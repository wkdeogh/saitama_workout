import { FriendError, requireProvider } from "./friendsModel.js";
export function createFriendsHandler({
  verify,
  service,
  virtual,
  administrator = async () => false,
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
      let body = req.body || {};
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
        JSON.stringify(body).length > 10000
      )
        throw new FriendError("요청이 너무 큽니다.");
      const adminAction = [
        "admin-list",
        "admin-update",
        "admin-seed",
        "admin-create",
      ].includes(req.query.action);
      const allowed =
        adminAction || req.query.action === "admin-status"
          ? await administrator(decoded)
          : false;
      if (adminAction && !allowed)
        throw new FriendError("관리자 계정만 접근할 수 있습니다.", 403);
      const api = service();
      let result;
      switch (req.query.action) {
        case "admin-status":
          result = { allowed };
          break;
        case "admin-list":
          result = await virtual().list();
          break;
        case "admin-update":
          result = await virtual().update(uid, body.uid, body.values);
          break;
        case "admin-create":
          result = await virtual().create(uid, body.values);
          break;
        case "admin-seed":
          await virtual().seed();
          result = await virtual().list();
          break;
        case "prepare-ranking":
          result = await virtual().refresh();
          break;
        case "state":
          result = await api.state(uid);
          break;
        case "profile":
          result = await api.ensureProfile(uid);
          break;
        case "labels":
          result = await api.labels(uid, body.ids);
          break;
        case "search":
          result = await api.search(uid, body.query);
          break;
        case "request":
          result = await api.request(uid, body.tag);
          break;
        case "respond":
          result = await api.respond(uid, body.id, body.action);
          break;
        case "remove":
          result = await api.remove(uid, body.tag);
          break;
        case "ranking":
          result = await api.ranking(uid, body.period);
          break;
        case "device":
          if (typeof body.enabled !== "boolean")
            throw new FriendError("설정을 확인해 주세요.");
          result = await api.device(uid, body.token, body.enabled);
          break;
        default:
          throw new FriendError("찾을 수 없는 요청입니다.", 404);
      }
      res.statusCode = 200;
      res.end(JSON.stringify(result));
    } catch (error) {
      res.statusCode = error instanceof FriendError ? error.status : 500;
      if (!(error instanceof FriendError))
        console.error("Friends API failed:", error.code || error.name);
      res.end(
        JSON.stringify({
          error:
            error instanceof FriendError
              ? error.message
              : "친구 정보를 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.",
        }),
      );
    }
  };
}
