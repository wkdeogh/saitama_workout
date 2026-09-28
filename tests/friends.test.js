import test from "node:test";
import assert from "node:assert/strict";
import {
  accountTag,
  normalizeTag,
  normalizeSearch,
  pairKey,
  requireProvider,
  assertFriendCapacity,
} from "../server/friendsModel.js";
import { createFriendsHandler } from "../server/friendsHandler.js";
import { spawnSync } from "node:child_process";
test("random tags roundtrip and never depend on nickname", () => {
  const tags = Array.from({ length: 1000 }, accountTag);
  assert.equal(new Set(tags).size, 1000);
  for (const tag of tags)
    assert.equal(normalizeTag(` #${tag.toLowerCase()} `), tag);
  for (const value of ["test", "ST-12345678", "../foo", "ST-ABCDEFGH/more"])
    assert.throws(() => normalizeTag(value));
  assert.equal(normalizeSearch("  근육대호  "), "근육대호");
  assert.throws(() => normalizeSearch(""));
});
test("pair keys are symmetric and resistant to delimiter ambiguity", () => {
  assert.equal(pairKey("a", "b"), pairKey("b", "a"));
  assert.notEqual(pairKey("a:b", "c"), pairKey("a", "b:c"));
});
test("only verified Google or Kakao custom identities can use friends", () => {
  assert.equal(
    requireProvider({ uid: "a", firebase: { sign_in_provider: "google.com" } }),
    "a",
  );
  assert.equal(
    requireProvider({
      uid: "a",
      firebase: { sign_in_provider: "custom" },
      kakao: true,
    }),
    "a",
  );
  for (const value of [
    {},
    { uid: "a", firebase: { sign_in_provider: "anonymous" }, kakao: true },
    { uid: "a", firebase: { sign_in_provider: "custom" } },
  ])
    assert.throws(() => requireProvider(value));
  assert.throws(() => assertFriendCapacity(Array(200), []));
  assertFriendCapacity(Array(199), Array(199));
});
async function invoke(
  overrides = {},
  claims = { uid: "verified", firebase: { sign_in_provider: "google.com" } },
) {
  const calls = [];
  const handler = createFriendsHandler({
    verify: async (token) => {
      if (token !== "valid") throw Error();
      return claims;
    },
    service: () => ({
      request: async (...args) => {
        calls.push(args);
        return { ok: true };
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
      query: { action: "request" },
      body: { tag: "ST-ABCDEFGH", uid: "forged" },
      ...overrides,
    },
    res,
  );
  return { ...res, calls };
}
test("friends API rejects cross-origin and unauthenticated mutations, and ignores client uid", async () => {
  assert.equal((await invoke({ method: "GET" })).statusCode, 405);
  assert.equal(
    (
      await invoke({
        headers: {
          origin: "https://evil.example",
          authorization: "Bearer valid",
        },
      })
    ).statusCode,
    403,
  );
  assert.equal(
    (
      await invoke({
        headers: { origin: "https://saitama-workout.vercel.app" },
      })
    ).statusCode,
    401,
  );
  assert.equal(
    (
      await invoke(
        {},
        { uid: "a", firebase: { sign_in_provider: "anonymous" } },
      )
    ).statusCode,
    401,
  );
  const result = await invoke();
  assert.equal(result.statusCode, 200);
  assert.deepEqual(result.calls, [["verified", "ST-ABCDEFGH"]]);
  assert.equal((await invoke({ body: "invalid json" })).statusCode, 400);
});
test("friend production entry loads on Vercel without ESM require support", () => {
  const result = spawnSync(
    process.execPath,
    [
      "--no-experimental-require-module",
      "--input-type=module",
      "-e",
      `await import(${JSON.stringify(new URL("../api/friends/[action].js", import.meta.url).href)})`,
    ],
    { encoding: "utf8", timeout: 15000 },
  );
  assert.equal(result.status, 0, result.stderr);
});
