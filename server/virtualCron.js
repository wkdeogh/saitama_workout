import { timingSafeEqual } from "node:crypto";
export function createVirtualCron({ secret, run }) {
  return async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "application/json");
    const expected = secret();
    const supplied = req.headers.authorization || "";
    const correct =
      expected &&
      Buffer.byteLength(supplied) === Buffer.byteLength(`Bearer ${expected}`) &&
      timingSafeEqual(Buffer.from(supplied), Buffer.from(`Bearer ${expected}`));
    if (req.method !== "GET" || !correct) {
      res.statusCode = 401;
      return res.end(JSON.stringify({ error: "Unauthorized" }));
    }
    try {
      res.statusCode = 200;
      res.end(JSON.stringify(await run()));
    } catch (error) {
      console.error("Virtual workout failed:", error.code || error.name);
      res.statusCode = 500;
      res.end(JSON.stringify({ error: "Workout update failed" }));
    }
  };
}
