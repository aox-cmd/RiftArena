import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Swords, Shield, Zap, Flag, Trophy,
  Skull, Clock, HeartPulse, Crosshair
} from "lucide-react";

import { useAuthStore } from "../stores/authStore";
import { useMultiplayerStore } from "../stores/multiplayerStore";
import { api } from "../services/api";
import { socketRequest } from "../services/socket";
import BattleChat from "../components/game/BattleChat";

import type { Character, Ability } from "../types";
import type { Fighter } from "../types/battle";

export default function BattlePage() {
  const { matchId } = useParams();
  const user = useAuthStore(s => s.user);

  const {
    battle, deadline, connected, busy,
    error, performAction, clearBattle
  } = useMultiplayerStore();

  const [characters, setCharacters] = useState<Character[]>([]);
  const [selection, setSelection] = useState<{
    version: number;
    matchId: string;
    abilityId: string;
    targetId: string;
  } | null>(null);

  const [now, setNow] = useState(Date.now());
  const [localError, setLocalError] = useState("");
  const [confirmSurrender, setConfirmSurrender] = useState(false);
  const [surrendering, setSurrendering] = useState(false);

  useEffect(() => {
    let active = true;

    api.get<Character[]>("/characters")
      .then(({ data }) => {
        if (active) setCharacters(data);
      })
      .catch(() => {
        if (active) setLocalError("Could not load abilities");
      });

    return () => { active = false; };
  }, []);

  useEffect(() => {
    const timer = setInterval(
      () => setNow(Date.now()), 200
    );

    return () => clearInterval(timer);
  }, []);

  if (!battle || battle.id !== matchId) {
    return (
      <div className="game-panel p-8 space-y-4">
        <h1 className="text-xl font-bold">
          Waiting for battle state...
        </h1>
        <Link to="/play" className="gold-text">
          Return to lobby
        </Link>
      </div>
    );
  }

  const state = battle;
  const finished = state.status === "COMPLETED";

  const actor = state.fighters.find(
    f => f.id === state.turnOrder[state.turnIndex]
  );

  const myTurn =
    !finished && actor?.ownerId === user?.id;

  const remaining = Math.max(
    0, Math.ceil((deadline - now) / 1000)
  );

  const canAct =
    myTurn && connected && !busy &&
    !surrendering && remaining > 0;

  const abilities = characters.find(
    c => c.id === actor?.characterId
  )?.abilities ?? [];

  const currentSelection =
    selection?.version === state.version &&
    selection.matchId === state.id
      ? selection
      : null;

  const ability = abilities.find(
    a => a.id === currentSelection?.abilityId
  );

  function available(skill: Ability) {
    return Boolean(
      canAct &&
      actor &&
      actor.energy >= skill.energyCost &&
      (actor.cooldowns[skill.id] ?? 0) === 0
    );
  }

  function validTarget(fighter: Fighter) {
    if (!canAct || !actor || !ability ||
        fighter.health <= 0) return false;

    if (ability.target === "ENEMY") {
      return fighter.ownerId !== actor.ownerId;
    }

    if (ability.target === "ALLY") {
      return fighter.ownerId === actor.ownerId;
    }

    if (ability.target === "SELF") {
      return fighter.id === actor.id;
    }

    return false;
  }

  function selectAbility(skill: Ability) {
    if (!available(skill) || !actor) return;

    setSelection({
      matchId: state.id,
      version: state.version,
      abilityId: skill.id,
      targetId: skill.target === "SELF"
        ? actor.id
        : ""
    });
  }

  const selectedTarget = state.fighters.find(
    f => f.id === currentSelection?.targetId
  );

  const ready = Boolean(
    ability &&
    available(ability) &&
    (
      ability.target === "ALL_ENEMIES" ||
      (selectedTarget && validTarget(selectedTarget))
    )
  );

  async function cast() {
    if (!ready || !actor || !ability) return;

    await performAction({
      matchId: state.id,
      fighterId: actor.id,
      abilityId: ability.id,
      targetId: ability.target === "ALL_ENEMIES"
        ? undefined
        : selectedTarget?.id,
      expectedVersion: state.version
    });
  }

  async function surrender() {
    if (finished || !connected || surrendering) return;

    setSurrendering(true);
    setLocalError("");

    try {
      await socketRequest("battle:surrender", {
        matchId: state.id
      });

      setConfirmSurrender(false);
    } catch (error) {
      setLocalError(
        error instanceof Error
          ? error.message
          : "Surrender failed"
      );
    } finally {
      setSurrendering(false);
    }
  }

  function renderFighter(fighter: Fighter) {
    const friendly = fighter.ownerId === user?.id;
    const dead = fighter.health <= 0;
    const current = !finished && fighter.id === actor?.id;
    const selected = fighter.id === selectedTarget?.id;

    const character = characters.find(
      c => c.id === fighter.characterId
    );

    return (
      <motion.button
        key={fighter.id}
        type="button"
        disabled={!validTarget(fighter)}
        animate={{ scale: current ? 1.025 : 1 }}
        onClick={() => {
          if (!currentSelection) return;

          setSelection({
            ...currentSelection,
            targetId: fighter.id
          });
        }}
        className={`relative rounded-xl border p-3 space-y-3 text-center ${
          dead
            ? "opacity-40 grayscale border-slate-800"
            : selected
              ? "border-red-400 bg-red-500/10"
              : current
                ? "border-amber-400 bg-amber-500/10"
                : validTarget(fighter)
                  ? "border-slate-500 hover:border-amber-400"
                  : "border-slate-800 bg-[#141b29]"
        }`}
      >
        {selected && (
          <Crosshair
            size={18}
            className="absolute right-2 top-2 text-red-400"
          />
        )}

        <div className="h-24 flex items-center justify-center">
          {dead ? (
            <Skull size={48} className="text-slate-500" />
          ) : character?.imageUrl ? (
            <img
              src={character.imageUrl}
              alt={fighter.name}
              className="h-full object-contain"
            />
          ) : (
            <Swords
              size={50}
              className={
                friendly ? "text-blue-300" : "text-red-300"
              }
            />
          )}
        </div>

        <p className="font-bold text-sm truncate">
          {fighter.name}
        </p>

        <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
          <motion.div
            animate={{
              width: `${fighter.health / fighter.maxHealth * 100}%`
            }}
            className={`h-full ${
              friendly ? "bg-emerald-500" : "bg-red-500"
            }`}
          />
        </div>

        <p className="text-xs text-slate-400">
          {fighter.health}/{fighter.maxHealth} HP
        </p>

        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            animate={{ width: `${fighter.energy}%` }}
            className="h-full bg-blue-500"
          />
        </div>

        <p className="text-xs text-blue-400">
          {fighter.energy}/100 Energy
        </p>

        {fighter.shield > 0 && (
          <p className="flex justify-center gap-1 text-xs text-cyan-400">
            <Shield size={14} />
            {fighter.shield}
          </p>
        )}

        {current && (
          <p className="text-xs gold-text">CURRENT TURN</p>
        )}
      </motion.button>
    );
  }

  const victory = state.winnerId === user?.id;

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <section className="game-panel p-5 space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-black gold-text">
            Battle Arena
          </h1>

          {!finished && (
            <button
              disabled={!connected || surrendering}
              onClick={() => setConfirmSurrender(true)}
              className="flex gap-2 items-center text-red-400"
            >
              <Flag size={18} />
              Surrender
            </button>
          )}
        </div>

        <div className="flex justify-between items-center">
          <span>Round {state.round}</span>

          <span className="gold-text">
            {finished
              ? "Battle completed"
              : myTurn
                ? `Your turn: ${actor?.name}`
                : `Enemy turn: ${actor?.name}`}
          </span>

          <span className="flex items-center gap-1">
            <Clock size={16} />
            {finished ? 0 : remaining}s
          </span>
        </div>

        <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
          <div
            className={`h-full transition-all ${
              remaining <= 5 ? "bg-red-500" : "bg-amber-400"
            }`}
            style={{
              width: `${finished ? 0 : Math.min(100, remaining / 15 * 100)}%`
            }}
          />
        </div>
      </section>

      <section className="game-panel p-4">
        <p className="text-xs text-slate-400 mb-3">
          TURN ORDER
        </p>

        <div className="flex gap-2 overflow-x-auto">
          {state.turnOrder.map(id => {
            const fighter = state.fighters.find(f => f.id === id);

            if (!fighter) return null;

            return (
              <div
                key={id}
                className={`flex-1 min-w-20 rounded-lg border p-3 text-center ${
                  !finished && id === actor?.id
                    ? "border-amber-400"
                    : "border-slate-800"
                } ${fighter.health <= 0 ? "opacity-30" : ""}`}
              >
                <Swords size={20} className="mx-auto gold-text" />
                <p className="text-xs mt-2">{fighter.name}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="game-panel p-4 md:p-6 space-y-4">
        <p className="text-xs text-red-400 tracking-widest">
          ENEMY FORMATION
        </p>

        <div className="grid grid-cols-3 gap-3">
          {state.fighters
            .filter(f => f.ownerId !== user?.id)
            .sort((a, b) => a.position - b.position)
            .map(renderFighter)}
        </div>

        <p className="text-center text-2xl font-black gold-text py-2">
          VS
        </p>

        <div className="grid grid-cols-3 gap-3">
          {state.fighters
            .filter(f => f.ownerId === user?.id)
            .sort((a, b) => a.position - b.position)
            .map(renderFighter)}
        </div>

        <p className="text-xs text-emerald-400 tracking-widest">
          YOUR FORMATION
        </p>
      </section>

      {!finished && (
        <section className="game-panel p-5 space-y-4">
          <h2 className="font-bold">
            {myTurn
              ? `${actor?.name}'s abilities`
              : "Opponent's turn"}
          </h2>

          <div className="grid grid-cols-3 gap-3">
            {abilities.map(skill => {
              const cooldown = actor?.cooldowns[skill.id] ?? 0;

              const Icon =
                skill.effect === "HEAL" ? HeartPulse :
                skill.effect === "SHIELD" ? Shield : Swords;

              return (
                <button
                  key={skill.id}
                  disabled={!available(skill)}
                  onClick={() => selectAbility(skill)}
                  title={skill.description}
                  className={`rounded-xl border p-3 space-y-2 disabled:opacity-40 ${
                    ability?.id === skill.id
                      ? "border-amber-400 bg-amber-500/10"
                      : "border-slate-700 bg-[#090d15]"
                  }`}
                >
                  <Icon size={28} className="gold-text mx-auto" />

                  <p className="font-bold text-sm">
                    {skill.name}
                  </p>

                  <p className="flex justify-center gap-1 text-xs text-blue-400">
                    <Zap size={14} />
                    {skill.energyCost} Energy
                  </p>

                  {cooldown > 0 && (
                    <p className="text-xs text-red-400">
                      Cooldown: {cooldown}
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          {ability && (
            <p className="text-sm text-slate-400">
              {ability.description}
            </p>
          )}

          <button
            disabled={!ready}
            onClick={() => void cast()}
            className="gold-button w-full disabled:opacity-40"
          >
            {!myTurn
              ? "WAITING FOR OPPONENT"
              : busy
                ? "EXECUTING..."
                : !ability
                  ? "SELECT AN ABILITY"
                  : !ready
                    ? "SELECT A TARGET"
                    : `CAST ${ability.name.toUpperCase()}`}
          </button>
        </section>
      )}

      {finished && (
        <motion.section
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="game-panel p-10 text-center space-y-5"
        >
          {victory ? (
            <Trophy size={65} className="gold-text mx-auto" />
          ) : (
            <Skull size={65} className="text-slate-400 mx-auto" />
          )}

          <h2 className="text-4xl font-black gold-text">
            {!state.winnerId
              ? "DRAW"
              : victory ? "VICTORY" : "DEFEAT"}
          </h2>

          <Link
            to="/play"
            onClick={clearBattle}
            className="gold-button inline-block"
          >
            RETURN TO LOBBY
          </Link>
        </motion.section>
      )}

      {(error || localError || !connected) && (
        <p role="alert" className="text-red-400">
          {error || localError || "Reconnecting to server..."}
        </p>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <section className="game-panel p-5">
          <h2 className="font-bold gold-text mb-4">
            Combat Log
          </h2>

          <div className="max-h-72 overflow-y-auto space-y-2">
            {[...state.events].reverse().map((event, index) => (
              <p key={index} className={`text-sm ${
                event.type === "DAMAGE"
                  ? "text-red-300"
                  : event.type === "HEAL"
                    ? "text-emerald-300"
                    : "text-slate-400"
              }`}>
                {event.message}
              </p>
            ))}
          </div>
        </section>

        <BattleChat key={state.id} matchId={state.id} />
      </div>

      {confirmSurrender && !finished && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-5">
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Confirm surrender"
            className="game-panel p-7 max-w-sm w-full text-center space-y-5"
          >
            <Flag size={45} className="text-red-400 mx-auto" />

            <h2 className="text-2xl font-bold">
              Surrender battle?
            </h2>

            <p className="text-slate-400">
              Your opponent will win this match.
              Ranked surrender counts as a defeat.
            </p>

            <button
              disabled={surrendering || !connected}
              onClick={() => void surrender()}
              className="w-full rounded-lg bg-red-600 p-3 font-bold"
            >
              {surrendering ? "Surrendering..." : "CONFIRM SURRENDER"}
            </button>

            <button
              disabled={surrendering}
              onClick={() => setConfirmSurrender(false)}
              className="text-slate-400"
            >
              Continue battle
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
