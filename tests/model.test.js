import test from "node:test";
import assert from "node:assert/strict";
import {
  initialData,
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
} from "../src/model.js";
const today = "2026-09-27";
const record = (data, day, pushups = 50, squats = 50) =>
  saveRecord(data, day, { pushups, squats }, today);
test("defaults to 50 reps per exercise with no invented history", () => {
  assert.deepEqual(initialData().goals, { pushups: 50, squats: 50 });
  assert.equal(stats(initialData(), today).total, 0);
});
test("partial workout contributes actual reps without goal completion", () => {
  const d = record(initialData(), today, 20, 10);
  assert.equal(stats(d, today).total, 30);
  assert.equal(stats(d, today).completed, 0);
  assert.equal(stats(d, today).progressDays, 1);
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
  let d = record(initialData(), "2026-09-26");
  d = { ...d, goals: { pushups: 100, squats: 100 } };
  d = record(d, today);
  assert.equal(isComplete(d.records["2026-09-26"]), true);
  assert.equal(isComplete(d.records[today]), false);
  d = record(d, "2026-09-26");
  assert.equal(d.records["2026-09-26"].goals.pushups, 50);
});
test("streak includes yesterday until today is completed", () => {
  let d = record(initialData(), "2026-09-25");
  d = record(d, "2026-09-26");
  assert.equal(stats(d, today).streak, 2);
  d = record(d, today, 5, 0);
  assert.equal(stats(d, today).streak, 2);
  d = record(d, today);
  assert.equal(stats(d, today).streak, 3);
});
test("streak resets after missed day and zero counts do not count as exercise", () => {
  let d = record(initialData(), "2026-09-25");
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
  let d = record(initialData(), "2026-09-25");
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
    JSON.stringify({ ...initialData(), version: 2 }),
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
  assert.equal(stats(d, today).progressDays, 1);
  delete d.records[today];
  assert.equal(stats(d, today).level, 1);
  assert.equal(stats(d, today).progressDays, 0);
  assert.equal(stats(d, today).total, 0);
});

function history(count, start = "2020-01-01", spacing = 1) {
  const records = {};
  for (let i = 0; i < count; i++)
    records[shiftDate(start, i * spacing)] = {
      pushups: 1,
      squats: 0,
      goals: { pushups: 50, squats: 50 },
    };
  return records;
}
test("ten distinct workout days give exactly one level, regardless of counts", () => {
  const r = history(10);
  assert.equal(progression(r, "2020-01-09").level, 1);
  assert.equal(progression(r, "2020-01-09").progressDays, 9);
  assert.equal(progression(r, "2020-01-10").level, 2);
  assert.equal(progression(r, "2020-01-10").progressDays, 0);
  r["2020-01-10"].pushups = 10000;
  assert.equal(progression(r, "2020-01-10").level, 2);
});
test("nonconsecutive training accumulates and zero-count days do not count", () => {
  const r = history(10, "2020-01-01", 2);
  assert.equal(progression(r, "2020-01-19").level, 2);
  r["2020-01-20"] = { pushups: 0, squats: 0 };
  assert.equal(progression(r, "2020-01-20").progressDays, 0);
});
test("inactivity applies at 10 and 20 full missing days with a level 1 floor", () => {
  const r = history(30);
  assert.equal(progression(r, "2020-02-08").level, 4);
  assert.equal(progression(r, "2020-02-09").level, 3);
  assert.equal(progression(r, "2020-02-19").level, 2);
  assert.equal(progression(r, "2021-01-01").level, 1);
});
test("recording on the tenth day interrupts an incomplete inactivity window", () => {
  const r = history(20);
  r["2020-01-30"] = { pushups: 1, squats: 0 };
  assert.equal(progression(r, "2020-01-30").level, 3);
  assert.equal(progression(r, "2020-02-09").level, 2);
});
test("historical gaps decay before resumed exercise and preserve progress days", () => {
  const r = history(25);
  r["2020-02-05"] = { pushups: 1, squats: 0 };
  const p = progression(r, "2020-02-05");
  assert.equal(p.level, 2);
  assert.equal(p.progressDays, 6);
  assert.equal(p.lostLevels, 1);
});
test("level is capped at 200 without banking excess levels; decay still applies", () => {
  const r = history(2100);
  const last = shiftDate("2020-01-01", 2099);
  assert.equal(progression(r, last).level, 200);
  assert.equal(progression(r, shiftDate(last, 10)).level, 199);
});
test("import and deletion deterministically recalculate level and inactivity", () => {
  const r = history(20);
  const before = progression(r, "2020-01-20");
  delete r["2020-01-20"];
  assert.equal(before.level, 3);
  assert.equal(progression(r, "2020-01-20").level, 2);
  assert.equal(progression(r, "2020-01-20").progressDays, 9);
});
