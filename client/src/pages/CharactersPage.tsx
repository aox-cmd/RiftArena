import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import {
  Swords, Flame, Sword, Shield, HeartPulse,
  Zap, Heart, X, LoaderCircle
} from "lucide-react";

import { api, getErrorMessage } from "../services/api";
import type { Character } from "../types";

const classes = {
  WARRIOR: { icon: Swords, color: "#d4ad70" },
  MAGE: { icon: Flame, color: "#fb923c" },
  ASSASSIN: { icon: Sword, color: "#a78bfa" },
  GUARDIAN: { icon: Shield, color: "#60a5fa" },
  SUPPORT: { icon: HeartPulse, color: "#4ade80" }
};

function appearance(character: Character) {
  return classes[character.class as keyof typeof classes]
    ?? classes.WARRIOR;
}

export default function CharactersPage() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selected, setSelected] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    api.get<Character[]>("/characters/owned")
      .then(({ data }) => {
        if (active) setCharacters(data);
      })
      .catch(error => {
        if (active) setError(getErrorMessage(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  if (loading) {
    return <LoaderCircle className="animate-spin gold-text mx-auto" />;
  }

  if (error) {
    return <p className="text-red-400">{error}</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Character Collection</h1>

        <p className="text-slate-400 mt-2">
          {characters.length} heroes unlocked
        </p>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {characters.map((character, index) => {
          const { icon: Icon, color } = appearance(character);

          return (
            <motion.button
              key={character.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -5 }}
              onClick={() => setSelected(character)}
              className="game-panel overflow-hidden text-left"
            >
              <div
                className="h-40 flex items-center justify-center"
                style={{
                  background: `radial-gradient(circle, ${color}25, transparent 75%)`
                }}
              >
                {character.imageUrl ? (
                  <img
                    src={character.imageUrl}
                    alt={character.name}
                    className="h-full object-contain"
                  />
                ) : (
                  <Icon size={65} color={color} />
                )}
              </div>

              <div className="p-5 space-y-3">
                <p
                  className="text-xs tracking-widest"
                  style={{ color }}
                >
                  {character.class}
                </p>

                <h2 className="text-xl font-bold">
                  {character.name}
                </h2>

                <div className="grid grid-cols-2 gap-3 text-sm text-slate-300">
                  <span className="flex gap-2 items-center">
                    <Heart size={15} className="text-red-400" />
                    {character.health} HP
                  </span>

                  <span className="flex gap-2 items-center">
                    <Swords size={15} className="text-amber-400" />
                    {character.attack} ATK
                  </span>

                  <span className="flex gap-2 items-center">
                    <Shield size={15} className="text-blue-400" />
                    {character.defense} DEF
                  </span>

                  <span className="flex gap-2 items-center">
                    <Zap size={15} className="text-violet-400" />
                    {character.speed} SPD
                  </span>
                </div>

                <p className="gold-text text-sm pt-2">
                  View abilities
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelected(null)}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-5"
          >
            <motion.section
              role="dialog"
              aria-modal="true"
              aria-label={selected.name}
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              onClick={e => e.stopPropagation()}
              className="game-panel p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold gold-text">
                  {selected.name}
                </h2>

                <button
                  aria-label="Close"
                  onClick={() => setSelected(null)}
                >
                  <X />
                </button>
              </div>

              <p className="text-slate-400 my-5">
                {selected.description}
              </p>

              <div className="space-y-3">
                {selected.abilities.map(ability => (
                  <div
                    key={ability.id}
                    className="bg-[#090d15] border border-slate-800 rounded-xl p-4"
                  >
                    <h3 className="font-bold gold-text">
                      {ability.name}
                    </h3>

                    <p className="text-sm text-slate-400 mt-2">
                      {ability.description}
                    </p>

                    <div className="flex flex-wrap gap-4 text-xs mt-3">
                      <span className="text-blue-400">
                        {ability.energyCost} Energy
                      </span>

                      <span className="text-violet-400">
                        {ability.cooldown} Cooldown
                      </span>

                      <span className="text-emerald-400">
                        {ability.multiplier}x
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
