import { test } from "node:test";
import assert from "node:assert/strict";

import {
  createBattle,
  applyAction,
  getCurrentFighter,
  applyAutomaticAction
} from "../src/game/engine/battle.js";

import {
  calculateDamage
} from "../src/game/engine/calculations.js";

import {
  CHARACTERS
} from "../src/game/data/characters.js";

function hero(id: string) {
  const character = CHARACTERS.find(c => c.id === id)!;

  return {
    ...character,
    id
  };
}

function setup() {
  return createBattle(
    "player1",
    [hero("vex"), hero("lyra"), hero("kael")],
    "player2",
    [hero("thorne"), hero("seraphina"), hero("draven")]
  );
}

test("Creates a six-fighter battle", () => {
  const state = setup();

  assert.equal(state.fighters.length, 6);
  assert.equal(state.status, "ACTIVE");
  assert.equal(state.round, 1);
});

test("Fastest character acts first", () => {
  assert.equal(
    getCurrentFighter(setup()).characterId,
    "vex"
  );
});

test("Defense reduces damage correctly", () => {
  assert.equal(calculateDamage(150, 170, 1.8), 100);
});

test("Basic attacks deal damage and regenerate energy", () => {
  const state = setup();
  const actor = getCurrentFighter(state);

  const target = state.fighters.find(
    f => f.characterId === "thorne"
  )!;

  const next = applyAction(state, {
    playerId: actor.ownerId,
    fighterId: actor.id,
    abilityId: "quick_slash",
    targetId: target.id,
    expectedVersion: state.version
  });

  const updated = next.fighters.find(
    f => f.id === target.id
  )!;

  assert.ok(updated.health < target.health);

  assert.equal(
    next.fighters.find(f => f.id === actor.id)!.energy,
    50
  );

  assert.equal(next.version, 1);

  assert.equal(target.health, target.maxHealth);
});

test("Rejects actions from the wrong player", () => {
  const state = setup();
  const actor = getCurrentFighter(state);

  assert.throws(() => applyAction(state, {
    playerId: "player2",
    fighterId: actor.id,
    abilityId: "quick_slash",
    expectedVersion: 0
  }), /not your turn/);
});

test("Rejects outdated actions", () => {
  const state = setup();
  const actor = getCurrentFighter(state);

  assert.throws(() => applyAction(state, {
    playerId: actor.ownerId,
    fighterId: actor.id,
    abilityId: "quick_slash",
    expectedVersion: 999
  }), /Outdated/);
});

test("Rejects abilities belonging to other characters", () => {
  const state = setup();
  const actor = getCurrentFighter(state);

  assert.throws(() => applyAction(state, {
    playerId: actor.ownerId,
    fighterId: actor.id,
    abilityId: "meteor",
    expectedVersion: 0
  }), /Invalid ability/);
});

test("Rejects insufficient energy", () => {
  const state = setup();
  const actor = getCurrentFighter(state);

  assert.throws(() => applyAction(state, {
    playerId: actor.ownerId,
    fighterId: actor.id,
    abilityId: "execution",
    expectedVersion: 0
  }), /Not enough energy/);
});

test("Rejects attacking allies", () => {
  const state = setup();
  const actor = getCurrentFighter(state);

  const ally = state.fighters.find(
    f => f.characterId === "lyra"
  )!;

  assert.throws(() => applyAction(state, {
    playerId: actor.ownerId,
    fighterId: actor.id,
    abilityId: "quick_slash",
    targetId: ally.id,
    expectedVersion: 0
  }), /Cannot attack an ally/);
});

test("Shields absorb incoming damage", () => {
  const state = setup();
  const actor = getCurrentFighter(state);

  const target = state.fighters.find(
    f => f.characterId === "thorne"
  )!;

  target.shield = 500;

  const next = applyAction(state, {
    playerId: actor.ownerId,
    fighterId: actor.id,
    abilityId: "quick_slash",
    targetId: target.id,
    expectedVersion: 0
  });

  const updated = next.fighters.find(
    f => f.id === target.id
  )!;

  assert.equal(updated.health, target.health);
  assert.ok(updated.shield < 500);
});

test("Rejects abilities on cooldown", () => {
  const state = setup();
  const actor = getCurrentFighter(state);

  actor.cooldowns.shadow_strike = 1;

  assert.throws(() => applyAction(state, {
    playerId: actor.ownerId,
    fighterId: actor.id,
    abilityId: "shadow_strike",
    expectedVersion: 0
  }), /cooldown/);
});

test("Healing cannot exceed maximum health", () => {
  const state = setup();

  const healer = state.fighters.find(
    f => f.characterId === "seraphina"
  )!;

  const target = state.fighters.find(
    f => f.characterId === "thorne"
  )!;

  state.turnIndex = state.turnOrder.indexOf(healer.id);
  target.health -= 10;

  const next = applyAction(state, {
    playerId: healer.ownerId,
    fighterId: healer.id,
    abilityId: "restore",
    targetId: target.id,
    expectedVersion: 0
  });

  const updated = next.fighters.find(
    f => f.id === target.id
  )!;

  assert.equal(updated.health, updated.maxHealth);
});

test("Ultimate damages all living enemies", () => {
  const state = setup();

  const mage = state.fighters.find(
    f => f.characterId === "lyra"
  )!;

  state.turnIndex = state.turnOrder.indexOf(mage.id);
  mage.energy = 100;

  const next = applyAction(state, {
    playerId: mage.ownerId,
    fighterId: mage.id,
    abilityId: "meteor",
    expectedVersion: 0
  });

  const enemies = next.fighters.filter(
    f => f.ownerId !== mage.ownerId
  );

  assert.ok(enemies.every(f => f.health < f.maxHealth));
});

test("Detects victory when the last enemy dies", () => {
  const state = setup();
  const actor = getCurrentFighter(state);

  const enemies = state.fighters.filter(
    f => f.ownerId !== actor.ownerId
  );

  enemies[0].health = 0;
  enemies[1].health = 0;
  enemies[2].health = 1;

  const next = applyAction(state, {
    playerId: actor.ownerId,
    fighterId: actor.id,
    abilityId: "quick_slash",
    targetId: enemies[2].id,
    expectedVersion: 0
  });

  assert.equal(next.status, "COMPLETED");
  assert.equal(next.winnerId, actor.ownerId);
});

test("A complete automatic battle terminates", () => {
  let state = setup();
  let actions = 0;

  while (state.status === "ACTIVE" && actions < 300) {
    state = applyAutomaticAction(state);
    actions++;
  }

  assert.equal(state.status, "COMPLETED");
  assert.ok(actions <= 300);
});
