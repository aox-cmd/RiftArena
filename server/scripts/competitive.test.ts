import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { io, type Socket } from "socket.io-client";

const BASE = "http://localhost:4000/api";
const SOCKET_URL = "http://localhost:4000";

const sockets: Socket[] = [];

async function request(
  path: string,
  method = "GET",
  body?: unknown,
  token?: string
) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? {
        Authorization: `Bearer ${token}`
      } : {})
    },
    ...(body !== undefined ? {
      body: JSON.stringify(body)
    } : {})
  });

  if (!response.ok) {
    throw new Error(
      `${path}: ${response.status} ${await response.text()}`
    );
  }

  return response.json();
}

async function createPlayer() {
  const id = randomUUID().replaceAll("-", "").slice(0, 12);

  const account = await request(
    "/auth/register",
    "POST",
    {
      username: `pvp_${id}`,
      email: `${id}@example.com`,
      password: "Multiplayer123!"
    }
  );

  await request(
    "/decks",
    "POST",
    {
      name: "Test Formation",
      characterIds: ["vex", "lyra", "kael"]
    },
    account.token
  );

  return account;
}

function waitFor(
  socket: Socket,
  event: string,
  timeout = 10000
): Promise<any> {
  return new Promise((resolve, reject) => {
    const handler = (data: any) => {
      clearTimeout(timer);
      resolve(data);
    };

    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`Timeout: ${event}`));
    }, timeout);

    socket.once(event, handler);
  });
}

async function connect(token: string) {
  const socket = io(SOCKET_URL, {
    autoConnect: false,
    auth: { token },
    reconnection: false
  });

  sockets.push(socket);

  const connected = waitFor(socket, "connect");

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
      (error: Error | null, result: any) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
  });
}

async function main() {
  const playerA = await createPlayer();
  const playerB = await createPlayer();

  const a = await connect(playerA.token);
  const b = await connect(playerB.token);

  console.log("PASS: Both players authenticated");

  const foundA = waitFor(a, "battle:found");
  const foundB = waitFor(b, "battle:found");

  const waiting = await send(a, "queue:join", {
    mode: "RANKED"
  });

  assert.equal(waiting.ok, true);

  const matched = await send(b, "queue:join", {
    mode: "RANKED"
  });

  assert.equal(matched.ok, true);

  const [battleA, battleB] = await Promise.all([
    foundA, foundB
  ]);

  assert.equal(battleA.matchId, battleB.matchId);
  assert.equal(battleA.state.fighters.length, 6);

  const matchId = battleA.matchId;

  console.log("PASS: Ranked matchmaking");

  const received = waitFor(b, "chat:message");

  const chat = await send(a, "chat:send", {
    matchId,
    text: "Good luck!"
  });

  assert.equal(chat.ok, true);

  const message = await received;

  assert.equal(message.text, "Good luck!");
  assert.equal(message.userId, playerA.user.id);
  assert.equal(message.username, playerA.user.username);

  console.log("PASS: Authenticated real-time chat");

  const invalidChat = await send(a, "chat:send", {
    matchId,
    text: "   "
  });

  assert.equal(invalidChat.ok, false);

  console.log("PASS: Empty chat rejected");

  const foreignChat = await send(a, "chat:send", {
    matchId: randomUUID(),
    text: "Invalid room"
  });

  assert.equal(foreignChat.ok, false);

  console.log("PASS: Unauthorized chat room rejected");

  const endedA = waitFor(a, "battle:ended");
  const endedB = waitFor(b, "battle:ended");

  const surrender = await send(a, "battle:surrender", {
    matchId
  });

  assert.equal(surrender.ok, true);

  const [resultA, resultB] = await Promise.all([
    endedA, endedB
  ]);

  assert.equal(resultA.winnerId, playerB.user.id);
  assert.equal(resultB.winnerId, playerB.user.id);

  console.log("PASS: Surrender synchronized");

  const repeat = await send(a, "battle:surrender", {
    matchId
  });

  assert.equal(repeat.ok, false);

  console.log("PASS: Duplicate surrender rejected");

  const leaderboard = await request(
    "/ranking/leaderboard"
  );

  const loser = leaderboard.find(
    (p: any) => p.id === playerA.user.id
  );

  const winner = leaderboard.find(
    (p: any) => p.id === playerB.user.id
  );

  const meA = await request(
    "/auth/me", "GET", undefined, playerA.token
  );

  const meB = await request(
    "/auth/me", "GET", undefined, playerB.token
  );

  const accountA = meA.user ?? meA;
  const accountB = meB.user ?? meB;

  assert.equal(accountA.rating, 984);
  assert.equal(accountB.rating, 1016);

  assert.equal(accountA.losses, 1);
  assert.equal(accountB.wins, 1);

  if (loser) assert.equal(loser.rating, 984);
  if (winner) assert.equal(winner.rating, 1016);

  console.log("PASS: Elo and win/loss persistence");

  const history = await request(
    "/ranking/history",
    "GET",
    undefined,
    playerA.token
  );

  assert.ok(history.some(
    (m: any) =>
      m.id === matchId &&
      m.result === "DEFEAT"
  ));

  console.log("PASS: Match history persistence");

  console.log("\nALL MULTIPLAYER CHECKS PASSED");
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    sockets.forEach(socket => socket.disconnect());
  });
