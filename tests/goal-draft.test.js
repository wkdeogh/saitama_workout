import test from "node:test";
import assert from "node:assert/strict";
import {
  initialData,
  saveRecord,
  emptyCounts,
  updateGoalsFromDraft,
  stats,
} from "../src/model.js";
const today = "2026-11-04",
  yesterday = "2026-11-03";
const input = { pushups: "120", squats: "80", situps: "0", runningKm: "3.5" };
test("guide/settings goal drafts update today while preserving historical targets, counts and EXP", () => {
  let data = saveRecord(
    initialData(),
    yesterday,
    { ...emptyCounts(), pushups: 30 },
    today,
  );
  data = saveRecord(data, today, { ...emptyCounts(), pushups: 60 }, today);
  const before = JSON.parse(JSON.stringify(data));
  const result = updateGoalsFromDraft(data, input, today);
  assert.deepEqual(result.goals, {
    pushups: 120,
    squats: 80,
    situps: 0,
    runningKm: 3.5,
  });
  assert.deepEqual(result.records[today].goals, result.goals);
  assert.equal(result.records[today].pushups, 60);
  assert.deepEqual(result.records[yesterday], before.records[yesterday]);
  assert.equal(stats(result, today).total, stats(data, today).total);
  assert.deepEqual(data, before);
});
test("goal setup does not create a workout and accepts explicit optional zero goals", () => {
  const result = updateGoalsFromDraft(initialData(), input, today);
  assert.deepEqual(result.records, {});
  assert.equal(result.goals.situps, 0);
  const changed = updateGoalsFromDraft(
    result,
    { ...input, runningKm: "0" },
    today,
  );
  assert.equal(changed.goals.runningKm, 0);
});
test("empty or missing input cannot silently overwrite an optional goal with zero", () => {
  for (const value of ["", " ", null, undefined, false, {}]) {
    assert.throws(
      () =>
        updateGoalsFromDraft(
          initialData(),
          { ...input, runningKm: value },
          today,
        ),
      /모든 운동 목표/,
    );
  }
});
test("goal drafts retain central minimum, maximum, finite-number and increment validation", () => {
  for (const [key, value] of [
    ["pushups", "0"],
    ["squats", "-1"],
    ["pushups", "1.5"],
    ["pushups", "301"],
    ["runningKm", "60.1"],
    ["runningKm", "0.01"],
    ["runningKm", "Infinity"],
    ["squats", "abc"],
  ]) {
    assert.throws(
      () => updateGoalsFromDraft(initialData(), { ...input, [key]: value }, today),
      key === "runningKm" ? /0~60/ : /1~300/,
    );
  }
});

test("existing high targets load unchanged while new targets follow daily recording limits", () => {
  const legacy = {
    ...initialData(),
    goals: { pushups: 500, squats: 500, situps: 500, runningKm: 100 },
  };
  const original = JSON.parse(JSON.stringify(legacy));
  assert.throws(
    () => updateGoalsFromDraft(legacy, legacy.goals, today),
    /1~300/,
  );
  const result = updateGoalsFromDraft(
    legacy,
    { pushups: "300", squats: "300", situps: "300", runningKm: "60" },
    today,
  );
  assert.deepEqual(result.goals, {
    pushups: 300,
    squats: 300,
    situps: 300,
    runningKm: 60,
  });
  assert.deepEqual(legacy, original);
});
