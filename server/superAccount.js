import { createHash, timingSafeEqual } from "node:crypto";
import { FriendError, requireProvider } from "./friendsModel.js";

const codeHash = createHash("sha256").update("DH1104").digest();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export function superAccountService({ db, auth, now = Date.now }) {
  return {
    async redeem(uid, code) {
      if (typeof code !== "string" || !code.trim() || code.length > 64)
        throw new FriendError("슈퍼코드를 입력해 주세요.");
      const valid = timingSafeEqual(
        createHash("sha256").update(code.trim().toUpperCase()).digest(),
        codeHash,
      );
      const ref = db.doc(`accountEntitlements/${uid}`);
      // Commit failed attempts as well; throwing inside the transaction would undo them.
      const outcome = await db.runTransaction(async (tx) => {
        const snapshot = await tx.get(ref);
        const current = snapshot.data() || {};
        if (current.superAccount === true) return "granted";
        const time = now();
        const inWindow =
          time - (current.windowStartedAt ?? -WINDOW_MS) < WINDOW_MS;
        const attempts = inWindow ? current.attempts || 0 : 0;
        if (attempts >= MAX_ATTEMPTS) return "limited";
        if (valid) {
          tx.set(
            ref,
            { superAccount: true, source: "super-code", grantedAt: time },
            { merge: true },
          );
          return "granted";
        }
        tx.set(
          ref,
          {
            attempts: attempts + 1,
            windowStartedAt: inWindow ? current.windowStartedAt : time,
          },
          { merge: true },
        );
        return "invalid";
      });
      if (outcome === "limited")
        throw new FriendError(
          "입력 횟수를 초과했습니다. 15분 후 다시 시도해 주세요.",
          429,
        );
      if (outcome === "invalid")
        throw new FriendError("슈퍼코드가 올바르지 않습니다.");
      // A retried redemption repairs a failed claim write without losing the durable grant.
      const user = await auth.getUser(uid);
      if (user.customClaims?.superAccount !== true)
        await auth.setCustomUserClaims(uid, {
          ...user.customClaims,
          superAccount: true,
        });
      return { superAccount: true };
    },
  };
}

export function createSuperAccountHandler({
  verify,
  service,
  origin = "https://saitama-workout.vercel.app",
}) {
  return async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    try {
      if (req.method !== "POST")
        throw new FriendError("지원하지 않는 요청입니다.", 405);
      if (req.headers.origin !== origin)
        throw new FriendError("이 주소에서는 사용할 수 없습니다.", 403);
      const bearer = req.headers.authorization;
      if (!/^Bearer [^\s]+$/.test(bearer || ""))
        throw new FriendError("로그인이 필요합니다.", 401);
      let decoded;
      try {
        decoded = await verify(bearer.slice(7));
      } catch {
        throw new FriendError("다시 로그인해 주세요.", 401);
      }
      const uid = requireProvider(decoded);
      let body = req.body;
      if (typeof body === "string") {
        try {
          body = JSON.parse(body);
        } catch {
          throw new FriendError("요청 형식을 확인해 주세요.");
        }
      }
      if (
        !body ||
        Array.isArray(body) ||
        typeof body !== "object" ||
        Object.keys(body).some((key) => key !== "code")
      )
        throw new FriendError("요청 형식을 확인해 주세요.");
      const result = await service().redeem(uid, body.code);
      res.statusCode = 200;
      res.end(JSON.stringify(result));
    } catch (error) {
      res.statusCode = error instanceof FriendError ? error.status : 500;
      if (!(error instanceof FriendError))
        console.error(
          "Super account redemption failed:",
          error.code || error.name,
        );
      res.end(
        JSON.stringify({
          error:
            error instanceof FriendError
              ? error.message
              : "슈퍼코드를 적용하지 못했습니다. 잠시 후 다시 시도해 주세요.",
        }),
      );
    }
  };
}
