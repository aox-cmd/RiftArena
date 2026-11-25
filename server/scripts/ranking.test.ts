import { test } from "node:test";
import assert from "node:assert/strict";

import {
  calculateRating,
  getRank
} from "../src/game/ranking/elo.js";

test("Equal rating victory", () => {
  assert.equal(calculateRating(1000, 1000, 1), 1016);
});

test("Equal rating defeat", () => {
  assert.equal(calculateRating(1000, 1000, 0), 984);
});

test("Equal rating draw", () => {
  assert.equal(calculateRating(1000, 1000, 0.5), 1000);
});

test("Underdog victory rewards more points", () => {
  assert.ok(calculateRating(1000, 1500, 1) > 1016);
});

test("Rating cannot become negative", () => {
  assert.equal(calculateRating(0, 0, 0), 0);
});

test("Rank thresholds", () => {
  assert.equal(getRank(899), "Bronze");
  assert.equal(getRank(1000), "Silver");
  assert.equal(getRank(1100), "Gold");
  assert.equal(getRank(1300), "Platinum");
  assert.equal(getRank(1500), "Diamond");
  assert.equal(getRank(1800), "Master");
  assert.equal(getRank(2100), "Legend");
});
