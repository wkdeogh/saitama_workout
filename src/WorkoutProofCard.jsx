import { useEffect, useState } from "react";
import { Download, Share2, Shuffle, RotateCcw } from "lucide-react";
import { characterPortrait } from "./Character";
import { EXERCISES, recordExp } from "./model";
import {
  APP_SHARE_URL,
  nextProofPose,
  proofShareData,
} from "./workoutProofModel";

const font = '"Noto Sans KR", sans-serif';
function text(
  ctx,
  value,
  x,
  y,
  size,
  color = "#171717",
  weight = 800,
  maxWidth,
) {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${font}`;
  while (maxWidth && ctx.measureText(value).width > maxWidth && size > 18) {
    size -= 1;
    ctx.font = `${weight} ${size}px ${font}`;
  }
  ctx.fillText(value, x, y);
}
export async function createProofImage(proof, pose) {
  if (document.fonts?.ready) await document.fonts.ready;
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1440;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("이미지 생성을 지원하지 않는 브라우저입니다.");
  ctx.fillStyle = "#f7f5ef";
  ctx.fillRect(0, 0, 1080, 1440);
  ctx.fillStyle = "#171717";
  ctx.fillRect(0, 0, 1080, 198);
  ctx.fillStyle = "#ffdf48";
  ctx.fillRect(0, 0, 16, 198);
  text(ctx, "오늘의 훈련 완료", 54, 135, 68, "#ffdf48", 900, 650);
  ctx.textAlign = "right";
  text(ctx, proof.day.replaceAll("-", "."), 1026, 84, 38, "#ffffff");
  text(ctx, "싸이따마훈련소", 1026, 141, 32, "#ffffff", 600);
  ctx.textAlign = "left";

  const glow = ctx.createRadialGradient(540, 610, 40, 540, 610, 570);
  glow.addColorStop(0, "#ffdf48");
  glow.addColorStop(0.55, "#f9e9a1");
  glow.addColorStop(1, "#f7f5ef");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 198, 1080, 786);
  // Comic speed lines keep the stage legible behind high-level effects.
  ctx.strokeStyle = "#17171712";
  ctx.lineWidth = 3;
  for (let i = 0; i < 28; i++) {
    const angle = (i * Math.PI) / 14;
    ctx.beginPath();
    ctx.moveTo(540 + Math.cos(angle) * 330, 610 + Math.sin(angle) * 330);
    ctx.lineTo(540 + Math.cos(angle) * 740, 610 + Math.sin(angle) * 740);
    ctx.stroke();
  }
  const portrait = characterPortrait(proof.level, pose, 972, 710, proof.streak);
  ctx.drawImage(portrait, 54, 264);
  ctx.fillStyle = "#171717";
  ctx.fillRect(54, 228, 188, 64);
  text(ctx, `LV. ${proof.level}`, 74, 272, 34, "#ffdf48", 900, 148);
  ctx.textAlign = "right";
  text(ctx, proof.name, 1026, 273, 38, "#171717", 900, 740);
  ctx.textAlign = "left";
  text(
    ctx,
    `${proof.streak || 0}일 연속 운동 중!`,
    74,
    334,
    30,
    "#171717",
    800,
    600,
  );

  ctx.fillStyle = "#c7372b";
  ctx.fillRect(54, 926, 972, 64);
  text(ctx, "오늘의 운동", 78, 970, 31, "#ffffff");
  ctx.textAlign = "right";
  text(
    ctx,
    `+${recordExp(proof.counts).toLocaleString("ko-KR")} EXP`,
    1000,
    970,
    32,
    "#ffffff",
  );
  ctx.textAlign = "left";
  EXERCISES.forEach(({ key, label, unit }, index) => {
    const x = 54 + (index % 2) * 496;
    const y = 1006 + Math.floor(index / 2) * 142;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x, y, 476, 126);
    ctx.strokeStyle = "#171717";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, 476, 126);
    text(ctx, label, x + 24, y + 43, 28, "#555555", 600);
    text(
      ctx,
      `${proof.counts[key].toLocaleString("ko-KR")} ${unit}`,
      x + 24,
      y + 98,
      44,
      "#171717",
      900,
      430,
    );
  });
  ctx.fillStyle = "#171717";
  ctx.fillRect(0, 1310, 1080, 130);
  text(ctx, "싸이따마훈련소", 54, 1360, 28, "#ffdf48");
  text(ctx, APP_SHARE_URL, 54, 1404, 29, "#ffffff", 600);
  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  if (!blob) throw new Error("이미지를 만들지 못했습니다. 다시 시도해 주세요.");
  return new File([blob], `오운완-${proof.day}.png`, { type: "image/png" });
}

export default function WorkoutProofCard({ proof }) {
  const [pose, setPose] = useState(() => nextProofPose());
  const [attempt, setAttempt] = useState(0);
  const [image, setImage] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [sharing, setSharing] = useState(false);
  useEffect(() => {
    let active = true,
      url;
    setImage(null);
    setError("");
    setMessage("");
    // Let the dialog and its loading state paint before WebGL work begins.
    const timer = setTimeout(() => {
      createProofImage(proof, pose)
        .then((file) => {
          if (!active) return;
          url = URL.createObjectURL(file);
          setImage({ file, url });
        })
        .catch(() => {
          if (active)
            setError(
              "캐릭터 이미지를 만들지 못했습니다. 3D를 지원하는 브라우저에서 다시 시도해 주세요.",
            );
        });
    }, 50);
    return () => {
      active = false;
      clearTimeout(timer);
      if (url) URL.revokeObjectURL(url);
    };
  }, [proof, pose, attempt]);
  async function share() {
    if (!image || sharing) return;
    const payload = proofShareData(proof, image.file);
    if (!navigator.share || !navigator.canShare?.(payload)) {
      setMessage(
        "이 브라우저는 이미지 공유를 지원하지 않습니다. 이미지를 저장해 공유해 주세요.",
      );
      return;
    }
    setSharing(true);
    setMessage("");
    try {
      await navigator.share(payload);
    } catch (e) {
      if (e.name !== "AbortError")
        setMessage("공유창을 열지 못했습니다. 이미지를 저장해 공유해 주세요.");
    } finally {
      setSharing(false);
    }
  }
  return (
    <div className="workout-proof">
      <div className="proof-preview" aria-busy={!image && !error}>
        {image ? (
          <img
            src={image.url}
            alt={`${proof.day} ${proof.name} LV. ${proof.level} 오운완. ${proof.streak || 0}일 연속 운동 중! ${EXERCISES.map(({ key, label, unit }) => `${label} ${proof.counts[key]}${unit}`).join(", ")}`}
          />
        ) : (
          <div className="proof-loading" role="status">
            {error || "인증 이미지 만드는 중…"}
            {error && (
              <button
                className="secondary-button"
                onClick={() => setAttempt((n) => n + 1)}
              >
                <RotateCcw size={17} />
                다시 시도
              </button>
            )}
          </div>
        )}
      </div>
      <div className="proof-actions">
        <button
          className="secondary-button"
          disabled={!image || sharing}
          onClick={() => setPose(nextProofPose(pose))}
        >
          <Shuffle size={17} />
          다른 포즈
        </button>
        <a
          className={`secondary-button proof-download ${!image ? "disabled" : ""}`}
          href={image?.url}
          download={image?.file.name}
          aria-disabled={!image}
          onClick={(e) => {
            if (!image) e.preventDefault();
          }}
        >
          <Download size={17} />
          이미지 저장
        </a>
        <button
          className="primary-button"
          disabled={!image || sharing}
          onClick={share}
        >
          <Share2 size={17} />
          {sharing ? "공유 중…" : "공유"}
        </button>
      </div>
      {message && (
        <p className="proof-message" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
