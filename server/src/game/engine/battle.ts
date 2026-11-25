import { BATTLE_CONFIG } from "./config.js";
import { randomUUID } from "node:crypto";

import { getAbilities } from "../abilities/catalog.js";

import {
  calculateDamage,
  calculateHealing,
  calculateShield
} from "./calculations.js";

import type {
  Fighter,
  FighterInput,
  BattleState,
  BattleAction,
  BattleEvent
} from "./types.js";

export class BattleError extends Error {}

const MAX_ENERGY = 100;
const ENERGY_REGEN = 20;
const MAX_ROUNDS = 50;

function createFighter(
  ownerId: string,
  character: FighterInput,
  position: number
): Fighter {
  return {
    id: `${ownerId}:${position}`,
    characterId: character.id,
    ownerId,
    name: character.name,
    position,

    maxHealth: character.health,
    health: character.health,
    attack: character.attack,
    defense: character.defense,
    speed: character.speed,

    energy: BATTLE_CONFIG.startingEnergy,
    shield: 0,
    cooldowns: {}
  };
}

export function createBattle(
  player1Id: string,
  team1: FighterInput[],
  player2Id: string,
  team2: FighterInput[],
  battleId: string = randomUUID()
): BattleState {
  if (player1Id === player2Id) {
    throw new BattleError("Players must be different");
  }

  for (const team of [team1, team2]) {
    if (
      team.length !== 3 ||
      new Set(team.map(c => c.id)).size !== 3
    ) {
      throw new BattleError("Invalid battle team");
    }

    for (const character of team) {
      if (!getAbilities(character.id).length) {
        throw new BattleError("Unknown character");
      }

      if (
        !Number.isFinite(character.health) ||
        character.health <= 0 ||
        !Number.isFinite(character.attack) ||
        character.attack <= 0 ||
        !Number.isFinite(character.defense) ||
        character.defense < 0 ||
        !Number.isFinite(character.speed) ||
        character.speed <= 0
      ) {
        throw new BattleError("Invalid character stats");
      }
    }
  }

  const fighters = [
    ...team1.map((c, i) => createFighter(player1Id, c, i)),
    ...team2.map((c, i) => createFighter(player2Id, c, i))
  ];

  const turnOrder = [...fighters]
    .sort((a, b) =>
      b.speed - a.speed ||
      a.id.localeCompare(b.id)
    )
    .map(f => f.id);

  return {
    id: battleId,
    playerIds: [player1Id, player2Id],
    fighters,
    turnOrder,
    turnIndex: 0,
    round: 1,
    version: 0,
    status: "ACTIVE",
    winnerId: null,
    events: []
  };
}

export function getCurrentFighter(
  state: BattleState
): Fighter {
  const fighter = state.fighters.find(
    f => f.id === state.turnOrder[state.turnIndex]
  );

  if (!fighter) {
    throw new BattleError("Invalid battle state");
  }

  return fighter;
}

function addEvent(
  state: BattleState,
  event: BattleEvent
) {
  state.events.push(event);

  if (state.events.length > 100) {
    state.events.shift();
  }
}

function checkVictory(state: BattleState): boolean {
  const alivePlayers = state.playerIds.filter(
    playerId => state.fighters.some(
      f => f.ownerId === playerId && f.health > 0
    )
  );

  if (alivePlayers.length === 2) {
    return false;
  }

  state.status = "COMPLETED";
  state.winnerId = alivePlayers[0] ?? null;

  addEvent(state, {
    type: state.winnerId ? "VICTORY" : "DRAW",
    message: state.winnerId
      ? `${state.winnerId} wins the battle`
      : "Battle ended in a draw"
  });

  return true;
}

function advanceTurn(state: BattleState) {
  if (checkVictory(state)) {
    return;
  }

  do {
    state.turnIndex++;

    if (state.turnIndex >= state.turnOrder.length) {
      state.turnIndex = 0;
      state.round++;

      if (state.round > MAX_ROUNDS) {
        state.round = MAX_ROUNDS;
        state.status = "COMPLETED";
        state.winnerId = null;

        addEvent(state, {
          type: "DRAW",
          message: "Maximum rounds reached"
        });

        return;
      }
    }
  } while (getCurrentFighter(state).health <= 0);

  const fighter = getCurrentFighter(state);

  for (const id of Object.keys(fighter.cooldowns)) {
    fighter.cooldowns[id] = Math.max(
      0,
      fighter.cooldowns[id] - 1
    );
  }

  addEvent(state, {
    type: "TURN",
    actorId: fighter.id,
    message: `${fighter.name}'s turn`
  });
}

export function applyAction(
  original: BattleState,
  action: BattleAction
): BattleState {
  if (original.status !== "ACTIVE") {
    throw new BattleError("Battle is already completed");
  }

  if (action.expectedVersion !== original.version) {
    throw new BattleError("Outdated battle action");
  }

  const state = structuredClone(original);
  const actor = getCurrentFighter(state);

  if (
    actor.id !== action.fighterId ||
    actor.ownerId !== action.playerId
  ) {
    throw new BattleError("It is not your turn");
  }

  if (actor.health <= 0) {
    throw new BattleError("Fighter is defeated");
  }

  const ability = getAbilities(actor.characterId)
    .find(a => a.id === action.abilityId);

  if (!ability) {
    throw new BattleError("Invalid ability");
  }

  if (actor.energy < ability.energyCost) {
    throw new BattleError("Not enough energy");
  }

  if ((actor.cooldowns[ability.id] ?? 0) > 0) {
    throw new BattleError("Ability is on cooldown");
  }

  let targets: Fighter[];

  if (ability.target === "SELF") {
    targets = [actor];
  } else if (ability.target === "ALL_ENEMIES") {
    targets = state.fighters.filter(
      f => f.ownerId !== actor.ownerId && f.health > 0
    );
  } else {
    const target = state.fighters.find(
      f => f.id === action.targetId
    );

    if (!target || target.health <= 0) {
      throw new BattleError("Invalid target");
    }

    if (
      ability.target === "ENEMY" &&
      target.ownerId === actor.ownerId
    ) {
      throw new BattleError("Cannot attack an ally");
    }

    if (
      ability.target === "ALLY" &&
      target.ownerId !== actor.ownerId
    ) {
      throw new BattleError("Target must be an ally");
    }

    targets = [target];
  }

  actor.energy -= ability.energyCost;

  if (ability.cooldown > 0) {
    actor.cooldowns[ability.id] = ability.cooldown;
  }

  for (const target of targets) {
    if (ability.effect === "DAMAGE") {
      const damage = calculateDamage(
        actor.attack,
        target.defense,
        ability.multiplier
      );

      const absorbed = Math.min(
        target.shield,
        damage
      );

      target.shield -= absorbed;

      const actualDamage = Math.min(
        target.health,
        damage - absorbed
      );

      target.health -= actualDamage;

      addEvent(state, {
        type: "DAMAGE",
        actorId: actor.id,
        targetId: target.id,
        amount: actualDamage,
        absorbed,
        message:
          `${actor.name} used ${ability.name} ` +
          `on ${target.name} for ${actualDamage} damage`
      });

      if (target.health === 0) {
        target.shield = 0;

        addEvent(state, {
          type: "DEATH",
          targetId: target.id,
          message: `${target.name} was defeated`
        });
      }
    }

    if (ability.effect === "HEAL") {
      const healing = calculateHealing(
        actor.attack,
        ability.multiplier
      );

      const actualHealing = Math.min(
        healing,
        target.maxHealth - target.health
      );

      target.health += actualHealing;

      addEvent(state, {
        type: "HEAL",
        actorId: actor.id,
        targetId: target.id,
        amount: actualHealing,
        message:
          `${actor.name} healed ${target.name} ` +
          `for ${actualHealing} HP`
      });
    }

    if (ability.effect === "SHIELD") {
      const shield = calculateShield(
        actor.defense,
        ability.multiplier
      );

      const added = Math.max(
        0,
        Math.min(
          shield,
          target.maxHealth - target.shield
        )
      );

      target.shield += added;

      addEvent(state, {
        type: "SHIELD",
        actorId: actor.id,
        targetId: target.id,
        amount: added,
        message:
          `${actor.name} granted ${target.name} ` +
          `${added} shield`
      });
    }
  }

  actor.energy = Math.min(
    MAX_ENERGY,
    actor.energy + ENERGY_REGEN
  );

  state.version++;

  advanceTurn(state);

  return state;
}

export function applyAutomaticAction(
  state: BattleState
): BattleState {
  if (state.status !== "ACTIVE") {
    throw new BattleError("Battle is completed");
  }

  const actor = getCurrentFighter(state);

  const ability = getAbilities(actor.characterId)
    .find(a =>
      a.effect === "DAMAGE" &&
      a.target === "ENEMY" &&
      a.energyCost === 0 &&
      (actor.cooldowns[a.id] ?? 0) === 0
    );

  const target = state.fighters
    .filter(f =>
      f.ownerId !== actor.ownerId &&
      f.health > 0
    )
    .sort((a, b) => a.health - b.health)[0];

  if (!ability || !target) {
    throw new BattleError("No automatic action available");
  }

  return applyAction(state, {
    playerId: actor.ownerId,
    fighterId: actor.id,
    abilityId: ability.id,
    targetId: target.id,
    expectedVersion: state.version
  });
}

