import test from "node:test";
import assert from "node:assert/strict";
import {
  createSuperAccountHandler,
  superAccountService,
} from "../server/superAccount.js";

function store() {
  const documents = new Map();
  let queue = Promise.resolve();
  return {
    documents,
    doc: (path) => path,
    runTransaction(fn) {
      const next = queue.then(() =>
        fn({
          get: async (path) => ({
            data: () => structuredClone(documents.get(path)),
          }),
          set: (path, values, options) =>
            documents.set(path, {
              ...(options?.merge ? documents.get(path) : {}),
              ...values,
            }),
        }),
      );
      queue = next.catch(() => {});
      return next;
    },
  };
}
function setup() {
  const db = store(),
    users = new Map([
      ["alice", { kakao: true, administrator: true, adFree: true }],
      ["bob", {}],
    ]);
  let time = 1000000,
    fail = false,
    writes = 0;
  const auth = {
    getUser: async (uid) => ({ customClaims: structuredClone(users.get(uid)) }),
    setCustomUserClaims: async (uid, claims) => {
      if (fail) throw new Error("claim write unavailable");
      writes++;
      users.set(uid, claims);
    },
  };
  return {
    db,
    users,
    auth,
    service: superAccountService({ db, auth, now: () => time }),
    advance: (ms) => {
      time += ms;
    },
    failClaims: (value) => {
      fail = value;
    },
    writes: () => writes,
  };
}

test("super code durably grants only the authenticated account and preserves all existing claims", async () => {
  const { service, db, users, writes } = setup();
  assert.deepEqual(await service.redeem("alice", " DH1104 "), {
    superAccount: true,
  });
  assert.deepEqual(users.get("alice"), {
    kakao: true,
    administrator: true,
    adFree: true,
    superAccount: true,
  });
  assert.deepEqual(users.get("bob"), {});
  assert.equal(
    db.documents.get("accountEntitlements/alice").superAccount,
    true,
  );
  assert.equal(db.documents.has("accountEntitlements/bob"), false);
  await service.redeem("alice", "DH1104");
  assert.equal(writes(), 1);
});

test("failed attempts persist, valid codes respect cooldown, and another account has an independent limit", async () => {
  const { service, db, advance } = setup();
  for (let i = 0; i < 5; i++)
    await assert.rejects(service.redeem("alice", "WRONG"), /올바르지/);
  assert.equal(db.documents.get("accountEntitlements/alice").attempts, 5);
  await assert.rejects(
    service.redeem("alice", "DH1104"),
    (e) => e.status === 429,
  );
  assert.equal(
    db.documents.get("accountEntitlements/alice").superAccount,
    undefined,
  );
  await service.redeem("bob", "DH1104");
  advance(15 * 60 * 1000);
  await service.redeem("alice", "dh1104");
  assert.equal(
    db.documents.get("accountEntitlements/alice").superAccount,
    true,
  );
});

test("parallel guesses cannot bypass the transactional attempt limit", async () => {
  const { service, db } = setup();
  const results = await Promise.allSettled(
    Array.from({ length: 12 }, () => service.redeem("alice", "WRONG")),
  );
  assert.equal(db.documents.get("accountEntitlements/alice").attempts, 5);
  assert.equal(results.filter((r) => r.reason?.status === 429).length, 7);
});

test("a retry repairs a failed auth claim write from the durable grant", async () => {
  const { service, db, users, failClaims } = setup();
  failClaims(true);
  await assert.rejects(service.redeem("alice", "DH1104"), /claim write/);
  assert.equal(
    db.documents.get("accountEntitlements/alice").superAccount,
    true,
  );
  assert.equal(users.get("alice").superAccount, undefined);
  failClaims(false);
  await service.redeem("alice", "DH1104");
  assert.equal(users.get("alice").superAccount, true);
});

test("invalid code shapes cannot grant benefits or touch account data", async () => {
  const { service, db, users } = setup();
  for (const code of [null, undefined, {}, [], "", " ", "A".repeat(65)])
    await assert.rejects(service.redeem("alice", code), /입력/);
  assert.equal(db.documents.size, 0);
  assert.equal(users.get("alice").superAccount, undefined);
});

function harness() {
  const calls = [];
  const handler = createSuperAccountHandler({
    origin: "https://app.example",
    verify: async (token) => {
      if (token === "expired") throw new Error("expired");
      if (token === "guest")
        return {
          uid: "anonymous",
          firebase: { sign_in_provider: "anonymous" },
        };
      if (token === "custom")
        return {
          uid: "kakao-user",
          kakao: true,
          firebase: { sign_in_provider: "custom" },
        };
      return { uid: "alice", firebase: { sign_in_provider: "google.com" } };
    },
    service: () => ({
      redeem: async (uid, code) => {
        calls.push({ uid, code });
        return { superAccount: true };
      },
    }),
  });
  return {
    calls,
    request: async (overrides = {}) => {
      const res = {
        headers: {},
        setHeader(k, v) {
          this.headers[k] = v;
        },
        end(body) {
          this.body = JSON.parse(body);
        },
      };
      await handler(
        {
          method: "POST",
          headers: {
            origin: "https://app.example",
            authorization: "Bearer valid",
          },
          body: { code: "DH1104" },
          ...overrides,
        },
        res,
      );
      return res;
    },
  };
}

test("redemption API rejects cross-origin requests, unauthenticated users, guests and client-chosen recipients", async () => {
  const { request, calls } = harness();
  for (const [requestData, status] of [
    [{ method: "GET" }, 405],
    [
      {
        headers: {
          origin: "https://evil.example",
          authorization: "Bearer valid",
        },
      },
      403,
    ],
    [{ headers: { origin: "https://app.example" } }, 401],
    [
      {
        headers: {
          origin: "https://app.example",
          authorization: "Bearer expired",
        },
      },
      401,
    ],
    [
      {
        headers: {
          origin: "https://app.example",
          authorization: "Bearer guest",
        },
      },
      401,
    ],
    [{ body: { code: "DH1104", uid: "bob" } }, 400],
    [{ body: "{" }, 400],
    [{ body: [] }, 400],
    [{ body: null }, 400],
  ])
    assert.equal((await request(requestData)).statusCode, status);
  assert.equal(calls.length, 0);
  const response = await request();
  assert.equal(response.statusCode, 200);
  assert.equal(response.headers["Cache-Control"], "no-store");
  assert.deepEqual(calls, [{ uid: "alice", code: "DH1104" }]);
  await request({
    headers: { origin: "https://app.example", authorization: "Bearer custom" },
    body: JSON.stringify({ code: "DH1104" }),
  });
  assert.equal(calls[1].uid, "kakao-user");
});
