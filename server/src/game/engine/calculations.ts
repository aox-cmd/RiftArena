import { BATTLE_CONFIG } from "./config.js";
export function calculateDamage(
  attack: number,
  defense: number,
  multiplier: number
): number {
  return Math.max(
    1,
    Math.round(BATTLE_CONFIG.damageMultiplier * 
      attack * multiplier * 100 / (100 + defense)
    )
  );
}

export function calculateHealing(
  attack: number,
  multiplier: number
): number {
  return Math.max(1, Math.round(attack * multiplier));
}

export function calculateShield(
  defense: number,
  multiplier: number
): number {
  return Math.max(1, Math.round(defense * multiplier));
}

