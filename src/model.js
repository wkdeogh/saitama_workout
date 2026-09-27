export const STORAGE_KEY = "saitama-training:v1";
export const MAX_REPS = 10000;
export const MAX_NAME_LENGTH = 20;
export function validateName(value, allowEmpty = false) {
  if (typeof value !== "string")
    throw new Error("이름을 문자로 입력해 주세요.");
  const name = value.trim();
  if (
    (!allowEmpty && !name) ||
    name.length > MAX_NAME_LENGTH ||
    /[\u0000-\u001f\u007f]/.test(name)
  )
    throw new Error("이름은 공백을 제외하고 1~20자로 입력해 주세요.");
  return name;
}
export const MAX_LEVEL = 1000;
export const EXP_PER_LEVEL = 100;
export const EXERCISES = [
  { key: "pushups", label: "푸쉬업", unit: "개", step: 1, max: MAX_REPS },
  { key: "squats", label: "스쿼트", unit: "개", step: 1, max: MAX_REPS },
  { key: "situps", label: "윗몸일으키기", unit: "개", step: 1, max: MAX_REPS },
  { key: "runningKm", label: "달리기", unit: "km", step: 0.1, max: 1000 },
];
export const emptyCounts = () =>
  Object.fromEntries(EXERCISES.map(({ key }) => [key, 0]));
export const recordExp = (record) =>
  !record
    ? 0
    : (Number(record.pushups) || 0) +
      (Number(record.squats) || 0) +
      (Number(record.situps) || 0) +
      Math.round((Number(record.runningKm) || 0) * 10);
export const STAGES = [
  {
    name: "평범한 빡빡이",
    tag: "모든 히어로의 시작",
    at: 1,
    reward: "작고 마른 체형",
    color: "#8f9c80",
  },
  {
    name: "운동 좀 한 빡빡이",
    tag: "제법 단단해졌는데?",
    at: 10,
    reward: "팔 · 어깨 근육 발달",
    color: "#72a287",
  },
  {
    name: "근육 빡빡이",
    tag: "티셔츠가 필요 없어",
    at: 30,
    reward: "넓은 어깨와 선명한 복근",
    color: "#e6ae43",
  },
  {
    name: "한계 돌파",
    tag: "심상치 않은 기운",
    at: 60,
    reward: "황금 불꽃 오라",
    color: "#f49634",
  },
  {
    name: "불꽃 히어로",
    tag: "눈빛부터 다르다",
    at: 100,
    reward: "불꽃 눈 해금",
    color: "#f16a3e",
  },
  {
    name: "원펀치의 경지",
    tag: "강함에는 끝이 없다",
    at: 200,
    reward: "머리카락 성장 · 삼중 링",
    color: "#9674c6",
  },
  { name: "무도가", at: 350, reward: "솟은 머리 · 수련복", color: "#f36b19" },
  {
    name: "도복 전사",
    at: 650,
    reward: "주황 도복 · 푸른 허리띠",
    color: "#f58220",
  },
  {
    name: "황금 전사",
    at: 850,
    reward: "금발 각성 · 청록 눈빛",
    color: "#ffcf24",
  },
  {
    name: "초월한 전사",
    at: 1000,
    reward: "황금 첨탑 머리 · 사중 에너지 링",
    color: "#ffe869",
  },
];
export function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function parseDate(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}
export function shiftDate(key, amount) {
  const d = parseDate(key);
  d.setDate(d.getDate() + amount);
  return dateKey(d);
}
export function isDateKey(key) {
  return (
    typeof key === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(key) &&
    dateKey(parseDate(key)) === key &&
    key >= "2000-01-01"
  );
}
export function initialData() {
  return {
    version: 2,
    characterName: "",
    goals: { pushups: 100, squats: 100, situps: 100, runningKm: 10 },
    records: {},
  };
}
export function isComplete(record) {
  return (
    !!record &&
    EXERCISES.some(({ key }) => record.goals?.[key] > 0) &&
    EXERCISES.every(
      ({ key }) => (record[key] || 0) >= (record.goals?.[key] || 0),
    )
  );
}
export function hasWorkout(record) {
  return recordExp(record) > 0;
}
export function stageIndex(level) {
  return Math.max(
    0,
    STAGES.findLastIndex((stage) => level >= stage.at),
  );
}
export function daysBetween(from, to) {
  const a = parseDate(from),
    b = parseDate(to);
  return Math.round(
    (Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) -
      Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) /
      86400000,
  );
}
export function progression(records, today = dateKey()) {
  const days = Object.keys(records)
    .filter((key) => key <= today && hasWorkout(records[key]))
    .sort();
  let level = 1,
    progressExp = 0,
    previous = null,
    lostLevels = 0;
  for (const day of days) {
    if (previous) {
      const penalty = Math.floor(
        Math.max(0, daysBetween(previous, day) - 1) / 5,
      );
      const next = Math.max(1, level - penalty * 5);
      lostLevels += level - next;
      level = next;
    }
    const earned = progressExp + recordExp(records[day]);
    level = Math.min(MAX_LEVEL, level + Math.floor(earned / EXP_PER_LEVEL));
    progressExp = level === MAX_LEVEL ? 0 : earned % EXP_PER_LEVEL;
    previous = day;
  }
  const inactiveDays = previous ? daysBetween(previous, today) : 0;
  const penalty = Math.floor(inactiveDays / 5);
  const finalLevel = Math.max(1, level - penalty * 5);
  lostLevels += level - finalLevel;
  return {
    level: finalLevel,
    progressExp,
    expToNext: finalLevel === MAX_LEVEL ? 0 : EXP_PER_LEVEL - progressExp,
    inactiveDays,
    lostLevels,
    daysToDecay: previous ? 5 - (inactiveDays % 5) : null,
  };
}
export function stats(data, today = dateKey()) {
  const entries = Object.entries(data.records).filter(
    ([key, r]) => key <= today && hasWorkout(r),
  );
  const total = entries.reduce((sum, [, r]) => sum + recordExp(r), 0);
  let streak = 0,
    cursor = isComplete(data.records[today]) ? today : shiftDate(today, -1);
  while (isComplete(data.records[cursor])) {
    streak++;
    cursor = shiftDate(cursor, -1);
  }
  const growth = progression(data.records, today);
  return {
    total,
    days: entries.length,
    completed: entries.filter(([, r]) => isComplete(r)).length,
    streak,
    stage: stageIndex(growth.level),
    ...growth,
  };
}
function validateCounts(input, goals = false, legacy = false) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("운동 기록과 목표를 확인해 주세요.");
  const result = {};
  for (const { key, label, step, max } of EXERCISES) {
    const value =
      legacy && ["situps", "runningKm"].includes(key) ? 0 : input[key];
    const min = goals && ["pushups", "squats"].includes(key) ? 1 : 0;
    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      value < min ||
      value > max ||
      (step === 1 && !Number.isSafeInteger(value)) ||
      Math.abs(value / step - Math.round(value / step)) > 1e-8
    )
      throw new Error(
        `${label}: ${min}~${max.toLocaleString("ko-KR")} 범위에서 ${step} 단위로 입력해 주세요.`,
      );
    result[key] = Math.round(value / step) * step;
    if (step === 0.1) result[key] = Math.round(value * 10) / 10;
  }
  return result;
}
export function validateData(input, today = dateKey()) {
  if (
    !input ||
    ![1, 2].includes(input.version) ||
    !input.records ||
    typeof input.records !== "object" ||
    Array.isArray(input.records)
  )
    throw new Error(
      "싸이따마훈련소 백업 파일이 아니거나 지원하지 않는 버전이에요.",
    );
  const legacy = input.version === 1;
  const goals = validateCounts(input.goals, true, legacy),
    records = {};
  if (Object.keys(input.records).length > 40000)
    throw new Error("기록이 너무 많아요.");
  for (const [date, r] of Object.entries(input.records)) {
    if (!isDateKey(date) || date > today)
      throw new Error("잘못된 날짜 또는 미래 날짜가 포함되어 있어요.");
    records[date] = {
      ...validateCounts(r, false, legacy),
      goals: validateCounts(r?.goals, true, legacy),
    };
  }
  const characterName =
    input.characterName === undefined
      ? ""
      : validateName(input.characterName, true);
  return { version: 2, characterName, goals, records };
}
export function parseBackup(text, today = dateKey()) {
  if (text.length > 2 * 1024 * 1024)
    throw new Error("백업 파일은 2MB 이하로 선택해 주세요.");
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("JSON 파일을 읽을 수 없어요. 파일을 확인해 주세요.");
  }
  return validateData(data, today);
}
export function mergeBackup(current, incoming, replace = false) {
  return replace
    ? {
        ...incoming,
        characterName: incoming.characterName || current.characterName || "",
      }
    : {
        version: 2,
        characterName: current.characterName || incoming.characterName || "",
        goals: current.goals,
        records: { ...current.records, ...incoming.records },
      };
}
export function saveRecord(data, date, counts, today = dateKey()) {
  if (!isDateKey(date) || date > today)
    throw new Error("오늘까지의 운동만 기록할 수 있어요.");
  const validated = validateCounts(counts);
  return {
    ...data,
    records: {
      ...data.records,
      [date]: {
        ...validated,
        goals: { ...(data.records[date]?.goals || data.goals) },
      },
    },
  };
}
export function monthCells(year, month) {
  const first = new Date(year, month, 1, 12);
  const count = new Date(year, month + 1, 0).getDate();
  return [
    ...Array(first.getDay()).fill(null),
    ...Array.from({ length: count }, (_, i) =>
      dateKey(new Date(year, month, i + 1, 12)),
    ),
  ];
}
