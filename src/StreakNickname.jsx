import { STREAK_REWARDS } from "./characterAppearance";

export default function StreakNickname({ name, streak = 0, dark = false }) {
  const stage = Math.min(
    6,
    Math.max(0, Math.floor((Number(streak) || 0) / 10)),
  );
  if (!stage) return <span>{name}</span>;
  const reward = STREAK_REWARDS[stage - 1];
  return (
    <span
      className={`streak-nickname${dark ? " streak-nickname-dark" : ""}`}
      title={`${streak}일 연속 운동 · ${stage}단계`}
      style={{
        "--streak-shine": `#${reward.color.toString(16).padStart(6, "0")}`,
      }}
    >
      {name}
    </span>
  );
}
