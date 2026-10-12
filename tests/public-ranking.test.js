import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  createPublicRankingHandler,
  publicRankingRows,
} from "../server/publicRanking.js";

const row = (uid, exp = 100) => ({
  uid,
  characterName: "훈련생",
  totalExp: exp,
  weeklyExp: exp / 2,
  weekStart: "2026-10-12",
  level: 2,
  calculatedOn: "2026-10-12",
  lastWorkout: "2026-10-12",
  totals: { pushups: exp, squats: 0, situps: 0, runningKm: 0 },
});

test("public leaderboard returns only display fields, preserving ties and today's activity", () => {
  const source = {
    ...row("one"),
    payload: "private account backup",
    email: "private@example.com",
    seed: "private seed",
    friendIds: ["private"],
    intensity: 5,
    totals: { ...row("one").totals, private: "secret" },
  };
  const label = {
    ...source,
    tag: "ST-ABCDEFGH",
    level: 3,
    streak: 2,
    activityDay: "2026-10-12",
    todayCounts: {
      pushups: 10,
      squats: 20,
      situps: 0,
      runningKm: 1,
      private: "secret",
    },
  };
  const result = publicRankingRows(
    [source, row("two"), row("three", 50)],
    [label],
    "all",
  );
  assert.deepEqual(
    result.map((item) => item.rank),
    [1, 1, 3],
  );
  assert.equal(result[0].level, 3);
  assert.equal(result[0].streak, 2);
  assert.equal(result[0].tag, "ST-ABCDEFGH");
  assert.deepEqual(result[0].todayCounts, {
    pushups: 10,
    squats: 20,
    situps: 0,
    runningKm: 1,
  });
  for (const value of [
    "private",
    "secret",
    "intensity",
    "payload",
    "email",
    "seed",
  ])
    assert.equal(JSON.stringify(result).includes(value), false, value);
  assert.deepEqual(result[1].todayCounts, {
    pushups: 0,
    squats: 0,
    situps: 0,
    runningKm: 0,
  });
  assert.equal(
    publicRankingRows(
      Array.from({ length: 60 }, (_, i) => row(String(i))),
      [],
      "all",
    ).length,
    50,
  );
  assert.deepEqual(
    publicRankingRows(
      [
        { ...row("one"), weeklyExp: 100 },
        { ...row("two"), weeklyExp: 50 },
      ],
      [],
      "week",
    ).map((item) => item.rank),
    [1, 2],
  );
});

async function invoke(request = {}, load = async () => [row("one")]) {
  const headers = {};
  const response = {
    setHeader: (name, value) => {
      headers[name] = value;
    },
    end(body) {
      this.body = JSON.parse(body);
    },
  };
  await createPublicRankingHandler(load)(
    { method: "GET", headers: {}, query: {}, ...request },
    response,
  );
  return { ...response, headers };
}

test("guest can read overall and weekly rankings with no authentication; unsupported queries cannot broaden access", async () => {
  const called = [];
  const load = async (period) => {
    called.push(period);
    return [row("one")];
  };
  const all = await invoke({}, load);
  assert.equal(all.statusCode, 200);
  assert.match(all.headers["Cache-Control"], /s-maxage=30/);
  assert.equal(
    (await invoke({ query: { period: "week" } }, load)).statusCode,
    200,
  );
  for (const period of ["friends", "../../accounts", ["all", "week"]])
    assert.equal((await invoke({ query: { period } }, load)).statusCode, 400);
  assert.equal((await invoke({ method: "POST" }, load)).statusCode, 405);
  assert.deepEqual(called, ["all", "week"]);
});

test("public failures return a generic non-cached error, never internal or credential data", async () => {
  const result = await invoke({}, async () => {
    throw new Error("private service credentials");
  });
  assert.equal(result.statusCode, 503);
  assert.equal(result.headers["Cache-Control"], "no-store");
  assert.equal(JSON.stringify(result.body).includes("credentials"), false);
});

test("public ranking API loads with Vercel's ESM runtime without opening an admin connection", () => {
  const result = spawnSync(
    process.execPath,
    [
      "--no-experimental-require-module",
      "--input-type=module",
      "-e",
      `await import(${JSON.stringify(new URL("../api/rankings.js", import.meta.url).href)})`,
    ],
    { encoding: "utf8", timeout: 15000 },
  );
  assert.equal(result.status, 0, result.stderr);
});
