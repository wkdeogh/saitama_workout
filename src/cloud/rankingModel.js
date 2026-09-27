import {
  dateKey,
  parseDate,
  shiftDate,
  recordExp,
  stats,
  initialData,
  validateData,
  daysBetween,
} from "../model.js";

export function koreaDay(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function weekStart(day = koreaDay()) {
  const weekday = parseDate(day).getDay();
  return shiftDate(day, -(weekday === 0 ? 6 : weekday - 1));
}
export function rankingSummary(data, day = koreaDay()) {
  const start = weekStart(day);
  const growth = stats(data, day);
  const dates = Object.keys(data.records)
    .filter((key) => key <= day && recordExp(data.records[key]) > 0)
    .sort();
  const totals = { pushups: 0, squats: 0, situps: 0, runningKm: 0 };
  for (const date of dates)
    for (const key of Object.keys(totals))
      totals[key] += data.records[date][key] || 0;
  totals.runningKm = Math.round(totals.runningKm * 10) / 10;
  return {
    totals,
    characterName: data.characterName,
    totalExp: growth.total,
    weeklyExp: dates
      .filter((key) => key >= start)
      .reduce((sum, key) => sum + recordExp(data.records[key]), 0),
    weekStart: start,
    level: growth.level,
    calculatedOn: day,
    lastWorkout: dates.at(-1) || day,
  };
}
export function displayedLevel(entry, today = koreaDay()) {
  const previous = Math.floor(
    Math.max(0, daysBetween(entry.lastWorkout, entry.calculatedOn)) / 5,
  );
  const now = Math.floor(
    Math.max(0, daysBetween(entry.lastWorkout, today)) / 5,
  );
  return Math.max(1, entry.level - Math.max(0, now - previous) * 5);
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
// Local edits win only on fields changed since this device's last successful sync.
export function mergeChanges(base, local, remote) {
  base ||= initialData();
  remote ||= initialData();
  const records = { ...remote.records };
  for (const day of new Set([
    ...Object.keys(base.records),
    ...Object.keys(local.records),
  ])) {
    if (same(base.records[day], local.records[day])) continue;
    if (local.records[day]) records[day] = local.records[day];
    else delete records[day];
  }
  return validateData(
    {
      version: 2,
      goalDefaultsVersion: Math.max(
        local.goalDefaultsVersion || 0,
        remote.goalDefaultsVersion || 0,
      ),
      records,
      goals: same(base.goals, local.goals) ? remote.goals : local.goals,
      characterName:
        base.characterName === local.characterName
          ? remote.characterName
          : local.characterName,
    },
    dateKey(),
  );
}
export function rankedEntries(rows, field) {
  let last = null,
    rank = 0;
  return rows.map((row, index) => {
    if (row[field] !== last) rank = index + 1;
    last = row[field];
    return { ...row, rank };
  });
}

export function needsAccountSync(scope) {
  return (
    !!scope.data.characterName &&
    (!!scope.needsPublication ||
      !scope.participating ||
      JSON.stringify(scope.data) !== JSON.stringify(scope.base))
  );
}
