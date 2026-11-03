import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from "@firebase/rules-unit-testing";
let env;
before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-saitama",
    database: {
      host: "127.0.0.1",
      port: 9000,
      rules: await readFile("database.rules.json", "utf8"),
    },
  });
});
after(async () => {
  await env?.cleanup();
});
const db = (uid) =>
  env
    .authenticatedContext(uid, { firebase: { sign_in_provider: "anonymous" } })
    .database();
const path = (uid, session = "browser") =>
  `worlds/meadow/players/${uid}/${session}`;
const player = (extra = {}) => ({
  name: "비회원",
  level: 1,
  streak: 0,
  guest: true,
  x: 0,
  z: 8,
  yaw: Math.PI,
  action: "idle",
  updatedAt: Date.now(),
  chat: "",
  chatAt: 0,
  ...extra,
});

test("anonymous visitors can meet in the same roster; unauthenticated clients cannot access it", async () => {
  await assertSucceeds(db("guest-a").ref(path("guest-a")).set(player()));
  await assertSucceeds(db("guest-b").ref(path("guest-b")).set(player()));
  const roster = await assertSucceeds(
    db("viewer").ref("worlds/meadow/players").once("value"),
  );
  assert.ok(roster.child("guest-a").exists());
  assert.ok(roster.child("guest-b").exists());
  await assertFails(
    env
      .unauthenticatedContext()
      .database()
      .ref("worlds/meadow/players")
      .once("value"),
  );
  await assertFails(db("viewer").ref("worlds").once("value"));
});
test("visitors own only their session and cannot write private workout data", async () => {
  await assertFails(
    db("attacker")
      .ref(path("guest-a"))
      .set(player({ name: "위조" })),
  );
  await assertFails(db("attacker").ref(path("guest-a")).remove());
  await assertFails(
    db("attacker").ref("accounts/attacker").set({ payload: "forged" }),
  );
  await assertSucceeds(
    db("guest-a").ref(path("guest-a", "second-tab")).set(player()),
  );
  await assertSucceeds(
    db("guest-a").ref(path("guest-a", "second-tab")).remove(),
  );
  assert.ok((await db("guest-a").ref(path("guest-a")).once("value")).exists());
});
test("rules reject invalid coordinates, oversized chat, forged fields and stale timestamps", async () => {
  const ref = db("invalid").ref(path("invalid"));
  for (const extra of [
    { x: 99 },
    { z: "8" },
    { level: 1001 },
    { action: "teleport" },
    { chat: "a".repeat(81), chatAt: Date.now() },
    { updatedAt: 0 },
    { payload: "private" },
  ])
    await assertFails(ref.set(player(extra)));
});
test("chat cooldown is enforced server-side and position changes keep the same message", async () => {
  const ref = db("speaker").ref(path("speaker"));
  const chatAt = Date.now() - 3000;
  await assertSucceeds(ref.set(player({ chat: "안녕하세요", chatAt })));
  await assertFails(
    ref.update({ chat: "도배", chatAt: chatAt + 1000, updatedAt: Date.now() }),
  );
  await assertSucceeds(ref.update({ x: 1, updatedAt: Date.now() }));
  await assertSucceeds(
    ref.update({ chat: "반가워요", chatAt: Date.now(), updatedAt: Date.now() }),
  );
  await assertSucceeds(ref.update({ chat: "", updatedAt: Date.now() }));
});
test("onDisconnect removes a departed character without deleting another session", async () => {
  const database = db("departing");
  const first = database.ref(path("departing", "one")),
    second = database.ref(path("departing", "two"));
  await first.onDisconnect().remove();
  await first.set(player());
  await second.set(player());
  database.goOffline();
  const observer = db("disconnect-observer");
  const deadline = Date.now() + 5000;
  while (
    (await observer.ref(path("departing", "one")).once("value")).exists() &&
    Date.now() < deadline
  )
    await new Promise((resolve) => setTimeout(resolve, 60));
  assert.equal(
    (await observer.ref(path("departing", "one")).once("value")).exists(),
    false,
  );
  assert.equal(
    (await observer.ref(path("departing", "two")).once("value")).exists(),
    true,
  );
});
