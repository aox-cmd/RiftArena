import { useEffect, useState } from "react";

import {
  Plus, Trash2, Pencil, CheckCircle2,
  Layers3, LoaderCircle, X,
  ChevronLeft, ChevronRight
} from "lucide-react";

import { motion } from "framer-motion";

import { api, getErrorMessage } from "../services/api";
import { deckService } from "../services/deckService";
import HeroCard from "../components/game/HeroCard";

import type { Character, Deck } from "../types";

export default function DecksPage() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [decks, setDecks] = useState<Deck[]>([]);

  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    Promise.all([
      api.get<Character[]>("/characters/owned"),
      deckService.list()
    ])
      .then(([owned, saved]) => {
        if (!active) return;

        setCharacters(owned.data);
        setDecks(saved);
      })
      .catch(error => {
        if (active) setError(getErrorMessage(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  const formation = selected
    .map(id => characters.find(c => c.id === id))
    .filter((c): c is Character => Boolean(c));

  const totals = formation.reduce(
    (total, c) => ({
      health: total.health + c.health,
      attack: total.attack + c.attack,
      defense: total.defense + c.defense,
      speed: total.speed + c.speed
    }),
    { health: 0, attack: 0, defense: 0, speed: 0 }
  );

  function toggleCharacter(id: string) {
    if (busy) return;

    setError("");
    setSuccess("");

    if (selected.includes(id)) {
      setSelected(old => old.filter(x => x !== id));
      return;
    }

    if (selected.length >= 3) {
      setError("Your formation already contains three heroes");
      return;
    }

    setSelected(old => [...old, id]);
  }

  function move(from: number, to: number) {
    if (
      busy ||
      from < 0 ||
      to < 0 ||
      from >= selected.length ||
      to >= selected.length
    ) return;

    setSelected(old => {
      const next = [...old];

      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);

      return next;
    });
  }

  function reset() {
    setEditingId(null);
    setName("");
    setSelected([]);
    setError("");
    setSuccess("");
  }

  function edit(deck: Deck) {
    setEditingId(deck.id);
    setName(deck.name);

    setSelected(
      [...deck.characters]
        .sort((a, b) => a.position - b.position)
        .map(c => c.characterId)
    );

    setError("");
    setSuccess("");
  }

  async function save() {
    if (busy) return;

    if (!name.trim() || selected.length !== 3) {
      setError("Enter a name and select exactly three heroes");
      return;
    }

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const input = {
        name: name.trim(),
        characterIds: selected
      };

      const updating = Boolean(editingId);

      if (editingId) {
        await deckService.update(editingId, input);
      } else {
        await deckService.create(input);
      }

      setDecks(await deckService.list());

      reset();

      setSuccess(
        updating
          ? "Formation updated successfully"
          : "Formation created successfully"
      );
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function activate(id: string) {
    if (busy) return;

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      await deckService.activate(id);
      setDecks(await deckService.list());

      setSuccess("Active formation updated");
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function remove(deck: Deck) {
    if (busy) return;

    if (!window.confirm(`Delete "${deck.name}"?`)) {
      return;
    }

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      await deckService.remove(deck.id);

      setDecks(await deckService.list());

      if (editingId === deck.id) {
        reset();
      }

      setSuccess("Formation deleted");
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <LoaderCircle className="animate-spin gold-text mx-auto" />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-7"
    >
      <div>
        <h1 className="text-3xl font-bold">Deck Builder</h1>

        <p className="text-slate-400 mt-2">
          Assemble your ultimate three-hero formation.
        </p>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-400">
          {error}
        </div>
      )}

      {success && (
        <div role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-400">
          {success}
        </div>
      )}

      <div className="grid xl:grid-cols-[280px_1fr] gap-6">

        <aside className="game-panel p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Your Formations</h2>

            <span className="text-xs text-slate-400">
              {decks.length}/10
            </span>
          </div>

          <button
            disabled={busy}
            onClick={reset}
            className="w-full flex items-center justify-center gap-2 border border-dashed border-slate-600 rounded-lg p-3 gold-text"
          >
            <Plus size={18} />
            New formation
          </button>

          {decks.length === 0 && (
            <p className="text-sm text-slate-500">
              You have no saved formations yet.
            </p>
          )}

          {decks.map(deck => (
            <div
              key={deck.id}
              className={`rounded-xl border p-4 space-y-3 ${
                deck.isActive
                  ? "border-[#d4ad70]/50 bg-amber-500/5"
                  : "border-slate-800 bg-[#090d15]"
              }`}
            >
              <div className="flex justify-between items-center gap-2">
                <h3 className="font-semibold break-all">
                  {deck.name}
                </h3>

                {deck.isActive && (
                  <CheckCircle2
                    size={18}
                    className="gold-text shrink-0"
                  />
                )}
              </div>

              <p className="text-xs text-slate-400">
                {deck.characters.map(c => c.character.name).join(" / ")}
              </p>

              <div className="flex gap-3 items-center">
                <button
                  disabled={busy}
                  onClick={() => edit(deck)}
                  aria-label={`Edit ${deck.name}`}
                  className="text-slate-400 hover:text-white"
                >
                  <Pencil size={16} />
                </button>

                <button
                  disabled={busy}
                  onClick={() => remove(deck)}
                  aria-label={`Delete ${deck.name}`}
                  className="text-slate-400 hover:text-red-400"
                >
                  <Trash2 size={16} />
                </button>

                {!deck.isActive ? (
                  <button
                    disabled={busy}
                    onClick={() => activate(deck.id)}
                    className="ml-auto text-xs gold-text"
                  >
                    Activate
                  </button>
                ) : (
                  <span className="ml-auto text-xs gold-text">
                    ACTIVE
                  </span>
                )}
              </div>
            </div>
          ))}
        </aside>

        <div className="space-y-6">

          <section className="game-panel p-5 md:p-7 space-y-5">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold gold-text">
                {editingId ? "Edit Formation" : "New Formation"}
              </h2>

              <span className="text-sm text-slate-400">
                {selected.length}/3 heroes
              </span>
            </div>

            <input
              className="game-input"
              placeholder="Formation name"
              aria-label="Formation name"
              value={name}
              maxLength={40}
              disabled={busy}
              onChange={e => setName(e.target.value)}
            />

            <div className="grid grid-cols-3 gap-3">
              {[0, 1, 2].map(index => {
                const character = formation[index];

                return (
                  <div
                    key={index}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => {
                      e.preventDefault();

                      if (draggedIndex !== null) {
                        move(draggedIndex, index);
                      }

                      setDraggedIndex(null);
                    }}
                    className="min-w-0"
                  >
                    {character ? (
                      <div
                        draggable={!busy}
                        onDragStart={e => {
                          e.dataTransfer.setData("text/plain", String(index));
                          setDraggedIndex(index);
                        }}
                        onDragEnd={() => setDraggedIndex(null)}
                        className="relative cursor-grab"
                      >
                        <HeroCard
                          character={character}
                          selected
                          disabled={busy}
                          onClick={() => toggleCharacter(character.id)}
                        />

                        <div className="flex justify-between mt-2">
                          <button
                            aria-label="Move hero left"
                            disabled={busy || index === 0}
                            onClick={() => move(index, index - 1)}
                          >
                            <ChevronLeft size={17} />
                          </button>

                          <button
                            aria-label="Remove hero"
                            disabled={busy}
                            onClick={() => toggleCharacter(character.id)}
                            className="text-red-400"
                          >
                            <X size={17} />
                          </button>

                          <button
                            aria-label="Move hero right"
                            disabled={busy || index >= selected.length - 1}
                            onClick={() => move(index, index + 1)}
                          >
                            <ChevronRight size={17} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="min-h-52 h-full border border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center gap-3">
                        <Plus size={30} className="text-slate-600" />

                        <span className="text-xs text-slate-500">
                          Slot {index + 1}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { name: "Health", value: totals.health, color: "text-red-400" },
                { name: "Attack", value: totals.attack, color: "text-amber-400" },
                { name: "Defense", value: totals.defense, color: "text-blue-400" },
                { name: "Speed", value: totals.speed, color: "text-violet-400" }
              ].map(stat => (
                <div key={stat.name} className="bg-[#090d15] rounded-lg p-3">
                  <p className={`text-xl font-bold ${stat.color}`}>
                    {stat.value}
                  </p>

                  <p className="text-xs text-slate-400">
                    Total {stat.name}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                disabled={busy || selected.length !== 3 || !name.trim()}
                onClick={() => void save()}
                className="gold-button flex-1 flex items-center justify-center gap-2"
              >
                {busy ? (
                  <LoaderCircle size={18} className="animate-spin" />
                ) : (
                  <Layers3 size={18} />
                )}

                {editingId ? "UPDATE FORMATION" : "SAVE FORMATION"}
              </button>

              {editingId && (
                <button
                  disabled={busy}
                  onClick={reset}
                  className="border border-slate-700 rounded-lg px-4"
                >
                  Cancel
                </button>
              )}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold">
              Available Heroes
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {characters.map(character => (
                <HeroCard
                  key={character.id}
                  character={character}
                  selected={selected.includes(character.id)}
                  disabled={busy}
                  onClick={() => toggleCharacter(character.id)}
                />
              ))}
            </div>
          </section>
        </div>
      </div>
    </motion.div>
  );
}
