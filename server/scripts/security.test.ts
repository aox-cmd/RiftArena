import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const BASE = "http://localhost:4000/api";

let passed = 0;

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

  const text = await response.text();

  let data: any = null;

  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  return {
    status: response.status,
    data
  };
}

function pass(message: string) {
  passed++;
  console.log(`PASS: ${message}`);
}

async function register() {
  const id = randomUUID().replaceAll("-", "").slice(0, 12);

  const result = await request(
    "/auth/register",
    "POST",
    {
      username: `test_${id}`,
      email: `${id}@example.com`,
      password: "SecurityTest123!"
    }
  );

  assert.equal(result.status, 201);

  return result.data;
}

async function main() {
  const health = await request("/health");

  assert.equal(health.status, 200);
  pass("Backend health endpoint");

  const playerA = await register();
  const playerB = await register();

  assert.ok(playerA.token);
  assert.ok(playerB.token);

  pass("Two isolated test accounts created");

  const noToken = await request("/decks");

  assert.equal(noToken.status, 401);
  pass("Unauthenticated deck access rejected");

  const invalidToken = await request(
    "/decks", "GET", undefined, "fake-token"
  );

  assert.equal(invalidToken.status, 401);
  pass("Invalid JWT rejected");

  const badLogin = await request(
    "/auth/login",
    "POST",
    {
      email: playerA.user.email,
      password: "IncorrectPassword123!"
    }
  );

  assert.equal(badLogin.status, 401);
  pass("Incorrect password rejected");

  const duplicate = await request(
    "/decks",
    "POST",
    {
      name: "Invalid Formation",
      characterIds: ["vex", "vex", "kael"]
    },
    playerA.token
  );

  assert.equal(duplicate.status, 400);
  pass("Duplicate characters rejected");

  const fakeCharacter = await request(
    "/decks",
    "POST",
    {
      name: "Invalid Formation",
      characterIds: ["vex", "kael", "fake-hero"]
    },
    playerA.token
  );

  assert.equal(fakeCharacter.status, 403);
  pass("Unowned characters rejected");

  const deck = await request(
    "/decks",
    "POST",
    {
      name: "Security Test Formation",
      characterIds: ["vex", "lyra", "kael"]
    },
    playerA.token
  );

  assert.equal(deck.status, 201);
  assert.ok(deck.data.id);
  pass("Valid deck creation");

  const stolenDeck = await request(
    `/decks/${deck.data.id}/activate`,
    "PATCH",
    undefined,
    playerB.token
  );

  assert.equal(stolenDeck.status, 404);
  pass("Cross-account deck activation rejected");

  const stolenDelete = await request(
    `/decks/${deck.data.id}`,
    "DELETE",
    undefined,
    playerB.token
  );

  assert.equal(stolenDelete.status, 404);
  pass("Cross-account deck deletion rejected");

  const leaderboard = await request(
    "/ranking/leaderboard"
  );

  assert.equal(leaderboard.status, 200);
  assert.ok(Array.isArray(leaderboard.data));

  for (const player of leaderboard.data) {
    assert.equal("passwordHash" in player, false);
    assert.equal("email" in player, false);
  }

  pass("Leaderboard exposes no private credentials");

  const history = await request(
    "/ranking/history"
  );

  assert.equal(history.status, 401);
  pass("Private match history requires authentication");

  console.log(`\n${passed} SECURITY CHECKS PASSED`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
