export const STORAGE_KEY = "saitama-training:v1";
export const MAX_REPS = 10000;
export const STAGES = [
  {
    name: "평범한 빡빡이",
    tag: "모든 히어로의 시작",
    at: 1,
    reward: "기본 체형",
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
    reward: "황금색 오라 해금",
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
    reward: "보라색 오라 · 최대 체격",
    color: "#9674c6",
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
  return { version: 1, goals: { pushups: 50, squats: 50 }, records: {} };
}
export function isComplete(record) {
  return (
    !!record &&
    record.pushups >= record.goals.pushups &&
    record.squats >= record.goals.squats
  );
}
export function hasWorkout(record) {
  return !!record && record.pushups + record.squats > 0;
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
    progressDays = 0,
    previous = null,
    lostLevels = 0;
  for (const day of days) {
    if (previous) {
      const penalty = Math.floor(
        Math.max(0, daysBetween(previous, day) - 1) / 10,
      );
      const next = Math.max(1, level - penalty);
      lostLevels += level - next;
      level = next;
    }
    progressDays++;
    if (progressDays === 10) {
      level = Math.min(200, level + 1);
      progressDays = 0;
    }
    previous = day;
  }
  const inactiveDays = previous ? daysBetween(previous, today) : 0;
  const penalty = Math.floor(inactiveDays / 10);
  const finalLevel = Math.max(1, level - penalty);
  lostLevels += level - finalLevel;
  return {
    level: finalLevel,
    progressDays,
    daysToNext: 10 - progressDays,
    inactiveDays,
    lostLevels,
    daysToDecay: previous ? 10 - (inactiveDays % 10) : null,
  };
}
export function stats(data, today = dateKey()) {
  const entries = Object.entries(data.records).filter(
    ([key, r]) => key <= today && hasWorkout(r),
  );
  const total = entries.reduce((sum, [, r]) => sum + r.pushups + r.squats, 0);
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
function validCount(value, min = 0) {
  return Number.isSafeInteger(value) && value >= min && value <= MAX_REPS;
}
function validateGoals(goals) {
  if (!goals || !validCount(goals.pushups, 1) || !validCount(goals.squats, 1))
    throw new Error("운동 목표는 1~10,000 사이의 정수여야 해요.");
  return { pushups: goals.pushups, squats: goals.squats };
}
export function validateData(input, today = dateKey()) {
  if (
    !input ||
    input.version !== 1 ||
    !input.records ||
    typeof input.records !== "object" ||
    Array.isArray(input.records)
  )
    throw new Error(
      "사이타마훈련소 백업 파일이 아니거나 지원하지 않는 버전이에요.",
    );
  const goals = validateGoals(input.goals),
    records = {};
  if (Object.keys(input.records).length > 40000)
    throw new Error("기록이 너무 많아요.");
  for (const [date, r] of Object.entries(input.records)) {
    if (!isDateKey(date) || date > today)
      throw new Error("잘못된 날짜 또는 미래 날짜가 포함되어 있어요.");
    if (!r || !validCount(r.pushups) || !validCount(r.squats))
      throw new Error("운동 횟수는 0~10,000 사이의 정수여야 해요.");
    records[date] = {
      pushups: r.pushups,
      squats: r.squats,
      goals: validateGoals(r.goals),
    };
  }
  return { version: 1, goals, records };
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
    ? incoming
    : {
        version: 1,
        goals: current.goals,
        records: { ...current.records, ...incoming.records },
      };
}
export function saveRecord(data, date, counts, today = dateKey()) {
  if (!isDateKey(date) || date > today)
    throw new Error("오늘까지의 운동만 기록할 수 있어요.");
  if (!validCount(counts.pushups) || !validCount(counts.squats))
    throw new Error("횟수는 0~10,000 사이의 정수로 입력해 주세요.");
  return {
    ...data,
    records: {
      ...data.records,
      [date]: {
        ...counts,
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
