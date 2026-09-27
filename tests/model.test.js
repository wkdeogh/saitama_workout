import test from "node:test";
import assert from "node:assert/strict";
import {
  initialData,
  upgradeDefaultGoals,
  saveRecord,
  stats,
  isComplete,
  parseBackup,
  validateData,
  mergeBackup,
  shiftDate,
  dateKey,
  parseDate,
  monthCells,
  stageIndex,
  progression,
  emptyCounts,
  recordExp,
  validateName,
} from "../src/model.js";
const today = "2026-09-27";
const legacyGoals = () => ({
  ...initialData(),
  goals: { pushups: 50, squats: 50, situps: 0, runningKm: 0 },
});
const record = (data, day, pushups = 50, squats = 50) =>
  saveRecord(data, day, { ...emptyCounts(), pushups, squats }, today);
test("defaults to 100 reps and 10km with no invented history", () => {
  assert.deepEqual(initialData().goals, {
    pushups: 100,
    squats: 100,
    situps: 100,
    runningKm: 10,
  });
  assert.equal(stats(initialData(), today).total, 0);
});
test("partial workout contributes actual reps without goal completion", () => {
  const d = record(initialData(), today, 20, 10);
  assert.equal(stats(d, today).total, 30);
  assert.equal(stats(d, today).completed, 0);
  assert.equal(stats(d, today).progressExp, 30);
});
test("editing replaces counts and never awards duplicate reps", () => {
  let d = record(initialData(), today);
  d = record(d, today);
  assert.equal(stats(d, today).total, 100);
  d = record(d, today, 10, 5);
  assert.equal(stats(d, today).total, 15);
  assert.equal(stats(d, today).completed, 0);
});
test("goal changes preserve historical completion and apply to new records", () => {
  let d = record(legacyGoals(), "2026-09-26");
  d = { ...d, goals: { ...d.goals, pushups: 100, squats: 100 } };
  d = record(d, today);
  assert.equal(isComplete(d.records["2026-09-26"]), true);
  assert.equal(isComplete(d.records[today]), false);
  d = record(d, "2026-09-26");
  assert.equal(d.records["2026-09-26"].goals.pushups, 50);
});
test("streak includes yesterday until today is completed", () => {
  let d = record(legacyGoals(), "2026-09-25");
  d = record(d, "2026-09-26");
  assert.equal(stats(d, today).streak, 2);
  d = record(d, today, 5, 0);
  assert.equal(stats(d, today).streak, 2);
  d = record(d, today);
  assert.equal(stats(d, today).streak, 3);
});
test("streak resets after missed day and zero counts do not count as exercise", () => {
  let d = record(legacyGoals(), "2026-09-25");
  d = record(d, today, 0, 0);
  assert.equal(stats(d, today).streak, 0);
  assert.equal(stats(d, today).days, 1);
});
test("growth thresholds unlock exactly at their boundaries", () => {
  for (const [at, i] of [
    [10, 1],
    [30, 2],
    [60, 3],
    [100, 4],
    [200, 5],
  ]) {
    assert.equal(stageIndex(at - 1), i - 1);
    assert.equal(stageIndex(at), i);
  }
});
test("backup roundtrip is lossless", () => {
  const d = record(initialData(), today, 73, 62);
  assert.deepEqual(
    parseBackup(JSON.stringify({ ...d, exportedAt: "ignored" }), today),
    d,
  );
});
test("backup merge preserves unrelated dates and replaces conflicts", () => {
  let d = record(legacyGoals(), "2026-09-25");
  d = record(d, today, 10, 20);
  const b = record(initialData(), today, 75, 80);
  const merged = mergeBackup(d, b);
  assert.equal(Object.keys(merged.records).length, 2);
  assert.equal(merged.records[today].pushups, 75);
  assert.equal(stats(merged, today).total, 255);
  assert.deepEqual(mergeBackup(d, b, true), b);
});
test("rejects invalid JSON, version, oversized files and structure", () => {
  for (const text of [
    "{",
    "null",
    "[]",
    JSON.stringify({ ...initialData(), version: 99 }),
    JSON.stringify({ ...initialData(), records: [] }),
    " ".repeat(2 * 1024 * 1024 + 1),
  ])
    assert.throws(() => parseBackup(text, today));
});
test("rejects invalid dates, future dates, negative, decimal, strings and unsafe counts", () => {
  for (const day of ["2026-02-30", "2026-09-28", "__proto__", "1999-12-31"])
    assert.throws(() => record(initialData(), day));
  for (const n of [-1, 1.5, "50", NaN, Infinity, 10001])
    assert.throws(() => record(initialData(), today, n, 0));
  for (const n of [0, -1, 2.2, 10001])
    assert.throws(() =>
      validateData(
        { ...initialData(), goals: { pushups: n, squats: 50 } },
        today,
      ),
    );
});
test("corrupted backup cannot introduce malicious keys or incomplete records", () => {
  assert.throws(() =>
    parseBackup(
      '{"version":1,"goals":{"pushups":50,"squats":50},"records":{"__proto__":{"pushups":1}}}',
      today,
    ),
  );
  assert.throws(() =>
    validateData(
      { ...initialData(), records: { [today]: { pushups: 2, squats: 3 } } },
      today,
    ),
  );
  assert.equal({}.pushups, undefined);
});
test("local calendar handles leap days and year boundaries", () => {
  assert.equal(shiftDate("2024-03-01", -1), "2024-02-29");
  assert.equal(shiftDate("2026-01-01", -1), "2025-12-31");
  assert.equal(dateKey(parseDate(today)), today);
  assert.equal(monthCells(2024, 1).filter(Boolean).length, 29);
  assert.equal(monthCells(2026, 1).filter(Boolean).length, 28);
  assert.equal(monthCells(2026, 8).filter(Boolean).length, 30);
});
test("deletion recalculates all rewards and stats", () => {
  let d = record(initialData(), today, 1000, 1000);
  assert.equal(stats(d, today).level, 21);
  delete d.records[today];
  assert.equal(stats(d, today).level, 1);
  assert.equal(stats(d, today).progressExp, 0);
  assert.equal(stats(d, today).total, 0);
});

const entry = (exp) => ({
  ...emptyCounts(),
  pushups: exp,
  goals: initialData().goals,
});
test("100 EXP per level, multiple levels per day and exact remainders", () => {
  for (const [exp, level, remainder] of [
    [0, 1, 0],
    [99, 1, 99],
    [100, 2, 0],
    [199, 2, 99],
    [250, 3, 50],
  ]) {
    const p = progression({ [today]: entry(exp) }, today);
    assert.equal(p.level, level);
    assert.equal(p.progressExp, remainder);
    assert.equal(p.expToNext, 100 - remainder);
  }
});
test("all four activities earn EXP, including exact tenths of a kilometer", () => {
  const d = saveRecord(
    initialData(),
    today,
    { pushups: 50, squats: 50, situps: 50, runningKm: 5 },
    today,
  );
  assert.equal(stats(d, today).total, 200);
  assert.equal(stats(d, today).level, 3);
  for (const [km, exp] of [
    [0.1, 1],
    [0.3, 3],
    [1.1, 11],
    [5, 50],
  ])
    assert.equal(recordExp({ ...emptyCounts(), runningKm: km }), exp);
  assert.equal(
    progression({ [today]: { ...emptyCounts(), runningKm: 10 } }, today).level,
    2,
  );
});
test("running validation allows tenths but rejects finer distances and malformed new fields", () => {
  for (const km of [-1, 0.01, 0.15, Infinity, NaN, "1", 1000.1])
    assert.throws(() =>
      saveRecord(
        initialData(),
        today,
        { ...emptyCounts(), runningKm: km },
        today,
      ),
    );
  for (const situps of [-1, 1.5, "50", 10001])
    assert.throws(() =>
      saveRecord(initialData(), today, { ...emptyCounts(), situps }, today),
    );
  assert.throws(() =>
    saveRecord(initialData(), today, { pushups: 50, squats: 50 }, today),
  );
});
test("legacy storage and JSON convert losslessly, preserving historical goal completion", () => {
  const legacy = {
    version: 1,
    goals: { pushups: 50, squats: 50 },
    records: {
      [today]: { pushups: 60, squats: 50, goals: { pushups: 50, squats: 50 } },
    },
  };
  const converted = parseBackup(JSON.stringify(legacy), today);
  assert.equal(converted.version, 2);
  assert.equal(converted.records[today].situps, 0);
  assert.equal(converted.records[today].runningKm, 0);
  assert.equal(isComplete(converted.records[today]), true);
  assert.equal(stats(converted, today).level, 2);
  assert.equal(stats(converted, today).progressExp, 10);
  assert.deepEqual(parseBackup(JSON.stringify(converted), today), converted);
  assert.deepEqual(legacy.records[today].goals, { pushups: 50, squats: 50 });
});
test("new optional goals do not change past completion and all four roundtrip", () => {
  let d = record(legacyGoals(), "2026-09-26");
  d.goals = { ...d.goals, situps: 50, runningKm: 5 };
  d = saveRecord(
    d,
    today,
    { pushups: 50, squats: 50, situps: 50, runningKm: 4.9 },
    today,
  );
  assert.equal(isComplete(d.records["2026-09-26"]), true);
  assert.equal(isComplete(d.records[today]), false);
  d = saveRecord(
    d,
    today,
    { pushups: 50, squats: 50, situps: 50, runningKm: 5 },
    today,
  );
  assert.equal(isComplete(d.records[today]), true);
  assert.deepEqual(parseBackup(JSON.stringify(d), today), d);
});
test("five consecutive missing days lose five levels; ten lose ten; floor is one", () => {
  const r = { "2026-09-01": entry(1550) };
  assert.equal(progression(r, "2026-09-05").level, 16);
  assert.equal(progression(r, "2026-09-06").level, 11);
  assert.equal(progression(r, "2026-09-11").level, 6);
  assert.equal(progression(r, "2026-09-16").level, 1);
  assert.equal(progression(r, "2026-09-16").progressExp, 50);
  assert.equal(progression(r, "2026-09-16").lostLevels, 15);
  assert.equal(progression(r, "2026-09-05").daysToDecay, 1);
  assert.equal(progression(r, "2026-09-06").daysToDecay, 5);
  assert.equal(progression({}, today).daysToDecay, null);
});
test("workout on fifth day cancels its uncompleted gap; sixth day retains penalty", () => {
  const r = { "2026-09-01": entry(1000), "2026-09-06": entry(1) };
  assert.equal(progression(r, "2026-09-06").level, 11);
  delete r["2026-09-06"];
  r["2026-09-07"] = entry(1);
  assert.equal(progression(r, "2026-09-07").level, 6);
  assert.equal(progression(r, "2026-09-07").progressExp, 1);
});
test("zero records do not reset inactivity; small workouts restart the window", () => {
  const r = { "2026-09-01": entry(1000), "2026-09-05": entry(0) };
  assert.equal(progression(r, "2026-09-06").level, 6);
  r["2026-09-05"] = { ...emptyCounts(), runningKm: 0.1 };
  assert.equal(progression(r, "2026-09-06").level, 11);
});
test("EXP accumulates across dates; editing, deleting and importing recompute deterministically", () => {
  let d = record(initialData(), "2026-09-25", 40, 0);
  d = record(d, today, 60, 0);
  assert.equal(stats(d, today).level, 2);
  d = record(d, today, 60, 0);
  assert.equal(stats(d, today).level, 2);
  d = record(d, today, 59, 0);
  assert.equal(stats(d, today).level, 1);
  assert.equal(stats(d, today).progressExp, 99);
  delete d.records[today];
  assert.equal(stats(d, today).progressExp, 40);
});
test("level caps at 1000 with no banked EXP and still decays", () => {
  const r = {};
  for (let i = 0; i < 11; i++) r[shiftDate("2026-09-01", i)] = entry(10000);
  assert.equal(progression(r, "2026-09-11").level, 1000);
  assert.equal(progression(r, "2026-09-11").progressExp, 0);
  assert.equal(progression(r, "2026-09-11").expToNext, 0);
  assert.equal(progression(r, "2026-09-16").level, 995);
  r["2026-09-17"] = entry(100);
  assert.equal(progression(r, "2026-09-17").level, 996);
});

test("character names survive saves and JSON roundtrips, with whitespace trimmed", () => {
  const d = record(
    { ...initialData(), characterName: "  우리 히어로  " },
    today,
  );
  const restored = parseBackup(JSON.stringify(d), today);
  assert.equal(restored.characterName, "우리 히어로");
  assert.equal(
    saveRecord(restored, today, { ...emptyCounts(), pushups: 100 }, today)
      .characterName,
    "우리 히어로",
  );
  assert.equal(stats(restored, today).total, 100);
});
test("older backups without names retain all workouts and request naming", () => {
  for (const version of [1, 2]) {
    const d = record(initialData(), today);
    delete d.characterName;
    d.version = version;
    const restored = parseBackup(JSON.stringify(d), today);
    assert.equal(restored.characterName, "");
    assert.equal(stats(restored, today).total, 100);
  }
});
test("backup merges keep the current name; replacement uses the backed-up name", () => {
  const current = { ...initialData(), characterName: "현재 이름" };
  const incoming = { ...initialData(), characterName: "백업 이름" };
  assert.equal(mergeBackup(current, incoming).characterName, "현재 이름");
  assert.equal(mergeBackup(current, incoming, true).characterName, "백업 이름");
  assert.equal(
    mergeBackup(current, initialData(), true).characterName,
    "현재 이름",
  );
  assert.equal(mergeBackup(initialData(), incoming).characterName, "백업 이름");
});
test("invalid names are rejected without discarding existing data", () => {
  for (const characterName of [null, 1, {}, "가".repeat(21), "이름\u0000오류"])
    assert.throws(() =>
      validateData({ ...initialData(), characterName }, today),
    );
  assert.equal(
    validateData({ ...initialData(), characterName: "가".repeat(20) }, today)
      .characterName.length,
    20,
  );
});

test("name entry requires nonblank text", () => {
  for (const name of ["", "   ", "\t"]) assert.throws(() => validateName(name));
  assert.equal(validateName("  사이타마  "), "사이타마");
});

test("new defaults do not replace existing personal or historical goals", () => {
  const existing = record(legacyGoals(), today);
  const restored = parseBackup(JSON.stringify(existing), today);
  assert.deepEqual(restored.goals, existing.goals);
  assert.deepEqual(restored.records[today].goals, existing.goals);
  assert.equal(isComplete(restored.records[today]), true);
  const fresh = saveRecord(
    initialData(),
    today,
    { pushups: 100, squats: 100, situps: 100, runningKm: 10 },
    today,
  );
  assert.equal(isComplete(fresh.records[today]), true);
  assert.equal(recordExp(fresh.records[today]), 400);
});

test("legacy defaults upgrade once while preserving workouts and previous dates", () => {
  let old = record(legacyGoals(), "2026-09-26");
  old = record(old, today);
  delete old.goalDefaultsVersion;
  const next = upgradeDefaultGoals(
    parseBackup(JSON.stringify(old), today),
    today,
  );
  assert.deepEqual(next.goals, initialData().goals);
  assert.deepEqual(next.records[today].goals, initialData().goals);
  assert.equal(next.records[today].pushups, 50);
  assert.deepEqual(next.records["2026-09-26"], old.records["2026-09-26"]);
  assert.equal(stats(next, today).total, stats(old, today).total);
  const custom = {
    ...next,
    goals: { pushups: 50, squats: 50, situps: 0, runningKm: 0 },
  };
  assert.deepEqual(
    upgradeDefaultGoals(parseBackup(JSON.stringify(custom), today), today),
    custom,
  );
});
test("legacy personal goals are not overwritten by default migration", () => {
  const old = {
    ...initialData(),
    goalDefaultsVersion: 0,
    goals: { pushups: 25, squats: 40, situps: 15, runningKm: 1 },
  };
  assert.deepEqual(upgradeDefaultGoals(old, today).goals, old.goals);
});
