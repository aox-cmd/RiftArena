import {
  Swords, Flame, Sword, Shield,
  HeartPulse, Heart, Zap, Check
} from "lucide-react";

import type { Character } from "../../types";

const styles = {
  WARRIOR: { icon: Swords, color: "#d4ad70" },
  MAGE: { icon: Flame, color: "#fb923c" },
  ASSASSIN: { icon: Sword, color: "#a78bfa" },
  GUARDIAN: { icon: Shield, color: "#60a5fa" },
  SUPPORT: { icon: HeartPulse, color: "#4ade80" }
};

interface Props {
  character: Character;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export default function HeroCard({
  character,
  selected = false,
  disabled = false,
  onClick
}: Props) {
  const { icon: Icon, color } =
    styles[character.class as keyof typeof styles]
    ?? styles.WARRIOR;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={`game-panel relative w-full overflow-hidden text-left transition ${
        selected
          ? "!border-[#d4ad70]"
          : "hover:border-slate-500"
      }`}
    >
      {selected && (
        <Check
          size={18}
          className="absolute top-3 right-3 gold-text"
        />
      )}

      <div
        className="h-28 flex items-center justify-center"
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
          <Icon size={45} color={color} />
        )}
      </div>

      <div className="p-4 space-y-2">
        <p className="text-[10px] tracking-widest" style={{ color }}>
          {character.class}
        </p>

        <h3 className="font-bold">
          {character.name}
        </h3>

        <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
          <span className="flex gap-1 items-center">
            <Heart size={13} className="text-red-400" />
            {character.health}
          </span>

          <span className="flex gap-1 items-center">
            <Swords size={13} className="text-amber-400" />
            {character.attack}
          </span>

          <span className="flex gap-1 items-center">
            <Shield size={13} className="text-blue-400" />
            {character.defense}
          </span>

          <span className="flex gap-1 items-center">
            <Zap size={13} className="text-violet-400" />
            {character.speed}
          </span>
        </div>
      </div>
    </button>
  );
}
