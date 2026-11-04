import test from "node:test";
import assert from "node:assert/strict";
import {
  hasAdFreeAccess,
  hasSuperAccountAccess,
  canRequestAds,
  observeAdEntitlements,
} from "../src/ads/adAccess.js";
import { setAdFreeAccount } from "../server/adEntitlements.js";

test("only a strict signed claim grants ad-free access; ordinary profile fields do not", () => {
  assert.equal(hasAdFreeAccess({ adFree: true }), true);
  for (const claims of [
    null,
    {},
    { adFree: "true" },
    { adFree: 1 },
    { premium: true },
    { data: { adFree: true } },
  ])
    assert.equal(hasAdFreeAccess(claims), false);
});
test("ads wait for auth and entitlement resolution and reject stale account results", () => {
  const account = { ready: true, authLoading: false, user: { uid: "alice" } };
  const access = { ready: true, uid: "alice", adFree: false };
  assert.equal(canRequestAds(account, access), true);
  assert.equal(canRequestAds({ ...account, authLoading: true }, access), false);
  assert.equal(canRequestAds({ ...account, ready: false }, access), false);
  assert.equal(canRequestAds(account, { ...access, ready: false }), false);
  assert.equal(canRequestAds(account, { ...access, uid: "bob" }), false);
  assert.equal(canRequestAds(account, { ...access, adFree: true }), false);
  assert.equal(
    canRequestAds(
      { ...account, user: null },
      { ready: true, uid: null, adFree: false },
    ),
    true,
  );
  assert.equal(canRequestAds({ ...account, user: null }, access), false);
});
test("server grant and revocation preserve existing auth/provider claims", async () => {
  let claims = { kakao: true, administrator: true };
  const auth = {
    getUser: async (uid) => {
      assert.equal(uid, "alice");
      return { customClaims: claims };
    },
    setCustomUserClaims: async (uid, next) => {
      assert.equal(uid, "alice");
      claims = next;
    },
  };
  await setAdFreeAccount(auth, "alice", true);
  assert.deepEqual(claims, { kakao: true, administrator: true, adFree: true });
  await setAdFreeAccount(auth, "alice", false);
  assert.deepEqual(claims, { kakao: true, administrator: true });
  await assert.rejects(setAdFreeAccount(auth, "alice", "true"), TypeError);
  await assert.rejects(setAdFreeAccount(auth, "", true), TypeError);
});

test("late claim reads cannot replace the new account; failed checks hide ads", async () => {
  let callback,
    uid = null,
    latest,
    stopped = false;
  const reads = new Map();
  const stop = observeAdEntitlements(
    {
      subscribe: (fn) => {
        callback = fn;
        return () => {
          stopped = true;
        };
      },
      currentUid: () => uid,
      readClaims: (user) =>
        new Promise((resolve, reject) =>
          reads.set(user.uid, { resolve, reject }),
        ),
    },
    (value) => {
      latest = value;
    },
  );
  uid = "alice";
  const alice = callback({ uid });
  uid = "bob";
  const bob = callback({ uid });
  reads.get("bob").resolve({ adFree: true });
  await bob;
  assert.deepEqual(latest, {
    uid: "bob",
    ready: true,
    adFree: true,
    superAccount: false,
  });
  reads.get("alice").resolve({});
  await alice;
  assert.deepEqual(latest, {
    uid: "bob",
    ready: true,
    adFree: true,
    superAccount: false,
  });
  uid = "charlie";
  const failed = callback({ uid });
  reads.get("charlie").reject(new Error("offline"));
  await failed;
  assert.deepEqual(latest, {
    uid: "charlie",
    ready: true,
    adFree: true,
    superAccount: false,
  });
  uid = "dana";
  const pending = callback({ uid });
  stop();
  const before = latest;
  reads.get("dana").resolve({ adFree: false });
  await pending;
  assert.equal(latest, before);
  assert.equal(stopped, true);
});

test("super account benefits require a strict signed claim and feed the shared ad entitlement", () => {
  assert.equal(hasSuperAccountAccess({ superAccount: true }), true);
  assert.equal(hasAdFreeAccess({ superAccount: true }), true);
  for (const claims of [
    null,
    {},
    { superAccount: "true" },
    { superAccount: 1 },
    { data: { superAccount: true } },
    { adFree: true },
  ]) {
    assert.equal(hasSuperAccountAccess(claims), false);
  }
});

test("super account state is cleared immediately on account changes and sign-out", async () => {
  let callback,
    latest,
    uid = "alice";
  const stop = observeAdEntitlements(
    {
      subscribe: (listener) => {
        callback = listener;
        return () => {};
      },
      currentUid: () => uid,
      readClaims: async (user) =>
        user.uid === "alice" ? { superAccount: true } : {},
    },
    (value) => {
      latest = value;
    },
  );
  await callback({ uid });
  assert.equal(latest.superAccount, true);
  uid = "bob";
  const pending = callback({ uid });
  assert.deepEqual(latest, {
    uid: "bob",
    ready: false,
    adFree: false,
    superAccount: false,
  });
  await pending;
  assert.equal(latest.superAccount, false);
  uid = null;
  await callback(null);
  assert.deepEqual(latest, {
    uid: null,
    ready: true,
    adFree: false,
    superAccount: false,
  });
  stop();
});
