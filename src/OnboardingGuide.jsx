import { t, localizeExercise } from "./i18n/index.js";
import { useEffect, useRef, useState } from "react";
import {
  Dumbbell,
  Sparkles,
  Trophy,
  Camera,
  Smartphone,
  TreePine,
  ChevronLeft,
  ChevronRight,
  Check,
} from "lucide-react";
import { swipePage } from "./onboardingModel";
import { EXERCISES, DAILY_WORKOUT_LIMITS, initialData } from "./model";
import useLanguage from "./i18n/useLanguage.js";
import TrainingMotto from "./TrainingMotto";
const DEFAULT_GOALS = initialData().goals;

function GuideGoals({ draft, onChange, onSave, dirty, feedback, enabled }) {
  const message = useRef(null);
  useEffect(() => {
    if (feedback?.kind === "error")
      message.current?.scrollIntoView({ block: "nearest" });
  }, [feedback]);
  return (
    <form
      className="guide-goal-form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <div className="guide-goals">
        {EXERCISES.map(localizeExercise).map(({ key, label, unit, step }) => (
          <label key={key}>
            <span>{label}</span>
            <div className="guide-goal-input">
              <input
                type="number"
                inputMode={step === 1 ? "numeric" : "decimal"}
                min={key === "pushups" || key === "squats" ? 1 : 0}
                max={DAILY_WORKOUT_LIMITS[key]}
                step={step}
                value={draft[key]}
                disabled={!enabled}
                aria-label={t("{0} 하루 목표", { 0: label })}
                onChange={(event) => onChange(key, event.target.value)}
              />
              <span>{unit}</span>
            </div>
          </label>
        ))}
      </div>
      <button
        className="primary-button"
        type="submit"
        disabled={!enabled || !dirty}
      >
        <Check size={16} aria-hidden="true" />
        {t(
          feedback?.kind === "success" && !dirty
            ? "목표 저장 완료"
            : "목표 저장",
        )}
      </button>
      {feedback && (
        <p
          ref={message}
          className={feedback.kind === "error" ? "error-box" : "hint"}
          role={feedback.kind === "error" ? "alert" : "status"}
        >
          {t(feedback.text)}
        </p>
      )}
    </form>
  );
}
function getPages(goalEditor) {
  return [
    {
      title: t("소개"),
      intro: true,
      content: (
        <blockquote className="guide-intro">
          <p className="guide-intro-opening">
            {t("“너희들에게도 알려주지. 내가 어떻게 강해졌는지.”")}
          </p>
          <TrainingMotto />
          <ol className="guide-intro-rules">
            <li>{t("아무리 힘들어도 매일 계속할 것!")}</li>
            <li>{t("여름에는 에어컨, 겨울에는 난방을 사용하지 않을 것!")}</li>
            <li>
              {t("하루 세 끼를 먹되, 아침에는 바나나 하나만 먹어도 괜찮다!")}
            </li>
            <li>{t("이걸 3년 동안 계속한다!")}</li>
          </ol>
        </blockquote>
      ),
    },
    {
      title: t("운동 입력과 목표"),
      icon: Dumbbell,
      content: (
        <>
          {goalEditor}
          <p className="hint">{t("기타운동·달리기 목표 0 = 선택 운동")}</p>
          <p>
            {t(
              "오늘 기록만 입력할 수 있습니다. 하루 한도: 각 300개·달리기 60km.",
            )}
          </p>
        </>
      ),
    },
    {
      title: t("야외 훈련장"),
      icon: TreePine,
      content: (
        <>
          <p>{t("야외 훈련장에서 다른 유저들에게 내 캐릭터를 뽐내보세요.")}</p>
          <ul>
            <li>
              {t(
                "이동: WASD·방향키 또는 조이스틱. 화면 드래그로 시점을 돌립니다.",
              )}
            </li>
            <li>
              {t(
                "푸쉬업·스쿼트는 반복 동작입니다. 다시 누르거나 이동하면 멈춥니다.",
              )}
            </li>
            <li>{t("다른 유저의 닉네임과 말풍선은 가까이 가면 보입니다.")}</li>
          </ul>
          <p>{t("이곳의 동작은 운동 기록·EXP에 반영되지 않습니다.")}</p>
        </>
      ),
    },
    {
      title: t("EXP와 캐릭터 성장"),
      icon: Sparkles,
      content: (
        <>
          <div className="guide-highlight">
            <strong>100 EXP</strong>
            <span>{t("마다 1레벨 상승 · 최대 LV. 1000")}</span>
          </div>
          <p>
            {t("푸쉬업·스쿼트·기타운동 1개 = 1 EXP. 달리기 0.1km = 2 EXP.")}
          </p>
          <p>{t("목표 달성과 관계없이 운동량만큼 EXP가 쌓입니다.")}</p>
          <p>
            {t(
              "미기록 5일째부터 매일 1레벨 감소합니다. 운동을 기록하면 초기화됩니다.",
            )}
          </p>
          <p>
            {t(
              "연속 운동 10일마다 오라가 강화됩니다(최대 60일). 30일에는 불꽃 눈, 50일에는 청록색 불꽃 눈이 열립니다.",
            )}
          </p>
          <p>{t("하루 쉬면 연속 운동 보상이 초기화됩니다.")}</p>
        </>
      ),
    },
    {
      title: t("친구와 랭킹"),
      icon: Trophy,
      content: (
        <>
          <p>{t("닉네임 앞부분 또는 계정 태그로 친구를 찾습니다.")}</p>
          <p>
            {t(
              "전체 랭킹은 상위 50명까지 표시합니다. 주간 랭킹은 월요일 0시(한국 시간)부터 집계합니다.",
            )}
          </p>
        </>
      ),
    },
    {
      title: t("오늘의 훈련 공유"),
      icon: Camera,
      content: (
        <>
          <p>
            {t(
              "오운완을 누르면 기록을 저장하고 캐릭터 인증 이미지를 만듭니다.",
            )}
          </p>
          <p>
            {t(
              "주소를 먼저 공유한 뒤, 같은 대화에 이미지를 공유합니다. 링크복사는 앱 주소를 복사합니다.",
            )}
          </p>
        </>
      ),
    },
    {
      title: t("아이폰 홈 화면에 추가"),
      icon: Smartphone,
      content: (
        <>
          <p>{t("Safari → 공유 → 홈 화면에 추가.")}</p>
          <p>{t("‘웹 앱으로 열기’가 보이면 켭니다.")}</p>
          <p>
            {t(
              "아이폰 푸시 알림은 홈 화면에 추가한 앱에서 사용할 수 있습니다.",
            )}
          </p>
          <a
            href="https://support.apple.com/ko-kr/guide/iphone/iphea86e5236/ios"
            target="_blank"
            rel="noreferrer"
          >
            {t("Apple 안내")}
          </a>
        </>
      ),
    },
    {
      title: t("갤럭시 홈 화면에 추가"),
      icon: Smartphone,
      content: (
        <>
          <p>{t("Chrome: ⋮ → 홈 화면에 추가 → 설치 또는 바로가기 만들기.")}</p>
          <p>{t("삼성 인터넷: ☰ → 현재 페이지 추가 → 홈 화면 → 추가.")}</p>
          <p>{t("메뉴가 보이지 않으면 Chrome에서 다시 여세요.")}</p>
          <a
            href="https://support.google.com/chrome/answer/15085120?co=GENIE.Platform%3DAndroid&hl=ko"
            target="_blank"
            rel="noreferrer"
          >
            {t("Chrome 안내")}
          </a>
        </>
      ),
    },
  ];
}
export default function OnboardingGuide({
  onClose,
  goals = DEFAULT_GOALS,
  onSaveGoals,
}) {
  useLanguage();
  const [page, setPage] = useState(0),
    [direction, setDirection] = useState(1);
  const [draft, setDraft] = useState(() => ({ ...goals })),
    [feedback, setFeedback] = useState(null);
  const touch = useRef(null),
    area = useRef(null);
  useEffect(() => {
    setDraft({ ...goals });
  }, [goals.pushups, goals.squats, goals.situps, goals.runningKm]);
  useEffect(() => {
    area.current?.scrollTo({ top: 0 });
  }, [page]);
  const dirty = EXERCISES.some(
    ({ key }) => String(draft[key]) !== String(goals[key]),
  );
  function saveGoals() {
    if (!dirty) return true;
    try {
      if (!onSaveGoals || onSaveGoals(draft) === false)
        throw new Error(
          "기록을 저장하지 못했습니다. 연결 상태와 저장 공간을 확인해 주세요.",
        );
      setFeedback({ kind: "success", text: "목표를 저장했습니다." });
      return true;
    } catch (error) {
      setFeedback({ kind: "error", text: error.message });
      return false;
    }
  }
  const pages = getPages(
    <GuideGoals
      draft={draft}
      onChange={(key, value) => {
        setDraft((current) => ({ ...current, [key]: value }));
        setFeedback(null);
      }}
      onSave={saveGoals}
      dirty={dirty}
      feedback={feedback}
      enabled={!!onSaveGoals}
    />,
  );
  const current = pages[page],
    Icon = current.icon;
  function go(next) {
    const bounded = Math.max(0, Math.min(pages.length - 1, next));
    if (bounded === page) return;
    if (page === 1 && bounded > page && dirty && !saveGoals()) return;
    setDirection(bounded > page ? 1 : -1);
    setPage(bounded);
  }
  return (
    <div
      className="onboarding-guide"
      onKeyDown={(event) => {
        if (
          event.target.matches("input,textarea,select") ||
          event.target.isContentEditable
        )
          return;
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          go(page + (event.key === "ArrowLeft" ? -1 : 1));
        }
      }}
    >
      <div
        className="guide-progress"
        aria-label={t("{0}페이지 중 {1}페이지", {
          0: pages.length,
          1: page + 1,
        })}
      >
        {pages.map((item, index) => (
          <span key={item.title} className={index <= page ? "filled" : ""} />
        ))}
        <strong>
          {page + 1} / {pages.length}
        </strong>
      </div>
      <div
        className="guide-swipe"
        ref={area}
        role="region"
        aria-label={current.title}
        tabIndex={0}
        aria-live="polite"
        aria-atomic="true"
        onPointerDown={(event) => {
          touch.current = null;
          if (
            event.button === 0 &&
            !event.target.closest("a,button,input,textarea,select,label")
          )
            touch.current = { x: event.clientX, y: event.clientY };
        }}
        onPointerUp={(event) => {
          const change = swipePage(touch.current, {
            x: event.clientX,
            y: event.clientY,
          });
          touch.current = null;
          if (change) go(page + change);
        }}
        onPointerCancel={() => {
          touch.current = null;
        }}
      >
        <section
          key={page}
          className={`guide-page ${direction > 0 ? "from-right" : "from-left"}`}
        >
          {!current.intro && (
            <>
              <div className="guide-icon">
                <Icon size={28} aria-hidden="true" />
              </div>
              <h3>{current.title}</h3>
            </>
          )}
          {current.content}
        </section>
      </div>
      <div className="guide-navigation">
        <button
          className="secondary-button"
          disabled={page === 0}
          onClick={() => go(page - 1)}
        >
          <ChevronLeft size={18} aria-hidden="true" />
          {t("이전")}
        </button>
        <button
          className="primary-button"
          onClick={() => (page === pages.length - 1 ? onClose() : go(page + 1))}
        >
          {page === pages.length - 1 ? (
            <>
              {t("완료")}
              <Check size={18} aria-hidden="true" />
            </>
          ) : (
            <>
              {t("다음")}
              <ChevronRight size={18} aria-hidden="true" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
