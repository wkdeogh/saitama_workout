import test from "node:test";
import assert from "node:assert/strict";
import {
  createKakaoHandler,
  configuration,
  seal,
  unseal,
  validateLinkIdentity,
  kakaoSubject,
  AuthError,
} from "../server/kakaoAuth.js";
const config = {
  enabled: true,
  origin: "https://app.example",
  clientId: "test-app",
  secret: "test-secret-only",
  redirectUri: "https://app.example/api/auth/kakao/callback",
};
const time = () => Math.floor(Date.now() / 1000);
function harness(overrides = {}) {
  const calls = [];
  const services = {
    verifyIdToken: async (token) => {
      if (token !== "valid") throw new AuthError("reauthenticate", 401);
      return {
        uid: "google-user",
        auth_time: time(),
        firebase: { sign_in_provider: "google.com" },
      };
    },
    isLinked: async () => false,
    resolveIdentity: async (subject, uid) => {
      calls.push({ subject, uid });
      return uid || `kakao:${subject}`;
    },
    createCustomToken: async (uid, claims) => {
      calls.push({ uid, claims });
      return "firebase-custom-token";
    },
    ...overrides,
  };
  const handler = createKakaoHandler({
    getConfig: () => config,
    getServices: () => services,
    getSubject: async () => "123456",
  });
  return {
    calls,
    async request(
      action,
      {
        method = ["status", "callback"].includes(action) ? "GET" : "POST",
        headers = {},
        query = {},
        body = {},
      } = {},
    ) {
      const res = {
        headers: {},
        setHeader(k, v) {
          this.headers[k] = v;
        },
        end(body) {
          this.body = body;
        },
      };
      await handler(
        {
          method,
          query: { action, ...query },
          headers: { origin: config.origin, ...headers },
          body,
        },
        res,
      );
      return res;
    },
  };
}
const getCookie = (response, name) =>
  []
    .concat(response.headers["Set-Cookie"])
    .find((v) => v.startsWith(name + "="))
    .split(";")[0];
const start = async (h, mode = "login") => {
  const res = await h.request("start", {
    body: { mode },
    headers: { authorization: "Bearer valid" },
  });
  return {
    cookie: getCookie(res, "__Host-kakao-flow"),
    state: new URL(JSON.parse(res.body).url).searchParams.get("state"),
    res,
  };
};
test("Kakao is disabled until credentials and explicit activation are present", () => {
  assert.equal(configuration({}).enabled, false);
  assert.equal(configuration({ KAKAO_LOGIN_ENABLED: "true" }).enabled, false);
});
test("signed OAuth cookies reject tampering, expiration and cross-purpose reuse", () => {
  const value = { purpose: "flow", exp: time() + 60, uid: "user" };
  const signed = seal(value, config.secret);
  assert.deepEqual(unseal(signed, config.secret, "flow"), value);
  assert.throws(() => unseal(signed, "different", "flow"));
  assert.throws(() => unseal(signed, config.secret, "result"));
  assert.throws(() =>
    unseal(
      seal({ ...value, exp: time() - 1 }, config.secret),
      config.secret,
      "flow",
    ),
  );
  assert.throws(() => unseal(signed + "x", config.secret, "flow"));
});
test("login requires same origin and valid POST; tokens never go into redirect URL", async () => {
  const h = harness();
  assert.equal(
    (await h.request("start", { headers: { origin: "https://evil.example" } }))
      .statusCode,
    403,
  );
  assert.equal((await h.request("start", { method: "GET" })).statusCode, 405);
  const flow = await start(h);
  assert.match(
    flow.res.headers["Set-Cookie"][0],
    /HttpOnly; Secure; SameSite=Lax/,
  );
  assert.equal(
    new URL(JSON.parse(flow.res.body).url).searchParams.get("redirect_uri"),
    config.redirectUri,
  );
  const done = await h.request("callback", {
    headers: { cookie: flow.cookie },
    query: { state: flow.state, code: "code" },
  });
  assert.equal(done.headers.Location, "https://app.example/?kakao=complete");
  assert.equal(done.headers["Cache-Control"], "no-store");
  const completion = await h.request("complete", {
    headers: { cookie: getCookie(done, "__Host-kakao-result") },
  });
  assert.equal(JSON.parse(completion.body).token, "firebase-custom-token");
  assert.match(completion.headers["Set-Cookie"], /Max-Age=0/);
  assert.deepEqual(h.calls[1], {
    uid: "kakao:123456",
    claims: { kakao: true },
  });
});
test("missing or wrong state cannot issue a Firebase token; cancellation clears cookies", async () => {
  const h = harness(),
    flow = await start(h);
  for (const [cookie, state] of [
    ["", flow.state],
    [flow.cookie, "wrong"],
  ]) {
    const res = await h.request("callback", {
      headers: { cookie },
      query: { state, code: "bad" },
    });
    assert.match(res.headers.Location, /kakao_error=expired/);
  }
  const cancel = await h.request("callback", {
    headers: { cookie: flow.cookie },
    query: { state: flow.state, error: "access_denied" },
  });
  assert.match(cancel.headers.Location, /kakao_error=cancelled/);
  assert.equal(h.calls.length, 0);
});
test("account linking trusts a fresh verified Google identity, never a supplied UID", async () => {
  const h = harness();
  assert.equal(
    (await h.request("start", { body: { mode: "link", uid: "victim" } }))
      .statusCode,
    401,
  );
  const flow = await start(h, "link");
  await h.request("callback", {
    headers: { cookie: flow.cookie },
    query: { state: flow.state, code: "code", uid: "victim" },
  });
  assert.deepEqual(h.calls[0], { subject: "123456", uid: "google-user" });
  assert.throws(() =>
    validateLinkIdentity({
      uid: "x",
      auth_time: time() - 301,
      firebase: { sign_in_provider: "google.com" },
    }),
  );
  assert.throws(() =>
    validateLinkIdentity({
      uid: "x",
      auth_time: time(),
      firebase: { sign_in_provider: "anonymous" },
    }),
  );
});
test("link collisions and disabled users produce safe errors without login tokens", async () => {
  for (const code of ["already_linked", "disabled"]) {
    const h = harness({
        resolveIdentity: async () => {
          throw new AuthError(code);
        },
      }),
      flow = await start(h, "link");
    const res = await h.request("callback", {
      headers: { cookie: flow.cookie },
      query: { state: flow.state, code: "code" },
    });
    assert.match(res.headers.Location, new RegExp(`kakao_error=${code}`));
    assert.equal(h.calls.length, 0);
  }
});
test("result exchange denies cross-origin reads and missing sessions", async () => {
  const h = harness();
  assert.equal(
    (
      await h.request("complete", {
        headers: { origin: "https://evil.example" },
      })
    ).statusCode,
    403,
  );
  assert.equal((await h.request("complete")).statusCode, 400);
});
test("Kakao subject is fetched server-side with client secret and minimal profile request", async () => {
  const requests = [];
  const fetcher = async (url, options) => {
    requests.push({ url, options });
    return {
      ok: true,
      json: async () =>
        requests.length === 1 ? { access_token: "private-token" } : { id: 123 },
    };
  };
  assert.equal(await kakaoSubject("code", config, fetcher), "123");
  assert.equal(requests[0].options.body.get("client_secret"), config.secret);
  assert.equal(
    requests[1].options.headers.Authorization,
    "Bearer private-token",
  );
  assert.equal(requests[1].options.body.get("property_keys"), "[]");
  await assert.rejects(
    kakaoSubject("code", config, async () => ({ ok: false })),
    /provider_failed/,
  );
});

test("production API entry loads Firebase Admin dependencies and responds safely when disabled", async () => {
  const { default: handler } = await import("../api/auth/kakao/[action].js");
  const res = {
    headers: {},
    setHeader(k, v) {
      this.headers[k] = v;
    },
    end(body) {
      this.body = body;
    },
  };
  await handler(
    { method: "GET", query: { action: "status" }, headers: {} },
    res,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(typeof JSON.parse(res.body).enabled, "boolean");
});
