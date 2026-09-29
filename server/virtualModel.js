import { virtualEditSummary } from "../src/cloud/virtualEdits.js";
import {
  DEFAULT_TRAINING_INTENSITY,
  DEFAULT_PREFERRED_EXERCISES,
  TRAINING_INTENSITIES,
} from "../src/cloud/virtualLimits.js";
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
export function validateTrainingIntensity(value = DEFAULT_TRAINING_INTENSITY) {
  if (!Number.isInteger(value) || value < 1 || value > 5)
    throw new FriendError("훈련강도는 1~5단계로 선택해 주세요.");
  return value;
}
export function validatePreferredExercises(
  value = DEFAULT_PREFERRED_EXERCISES,
) {
  const keys = Object.keys(emptyCounts());
  if (
    !Array.isArray(value) ||
    value.length < 1 ||
    value.length > keys.length ||
    new Set(value).size !== value.length ||
    value.some((key) => !keys.includes(key))
  )
    throw new FriendError("선호 운동을 1개 이상 선택해 주세요.");
  return keys.filter((key) => value.includes(key));
}
export function nextVirtualWorkoutDay(bot, after) {
  const intensity = bot.intensity ?? DEFAULT_TRAINING_INTENSITY;
  const { maxIntervalDays } = TRAINING_INTENSITIES[intensity - 1];
  const interval =
    1 + (draw(bot.seed, `interval:${intensity}:${after}`) % maxIntervalDays);
  return shiftDate(after, interval);
}
// Called only on a scheduled workout day; retain ten-EXP exercise units.
export function plannedWorkout(bot, day) {
  const intensity = bot.intensity ?? DEFAULT_TRAINING_INTENSITY;
  const { minExp, maxExp } = TRAINING_INTENSITIES[intensity - 1];
  const units =
    minExp / 10 +
    (draw(bot.seed, `exp:${intensity}:${day}`) % ((maxExp - minExp) / 10 + 1));
  const preferences = bot.preferredExercises ?? DEFAULT_PREFERRED_EXERCISES;
  const others = Object.keys(emptyCounts()).filter(
    (key) => !preferences.includes(key),
  );
  const mixLimit = Math.min(
    Math.floor(units / 3),
    Math.max(0, units - preferences.length),
  );
  const mixedUnits =
    others.length && mixLimit > 0 && draw(bot.seed, `mix:${day}`) % 10 < 3
      ? 1 + (draw(bot.seed, `mix-units:${day}`) % mixLimit)
      : 0;
  const counts = emptyCounts();
  const mainUnits = units - mixedUnits;
  const offset = draw(bot.seed, `balance:${day}`) % preferences.length;
  for (let i = 0; i < preferences.length; i++) {
    const key = preferences[(i + offset) % preferences.length];
    const share =
      Math.floor(mainUnits / preferences.length) +
      (i < mainUnits % preferences.length ? 1 : 0);
    counts[key] = share * (key === "runningKm" ? 0.5 : 10);
  }
  if (mixedUnits) {
    const secondary =
      others[draw(bot.seed, `secondary:${day}`) % others.length];
    counts[secondary] = mixedUnits * (secondary === "runningKm" ? 0.5 : 10);
  }
  return counts;
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
  bot.intensity ??= DEFAULT_TRAINING_INTENSITY;
  bot.preferredExercises ??= [...DEFAULT_PREFERRED_EXERCISES];
  bot.nextWorkoutDay ??= nextVirtualWorkoutDay(bot, bot.processedThrough);
  // Bound catch-up work; later calls continue if a project was idle for years.
  const count = Math.min(366, daysBetween(bot.processedThrough, until));
  for (let i = 0; i < count; i++) {
    const day = shiftDate(bot.processedThrough, 1);
    const scheduled = day >= bot.nextWorkoutDay;
    const counts =
      bot.enabled && scheduled ? plannedWorkout(bot, day) : emptyCounts();
    if (scheduled) bot.nextWorkoutDay = nextVirtualWorkoutDay(bot, day);
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
  const intensity = validateTrainingIntensity(
    input.intensity === undefined ? bot.intensity : input.intensity,
  );
  const preferredExercises = validatePreferredExercises(
    input.preferredExercises === undefined
      ? bot.preferredExercises
      : input.preferredExercises,
  );
  if (typeof input.enabled !== "boolean")
    throw new FriendError("자동 운동 설정을 확인해 주세요.");
  const totals = {};
  for (const key of Object.keys(emptyCounts())) {
    const value = input.totals?.[key];
    const scaled = key === "runningKm" ? Math.round(value * 10) : value;
    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      value < 0 ||
      value > (key === "runningKm" ? 40000000 : 400000000) ||
      !Number.isInteger(scaled) ||
      (key === "runningKm" && Math.abs(value * 10 - scaled) > 1e-7)
    )
      throw new FriendError(
        "누적 운동량은 0 이상으로 입력해 주세요. 달리기는 0.1km 단위입니다.",
      );
    totals[key] = value;
  }
  return {
    totals,
    intensity,
    preferredExercises,
    ...virtualEditSummary(totals, bot),
    enabled: input.enabled,
  };
}
