import { randomUUID } from "node:crypto";
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { virtualService } from "../../server/virtualService.js";
import { friendsService } from "../../server/friendsService.js";
import {
  FIRST_VIRTUAL_UID,
  plannedWorkout,
} from "../../server/virtualModel.js";
import { koreaDay } from "../../src/cloud/rankingModel.js";
import { emptyCounts, initialData, shiftDate } from "../../src/model.js";
if (!process.env.FIRESTORE_EMULATOR_HOST) throw Error("Emulator only");
const app = initializeApp({ projectId: "demo-saitama" }, "virtual-tests"),
  db = getFirestore(app);
after(() => deleteApp(app));
test("seed, concurrent daily ticks, server-owned edits, auto acceptance and both rankings work together", async () => {
  const date = koreaDay();
  let now = new Date(`${date}T12:30:00Z`);
  const virtual = virtualService(db, () => now);
  const seeded = await Promise.all([virtual.seed(), virtual.seed()]);
  assert.equal(seeded[0].uid, FIRST_VIRTUAL_UID);
  assert.equal(seeded[0].tag, seeded[1].tag);
  await Promise.all(Array.from({ length: 5 }, () => virtual.refresh()));
  let [entry] = await virtual.list();
  const bot = (
    await db.doc(`virtualTrainees/${FIRST_VIRTUAL_UID}`).get()
  ).data();
  assert.deepEqual(entry.todayCounts, plannedWorkout(bot, date));
  const exp = entry.totalExp;
  await virtual.refresh();
  assert.equal((await virtual.list())[0].totalExp, exp);
  const friends = friendsService(db);
  const uid = "virtual-friend-test";
  const data = { ...initialData(), characterName: "실제친구" };
  await db
    .doc(`accounts/${uid}`)
    .set({ payload: JSON.stringify(data), participating: true });
  const result = await friends.request(uid, entry.tag);
  assert.equal(result.accepted, true);
  assert.equal((await friends.state(uid)).outgoing.length, 0);
  assert.ok(
    (await friends.state(uid)).friends.some((f) => f.uid === FIRST_VIRTUAL_UID),
  );
  assert.ok(
    (await friends.ranking(uid, "all")).some(
      (r) => r.uid === FIRST_VIRTUAL_UID,
    ),
  );
  const [label] = await friends.labels(uid, [FIRST_VIRTUAL_UID]);
  assert.equal(label.seed, undefined);
  assert.equal(label.level, entry.level);
  assert.equal(
    (await db.doc(`rankings/${FIRST_VIRTUAL_UID}`).get()).data().characterName,
    "고구마똥",
  );
  const changed = {
    ...entry,
    totals: { pushups: 1000, squats: 1000, situps: 50, runningKm: 2.5 },
    totalExp: 4000,
    level: 30,
    enabled: false,
  };
  await virtual.update("owner", entry.uid, changed);
  assert.equal((await virtual.list())[0].level, 30);
  await assert.rejects(virtual.update("owner", entry.uid, changed), /새로고침/);
  await assert.rejects(virtual.update("owner", "real-account", changed));
  now = new Date(`${shiftDate(date, 7)}T12:30:00Z`);
  [entry] = await virtual.list();
  assert.equal(entry.totalExp, 4000);
  assert.equal(entry.level, 23);
  assert.deepEqual(entry.todayCounts, emptyCounts());
  assert.ok(
    !(
      await db
        .collection("adminAudit")
        .where("target", "==", FIRST_VIRTUAL_UID)
        .get()
    ).empty,
  );
  // Existing trainee counts toward the cap; new trainees use the same public paths.
  for (const name of ["", " ", "x".repeat(21), "bad\nname", 12])
    await assert.rejects(
      virtual.create("owner", { name, requestId: randomUUID() }),
    );
  await assert.rejects(
    virtual.create("owner", { name: "정상", requestId: "../bad" }),
  );
  const request = { name: "  Test훈련생  ", requestId: randomUUID() };
  const createdUid = `virtual-${request.requestId}`;
  await Promise.all([
    virtual.create("owner", request),
    virtual.create("owner", request),
  ]);
  assert.equal((await virtual.list()).length, 2);
  const created = (await db.doc(`virtualTrainees/${createdUid}`).get()).data();
  assert.equal(created.name, "Test훈련생");
  assert.equal(created.enabled, true);
  assert.equal(
    (await db.doc(`socialTags/${created.tag}`).get()).data().uid,
    createdUid,
  );
  assert.equal(
    (await db.doc(`socialProfiles/${createdUid}`).get()).data().nameLower,
    "test훈련생",
  );
  assert.equal(
    (await db.doc(`rankings/${createdUid}`).get()).data().characterName,
    created.name,
  );
  assert.equal((await friends.request(uid, created.tag)).accepted, true);
  assert.ok(
    (await friends.ranking(uid, "all")).some((row) => row.uid === createdUid),
  );
  for (let i = 0; i < 7; i++)
    await virtual.create("owner", {
      name: `훈련생${i}`,
      requestId: randomUUID(),
    });
  const results = await Promise.allSettled(
    Array.from({ length: 3 }, (_, i) =>
      virtual.create("owner", {
        name: `동시추가${i}`,
        requestId: randomUUID(),
      }),
    ),
  );
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  for (const result of results.filter((r) => r.status === "rejected"))
    assert.match(result.reason.message, /최대 10명/);
  assert.equal((await virtual.list()).length, 10);
  await virtual.create("owner", request);
  await virtual.seed();
  assert.equal((await virtual.list()).length, 10);
  assert.equal(
    (
      await db
        .collection("adminAudit")
        .where("target", "==", createdUid)
        .where("action", "==", "virtual-create")
        .get()
    ).size,
    1,
  );
  // Legacy seed must also respect capacity when its original record is absent.
  await db.doc(`virtualTrainees/${FIRST_VIRTUAL_UID}`).delete();
  await virtual.create("owner", { name: "빈자리", requestId: randomUUID() });
  await assert.rejects(virtual.seed(), /최대 10명/);
});
