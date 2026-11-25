import { useEffect, useState } from "react";

import {
  Swords, Trophy, Wifi, WifiOff,
  LoaderCircle, Layers3
} from "lucide-react";

import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";

import { deckService } from "../services/deckService";
import { getErrorMessage } from "../services/api";
import { useMultiplayerStore } from "../stores/multiplayerStore";

import HeroCard from "../components/game/HeroCard";

import type { Deck } from "../types";
import type { MatchMode } from "../types/battle";

export default function LobbyPage() {
  const navigate = useNavigate();

  const {
    connected,
    searching,
    busy,
    battle,
    error,
    joinQueue,
    leaveQueue
  } = useMultiplayerStore();

  const [mode, setMode] = useState<MatchMode>("QUICK");
  const [deck, setDeck] = useState<Deck | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let active = true;

    deckService.list()
      .then(decks => {
        if (active) {
          setDeck(decks.find(d => d.isActive) ?? null);
        }
      })
      .catch(error => {
        if (active) setLoadError(getErrorMessage(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (battle?.status === "ACTIVE") {
      navigate(`/battle/${battle.id}`);
    }
  }, [battle, navigate]);

  useEffect(() => {
    if (!searching) {
      setElapsed(0);
      return;
    }

    const started = Date.now();

    const timer = setInterval(() => {
      setElapsed(
        Math.floor((Date.now() - started) / 1000)
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [searching]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = String(elapsed % 60).padStart(2, "0");

  const modes = [
    {
      id: "QUICK" as const,
      title: "Quick Match",
      description: "Casual tactical combat",
      icon: Swords
    },
    {
      id: "RANKED" as const,
      title: "Ranked Match",
      description: "Competitive matchmaking",
      icon: Trophy
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      <div className="flex justify-between items-center gap-3">
        <div>
          <h1 className="text-3xl font-bold">
            Battle Arena
          </h1>

          <p className="text-slate-400 mt-2">
            Challenge other commanders.
          </p>
        </div>

        <div className={`flex items-center gap-2 text-sm ${
          connected ? "text-emerald-400" : "text-red-400"
        }`}>
          {connected ? <Wifi size={18} /> : <WifiOff size={18} />}

          {connected ? "Connected" : "Disconnected"}
        </div>
      </div>

      <section className="game-panel p-8 text-center">
        <Swords
          size={65}
          className="gold-text mx-auto mb-5"
        />

        <h2 className="text-4xl font-black">
          Enter the Rift
        </h2>

        <p className="text-slate-400 mt-3">
          Three heroes. Two commanders. One victor.
        </p>
      </section>

      <div className="grid sm:grid-cols-2 gap-4">
        {modes.map(item => (
          <button
            key={item.id}
            disabled={searching || busy}
            onClick={() => setMode(item.id)}
            className={`game-panel p-6 text-center transition ${
              mode === item.id
                ? "!border-[#d4ad70]"
                : "hover:border-slate-500"
            }`}
          >
            <item.icon
              size={35}
              className="gold-text mx-auto mb-3"
            />

            <h3 className="text-xl font-bold">
              {item.title}
            </h3>

            <p className="text-sm text-slate-400 mt-2">
              {item.description}
            </p>
          </button>
        ))}
      </div>

      <section className="game-panel p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">
            Active Formation
          </h2>

          <Link
            to="/decks"
            className="text-sm gold-text"
          >
            Manage decks
          </Link>
        </div>

        {loading ? (
          <LoaderCircle className="animate-spin gold-text mx-auto" />
        ) : deck ? (
          <>
            <p className="text-slate-400">
              {deck.name}
            </p>

            <div className="grid grid-cols-3 gap-3">
              {deck.characters.map(entry => (
                <HeroCard
                  key={entry.characterId}
                  character={entry.character}
                  disabled
                />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <Layers3
              size={40}
              className="mx-auto text-slate-500 mb-4"
            />

            <p className="text-slate-400 mb-5">
              Create and activate a formation before playing.
            </p>

            <Link to="/decks" className="gold-button">
              CREATE FORMATION
            </Link>
          </div>
        )}
      </section>

      {(error || loadError) && (
        <div role="alert" className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
          {error || loadError}
        </div>
      )}

      {searching ? (
        <section className="game-panel p-8 text-center space-y-4">
          <LoaderCircle
            size={45}
            className="animate-spin gold-text mx-auto"
          />

          <h2 className="text-xl font-bold">
            Searching for opponent...
          </h2>

          <p className="text-3xl font-mono gold-text">
            {minutes}:{seconds}
          </p>

          <button
            disabled={busy || !connected}
            onClick={() => void leaveQueue()}
            className="border border-slate-600 rounded-lg px-6 py-3"
          >
            Cancel matchmaking
          </button>
        </section>
      ) : (
        <button
          disabled={
            !connected ||
            !deck ||
            loading ||
            busy ||
            battle?.status === "ACTIVE"
          }
          onClick={() => void joinQueue(mode)}
          className="gold-button w-full text-lg flex items-center justify-center gap-3"
        >
          {busy ? (
            <LoaderCircle className="animate-spin" />
          ) : (
            <Swords size={22} />
          )}

          FIND MATCH
        </button>
      )}
    </motion.div>
  );
}
