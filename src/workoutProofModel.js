import {
  EXERCISES,
  hasWorkout,
  stats,
  isDateKey,
  validateData,
} from "./model.js";

export const APP_SHARE_URL = "https://saitama-workout.vercel.app/";
export const PROOF_POSES = [
  "double-biceps",
  "victory",
  "archer",
  "most-muscular",
  "lunge-flex",
  "knee-raise",
  "side-chest",
];
export function nextProofPose(previous, random = Math.random) {
  const choices = PROOF_POSES.filter((pose) => pose !== previous);
  return choices[
    Math.min(choices.length - 1, Math.floor(random() * choices.length))
  ];
}
export function workoutProof(data, day) {
  if (!isDateKey(day)) throw new Error("운동 날짜를 확인해 주세요.");
  const checked = validateData(data, day);
  const record = checked.records[day];
  if (!hasWorkout(record))
    throw new Error("오늘 운동한 기록을 먼저 입력해 주세요.");
  const summary = stats(checked, day);
  return {
    day,
    name: checked.characterName,
    level: summary.level,
    streak: summary.streak,
    counts: Object.fromEntries(
      EXERCISES.map(({ key }) => [key, record[key] || 0]),
    ),
  };
}
export function proofShareData(proof, file) {
  const frame = "=============";
  const icons = { pushups: "👊", squats: "🏋️", situps: "🔥", runningKm: "🏃" };
  return {
    text: [
      frame,
      `💪 ${proof.name}.. 오늘의 훈련 완료..`,
      proof.day,
      `${proof.streak || 0}일 연속 운동 중`,
      "",
      ...EXERCISES.map(
        ({ key, label, unit }) =>
          `${icons[key]} ${label} ${proof.counts[key]}${unit}`,
      ),
      "",
      `싸이따마훈련소 ${APP_SHARE_URL}`,
      frame,
    ].join("\n"),
    ...(file ? { files: [file] } : {}),
  };
}

// Posed arm endpoints also drive fists, fingers and wrist wraps.
export function armPose(p, side, pose = "idle") {
  const shoulder = [side * p.shoulder * 0.96, 2.04, 0];
  if (
    pose === "double-biceps" ||
    pose === "lunge-flex" ||
    ((pose === "archer" || pose === "knee-raise") && side === -1)
  )
    return {
      shoulder,
      elbow: [side * (p.shoulder + 0.46), 2.12, 0.02],
      hand: [side * (p.shoulder + 0.35), 2.68, 0.06],
    };
  if (pose === "victory" || pose === "archer" || pose === "knee-raise")
    return {
      shoulder,
      elbow: [side * (p.shoulder + 0.35), 2.45, 0.03],
      hand: [side * (p.shoulder + 0.68), 2.87, 0.04],
    };
  if (pose === "most-muscular")
    return {
      shoulder,
      elbow: [side * (p.shoulder + 0.25), 1.68, 0.12],
      hand: [side * 0.17, 1.52, p.shoulder * 0.62 + 0.24],
    };
  if (pose === "side-chest")
    return {
      shoulder,
      elbow: [side * (p.shoulder + 0.16), side === -1 ? 1.62 : 1.8, 0.12],
      hand: [side * 0.12, 1.8, p.shoulder * 0.62 + 0.26],
    };
  return {
    shoulder,
    elbow: [side * (p.shoulder + 0.08 + 0.1 * p.growth), 1.67, 0.005],
    hand: [side * (p.shoulder + 0.1 + 0.18 * p.growth), 1.29, 0.14 * p.growth],
  };
}

export function bodyPose(pose = "idle") {
  const stances = {
    idle: [0, -0.08],
    "double-biceps": [0.08, -0.08],
    victory: [0.04, 0.08],
    archer: [0.15, -0.25],
    "most-muscular": [0.24, -0.08],
    "lunge-flex": [0.24, 0.22],
    "knee-raise": [0, -0.18],
    "side-chest": [0.11, -0.55],
  };
  const [drop, turn] = stances[pose] || stances.idle;
  return { drop, turn };
}

// Solve the knee from fixed thigh/shin lengths so bent poses never stretch legs.
export function legPose(p, side, pose = "idle") {
  const g = p.growth;
  const hip = [side * (0.09 + 0.105 * g), 1.12, 0];
  const restKnee = [side * (0.12 + 0.14 * g), 0.67, 0.025];
  const restAnkle = [side * (0.12 + 0.2 * g), 0.31, 0];
  let ankle = [...restAnkle];
  const { drop } = bodyPose(pose);
  if (pose === "double-biceps")
    ankle = [side * (0.23 + 0.2 * g), 0.31, side * 0.1];
  if (pose === "victory") ankle = [side * (0.18 + 0.18 * g), 0.31, 0];
  if (pose === "archer")
    ankle = [side * (0.37 + 0.18 * g), 0.31, side === 1 ? 0.2 : -0.08];
  if (pose === "most-muscular") ankle = [side * (0.3 + 0.2 * g), 0.31, 0.13];
  if (pose === "lunge-flex")
    ankle = [side * (0.23 + 0.14 * g), 0.31, side === 1 ? 0.45 : -0.3];
  if (pose === "knee-raise" && side === 1) ankle = [0.3 + 0.15 * g, 0.78, 0.35];
  if (pose === "side-chest")
    ankle = [
      side * ((side === 1 ? 0.26 : 0.18) + 0.17 * g),
      0.31,
      side === 1 ? 0.2 : -0.17,
    ];
  ankle[1] += drop;
  let knee = restKnee;
  if (pose !== "idle") {
    const distance = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
    const thigh = distance(hip, restKnee),
      shin = distance(restKnee, restAnkle);
    const reach = distance(hip, ankle);
    const direction = ankle.map((v, i) => (v - hip[i]) / reach);
    const along = (thigh * thigh - shin * shin + reach * reach) / (2 * reach);
    const bend = Math.sqrt(Math.max(0, thigh * thigh - along * along));
    const forward = [side * 0.35, 0, 1];
    const dot = forward.reduce((sum, v, i) => sum + v * direction[i], 0);
    const perpendicular = forward.map((v, i) => v - dot * direction[i]);
    const length = Math.hypot(...perpendicular);
    knee = hip.map(
      (v, i) => v + direction[i] * along + (perpendicular[i] / length) * bend,
    );
  }
  return { hip, knee, ankle };
}
