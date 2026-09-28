import {
  EXERCISES,
  hasWorkout,
  stats,
  isDateKey,
  validateData,
} from "./model.js";

export const APP_SHARE_URL = "https://saitama-workout.vercel.app/";
export const PROOF_POSES = ["double-biceps", "victory", "archer"];
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
  return {
    day,
    name: checked.characterName,
    level: stats(checked, day).level,
    counts: Object.fromEntries(
      EXERCISES.map(({ key }) => [key, record[key] || 0]),
    ),
  };
}
export function proofShareData(proof, file) {
  return {
    title: `${proof.name}의 오운완 · ${proof.day}`,
    text: `${proof.day} 오운완!\n${EXERCISES.map(({ key, label, unit }) => `${label} ${proof.counts[key]}${unit}`).join(" · ")}\n싸이따마훈련소 ${APP_SHARE_URL}`,
    url: APP_SHARE_URL,
    ...(file ? { files: [file] } : {}),
  };
}

// Posed arm endpoints also drive fists, fingers and wrist wraps.
export function armPose(p, side, pose = "idle") {
  const shoulder = [side * p.shoulder * 0.96, 2.04, 0];
  if (pose === "double-biceps" || (pose === "archer" && side === -1))
    return {
      shoulder,
      elbow: [side * (p.shoulder + 0.46), 2.12, 0.02],
      hand: [side * (p.shoulder + 0.35), 2.68, 0.06],
    };
  if (pose === "victory" || pose === "archer")
    return {
      shoulder,
      elbow: [side * (p.shoulder + 0.35), 2.45, 0.03],
      hand: [side * (p.shoulder + 0.68), 2.87, 0.04],
    };
  return {
    shoulder,
    elbow: [side * (p.shoulder + 0.08 + 0.1 * p.growth), 1.67, 0.005],
    hand: [side * (p.shoulder + 0.1 + 0.18 * p.growth), 1.29, 0.14 * p.growth],
  };
}
