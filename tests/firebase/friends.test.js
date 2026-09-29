import { test, after } from "node:test";
import assert from "node:assert/strict";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { friendsService } from "../../server/friendsService.js";
import { pairKey } from "../../server/friendsModel.js";
import {
  initialData,
  saveRecord,
  emptyCounts,
  shiftDate,
} from "../../src/model.js";
import { koreaDay } from "../../src/cloud/rankingModel.js";
if (!process.env.FIRESTORE_EMULATOR_HOST)
  throw new Error("Run only inside Firestore emulator");
const app = initializeApp({ projectId: "demo-saitama" }, "friend-tests"),
  db = getFirestore(app),
  sent = [];
const service = friendsService(db, {
  sendEachForMulticast: async (payload) => {
    sent.push(payload);
    return { successCount: 1, failureCount: 0, responses: [{ success: true }] };
  },
});
after(() => deleteApp(app));
async function user(id, name = "같은닉네임", runningKm = 1) {
  const uid = `social-test-${id}`;
  const data = saveRecord(
    { ...initialData(), characterName: name },
    koreaDay(),
    { ...emptyCounts(), runningKm },
    koreaDay(),
  );
  await db
    .doc(`accounts/${uid}`)
    .set({ payload: JSON.stringify(data), participating: true });
  return await service.ensureProfile(uid);
}
test("existing accounts receive stable unique tags, including concurrent setup and renames", async () => {
  const a = await user("identity"),
    b = await user("identity2");
  assert.notEqual(a.tag, b.tag);
  const parallel = await Promise.all(
    Array.from({ length: 5 }, () => service.ensureProfile(a.uid)),
  );
  assert.ok(parallel.every((p) => p.tag === a.tag));
  const renamed = await user("identity", "바뀐닉네임");
  assert.equal(renamed.tag, a.tag);
  const result = await service.search(b.uid, "바뀐");
  assert.equal(result[0].tag, a.tag);
  assert.equal((await service.search(b.uid, "#" + a.tag))[0].uid, a.uid);
  assert.ok(
    (await service.search(b.uid, "#" + a.tag.slice(0, 6).toLowerCase())).some(
      (p) => p.uid === a.uid,
    ),
  );
  assert.ok(
    (await service.search(a.uid, a.tag.slice(0, 6))).every(
      (p) => p.uid !== a.uid,
    ),
  );
  assert.deepEqual(await service.search(b.uid, "ST-"), []);
});
test("duplicate and opposing requests cannot duplicate pushes or bypass recipient acceptance", async () => {
  const a = await user("sender"),
    b = await user("receiver"),
    outsider = await user("outsider");
  await service.device(
    b.uid,
    "fcm-test-token-123456789012345678901234567890",
    true,
  );
  assert.equal((await service.request(a.uid, b.tag)).created, true);
  assert.equal((await service.request(a.uid, b.tag)).created, false);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].data.uid, b.uid);
  assert.ok(sent[0].data.body.includes(a.tag));
  await assert.rejects(service.request(b.uid, a.tag), /받은 요청/);
  await assert.rejects(service.request(a.uid, a.tag), /본인/);
  const id = pairKey(a.uid, b.uid);
  await assert.rejects(service.respond(outsider.uid, id, "accept"), /권한/);
  await assert.rejects(service.respond(a.uid, id, "accept"), /권한/);
  await assert.rejects(service.respond(b.uid, id, "cancel"), /권한/);
  assert.equal((await service.state(b.uid)).incoming.length, 1);
  await Promise.all([
    service.respond(b.uid, id, "accept"),
    service.respond(b.uid, id, "accept"),
  ]);
  assert.deepEqual((await db.doc(`friendLists/${a.uid}`).get()).data().ids, [
    b.uid,
  ]);
  assert.deepEqual((await db.doc(`friendLists/${b.uid}`).get()).data().ids, [
    a.uid,
  ]);
  assert.equal((await service.state(b.uid)).incoming.length, 0);
  assert.equal((await db.doc(`friendInbox/${b.uid}`).get()).data().pending, 0);
  const ranks = await service.ranking(a.uid, "all");
  assert.equal(ranks.length, 2);
  assert.ok(ranks.every((r) => r.totalExp === 20 && r.rank === 1));
  assert.ok(!ranks.some((r) => r.uid === outsider.uid));
  await service.remove(a.uid, b.tag);
  assert.equal((await service.state(b.uid)).friends.length, 0);
});
test("reject/cancel clean up both inboxes and enforce resend cooldown", async () => {
  const a = await user("reject-a"),
    b = await user("reject-b");
  await service.request(a.uid, b.tag);
  const id = pairKey(a.uid, b.uid);
  await service.respond(b.uid, id, "reject");
  assert.equal((await service.state(a.uid)).outgoing.length, 0);
  await assert.rejects(service.request(a.uid, b.tag), /24시간/);
  await db.doc(`friendCooldowns/${id}`).set({ at: Timestamp.fromMillis(0) });
  await service.request(a.uid, b.tag);
  await service.respond(a.uid, id, "cancel");
  assert.equal((await service.state(b.uid)).incoming.length, 0);
});
test("push failure preserves requests and token deletion cannot affect another owner", async () => {
  const a = await user("failure-a"),
    b = await user("failure-b");
  const token = "fcm-test-failure-123456789012345678901234567890";
  await service.device(b.uid, token, true);
  await service.device(a.uid, token, false);
  const failing = friendsService(db, {
    sendEachForMulticast: async () => {
      throw Error("provider down");
    },
  });
  const result = await failing.request(a.uid, b.tag);
  assert.equal(result.push.failed, 1);
  assert.equal((await service.state(b.uid)).incoming.length, 1);
});

test("public ranking activity is calculated from today's saved account records only", async () => {
  const a = await user("daily", "오늘훈련", 2.5);
  const labels = await service.labels(a.uid, [a.uid]);
  assert.equal(labels[0].activityDay, koreaDay());
  assert.equal(labels[0].todayExp, 50);
  assert.deepEqual(labels[0].todayCounts, { ...emptyCounts(), runningKm: 2.5 });
  assert.equal(labels[0].payload, undefined);
  assert.equal(labels[0].records, undefined);
  const rankings = await service.ranking(a.uid, "all");
  assert.equal(rankings[0].todayExp, 50);
  assert.equal(rankings[0].todayCounts.runningKm, 2.5);
  await user("daily", "오늘훈련", 0.1);
  assert.equal((await service.labels(a.uid, [a.uid]))[0].todayExp, 2);
});

test("existing ranking accounts recalculate old gaps using daily decay without republishing", async () => {
  const a = await user("decay");
  const today = koreaDay();
  const data = saveRecord(
    initialData(),
    shiftDate(today, -7),
    { ...emptyCounts(), pushups: 3000 },
    today,
  );
  data.characterName = "감소확인";
  await db
    .doc(`accounts/${a.uid}`)
    .set({ payload: JSON.stringify(data), participating: true });
  const [label] = await service.labels(a.uid, [a.uid]);
  const [friend] = await service.ranking(a.uid, "all");
  assert.equal(label.level, 24);
  assert.equal(friend.level, 24);
  assert.equal(label.calculatedOn, today);
  assert.equal(label.lastWorkout, shiftDate(today, -7));
  assert.equal(label.todayExp, 0);
});
