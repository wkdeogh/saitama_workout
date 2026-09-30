import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyCounts,
  shiftDate,
  recordExp,
  daysBetween,
} from "../src/model.js";
import {
  advanceVirtual,
  plannedWorkout,
  nextVirtualWorkoutDay,
  validateTrainingIntensity,
  validatePreferredExercises,
  publicVirtual,
  dueDay,
  isAdministrator,
  validateVirtualEdit,
} from "../server/virtualModel.js";
import { createVirtualCron } from "../server/virtualCron.js";
import { createFriendsHandler } from "../server/friendsHandler.js";
const bot = () => ({
  uid: "virtual-test",
  name: "고구마똥",
  tag: "ST-ABCDEFGH",
  seed: "repeatable",
  createdDay: "2026-09-01",
  processedThrough: "2026-08-31",
  calculatedOn: "2026-09-01",
  lastWorkout: "2026-09-01",
  activityDay: "2026-09-01",
  totals: emptyCounts(),
  todayCounts: emptyCounts(),
  totalExp: 0,
  weeklyExp: 0,
  weekStart: "2026-08-31",
  level: 1,
  progressExp: 0,
  enabled: true,
});
test("all five intensities respect interval and EXP ranges across seeds and daily/catch-up runs", () => {
  const ranges = [
    [10, 30, 100],
    [7, 50, 120],
    [4, 80, 150],
    [2, 100, 200],
    [1, 100, 400],
  ];
  for (const [index, [maxGap, minExp, maxExp]] of ranges.entries()) {
    const gaps = new Set(),
      amounts = new Set();
    for (let seed = 0; seed < 8; seed++) {
      const original = { ...bot(), intensity: index + 1, seed: `seed-${seed}` };
      let daily = original,
        previous = original.processedThrough;
      for (let i = 0; i < 180; i++) {
        const day = shiftDate(original.createdDay, i);
        daily = advanceVirtual(daily, day);
        const exp = recordExp(daily.todayCounts);
        if (exp) {
          const gap = daysBetween(previous, day);
          assert.ok(gap >= 1 && gap <= maxGap);
          assert.ok(exp >= minExp && exp <= maxExp);
          assert.equal(exp % 10, 0);
          assert.ok(
            daily.todayCounts.pushups > 0 || daily.todayCounts.squats > 0,
          );
          previous = day;
          gaps.add(gap);
          amounts.add(exp);
        } else {
          assert.ok(daysBetween(previous, day) < maxGap);
        }
      }
      assert.deepEqual(advanceVirtual(original, daily.processedThrough), daily);
      assert.deepEqual(advanceVirtual(daily, daily.processedThrough), daily);
      assert.equal(daily.totalExp, recordExp(daily.totals));
    }
    assert.equal(Math.min(...gaps), 1);
    assert.equal(Math.max(...gaps), maxGap);
    assert.equal(Math.min(...amounts), minExp);
    assert.equal(Math.max(...amounts), maxExp);
  }
});
test("legacy bots default to stage three and paused schedules never bank missed workouts", () => {
  const original = { ...bot(), level: 50, intensity: 5, enabled: false };
  const paused = advanceVirtual(original, "2026-09-20");
  assert.equal(paused.totalExp, 0);
  const resumed = advanceVirtual({ ...paused, enabled: true }, "2026-09-21");
  assert.equal(
    resumed.totalExp,
    recordExp(plannedWorkout(resumed, "2026-09-21")),
  );
  assert.equal(resumed.nextWorkoutDay, "2026-09-22");
  const legacy = advanceVirtual(bot(), "2026-09-30");
  assert.equal(legacy.intensity, 3);
  assert.deepEqual(
    legacy,
    advanceVirtual({ ...bot(), intensity: 3 }, "2026-09-30"),
  );
  for (const value of [0, 6, 1.5, "3", null, NaN])
    assert.throws(() => validateTrainingIntensity(value), /1~5/);
  assert.equal(validateTrainingIntensity(), 3);
  assert.equal(
    nextVirtualWorkoutDay({ ...bot(), intensity: 5 }, "2026-09-30"),
    "2026-10-01",
  );
});
test("catch-up and daily runs agree, retries never duplicate EXP, and input is not mutated", () => {
  const original = bot();
  let daily = bot();
  for (let i = 0; i < 30; i++)
    daily = advanceVirtual(daily, shiftDate("2026-09-01", i));
  assert.deepEqual(advanceVirtual(original, "2026-09-30"), daily);
  assert.deepEqual(advanceVirtual(daily, "2026-09-30"), daily);
  assert.equal(original.totalExp, 0);
  assert.equal(daily.totalExp, recordExp(daily.totals));
  assert.equal(daily.level, 1 + Math.floor(daily.totalExp / 100));
  assert.equal(daily.progressExp, daily.totalExp % 100);
});
test("paused virtual trainees decay daily after grace and never accumulate workouts", () => {
  const initial = {
    ...bot(),
    enabled: false,
    level: 30,
    processedThrough: "2026-09-01",
  };
  assert.equal(advanceVirtual(initial, "2026-09-05").level, 30);
  assert.equal(advanceVirtual(initial, "2026-09-06").level, 29);
  assert.equal(advanceVirtual(initial, "2026-09-08").level, 27);
  assert.equal(advanceVirtual(initial, "2026-09-30").totalExp, 0);
  assert.equal(advanceVirtual(initial, "2026-10-10").level, 1);
});
test("virtual schedule uses KST 21:00 and public views reset today/week without leaking settings", () => {
  assert.equal(dueDay(new Date("2026-09-29T11:59:59Z")), "2026-09-28");
  assert.equal(dueDay(new Date("2026-09-29T12:00:00Z")), "2026-09-29");
  const progressed = advanceVirtual(bot(), "2026-09-27");
  const view = publicVirtual(progressed, "2026-09-28");
  assert.equal(view.todayExp, 0);
  assert.equal(view.weeklyExp, 0);
  assert.equal(view.seed, undefined);
  assert.equal(view.enabled, undefined);
  assert.equal(view.intensity, undefined);
  assert.equal(view.preferredExercises, undefined);
  assert.equal(view.nextWorkoutDay, undefined);
});
test("verified owner can administer using Google or linked Kakao; forged identities are denied", () => {
  const owner = {
    uid: "owner",
    email: "wkdeoghq@gmail.com",
    emailVerified: true,
    disabled: false,
    providerData: [{ providerId: "google.com", email: "wkdeoghq@gmail.com" }],
  };
  const claims = { uid: "owner", firebase: { sign_in_provider: "google.com" } };
  const kakao = {
    uid: "owner",
    firebase: { sign_in_provider: "custom" },
    kakao: true,
  };
  assert.equal(isAdministrator(claims, owner), true);
  assert.equal(isAdministrator(kakao, owner), true);
  for (const invalid of [
    {
      ...kakao,
      uid: "other",
      email: "wkdeoghq@gmail.com",
      email_verified: true,
    },
    { ...kakao, kakao: false },
    { ...claims, firebase: { sign_in_provider: "anonymous" } },
  ])
    assert.equal(isAdministrator(invalid, owner), false);
  for (const change of [
    { email: "friend@gmail.com" },
    { emailVerified: false },
    { disabled: true },
    { providerData: [] },
  ])
    assert.equal(isAdministrator(claims, { ...owner, ...change }), false);
  assert.equal(isAdministrator(claims), false);
  const valid = {
    totals: emptyCounts(),
    totalExp: 100,
    level: 15,
    enabled: false,
  };
  assert.equal(validateVirtualEdit(valid, bot()).level, 1);
  for (const change of [
    { totals: { ...emptyCounts(), pushups: -1 } },
    { enabled: "true" },
    { intensity: 6 },
    { intensity: null },
    { totals: { ...emptyCounts(), runningKm: 0.01 } },
    { totals: { ...emptyCounts(), pushups: "100" } },
  ])
    assert.throws(() => validateVirtualEdit({ ...valid, ...change }, bot()));
});
test("admin endpoints reject forged body ownership before calling virtual service", async () => {
  let called = 0;
  for (const action of [
    "admin-list",
    "admin-seed",
    "admin-update",
    "admin-create",
    "admin-delete",
  ]) {
    const handler = createFriendsHandler({
      verify: async () => ({
        uid: "friend",
        email: "friend@gmail.com",
        email_verified: true,
        firebase: { sign_in_provider: "google.com" },
      }),
      service: () => ({}),
      virtual: () => {
        called++;
        return {};
      },
    });
    const res = {
      setHeader() {},
      end(body) {
        this.body = JSON.parse(body);
      },
    };
    await handler(
      {
        method: "POST",
        headers: {
          origin: "https://saitama-workout.vercel.app",
          authorization: "Bearer valid",
        },
        query: { action },
        body: { email: "wkdeoghq@gmail.com", uid: "admin" },
      },
      res,
    );
    assert.equal(res.statusCode, 403);
  }
  assert.equal(called, 0);
});
test("cron fails closed without secret or with wrong authentication; retries delegate safely", async () => {
  let called = 0;
  for (const [secret, authorization, status] of [
    [undefined, undefined, 401],
    ["abc", "Bearer wrong", 401],
    ["abc", "Bearer abc", 200],
  ]) {
    const handler = createVirtualCron({
      secret: () => secret,
      run: async () => {
        called++;
        return { ok: true };
      },
    });
    const res = { setHeader() {}, end() {} };
    await handler({ method: "GET", headers: { authorization } }, res);
    assert.equal(res.statusCode, status);
  }
  assert.equal(called, 1);
});

test("admin status and editing use the same server identity resolver for linked Kakao", async () => {
  const claims = {
    uid: "owner",
    firebase: { sign_in_provider: "custom" },
    kakao: true,
  };
  let calls = 0;
  const handler = createFriendsHandler({
    verify: async () => claims,
    administrator: async (token) => token.uid === "owner",
    service: () => ({}),
    virtual: () => ({
      list: async () => {
        calls++;
        return [];
      },
    }),
  });
  for (const action of ["admin-status", "admin-list"]) {
    const res = {
      setHeader() {},
      end(body) {
        this.body = JSON.parse(body);
      },
    };
    await handler(
      {
        method: "POST",
        headers: {
          origin: "https://saitama-workout.vercel.app",
          authorization: "Bearer valid",
        },
        query: { action },
        body: {},
      },
      res,
    );
    assert.equal(res.statusCode, 200);
    if (action === "admin-status") assert.equal(res.body.allowed, true);
  }
  assert.equal(calls, 1);
});

test("admin creation uses verified actor and forwards creation input", async () => {
  const values = { name: "새 훈련생", requestId: "request" };
  const handler = createFriendsHandler({
    verify: async () => ({
      uid: "owner",
      firebase: { sign_in_provider: "google.com" },
    }),
    administrator: async () => true,
    service: () => ({}),
    virtual: () => ({
      create: async (actor, input) => {
        assert.equal(actor, "owner");
        assert.deepEqual(input, values);
        return [{ characterName: input.name }];
      },
    }),
  });
  const res = {
    setHeader() {},
    end(body) {
      this.body = JSON.parse(body);
    },
  };
  await handler(
    {
      method: "POST",
      headers: {
        origin: "https://saitama-workout.vercel.app",
        authorization: "Bearer valid",
      },
      query: { action: "admin-create" },
      body: { uid: "forged", values },
    },
    res,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body[0].characterName, values.name);
});

test("every preference combination keeps favored exercises dominant with occasional variety and exact EXP", () => {
  const keys = Object.keys(emptyCounts());
  for (let mask = 1; mask < 16; mask++) {
    const preferences = keys.filter((_, index) => mask & (1 << index));
    let total = 0,
      favored = 0,
      mixedDays = 0;
    const seen = new Set();
    for (let i = 0; i < 360; i++) {
      const source = {
        ...bot(),
        preferredExercises: preferences,
        intensity: 1 + (i % 5),
      };
      const day = shiftDate(source.createdDay, i);
      const counts = plannedWorkout(source, day);
      assert.deepEqual(counts, plannedWorkout(source, day));
      assert.equal(
        recordExp(counts),
        recordExp(plannedWorkout({ ...source, preferredExercises: keys }, day)),
      );
      const preferredCounts = emptyCounts();
      for (const key of keys) {
        if (preferences.includes(key)) preferredCounts[key] = counts[key];
        if (counts[key]) seen.add(key);
        assert.ok(counts[key] >= 0);
        assert.equal((counts[key] * (key === "runningKm" ? 10 : 1)) % 1, 0);
      }
      const exp = recordExp(counts),
        preferredExp = recordExp(preferredCounts);
      assert.ok(preferredExp > exp / 2);
      total += exp;
      favored += preferredExp;
      if (keys.some((key) => !preferences.includes(key) && counts[key] > 0))
        mixedDays++;
    }
    assert.equal(seen.size, 4);
    assert.ok(favored / total > 0.85);
    if (preferences.length < 4) {
      assert.ok(mixedDays > 0 && mixedDays < 180);
      assert.ok(favored < total);
    }
  }
  for (const invalid of [
    [],
    null,
    "pushups",
    ["yoga"],
    ["pushups", "pushups"],
    ["__proto__"],
  ])
    assert.throws(() => validatePreferredExercises(invalid), /선호 운동/);
  assert.deepEqual(validatePreferredExercises(), ["pushups", "squats"]);
});

test("lower totals recalculate EXP and level, clamp daily counts, and ignore forged derived fields", () => {
  const source = {
    ...bot(),
    totals: { pushups: 100, squats: 100, situps: 0, runningKm: 2 },
    todayCounts: { pushups: 60, squats: 40, situps: 0, runningKm: 1 },
    totalExp: 240,
    level: 3,
  };
  const edited = validateVirtualEdit(
    {
      ...source,
      totals: { pushups: 20, squats: 0, situps: 5, runningKm: 0.1 },
      totalExp: -100,
      level: 999,
    },
    source,
  );
  assert.equal(edited.totalExp, 27);
  assert.equal(edited.level, 1);
  assert.deepEqual(edited.todayCounts, {
    pushups: 0,
    squats: 0,
    situps: 5,
    runningKm: 0,
  });
  const zero = validateVirtualEdit(
    { ...source, totals: emptyCounts() },
    source,
  );
  assert.equal(zero.totalExp, 0);
  assert.equal(zero.level, 1);
  assert.deepEqual(zero.todayCounts, emptyCounts());
  const increased = validateVirtualEdit(
    { ...source, totals: { ...source.totals, pushups: 200 } },
    source,
  );
  assert.equal(increased.totalExp, 340);
  assert.equal(increased.level, 4);
  assert.equal(increased.todayCounts.pushups, 160);
  assert.equal(
    validateVirtualEdit({ ...source, level: 1000 }, { ...source, level: 2 })
      .level,
    2,
  );
});
test("selected bodyweight exercises share each workout evenly, including 50/50 at 100 EXP", () => {
  for (const preferredExercises of [
    ["pushups", "squats"],
    ["pushups", "situps"],
    ["pushups", "squats", "situps"],
    ["pushups", "squats", "runningKm"],
  ]) {
    for (let i = 0; i < 300; i++) {
      const workout = plannedWorkout(
        { ...bot(), intensity: 1 + (i % 5), preferredExercises },
        shiftDate("2026-09-01", i),
      );
      const reps = preferredExercises
        .filter((key) => key !== "runningKm")
        .map((key) => workout[key]);
      assert.ok(Math.max(...reps) - Math.min(...reps) <= 10);
      assert.ok(reps.every((n) => n > 0));
    }
  }
  let found = false;
  for (let i = 0; i < 300; i++) {
    const workout = plannedWorkout(
      { ...bot(), intensity: 1, preferredExercises: ["pushups", "squats"] },
      shiftDate("2026-09-01", i),
    );
    if (recordExp(workout) === 100 && !workout.situps && !workout.runningKm) {
      assert.equal(workout.pushups, 50);
      assert.equal(workout.squats, 50);
      found = true;
    }
  }
  assert.ok(found);
});
