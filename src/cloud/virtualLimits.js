export const MAX_VIRTUAL_TRAINEES = 10;
export const DEFAULT_TRAINING_INTENSITY = 3;
export const DEFAULT_PREFERRED_EXERCISES = ["pushups", "squats"];
export const TRAINING_INTENSITIES = [
  { level: 1, maxIntervalDays: 10, minExp: 30, maxExp: 100 },
  { level: 2, maxIntervalDays: 7, minExp: 50, maxExp: 120 },
  { level: 3, maxIntervalDays: 4, minExp: 80, maxExp: 150 },
  { level: 4, maxIntervalDays: 2, minExp: 100, maxExp: 200 },
  { level: 5, maxIntervalDays: 1, minExp: 100, maxExp: 400 },
];
export function trainingIntensityLabel(setting) {
  const interval =
    setting.maxIntervalDays === 1
      ? "매일"
      : `1~${setting.maxIntervalDays}일에 한 번`;
  return `${setting.level}단계 · ${interval} · ${setting.minExp}~${setting.maxExp} EXP`;
}
