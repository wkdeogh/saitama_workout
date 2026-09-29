import test from "node:test";
import assert from "node:assert/strict";
import { emptyCounts, shiftDate, recordExp } from "../src/model.js";
import {
  advanceVirtual,
  plannedWorkout,
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
test("virtual exercise draws have exactly one rest per three days and 80–120 EXP in tens", () => {
  for (let cycle = 0; cycle < 120; cycle++) {
    const workouts = [0, 1, 2].map((i) =>
      plannedWorkout(bot(), shiftDate("2026-09-01", cycle * 3 + i)),
    );
    assert.equal(workouts.filter((w) => recordExp(w) === 0).length, 1);
    for (const w of workouts.filter((w) => recordExp(w))) {
      assert.ok(recordExp(w) >= 80 && recordExp(w) <= 120);
      assert.equal(w.pushups % 10, 0);
      assert.equal(w.squats % 10, 0);
      assert.ok(w.pushups >= 30 && w.squats >= 30);
    }
  }
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
  assert.equal(advanceVirtual(initial, "2026-09-06").level, 25);
  assert.equal(advanceVirtual(initial, "2026-09-08").level, 23);
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
  assert.equal(validateVirtualEdit(valid, bot()).level, 15);
  for (const change of [
    { level: 0 },
    { level: 1001 },
    { totalExp: -1 },
    { enabled: "true" },
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
