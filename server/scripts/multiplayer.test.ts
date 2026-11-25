import assert from "node:assert/strict";
import { io, type Socket } from "socket.io-client";
import { randomUUID } from "node:crypto";

import type {
  BattleState
} from "../src/game/engine/types.js";

const URL = "http://localhost:4000";
const sockets: Socket[] = [];

async function request(
  path: string,
  method = "GET",
  body?: unknown,
  token?: string
) {
  const response = await fetch(`${URL}/api${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token
        ? { Authorization: `Bearer ${token}` }
        : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    throw new Error(
      `${path}: ${response.status} ${await response.text()}`
    );
  }

  return response.json();
}

async function createPlayer(characterIds: string[]) {
  const stamp = randomUUID().replaceAll("-", "").slice(0, 16);

  const account = await request("/auth/register", "POST", {
    username: `Test${stamp}`,
    email: `test${stamp}@example.com`,
    password: "RiftTest123!"
  });

  await request(
    "/decks",
    "POST",
    {
      name: "Multiplayer Test",
      characterIds
    },
    account.token
  );

  return account;
}

function waitFor<T>(
  socket: Socket,
  event: string
): Promise<T> {
  return new Promise((resolve, reject) => {
    const handler = (data: T) => {
      clearTimeout(timer);
      resolve(data);
    };

    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`Timeout: ${event}`));
    }, 10000);

    socket.once(event, handler);
  });
}

async function connect(token: string) {
  const socket = io(URL, {
    auth: { token },
    autoConnect: false,
    reconnection: false
  });

  sockets.push(socket);

  const connected = waitFor(socket, "server:welcome");

  socket.connect();

  await connected;

  return socket;
}

function send(
  socket: Socket,
  event: string,
  payload: unknown
): Promise<any> {
  return new Promise((resolve, reject) => {
    socket.timeout(5000).emit(
      event,
      payload,
      (error: Error | null, response: unknown) => {
        if (error) reject(error);
        else resolve(response);
      }
    );
  });
}

async function main() {
  const p1 = await createPlayer([
    "vex", "lyra", "kael"
  ]);

  const p2 = await createPlayer([
    "thorne", "seraphina", "draven"
  ]);

  console.log("[PASS] Two players and decks created");

  const s1 = await connect(p1.token);
  const s2 = await connect(p2.token);

  console.log("[PASS] Both sockets authenticated");

  const queued = await send(s1, "queue:join", {
    mode: "QUICK"
  });

  assert.equal(queued.ok, true);
  assert.equal(queued.data.status, "WAITING");

  console.log("[PASS] Player 1 entered queue");

  const found1 = waitFor<{
    matchId: string;
    state: BattleState;
  }>(s1, "battle:found");

  const found2 = waitFor<{
    matchId: string;
    state: BattleState;
  }>(s2, "battle:found");

  const matched = await send(s2, "queue:join", {
    mode: "QUICK"
  });

  assert.equal(matched.ok, true);

  const [battle1, battle2] = await Promise.all([
    found1,
    found2
  ]);

  assert.equal(battle1.matchId, battle2.matchId);
  assert.equal(battle1.state.fighters.length, 6);

  console.log("[PASS] Both players matched in same battle");

  const state = battle1.state;

  const actor = state.fighters.find(
    f => f.id === state.turnOrder[state.turnIndex]
  )!;

  const target = state.fighters.find(
    f => f.ownerId !== actor.ownerId
  )!;

  const action = {
    matchId: state.id,
    fighterId: actor.id,
    abilityId: "quick_slash",
    targetId: target.id,
    expectedVersion: state.version
  };

  const rejected = await send(
    s2,
    "battle:action",
    action
  );

  assert.equal(rejected.ok, false);

  console.log("[PASS] Wrong-player action rejected");

  const update1 = waitFor<{ state: BattleState }>(
    s1, "battle:state"
  );

  const update2 = waitFor<{ state: BattleState }>(
    s2, "battle:state"
  );

  const accepted = await send(
    s1,
    "battle:action",
    action
  );

  assert.equal(accepted.ok, true);

  const [next1, next2] = await Promise.all([
    update1,
    update2
  ]);

  assert.equal(next1.state.version, 1);
  assert.deepEqual(next1.state, next2.state);

  const damaged = next1.state.fighters.find(
    f => f.id === target.id
  )!;

  assert.ok(damaged.health < target.health);

  console.log("[PASS] Valid attack processed");
  console.log("[PASS] Both clients synchronized");

  const duplicate = await send(
    s1,
    "battle:action",
    action
  );

  assert.equal(duplicate.ok, false);

  console.log("[PASS] Duplicate action rejected");

  s1.disconnect();

  const reconnected = io(URL, {
    auth: { token: p1.token },
    autoConnect: false,
    reconnection: false
  });

  sockets.push(reconnected);

  const restored = waitFor<{
    state: BattleState;
  }>(reconnected, "battle:reconnected");

  reconnected.connect();

  const recovered = await restored;

  assert.equal(recovered.state.id, state.id);
  assert.equal(recovered.state.version, 1);

  console.log("[PASS] Battle restored after reconnect");

  console.log("--------------------------------");
  console.log("ALL MULTIPLAYER TESTS PASSED");
  console.log("--------------------------------");
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    sockets.forEach(socket => socket.disconnect());
  });
