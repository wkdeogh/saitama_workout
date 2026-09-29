import { emptyCounts, EXERCISES, recordExp } from "../model.js";
import { koreaDay } from "./rankingModel.js";

export function dailyActivity(data, day = koreaDay()) {
  const record = data.records[day];
  const todayCounts = Object.fromEntries(
    EXERCISES.map(({ key }) => [key, record?.[key] || 0]),
  );
  return { activityDay: day, todayCounts, todayExp: recordExp(todayCounts) };
}

export function displayedDailyActivity(entry, day = koreaDay()) {
  if (entry.activityDay !== day)
    return { todayCounts: emptyCounts(), todayExp: 0 };
  const todayCounts = { ...emptyCounts(), ...entry.todayCounts };
  return { todayCounts, todayExp: recordExp(todayCounts) };
}

export function dailyExpColor(exp, dark = false) {
  const band = Math.floor(Math.max(0, Number(exp) || 0) / 100);
  if (!band) return dark ? "#bbbbbb" : "#666666";
  // Adjacent 100-EXP bands have distinct hues, including values above 1000.
  return `hsl(${(150 + (band - 1) * 47) % 360} 65% ${dark ? 68 : 28}%)`;
}
