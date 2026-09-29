import { emptyCounts, recordExp, MAX_LEVEL, EXP_PER_LEVEL } from "../model.js";

export function virtualEditSummary(totals, entry) {
  const totalExp = recordExp(totals);
  const changed =
    totalExp !== entry.totalExp ||
    Object.keys(emptyCounts()).some((key) => totals[key] !== entry.totals[key]);
  const todayCounts = Object.fromEntries(
    Object.keys(emptyCounts()).map((key) => [
      key,
      Math.round(
        Math.max(
          0,
          Math.min(
            Number(totals[key]) || 0,
            (entry.todayCounts[key] || 0) +
              (Number(totals[key]) || 0) -
              entry.totals[key],
          ),
        ) * 10,
      ) / 10,
    ]),
  );
  return {
    totalExp,
    level: changed
      ? Math.min(MAX_LEVEL, 1 + Math.floor(totalExp / EXP_PER_LEVEL))
      : entry.level,
    todayCounts,
  };
}
