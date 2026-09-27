import test from "node:test";
import assert from "node:assert/strict";
import { initialData, saveRecord, emptyCounts } from "../src/model.js";
import {
  weekStart,
  koreaDay,
  rankingSummary,
  displayedLevel,
  mergeChanges,
  rankedEntries,
  needsAccountSync,
} from "../src/cloud/rankingModel.js";
const day = "2026-09-27";
const add = (d, date, counts) =>
  saveRecord(d, date, { ...emptyCounts(), ...counts }, day);
test("ranking week uses Monday in Korea and crosses years correctly", () => {
  assert.equal(weekStart("2026-09-27"), "2026-09-21");
  assert.equal(weekStart("2026-09-28"), "2026-09-28");
  assert.equal(weekStart("2027-01-01"), "2026-12-28");
  assert.equal(koreaDay(new Date("2026-09-27T15:00:00Z")), "2026-09-28");
});
test("weekly EXP excludes previous weeks; lifetime exercise totals include them", () => {
  let d = add(initialData(), "2026-09-20", { pushups: 100 });
  d = add(d, "2026-09-21", { squats: 50, situps: 25, runningKm: 2.5 });
  const summary = rankingSummary(d, day);
  assert.equal(summary.totalExp, 200);
  assert.equal(summary.weeklyExp, 100);
  assert.deepEqual(summary.totals, {
    pushups: 100,
    squats: 50,
    situps: 25,
    runningKm: 2.5,
  });
  assert.equal(rankingSummary(d, "2026-09-28").weeklyExp, 0);
});
test("cached leaderboard levels apply missed-day decay without requiring a login", () => {
  const e = {
    level: 20,
    lastWorkout: "2026-09-01",
    calculatedOn: "2026-09-05",
  };
  assert.equal(displayedLevel(e, "2026-09-05"), 20);
  assert.equal(displayedLevel(e, "2026-09-06"), 15);
  assert.equal(
    displayedLevel(
      { ...e, level: 15, calculatedOn: "2026-09-06" },
      "2026-09-11",
    ),
    10,
  );
  assert.equal(displayedLevel(e, "2026-10-01"), 1);
});
test("three-way sync keeps concurrent edits to different days", () => {
  const base = initialData(),
    local = add(base, "2026-09-26", { pushups: 50 }),
    remote = add(base, day, { squats: 50 });
  const merged = mergeChanges(base, local, remote);
  assert.equal(merged.records["2026-09-26"].pushups, 50);
  assert.equal(merged.records[day].squats, 50);
});
test("sync preserves deletions, keeps remote changes and resolves same-day conflict to local edit", () => {
  const base = add(initialData(), "2026-09-26", { pushups: 50 });
  const local = structuredClone(base);
  delete local.records["2026-09-26"];
  const remote = add(base, day, { situps: 50 });
  remote.characterName = "다른 기기";
  const merged = mergeChanges(base, local, remote);
  assert.equal(merged.records["2026-09-26"], undefined);
  assert.equal(merged.records[day].situps, 50);
  assert.equal(merged.characterName, "다른 기기");
  const changed = add(base, "2026-09-26", { pushups: 25 });
  assert.equal(
    mergeChanges(base, changed, add(base, "2026-09-26", { pushups: 75 }))
      .records["2026-09-26"].pushups,
    25,
  );
});
test("repeat synchronization never doubles EXP and preserves incoming changes after flight", () => {
  const base = initialData(),
    local = add(base, day, { pushups: 100 });
  const merged = mergeChanges(base, local, local);
  assert.equal(rankingSummary(merged, day).totalExp, 100);
  const edit = add(local, day, { pushups: 150 });
  assert.equal(mergeChanges(local, edit, merged).records[day].pushups, 150);
});
test("rankings use competition ranks for tied EXP", () => {
  assert.deepEqual(
    rankedEntries(
      [{ totalExp: 100 }, { totalExp: 100 }, { totalExp: 50 }],
      "totalExp",
    ).map((e) => e.rank),
    [1, 1, 3],
  );
});

test("automatic ranking registers existing opt-outs without changing workouts", () => {
  const data = { ...initialData(), characterName: "기존회원" };
  assert.equal(
    needsAccountSync({ data, base: data, participating: false }),
    true,
  );
  assert.equal(
    needsAccountSync({
      data,
      base: data,
      participating: true,
      needsPublication: true,
    }),
    true,
  );
  assert.equal(
    needsAccountSync({
      data,
      base: data,
      participating: true,
      needsPublication: false,
    }),
    false,
  );
  assert.equal(
    needsAccountSync({
      data: initialData(),
      base: initialData(),
      participating: false,
    }),
    false,
  );
});
