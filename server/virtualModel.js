import { createHash } from "node:crypto";
import {
  emptyCounts,
  recordExp,
  daysBetween,
  shiftDate,
  inactivityPenalty,
} from "../src/model.js";
import {
  koreaDay,
  weekStart,
  displayedLevel,
} from "../src/cloud/rankingModel.js";
import { FriendError } from "./friendsModel.js";

export const FIRST_VIRTUAL_UID = "virtual-goguma-v1";
export const ADMIN_EMAIL = "wkdeoghq@gmail.com";
export function isAdministrator(claims, owner) {
  const provider = claims?.firebase?.sign_in_provider;
  return Boolean(
    claims?.uid &&
    owner?.uid === claims.uid &&
    owner.email === ADMIN_EMAIL &&
    owner.emailVerified === true &&
    !owner.disabled &&
    owner.providerData?.some(
      (p) => p.providerId === "google.com" && p.email === ADMIN_EMAIL,
    ) &&
    (provider === "google.com" ||
      (provider === "custom" && claims.kakao === true)),
  );
}
// A stable draw makes retries and catch-up runs produce the same workout.
const draw = (seed, key) =>
  createHash("sha256").update(`${seed}:${key}`).digest().readUInt32BE(0);
export function plannedWorkout(bot, day) {
  const age = daysBetween(bot.createdDay, day);
  const rest = draw(bot.seed, `rest:${Math.floor(age / 3)}`) % 3;
  if (age % 3 === rest) return emptyCounts();
  const units = 8 + (draw(bot.seed, `exp:${day}`) % 5);
  const pushUnits = 3 + (draw(bot.seed, `push:${day}`) % (units - 5));
  return {
    ...emptyCounts(),
    pushups: pushUnits * 10,
    squats: (units - pushUnits) * 10,
  };
}
export function dueDay(now = new Date()) {
  // Daily job is scheduled at 21:00 KST. Reads can catch up delayed runs.
  const day = koreaDay(now);
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Seoul",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(now),
  );
  return hour >= 21 ? day : shiftDate(day, -1);
}
export function advanceVirtual(source, until) {
  const bot = structuredClone(source);
  if (until <= bot.processedThrough) return bot;
  // Bound catch-up work; later calls continue if a project was idle for years.
  const count = Math.min(366, daysBetween(bot.processedThrough, until));
  for (let i = 0; i < count; i++) {
    const day = shiftDate(bot.processedThrough, 1);
    const counts = bot.enabled ? plannedWorkout(bot, day) : emptyCounts();
    const exp = recordExp(counts);
    // The workout date itself is not a missed day.
    const gap = daysBetween(bot.lastWorkout, day) - (exp > 0 ? 1 : 0);
    const oldGap = daysBetween(bot.lastWorkout, bot.calculatedOn);
    bot.level = Math.max(
      1,
      bot.level -
        Math.max(0, inactivityPenalty(gap) - inactivityPenalty(oldGap)),
    );
    if (weekStart(day) !== bot.weekStart) {
      bot.weekStart = weekStart(day);
      bot.weeklyExp = 0;
    }
    for (const key of Object.keys(counts)) bot.totals[key] += counts[key];
    bot.totalExp += exp;
    bot.weeklyExp += exp;
    if (exp) {
      const earned = bot.progressExp + exp;
      bot.level = Math.min(1000, bot.level + Math.floor(earned / 100));
      bot.progressExp = bot.level === 1000 ? 0 : earned % 100;
      bot.lastWorkout = day;
    }
    bot.todayCounts = counts;
    bot.activityDay = day;
    bot.calculatedOn = day;
    bot.processedThrough = day;
  }
  return bot;
}
export function publicVirtual(bot, day = koreaDay()) {
  const counts = bot.activityDay === day ? bot.todayCounts : emptyCounts();
  return {
    uid: bot.uid,
    characterName: bot.name,
    tag: bot.tag,
    level: displayedLevel(bot, day),
    totalExp: bot.totalExp,
    weeklyExp: bot.weekStart === weekStart(day) ? bot.weeklyExp : 0,
    weekStart: weekStart(day),
    totals: bot.totals,
    calculatedOn: day,
    lastWorkout: bot.lastWorkout,
    activityDay: day,
    todayCounts: counts,
    todayExp: recordExp(counts),
  };
}
export function validateVirtualEdit(input, bot) {
  if (!input || typeof input !== "object")
    throw new FriendError("입력값을 확인해 주세요.");
  const integer = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;
  if (
    !integer(input.level, 1, 1000) ||
    !integer(input.totalExp, recordExp(bot.todayCounts), 2000000000) ||
    typeof input.enabled !== "boolean"
  )
    throw new FriendError(
      "레벨은 1~1000, EXP는 오늘 EXP 이상으로 입력해 주세요.",
    );
  const totals = {};
  for (const key of Object.keys(emptyCounts())) {
    const value = input.totals?.[key];
    const scaled = key === "runningKm" ? Math.round(value * 10) : value;
    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      value < bot.todayCounts[key] ||
      value > (key === "runningKm" ? 40000000 : 400000000) ||
      !Number.isInteger(scaled) ||
      (key === "runningKm" && Math.abs(value * 10 - scaled) > 1e-7)
    )
      throw new FriendError(
        "누적 운동량은 오늘 운동량 이상으로 입력해 주세요. 달리기는 0.1km 단위입니다.",
      );
    totals[key] = value;
  }
  return {
    totals,
    totalExp: input.totalExp,
    level: input.level,
    enabled: input.enabled,
  };
}
