import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const FLOW_COOKIE = "__Host-kakao-flow";
const RESULT_COOKIE = "__Host-kakao-result";
const MAX_AGE = 600;
const now = () => Math.floor(Date.now() / 1000);
export class AuthError extends Error {
  constructor(code, status = 400) {
    super(code);
    this.code = code;
    this.status = status;
  }
}
export function configuration(env = process.env) {
  const origin = env.AUTH_ORIGIN || "https://saitama-workout.vercel.app";
  const enabled =
    env.KAKAO_LOGIN_ENABLED === "true" &&
    !!env.KAKAO_REST_API_KEY &&
    !!env.KAKAO_CLIENT_SECRET &&
    !!env.FIREBASE_SERVICE_ACCOUNT_JSON;
  return {
    origin,
    enabled,
    clientId: env.KAKAO_REST_API_KEY,
    secret: env.KAKAO_CLIENT_SECRET,
    redirectUri: `${origin}/api/auth/kakao/callback`,
  };
}
export function seal(value, secret) {
  const payload = Buffer.from(JSON.stringify(value)).toString("base64url");
  const signature = createHmac("sha256", secret)
    .update(`saitama-kakao:${payload}`)
    .digest("base64url");
  return `${payload}.${signature}`;
}
export function unseal(value, secret, purpose, time = now()) {
  if (typeof value !== "string" || value.length > 3800)
    throw new AuthError("expired");
  const [payload, signature, extra] = value.split(".");
  if (!payload || !signature || extra) throw new AuthError("expired");
  const expected = seal(
    JSON.parse(Buffer.from(payload, "base64url").toString()),
    secret,
  ).split(".")[1];
  const a = Buffer.from(signature),
    b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b))
    throw new AuthError("expired");
  const data = JSON.parse(Buffer.from(payload, "base64url").toString());
  if (
    data.purpose !== purpose ||
    !Number.isInteger(data.exp) ||
    data.exp <= time ||
    data.exp > time + MAX_AGE
  )
    throw new AuthError("expired");
  return data;
}
function cookie(name, value, age) {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`;
}
function cookies(req) {
  return Object.fromEntries(
    (req.headers.cookie || "")
      .split(";")
      .map((v) => v.trim().split(/=(.*)/s).slice(0, 2)),
  );
}
function json(res, status, value) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(value));
}
function redirect(res, origin, query) {
  res.statusCode = 303;
  res.setHeader("Location", `${origin}/?${query}`);
  res.end();
}
function sameOrigin(req, config) {
  if (req.headers.origin !== config.origin)
    throw new AuthError("forbidden", 403);
}
function bearer(req) {
  const token = req.headers.authorization?.match(/^Bearer (\S+)$/)?.[1];
  if (!token) throw new AuthError("reauthenticate", 401);
  return token;
}
export function validateLinkIdentity(decoded, time = now()) {
  if (
    decoded.firebase?.sign_in_provider !== "google.com" ||
    !Number.isInteger(decoded.auth_time) ||
    time - decoded.auth_time > 300 ||
    decoded.auth_time > time + 30
  )
    throw new AuthError("reauthenticate", 401);
  return decoded.uid;
}
export async function kakaoSubject(code, config, fetcher = fetch) {
  const response = await fetcher("https://kauth.kakao.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: config.clientId,
      client_secret: config.secret,
      redirect_uri: config.redirectUri,
      code,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new AuthError("provider_failed");
  const token = await response.json();
  if (!token.access_token) throw new AuthError("provider_failed");
  const profile = await fetcher("https://kapi.kakao.com/v2/user/me", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ property_keys: "[]" }),
    signal: AbortSignal.timeout(10000),
  });
  if (!profile.ok) throw new AuthError("provider_failed");
  const { id } = await profile.json();
  if (!Number.isSafeInteger(id) || id <= 0)
    throw new AuthError("provider_failed");
  return String(id);
}
export function createKakaoHandler({
  getServices,
  getConfig = configuration,
  getSubject = kakaoSubject,
}) {
  return async function handler(req, res) {
    const config = getConfig();
    const action = req.query?.action;
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Content-Type-Options", "nosniff");
    try {
      const method = ["status", "callback"].includes(action) ? "GET" : "POST";
      if (!["status", "start", "callback", "complete"].includes(action))
        return json(res, 404, { error: "not_found" });
      if (req.method !== method) {
        res.setHeader("Allow", method);
        return json(res, 405, { error: "method" });
      }
      if (action === "status") {
        let linked = false;
        if (config.enabled && req.headers.authorization) {
          const services = await getServices();
          const decoded = await services.verifyIdToken(bearer(req));
          linked = await services.isLinked(decoded.uid);
        }
        return json(res, 200, { enabled: config.enabled, linked });
      }
      if (method === "POST") sameOrigin(req, config);
      if (!config.enabled) throw new AuthError("not_configured", 503);
      if (action === "start") {
        const body =
          typeof req.body === "string" ? JSON.parse(req.body) : req.body;
        const mode = body?.mode || "login";
        if (!["login", "link"].includes(mode))
          throw new AuthError("invalid_request");
        let uid = null;
        if (mode === "link") {
          const services = await getServices();
          uid = validateLinkIdentity(await services.verifyIdToken(bearer(req)));
        }
        const state = randomBytes(32).toString("base64url");
        res.setHeader("Set-Cookie", [
          cookie(
            FLOW_COOKIE,
            seal(
              { purpose: "flow", state, mode, uid, exp: now() + MAX_AGE },
              config.secret,
            ),
            MAX_AGE,
          ),
          cookie(RESULT_COOKIE, "", 0),
        ]);
        const url = new URL("https://kauth.kakao.com/oauth/authorize");
        url.search = new URLSearchParams({
          client_id: config.clientId,
          redirect_uri: config.redirectUri,
          response_type: "code",
          state,
          prompt: "select_account",
        }).toString();
        return json(res, 200, { url: url.href });
      }
      if (action === "callback") {
        res.setHeader("Set-Cookie", [
          cookie(FLOW_COOKIE, "", 0),
          cookie(RESULT_COOKIE, "", 0),
        ]);
        const flow = unseal(cookies(req)[FLOW_COOKIE], config.secret, "flow");
        if (
          typeof req.query.state !== "string" ||
          req.query.state !== flow.state
        )
          throw new AuthError("expired");
        if (req.query.error)
          throw new AuthError(
            req.query.error === "access_denied"
              ? "cancelled"
              : "provider_failed",
          );
        if (typeof req.query.code !== "string" || req.query.code.length > 2048)
          throw new AuthError("invalid_request");
        const subject = await getSubject(req.query.code, config);
        const services = await getServices();
        const uid = await services.resolveIdentity(
          subject,
          flow.mode === "link" ? flow.uid : null,
        );
        const token = await services.createCustomToken(uid, { kakao: true });
        const result = seal(
          {
            purpose: "result",
            token,
            linked: flow.mode === "link",
            exp: now() + 60,
          },
          config.secret,
        );
        if (result.length > 3800) throw new AuthError("failed", 500);
        res.setHeader("Set-Cookie", [
          cookie(FLOW_COOKIE, "", 0),
          cookie(RESULT_COOKIE, result, 60),
        ]);
        return redirect(res, config.origin, "kakao=complete");
      }
      res.setHeader("Set-Cookie", cookie(RESULT_COOKIE, "", 0));
      const result = unseal(
        cookies(req)[RESULT_COOKIE],
        config.secret,
        "result",
      );
      return json(res, 200, { token: result.token, linked: result.linked });
    } catch (error) {
      const code = error instanceof AuthError ? error.code : "failed";
      if (action === "callback") {
        res.setHeader("Set-Cookie", [
          cookie(FLOW_COOKIE, "", 0),
          cookie(RESULT_COOKIE, "", 0),
        ]);
        return redirect(res, config.origin, `kakao_error=${code}`);
      }
      return json(res, error instanceof AuthError ? error.status : 500, {
        error: code,
      });
    }
  };
}
