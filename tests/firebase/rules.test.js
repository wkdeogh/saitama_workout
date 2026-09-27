import { before, after, test } from "node:test";
import { readFile } from "node:fs/promises";
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from "@firebase/rules-unit-testing";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  query,
  limit,
  writeBatch,
  serverTimestamp,
  deleteDoc,
} from "firebase/firestore";
let env;
before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-saitama",
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules: await readFile("firestore.rules", "utf8"),
    },
  });
});
after(async () => {
  await env?.cleanup();
});
const authed = (uid) =>
  env
    .authenticatedContext(uid, { firebase: { sign_in_provider: "google.com" } })
    .firestore();
const account = () => ({
  payload: '{"version":2}',
  participating: true,
  updatedAt: serverTimestamp(),
});
const entry = () => ({
  characterName: "테스트",
  totalExp: 100,
  weeklyExp: 100,
  weekStart: "2026-09-21",
  level: 2,
  calculatedOn: "2026-09-27",
  lastWorkout: "2026-09-27",
  totals: { pushups: 50, squats: 50, situps: 0, runningKm: 0 },
  updatedAt: serverTimestamp(),
});
test("only the owner can read and write private account records", async () => {
  const a = authed("owner");
  await assertSucceeds(setDoc(doc(a, "accounts", "owner"), account()));
  await assertSucceeds(getDoc(doc(a, "accounts", "owner")));
  await assertFails(getDoc(doc(authed("other"), "accounts", "owner")));
  await assertFails(
    setDoc(doc(authed("other"), "accounts", "owner"), account()),
  );
  await assertFails(
    getDoc(doc(env.unauthenticatedContext().firestore(), "accounts", "owner")),
  );
  await assertFails(getDocs(collection(a, "accounts")));
});
test("a Google user can opt into rankings with an atomic update", async () => {
  const a = authed("rank-user"),
    batch = writeBatch(a);
  batch.set(doc(a, "accounts", "rank-user"), account());
  batch.set(doc(a, "rankings", "rank-user"), entry());
  await assertSucceeds(batch.commit());
  await assertSucceeds(
    getDocs(query(collection(authed("viewer"), "rankings"), limit(50))),
  );
  await assertFails(getDocs(collection(a, "rankings")));
  await assertFails(getDocs(query(collection(a, "rankings"), limit(51))));
  await assertFails(
    getDocs(
      query(
        collection(env.unauthenticatedContext().firestore(), "rankings"),
        limit(50),
      ),
    ),
  );
});
test("users cannot overwrite other rankings or publish private extra fields", async () => {
  const a = authed("rank-user");
  await assertFails(
    setDoc(doc(authed("other"), "rankings", "rank-user"), entry()),
  );
  await assertFails(
    setDoc(doc(a, "rankings", "rank-user"), {
      ...entry(),
      email: "private@example.com",
    }),
  );
  await assertFails(
    setDoc(doc(a, "rankings", "rank-user"), { ...entry(), totalExp: 999 }),
  );
  await assertFails(
    setDoc(doc(a, "rankings", "rank-user"), { ...entry(), level: 1001 }),
  );
  await assertFails(
    setDoc(doc(a, "rankings", "rank-user"), { ...entry(), weeklyExp: -1 }),
  );
});
test("ranking opt-out removes only the owner public entry", async () => {
  const a = authed("rank-user"),
    batch = writeBatch(a);
  batch.set(doc(a, "accounts", "rank-user"), {
    ...account(),
    participating: false,
  });
  batch.delete(doc(a, "rankings", "rank-user"));
  await assertSucceeds(batch.commit());
  await assertFails(setDoc(doc(a, "rankings", "rank-user"), entry()));
  await assertFails(deleteDoc(doc(authed("other"), "rankings", "rank-user")));
});
test("anonymous auth cannot use records or rankings", async () => {
  const a = env
    .authenticatedContext("anon", {
      firebase: { sign_in_provider: "anonymous" },
    })
    .firestore();
  await assertFails(setDoc(doc(a, "accounts", "anon"), account()));
  await assertFails(getDocs(query(collection(a, "rankings"), limit(50))));
});
