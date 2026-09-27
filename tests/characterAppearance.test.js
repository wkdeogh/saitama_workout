import test from "node:test";
import assert from "node:assert/strict";
import {
  characterAppearance,
  VISUAL_UNLOCKS,
} from "../src/characterAppearance.js";

test("level 1 is short, skinny and has no muscle definition or effects", () => {
  const p = characterAppearance(1);
  assert.equal(p.height, 0.64);
  assert.equal(p.arm, 0.055);
  for (const key of ["chest", "abs", "back", "rings"]) assert.equal(p[key], 0);
  for (const key of ["aura", "eyes", "lightning", "fists", "awakened"])
    assert.equal(p[key], false);
});
test("every one of the 200 levels has monotonically growing finite proportions", () => {
  let previous = characterAppearance(1);
  for (let level = 2; level <= 200; level++) {
    const p = characterAppearance(level);
    for (const key of ["height", "shoulder", "waist", "arm"]) {
      assert.ok(Number.isFinite(p[key]));
      assert.ok(p[key] > previous[key], `${key} must grow at level ${level}`);
    }
    assert.ok(p.height <= 1);
    assert.ok(p.shoulder > p.waist);
    previous = p;
  }
  assert.equal(previous.height, 1);
  assert.ok(previous.arm > characterAppearance(1).arm * 4);
});
test("effects unlock at their documented thresholds and rings build to three", () => {
  for (const [key, threshold] of [
    ["aura", 60],
    ["eyes", 100],
    ["lightning", 120],
    ["fists", 150],
    ["awakened", 200],
  ]) {
    assert.equal(characterAppearance(threshold - 1)[key], false);
    assert.equal(characterAppearance(threshold)[key], true);
  }
  for (const [level, rings] of [
    [79, 0],
    [80, 1],
    [174, 1],
    [175, 2],
    [199, 2],
    [200, 3],
  ])
    assert.equal(characterAppearance(level).rings, rings);
});
test("unlock previews always show a future reward and end at maximum level", () => {
  for (let level = 1; level < 200; level++) {
    const next = characterAppearance(level).nextUnlock;
    assert.ok(next.level > level);
    assert.ok(VISUAL_UNLOCKS.includes(next));
  }
  assert.equal(characterAppearance(200).nextUnlock, null);
  assert.equal(characterAppearance(59).nextUnlock.level, 60);
  assert.equal(characterAppearance(60).nextUnlock.level, 80);
});
test("appearance stays bounded for malformed preview values", () => {
  for (const input of [undefined, NaN, -3, 0, "wrong"])
    assert.equal(characterAppearance(input).level, 1);
  assert.equal(characterAppearance(201).level, 200);
  assert.equal(characterAppearance(150.9).level, 150);
});
