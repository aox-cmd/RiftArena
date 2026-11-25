export interface User {
  id: string;
  username: string;
  email: string;
  rating: number;
  wins: number;
  losses: number;
}

export interface Ability {
  id: string;
  name: string;
  description: string;
  effect: "DAMAGE" | "HEAL" | "SHIELD";
  target: "ENEMY" | "ALL_ENEMIES" | "ALLY" | "SELF";
  multiplier: number;
  energyCost: number;
  cooldown: number;
}

export interface Character {
  id: string;
  name: string;
  description: string;
  class: string;
  health: number;
  attack: number;
  defense: number;
  speed: number;
  imageUrl?: string | null;
  abilities: Ability[];
}

export interface Deck {
  id: string;
  name: string;
  isActive: boolean;
  characters: {
    characterId: string;
    position: number;
    character: Character;
  }[];
}

export interface AuthResponse {
  token: string;
  user: User;
}
