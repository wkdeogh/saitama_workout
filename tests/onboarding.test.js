import test from "node:test";
import assert from "node:assert/strict";
import { claimOnboarding, swipePage } from "../src/onboardingModel.js";

test("guide opens once per account, persists across reloads and does not use workout data", () => {
  const values = new Map([["workout", "unchanged"]]);
  const storage = {
    getItem: (key) => values.get(key),
    setItem: (key, value) => values.set(key, value),
  };
  const session = new Set();
  assert.equal(claimOnboarding(null, storage, session), false);
  assert.equal(claimOnboarding("first", storage, session), true);
  assert.equal(claimOnboarding("first", storage, session), false);
  assert.equal(claimOnboarding("first", storage, new Set()), false);
  assert.equal(claimOnboarding("second", storage, session), true);
  assert.equal(values.get("workout"), "unchanged");
});
test("restricted storage does not prevent closing the guide or cause a reopen loop", () => {
  for (const storage of [
    undefined,
    {
      getItem() {
        throw new Error("blocked");
      },
    },
    {
      getItem: () => null,
      setItem() {
        throw new Error("full");
      },
    },
  ]) {
    const session = new Set();
    assert.equal(claimOnboarding("user", storage, session), true);
    assert.equal(claimOnboarding("user", storage, session), false);
  }
});
test("horizontal swipes change pages, while taps, vertical scrolls and cancelled swipes do not", () => {
  const start = { x: 100, y: 100 };
  assert.equal(swipePage(start, { x: 20, y: 110 }), 1);
  assert.equal(swipePage(start, { x: 180, y: 110 }), -1);
  assert.equal(swipePage(start, { x: 90, y: 110 }), 0);
  assert.equal(swipePage(start, { x: 20, y: 200 }), 0);
  assert.equal(swipePage(null, { x: 20, y: 110 }), 0);
});
