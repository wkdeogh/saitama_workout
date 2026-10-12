import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "./firebaseAdmin.js";
import { friendsService } from "./friendsService.js";
import { EXERCISES } from "../src/model.js";
import {
  koreaDay,
  weekStart,
  rankedEntries,
} from "../src/cloud/rankingModel.js";

const counts = (value = {}) =>
  Object.fromEntries(EXERCISES.map(({ key }) => [key, value[key] || 0]));

// Return only the fields already displayed on the public leaderboard. Never
// serialize raw account payloads, social documents or virtual trainee settings.
export function publicRankingRows(rows, labels, period) {
  const activities = new Map(labels.map((row) => [row.uid, row]));
  return rankedEntries(
    rows.slice(0, 50).map((row) => {
      const activity = activities.get(row.uid) || row;
      return {
        uid: row.uid,
        characterName: row.characterName,
        totalExp: row.totalExp,
        weeklyExp: row.weeklyExp,
        weekStart: row.weekStart,
        totals: counts(row.totals),
        level: activity.level,
        calculatedOn: activity.calculatedOn,
        lastWorkout: activity.lastWorkout,
        streak: activity.streak || 0,
        activityDay: activity.activityDay || null,
        todayCounts: counts(activity.todayCounts),
        ...(activity.tag ? { tag: activity.tag } : {}),
      };
    }),
    period === "week" ? "weeklyExp" : "totalExp",
  );
}

export async function loadPublicRanking(period) {
  const db = getFirestore(getAdminApp());
  const day = koreaDay();
  const field = period === "week" ? "weeklyExp" : "totalExp";
  let query = db.collection("rankings");
  if (period === "week") query = query.where("weekStart", "==", weekStart(day));
  const snapshot = await query.orderBy(field, "desc").limit(50).get();
  const rows = snapshot.docs.map((doc) => ({ ...doc.data(), uid: doc.id }));
  const labels = await friendsService(db).labels(
    null,
    rows.map((row) => row.uid),
  );
  return publicRankingRows(rows, labels, period);
}

export function createPublicRankingHandler(load = loadPublicRanking) {
  return async (req, res) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "no-store");
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      res.statusCode = 405;
      res.end(JSON.stringify({ error: "지원하지 않는 요청입니다." }));
      return;
    }
    const period = req.query?.period || "all";
    if (!["all", "week"].includes(period)) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: "랭킹 기간을 확인해 주세요." }));
      return;
    }
    try {
      const rows = await load(period);
      res.setHeader(
        "Cache-Control",
        "public, max-age=0, s-maxage=30, stale-while-revalidate=60",
      );
      res.statusCode = 200;
      res.end(JSON.stringify(rows));
    } catch (error) {
      console.error("Public ranking failed:", error.code || error.name);
      res.statusCode = 503;
      res.end(
        JSON.stringify({
          error: "랭킹을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
        }),
      );
    }
  };
}
