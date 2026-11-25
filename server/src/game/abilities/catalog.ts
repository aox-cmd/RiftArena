export type AbilityEffect =
  | "DAMAGE"
  | "HEAL"
  | "SHIELD";

export type AbilityTarget =
  | "ENEMY"
  | "ALL_ENEMIES"
  | "ALLY"
  | "SELF";

export interface Ability {
  id: string;
  name: string;
  description: string;
  effect: AbilityEffect;
  target: AbilityTarget;
  multiplier: number;
  energyCost: number;
  cooldown: number;
}

export const ABILITIES: Record<string, Ability[]> = {
  kael: [
    {
      id: "iron_strike",
      name: "Iron Strike",
      description: "Strike a single enemy.",
      effect: "DAMAGE",
      target: "ENEMY",
      multiplier: 1,
      energyCost: 0,
      cooldown: 0
    },
    {
      id: "blade_fury",
      name: "Blade Fury",
      description: "Deliver a powerful sword attack.",
      effect: "DAMAGE",
      target: "ENEMY",
      multiplier: 1.8,
      energyCost: 25,
      cooldown: 2
    },
    {
      id: "iron_storm",
      name: "Iron Storm",
      description: "Strike every enemy.",
      effect: "DAMAGE",
      target: "ALL_ENEMIES",
      multiplier: 1.5,
      energyCost: 60,
      cooldown: 4
    }
  ],

  lyra: [
    {
      id: "firebolt",
      name: "Firebolt",
      description: "Launch a bolt of fire.",
      effect: "DAMAGE",
      target: "ENEMY",
      multiplier: 1,
      energyCost: 0,
      cooldown: 0
    },
    {
      id: "flame_burst",
      name: "Flame Burst",
      description: "Burn a single enemy.",
      effect: "DAMAGE",
      target: "ENEMY",
      multiplier: 1.9,
      energyCost: 30,
      cooldown: 2
    },
    {
      id: "meteor",
      name: "Meteor",
      description: "Rain fire upon all enemies.",
      effect: "DAMAGE",
      target: "ALL_ENEMIES",
      multiplier: 1.8,
      energyCost: 70,
      cooldown: 5
    }
  ],

  vex: [
    {
      id: "quick_slash",
      name: "Quick Slash",
      description: "A swift dagger attack.",
      effect: "DAMAGE",
      target: "ENEMY",
      multiplier: 1,
      energyCost: 0,
      cooldown: 0
    },
    {
      id: "shadow_strike",
      name: "Shadow Strike",
      description: "Deliver a deadly precision attack.",
      effect: "DAMAGE",
      target: "ENEMY",
      multiplier: 2.1,
      energyCost: 30,
      cooldown: 2
    },
    {
      id: "execution",
      name: "Execution",
      description: "Unleash a devastating attack.",
      effect: "DAMAGE",
      target: "ENEMY",
      multiplier: 3,
      energyCost: 65,
      cooldown: 4
    }
  ],

  thorne: [
    {
      id: "shield_bash",
      name: "Shield Bash",
      description: "Strike with a heavy shield.",
      effect: "DAMAGE",
      target: "ENEMY",
      multiplier: 1,
      energyCost: 0,
      cooldown: 0
    },
    {
      id: "fortify",
      name: "Fortify",
      description: "Create a protective shield.",
      effect: "SHIELD",
      target: "ALLY",
      multiplier: 2,
      energyCost: 25,
      cooldown: 2
    },
    {
      id: "iron_wall",
      name: "Iron Wall",
      description: "Create a massive personal shield.",
      effect: "SHIELD",
      target: "SELF",
      multiplier: 4,
      energyCost: 55,
      cooldown: 4
    }
  ],

  seraphina: [
    {
      id: "holy_light",
      name: "Holy Light",
      description: "Damage an enemy with holy energy.",
      effect: "DAMAGE",
      target: "ENEMY",
      multiplier: 1,
      energyCost: 0,
      cooldown: 0
    },
    {
      id: "restore",
      name: "Restore",
      description: "Restore an ally's health.",
      effect: "HEAL",
      target: "ALLY",
      multiplier: 2.5,
      energyCost: 25,
      cooldown: 2
    },
    {
      id: "divine_grace",
      name: "Divine Grace",
      description: "Restore a large amount of health.",
      effect: "HEAL",
      target: "ALLY",
      multiplier: 5,
      energyCost: 60,
      cooldown: 4
    }
  ],

  draven: [
    {
      id: "heavy_slash",
      name: "Heavy Slash",
      description: "Strike with a heavy weapon.",
      effect: "DAMAGE",
      target: "ENEMY",
      multiplier: 1,
      energyCost: 0,
      cooldown: 0
    },
    {
      id: "blood_rage",
      name: "Blood Rage",
      description: "Deliver a brutal attack.",
      effect: "DAMAGE",
      target: "ENEMY",
      multiplier: 2,
      energyCost: 25,
      cooldown: 2
    },
    {
      id: "carnage",
      name: "Carnage",
      description: "Attack every enemy.",
      effect: "DAMAGE",
      target: "ALL_ENEMIES",
      multiplier: 1.7,
      energyCost: 65,
      cooldown: 4
    }
  ]
};

export function getAbilities(characterId: string): Ability[] {
  return ABILITIES[characterId] ?? [];
}
