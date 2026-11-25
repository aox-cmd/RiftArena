import {
  createBattle,
  applyAutomaticAction,
  getCurrentFighter
} from "../src/game/engine/battle.js";

import {
  CHARACTERS
} from "../src/game/data/characters.js";

function hero(id: string) {
  return {
    ...CHARACTERS.find(c => c.id === id)!,
    id
  };
}

let state = createBattle(
  "Team Alpha",
  [hero("vex"), hero("lyra"), hero("kael")],
  "Team Omega",
  [hero("thorne"), hero("seraphina"), hero("draven")]
);

console.log("================================");
console.log("       RIFTARENA BATTLE");
console.log("================================");

let actions = 0;

while (state.status === "ACTIVE" && actions < 300) {
  const actor = getCurrentFighter(state);

  console.log(
    `Round ${state.round} | ${actor.ownerId} | ${actor.name}`
  );

  state = applyAutomaticAction(state);

  const events = state.events.slice(-3);

  for (const event of events) {
    if (
      event.type === "DAMAGE" &&
      event.actorId === actor.id
    ) {
      console.log(event.message);
    }
  }

  actions++;
}

console.log("================================");
console.log("BATTLE FINISHED");
console.log(`Winner: ${state.winnerId ?? "Draw"}`);
console.log(`Rounds: ${state.round}`);
console.log(`Total actions: ${actions}`);

console.table(
  state.fighters.map(f => ({
    team: f.ownerId,
    name: f.name,
    health: f.health,
    energy: f.energy,
    status: f.health > 0 ? "ALIVE" : "DEFEATED"
  }))
);
