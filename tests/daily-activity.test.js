import test from "node:test";
import assert from "node:assert/strict";
import { initialData, saveRecord, emptyCounts } from "../src/model.js";
import {
  dailyActivity,
  displayedDailyActivity,
  dailyExpColor,
} from "../src/cloud/dailyActivity.js";
import { koreaDay, rankingSummary } from "../src/cloud/rankingModel.js";
const today = "2026-09-29";
test("today's activity includes four exercises and double running EXP, excluding past records", () => {
  let data = saveRecord(
    initialData(),
    "2026-09-28",
    { pushups: 100, squats: 100, situps: 100, runningKm: 10 },
    today,
  );
  data = saveRecord(
    data,
    today,
    { pushups: 30, squats: 40, situps: 10, runningKm: 2 },
    today,
  );
  const before = JSON.stringify(data);
  assert.deepEqual(dailyActivity(data, today), {
    activityDay: today,
    todayExp: 120,
    todayCounts: { pushups: 30, squats: 40, situps: 10, runningKm: 2 },
  });
  assert.equal(JSON.stringify(data), before);
  assert.equal(rankingSummary(data, today).totalExp, 620);
});
test("today's edits replace values and deletion removes gains", () => {
  let data = saveRecord(
    initialData(),
    today,
    { ...emptyCounts(), runningKm: 0.3 },
    today,
  );
  assert.equal(dailyActivity(data, today).todayExp, 6);
  data = saveRecord(data, today, { ...emptyCounts(), runningKm: 0.1 }, today);
  assert.equal(dailyActivity(data, today).todayExp, 2);
  delete data.records[today];
  assert.equal(dailyActivity(data, today).todayExp, 0);
});
test("KST midnight resets stale daily values without removing totals", () => {
  const before = koreaDay(new Date("2026-09-29T14:59:59Z")),
    after = koreaDay(new Date("2026-09-29T15:00:00Z"));
  const entry = {
    ...dailyActivity(
      saveRecord(
        initialData(),
        today,
        { ...emptyCounts(), pushups: 150 },
        today,
      ),
      today,
    ),
    totalExp: 999,
  };
  assert.equal(displayedDailyActivity(entry, before).todayExp, 150);
  assert.deepEqual(displayedDailyActivity(entry, after), {
    todayExp: 0,
    todayCounts: emptyCounts(),
  });
  assert.equal(entry.totalExp, 999);
  assert.equal(displayedDailyActivity({}, today).todayExp, 0);
});
test("each 100 EXP boundary changes colour, starting with grey", () => {
  assert.equal(dailyExpColor(0), "#666666");
  assert.equal(dailyExpColor(99), "#666666");
  for (let n = 100; n <= 50000; n += 100) {
    assert.notEqual(dailyExpColor(n), dailyExpColor(n - 1));
    assert.equal(dailyExpColor(n), dailyExpColor(n + 99));
  }
});
