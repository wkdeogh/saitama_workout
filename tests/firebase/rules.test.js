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

test("verified Kakao custom auth can use own records and rankings, but untrusted custom auth cannot", async () => {
  const a = env
    .authenticatedContext("kakao-user", {
      firebase: { sign_in_provider: "custom" },
      kakao: true,
    })
    .firestore();
  const batch = writeBatch(a);
  batch.set(doc(a, "accounts", "kakao-user"), account());
  batch.set(doc(a, "rankings", "kakao-user"), entry());
  await assertSucceeds(batch.commit());
  await assertSucceeds(getDoc(doc(a, "accounts", "kakao-user")));
  await assertSucceeds(getDocs(query(collection(a, "rankings"), limit(50))));
  await assertFails(getDoc(doc(a, "accounts", "owner")));
  for (const claims of [
    { firebase: { sign_in_provider: "custom" } },
    { firebase: { sign_in_provider: "anonymous" }, kakao: true },
  ]) {
    const rejected = env.authenticatedContext("untrusted", claims).firestore();
    await assertFails(
      setDoc(doc(rejected, "accounts", "untrusted"), account()),
    );
    await assertFails(
      getDocs(query(collection(rejected, "rankings"), limit(50))),
    );
  }
});
test("identity mapping is inaccessible to all client providers", async () => {
  for (const a of [
    authed("owner"),
    env
      .authenticatedContext("kakao-user", {
        firebase: { sign_in_provider: "custom" },
        kakao: true,
      })
      .firestore(),
  ]) {
    for (const path of ["kakaoIdentities/123", "authLinks/owner"]) {
      await assertFails(getDoc(doc(a, path)));
      await assertFails(setDoc(doc(a, path), { uid: "owner" }));
    }
  }
});

test("running earns two EXP per tenth in rankings, including the weekly maximum", async () => {
  const db = authed("runner");
  await assertSucceeds(setDoc(doc(db, "accounts", "runner"), account()));
  const ref = doc(db, "rankings", "runner");
  for (const [km, exp] of [
    [0.1, 2],
    [0.3, 6],
    [5, 100],
    [10, 200],
  ]) {
    const value = {
      ...entry(),
      totals: { pushups: 0, squats: 0, situps: 0, runningKm: km },
      totalExp: exp,
      weeklyExp: exp,
    };
    await assertSucceeds(setDoc(ref, value));
    await assertFails(
      setDoc(ref, { ...value, totalExp: exp / 2, weeklyExp: exp / 2 }),
    );
  }
  await assertSucceeds(
    setDoc(ref, {
      ...entry(),
      totals: { pushups: 70000, squats: 70000, situps: 70000, runningKm: 7000 },
      totalExp: 350000,
      weeklyExp: 350000,
      level: 1000,
    }),
  );
});

test("friend inbox belongs to its recipient and social identities are server controlled", async () => {
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "friendInbox", "owner"), {
      pending: 1,
    });
  });
  await assertSucceeds(getDoc(doc(authed("owner"), "friendInbox", "owner")));
  await assertFails(getDoc(doc(authed("other"), "friendInbox", "owner")));
  await assertFails(
    setDoc(doc(authed("owner"), "friendInbox", "owner"), { pending: 0 }),
  );
  for (const path of [
    "socialProfiles/owner",
    "socialTags/ST-ABCDEFGH",
    "friendRequests/request",
    "friendLists/owner",
    "friendCooldowns/pair",
    "pushDevices/token",
  ]) {
    await assertFails(getDoc(doc(authed("owner"), path)));
    await assertFails(setDoc(doc(authed("owner"), path), { uid: "owner" }));
  }
});
