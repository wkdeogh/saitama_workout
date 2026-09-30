import { MAX_LEVEL } from "./model.js";
export const VISUAL_UNLOCKS = [
  { level: 1, name: "작고 마른 체형" },
  { level: 10, name: "키 성장 · 어깨 발달" },
  { level: 20, name: "가슴 근육" },
  { level: 30, name: "복근" },
  { level: 45, name: "등 · 승모근" },
  { level: 80, name: "회전 에너지 링" },
  { level: 120, name: "전신 번개" },
  { level: 150, name: "주먹 에너지" },
  { level: 175, name: "이중 링" },
  { level: 200, name: "머리카락 성장 · 삼중 링" },
  { level: 250, name: "검은 머리 · 손목 보호대" },
  { level: 350, name: "솟은 머리 · 수련 반바지" },
  { level: 450, name: "주황 도복 바지 · 푸른 부츠" },
  { level: 550, name: "푸른 허리띠 · 도복 매듭" },
  { level: 650, name: "주황 도복 상의" },
  { level: 750, name: "금빛 머리" },
  { level: 850, name: "금발 각성" },
  { level: 1000, name: "초월 · 첨탑 머리 · 사중 링" },
];

const ramp = (value, start, end) =>
  Math.max(0, Math.min(1, (value - start) / (end - start)));

export const STREAK_REWARDS = [
  { days: 10, name: "주황빛 황금 오라", color: 0xffb20c, edge: 0xffe56b },
  { days: 20, name: "붉은 오라", color: 0xff302a, edge: 0xffb128 },
  { days: 30, name: "보라색 오라", color: 0x9d52ff, edge: 0x46dfff },
  { days: 40, name: "노란 오라", color: 0xffdd33, edge: 0xffffff },
  { days: 50, name: "푸른 오라", color: 0x25aaff, edge: 0xffffff },
  { days: 60, name: "황금 오라", color: 0xffd21b, edge: 0xffffff },
];

export function characterAppearance(value, streak = 0) {
  const streakDays = Math.max(0, Math.floor(Number(streak) || 0));
  const rewardStage = Math.min(6, Math.floor(streakDays / 10));
  const reward = STREAK_REWARDS[Math.max(0, rewardStage - 1)];
  const level = Math.max(
    1,
    Math.min(MAX_LEVEL, Math.floor(Number(value) || 1)),
  );
  const beyond = ramp(level, 200, MAX_LEVEL);
  const growth =
    Math.pow((Math.min(level, 200) - 1) / 199, 0.72) + beyond * 0.15;
  return {
    level,
    growth,
    height: 0.64 + growth * 0.36,
    shoulder: 0.22 + growth * 0.51,
    waist: 0.16 + growth * 0.22,
    arm: 0.055 + growth * 0.18,
    chest: ramp(level, 10, 120),
    abs: ramp(level, 29, 130),
    back: ramp(level, 44, 150),
    streakDays,
    rewardStage,
    aura: rewardStage > 0,
    auraPower: 0.4 + Math.max(0, rewardStage - 1) * 0.12,
    auraColor: reward.color,
    auraEdge: reward.edge,
    rings:
      level >= 1000
        ? 4
        : level >= 200
          ? 3
          : level >= 175
            ? 2
            : level >= 80
              ? 1
              : 0,
    eyes: rewardStage >= 3,
    eyeFlames: rewardStage >= 3,
    eyeColor: rewardStage >= 5 ? 0x3fffe0 : 0xffec90,
    lightning: level >= 120,
    fists: level >= 150,
    awakened: level >= 200,
    hair: level >= 200 ? 0.06 + ramp(level, 200, 1000) * 0.94 : 0,
    hairGold: ramp(level, 749, 850),
    wraps: level >= 250,
    shorts: level >= 350,
    pants: level >= 450,
    sash: level >= 550,
    vest: level >= 650,
    golden: level >= 850,
    ultimate: level === 1000,
    energyColor:
      level >= 850
        ? 0xffd21b
        : level >= 650
          ? 0x25aaff
          : level >= 200
            ? 0xffdd33
            : level >= 175
              ? 0x9d52ff
              : level >= 150
                ? 0xff302a
                : 0xffb20c,
    energyEdge:
      level >= 200
        ? 0xffffff
        : level >= 175
          ? 0x46dfff
          : level >= 150
            ? 0xffb128
            : 0xffe56b,
    nextUnlock: VISUAL_UNLOCKS.find((unlock) => unlock.level > level) ?? null,
  };
}
