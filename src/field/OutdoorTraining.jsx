import { t } from "../i18n/index.js";
import { lazy, Suspense, useState } from "react";
import { TreePine, ArrowRight, LoaderCircle, Pencil } from "lucide-react";
import Character from "../Character";
import "./field.css";
const OutdoorWorld = lazy(() => import("./OutdoorWorld"));
export default function OutdoorTraining({
  user,
  name,
  level,
  streak,
  onEditName,
}) {
  const [entered, setEntered] = useState(false);
  return (
    <section className="field-lobby panel">
      <div className="field-lobby-heading">
        <span className="eyebrow">
          <TreePine size={14} aria-hidden="true" /> OUTDOOR TRAINING
        </span>
        <h2>{t("야외 훈련장")}</h2>
        <p>{t("숲속에서 함께 움직이고, 잠깐 쉬어가요.")}</p>
      </div>
      <div className="field-lobby-character">
        {!entered && (
          <Character
            level={level}
            streak={streak}
            label={t("{0}의 캐릭터", {
              0: name,
            })}
          />
        )}
      </div>
      <div className="field-lobby-name">
        <strong>{name}</strong>
        {onEditName && (
          <button
            type="button"
            className="field-edit-name"
            aria-label={t("닉네임 편집")}
            aria-haspopup="dialog"
            onClick={onEditName}
          >
            <Pencil size={16} aria-hidden="true" />
          </button>
        )}
        <span>LV. {level}</span>
      </div>
      <button className="field-enter" onClick={() => setEntered(true)}>
        {t("입장하기 ")}
        <ArrowRight size={19} aria-hidden="true" />
      </button>
      {entered && (
        <Suspense
          fallback={
            <div className="field-loading" role="status">
              <LoaderCircle size={24} />
              {t(" 훈련장을 준비하고 있어요…")}
              <button onClick={() => setEntered(false)}>{t("돌아가기")}</button>
            </div>
          }
        >
          <OutdoorWorld
            user={user}
            name={name}
            level={level}
            streak={streak}
            onClose={() => setEntered(false)}
          />
        </Suspense>
      )}
    </section>
  );
}
