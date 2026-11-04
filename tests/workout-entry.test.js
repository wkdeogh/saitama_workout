import test from "node:test";
import assert from "node:assert/strict";
import {
  initialData,
  emptyCounts,
  saveRecord,
  saveTodayRecord,
  deleteTodayRecord,
  validateData,
  DAILY_WORKOUT_LIMITS,
} from "../src/model.js";

const today = "2026-11-04";
const yesterday = "2026-11-03";

test("today's daily totals accept each limit and replace rather than accumulate", () => {
  const first = saveTodayRecord(
    initialData(),
    today,
    DAILY_WORKOUT_LIMITS,
    today,
  );
  const repeated = saveTodayRecord(first, today, DAILY_WORKOUT_LIMITS, today);
  assert.deepEqual(repeated.records[today], first.records[today]);
  const reduced = saveTodayRecord(
    first,
    today,
    { ...emptyCounts(), pushups: 25 },
    today,
  );
  assert.equal(reduced.records[today].pushups, 25);
  assert.equal(reduced.records[today].runningKm, 0);
  assert.equal(first.records[today].pushups, 300);
});

test("each exercise rejects the smallest amount above its daily input limit", () => {
  for (const [key, limit] of Object.entries(DAILY_WORKOUT_LIMITS)) {
    assert.throws(
      () =>
        saveTodayRecord(
          initialData(),
          today,
          { ...emptyCounts(), [key]: limit + (key === "runningKm" ? 0.1 : 1) },
          today,
        ),
      /하루 최대/,
    );
  }
});

test("today-only entry preserves number validation", () => {
  for (const invalid of [-1, 1.5, NaN, Infinity]) {
    assert.throws(() =>
      saveTodayRecord(
        initialData(),
        today,
        { ...emptyCounts(), pushups: invalid },
        today,
      ),
    );
  }
  assert.throws(() =>
    saveTodayRecord(
      initialData(),
      today,
      { ...emptyCounts(), runningKm: 0.01 },
      today,
    ),
  );
});

test("past and future entry/deletion are blocked, including after midnight", () => {
  const data = saveRecord(
    initialData(),
    yesterday,
    { ...emptyCounts(), pushups: 50 },
    today,
  );
  for (const day of [yesterday, "2026-11-05", "bad-date"]) {
    assert.throws(
      () => saveTodayRecord(data, day, emptyCounts(), today),
      /오늘 날짜/,
    );
    assert.throws(() => deleteTodayRecord(data, day, today), /오늘 날짜/);
  }
  assert.throws(
    () => saveTodayRecord(data, today, emptyCounts(), "2026-11-05"),
    /오늘 날짜/,
  );
  assert.throws(
    () => deleteTodayRecord(data, today, "2026-11-05"),
    /오늘 날짜/,
  );
  assert.equal(data.records[yesterday].pushups, 50);
});

test("legacy records above new input limits remain intact while today's record changes", () => {
  const legacy = saveRecord(
    initialData(),
    yesterday,
    { pushups: 1000, squats: 800, situps: 700, runningKm: 100 },
    today,
  );
  const loaded = validateData(JSON.parse(JSON.stringify(legacy)));
  assert.deepEqual(loaded, legacy);
  const saved = saveTodayRecord(loaded, today, DAILY_WORKOUT_LIMITS, today);
  const removed = deleteTodayRecord(saved, today, today);
  assert.deepEqual(saved.records[yesterday], legacy.records[yesterday]);
  assert.deepEqual(removed.records, legacy.records);
  assert.ok(saved.records[today]);
});
