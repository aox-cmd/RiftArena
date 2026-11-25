export interface Fighter {
  id: string;
  characterId: string;
  ownerId: string;
  name: string;
  position: number;

  maxHealth: number;
  health: number;
  attack: number;
  defense: number;
  speed: number;

  energy: number;
  shield: number;

  cooldowns: Record<string, number>;
}

export interface FighterInput {
  id: string;
  name: string;
  health: number;
  attack: number;
  defense: number;
  speed: number;
}

export interface BattleAction {
  playerId: string;
  fighterId: string;
  abilityId: string;
  targetId?: string;
  expectedVersion: number;
}

export interface BattleEvent {
  type:
    | "DAMAGE"
    | "HEAL"
    | "SHIELD"
    | "DEATH"
    | "TURN"
    | "VICTORY"
    | "DRAW";

  actorId?: string;
  targetId?: string;
  amount?: number;
  absorbed?: number;
  message: string;
}

export interface BattleState {
  id: string;
  playerIds: [string, string];

  fighters: Fighter[];
  turnOrder: string[];
  turnIndex: number;
  round: number;
  version: number;

  status: "ACTIVE" | "COMPLETED";
  winnerId: string | null;

  events: BattleEvent[];
}
