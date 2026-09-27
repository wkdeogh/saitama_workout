export const VISUAL_UNLOCKS = [
  { level: 1, name: "작고 마른 체형" },
  { level: 10, name: "키 성장 · 어깨 발달" },
  { level: 20, name: "가슴 근육" },
  { level: 30, name: "복근" },
  { level: 45, name: "등 · 승모근" },
  { level: 60, name: "황금 불꽃 오라" },
  { level: 80, name: "회전 에너지 링" },
  { level: 100, name: "불꽃 눈" },
  { level: 120, name: "전신 번개" },
  { level: 150, name: "붉은 오라 · 주먹 에너지" },
  { level: 175, name: "보라색 오라 · 이중 링" },
  { level: 200, name: "최종 각성 · 삼중 링" },
];

const ramp = (value, start, end) =>
  Math.max(0, Math.min(1, (value - start) / (end - start)));

export function characterAppearance(value) {
  const level = Math.max(1, Math.min(200, Math.floor(Number(value) || 1)));
  const growth = Math.pow((level - 1) / 199, 0.72);
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
    aura: level >= 60,
    auraPower: 0.4 + ramp(level, 60, 200) * 0.6,
    rings: level >= 200 ? 3 : level >= 175 ? 2 : level >= 80 ? 1 : 0,
    eyes: level >= 100,
    lightning: level >= 120,
    fists: level >= 150,
    awakened: level === 200,
    auraColor:
      level === 200
        ? 0xffdd33
        : level >= 175
          ? 0x9d52ff
          : level >= 150
            ? 0xff302a
            : 0xffb20c,
    auraEdge:
      level === 200
        ? 0xffffff
        : level >= 175
          ? 0x46dfff
          : level >= 150
            ? 0xffb128
            : 0xffe56b,
    nextUnlock: VISUAL_UNLOCKS.find((unlock) => unlock.level > level) ?? null,
  };
}
