export const MAX_VIRTUAL_TRAINEES = 10;
export const DEFAULT_TRAINING_INTENSITY = 3;
export const DEFAULT_TRAINING_FREQUENCY = 3;
export const DEFAULT_PREFERRED_EXERCISES = ["pushups", "squats"];
export const TRAINING_INTENSITIES = [
  { level: 1, minExp: 30, maxExp: 100 },
  { level: 2, minExp: 50, maxExp: 120 },
  { level: 3, minExp: 80, maxExp: 150 },
  { level: 4, minExp: 100, maxExp: 200 },
  { level: 5, minExp: 100, maxExp: 400 },
];
export const TRAINING_FREQUENCIES = [
  { level: 1, maxIntervalDays: 10 },
  { level: 2, maxIntervalDays: 7 },
  { level: 3, maxIntervalDays: 4 },
  { level: 4, maxIntervalDays: 2 },
  { level: 5, maxIntervalDays: 1 },
];
export function trainingFrequency(bot) {
  return bot.frequency ?? bot.intensity ?? DEFAULT_TRAINING_FREQUENCY;
}
export function trainingFrequencyLabel(setting) {
  const interval =
    setting.maxIntervalDays === 1
      ? "매일"
      : `1~${setting.maxIntervalDays}일에 한 번`;
  return `${setting.level}단계 · ${interval}`;
}
export function trainingIntensityLabel(setting) {
  return `${setting.level}단계 · ${setting.minExp}~${setting.maxExp} EXP`;
}
