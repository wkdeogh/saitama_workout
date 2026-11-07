import { test, after } from "node:test";
import assert from "node:assert/strict";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { kudosService } from "../../server/kudosService.js";
import { friendsService } from "../../server/friendsService.js";
import { initialData } from "../../src/model.js";
if (!process.env.FIRESTORE_EMULATOR_HOST)
  throw new Error("Run only inside Firestore emulator");
const app = initializeApp({ projectId: "demo-saitama" }, "kudos-tests");
const db = getFirestore(app),
  social = friendsService(db);
after(() => deleteApp(app));
async function user(id) {
  const uid = `kudos-test-${id}`;
  await db
    .doc(`accounts/${uid}`)
    .set({
      payload: JSON.stringify({ ...initialData(), characterName: id }),
      participating: true,
    });
  return social.ensureProfile(uid);
}
function harness() {
  let now = new Date("2026-11-07T14:59:00Z");
  const sent = [];
  const service = kudosService(
    db,
    {
      sendEachForMulticast: async (payload) => {
        sent.push(payload);
        return {
          successCount: 1,
          failureCount: 0,
          responses: [{ success: true }],
        };
      },
    },
    () => now,
  );
  return {
    service,
    sent,
    advance: () => {
      now = new Date("2026-11-07T15:00:00Z");
    },
  };
}
test("a sender can give, cancel and re-give; count changes but only one daily push/event is created", async () => {
  const a = await user("toggle-a"),
    b = await user("toggle-b");
  await social.device(
    b.uid,
    "kudos-toggle-token-123456789012345678901234567890",
    true,
  );
  const { service, sent } = harness();
  const first = await service.set(a.uid, b.uid, true);
  assert.equal(first.count, 1);
  assert.equal(first.given, true);
  assert.equal(first.promptForPush, true);
  assert.equal((await service.set(a.uid, b.uid, true)).count, 1);
  assert.equal((await service.set(a.uid, b.uid, false)).count, 0);
  const cancelled = await service.state(b.uid);
  assert.equal(cancelled.received.length, 0);
  assert.equal(cancelled.notifications.length, 1);
  assert.equal((await service.set(a.uid, b.uid, true)).promptForPush, false);
  const received = await service.state(b.uid);
  assert.equal(received.count, 1);
  assert.deepEqual(
    received.received.map((r) => r.uid),
    [a.uid],
  );
  assert.equal(received.notifications.length, 1);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].data.body, "toggle-a에게 따봉을 받았습니다!");
  assert.equal(sent[0].data.url, "/?view=kudos");
  const publicState = await service.state(a.uid, b.uid);
  assert.equal(publicState.given, true);
  assert.equal(publicState.received, undefined);
  assert.equal(publicState.notifications, undefined);
});
test("concurrent duplicate requests and multiple senders retain exactly one count per sender", async () => {
  const a = await user("concurrent-a"),
    b = await user("concurrent-b"),
    c = await user("concurrent-c");
  const { service } = harness();
  const results = await Promise.all([
    service.set(a.uid, b.uid, true),
    service.set(a.uid, b.uid, true),
    service.set(c.uid, b.uid, true),
  ]);
  assert.equal(results.filter((r) => r.promptForPush).length, 2);
  assert.equal((await service.state(b.uid)).count, 2);
  await Promise.all([
    service.set(a.uid, b.uid, false),
    service.set(a.uid, b.uid, false),
  ]);
  assert.equal((await service.state(b.uid)).count, 1);
  assert.deepEqual(
    (await service.state(b.uid)).received.map((r) => r.uid),
    [c.uid],
  );
});
test("KST midnight resets count, given state and sender list and allows one new daily notification", async () => {
  const a = await user("midnight-a"),
    b = await user("midnight-b");
  await social.device(
    b.uid,
    "kudos-midnight-token-123456789012345678901234567890",
    true,
  );
  const { service, sent, advance } = harness();
  const first = await service.set(a.uid, b.uid, true);
  assert.equal(first.day, "2026-11-07");
  advance();
  assert.deepEqual(await service.state(b.uid), {
    day: "2026-11-08",
    count: 0,
    given: false,
    received: [],
    notifications: [],
  });
  assert.equal((await service.state(a.uid, b.uid)).given, false);
  const second = await service.set(a.uid, b.uid, true);
  assert.equal(second.day, "2026-11-08");
  assert.equal(second.count, 1);
  assert.equal(second.promptForPush, false);
  assert.equal(sent.length, 2);
  assert.notEqual(sent[0].data.notificationTag, sent[1].data.notificationTag);
});
test("notification opt-in prompt is claimed once per account, even for different recipients concurrently", async () => {
  const a = await user("prompt-a"),
    b = await user("prompt-b"),
    c = await user("prompt-c");
  const { service } = harness();
  const results = await Promise.all([
    service.set(a.uid, b.uid, true),
    service.set(a.uid, c.uid, true),
  ]);
  assert.equal(results.filter((r) => r.promptForPush).length, 1);
  assert.equal(
    (await db.doc(`friendInbox/${a.uid}`).get()).data().kudosPushPrompted,
    true,
  );
});
test("invalid targets, self reactions, and non-boolean values cannot write reactions", async () => {
  const a = await user("invalid-a"),
    { service } = harness();
  await assert.rejects(service.set(a.uid, a.uid, true), /본인/);
  await assert.rejects(service.set(a.uid, "bad/id", true), /사용자/);
  await assert.rejects(service.set(a.uid, "missing", true), /찾을 수/);
  await assert.rejects(service.set(a.uid, "missing", "true"), /상태/);
});
test("failed pushes preserve count and never send again after a cancel and re-give", async () => {
  const a = await user("failure-a"),
    b = await user("failure-b");
  await social.device(
    b.uid,
    "kudos-failure-token-123456789012345678901234567890",
    true,
  );
  let attempts = 0;
  const service = kudosService(db, {
    sendEachForMulticast: async () => {
      attempts++;
      throw Error("offline");
    },
  });
  assert.equal((await service.set(a.uid, b.uid, true)).push.failed, 1);
  await service.set(a.uid, b.uid, false);
  await service.set(a.uid, b.uid, true);
  assert.equal(attempts, 1);
  assert.equal((await service.state(b.uid)).count, 1);
});
test("profile dialogs expose public workout data and uid-based friend requests use the normal acceptance flow", async () => {
  const a = await user("profile-a"),
    b = await user("profile-b");
  const profile = await social.user(a.uid, b.uid);
  assert.equal(profile.characterName, "profile-b");
  assert.equal(profile.tag, b.tag);
  assert.ok(profile.totals);
  assert.equal(profile.payload, undefined);
  assert.equal(profile.records, undefined);
  assert.equal((await social.requestUser(a.uid, b.uid)).created, true);
  assert.equal((await social.state(b.uid)).incoming[0].user.uid, a.uid);
  assert.equal((await social.state(a.uid)).friends.length, 0);
});
