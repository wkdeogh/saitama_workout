import { useEffect, useRef, useState } from "react";
import {
  Zap,
  Flame,
  CalendarDays,
  Dumbbell,
  Sparkles,
  Settings,
  CircleHelp,
  ChevronLeft,
  ChevronRight,
  Check,
  Plus,
  Minus,
  X,
  ShieldCheck,
  Trophy,
  LockKeyhole,
  RotateCcw,
  ArrowRight,
  Camera,
} from "lucide-react";
import Character from "./Character";
import WorkoutProofCard from "./WorkoutProofCard";
import OnboardingGuide from "./OnboardingGuide";
import { claimOnboarding } from "./onboardingModel";
import { workoutProof } from "./workoutProofModel";
import useWorkoutAccount from "./cloud/useWorkoutAccount";
import AdminPanel from "./cloud/AdminPanel";
import { friendApi } from "./cloud/friendsClient";
import FriendsPanel from "./cloud/FriendsPanel";
import useFriends from "./cloud/useFriends";
import { LoginScreen, AccountControls } from "./cloud/RankingPanel";
import { displayedLevel } from "./cloud/rankingModel";
import { displayedDailyActivity, dailyExpColor } from "./cloud/dailyActivity";
import useKoreaDay from "./cloud/useKoreaDay";
import { characterAppearance, VISUAL_UNLOCKS } from "./characterAppearance";
import {
  MAX_NAME_LENGTH,
  validateName,
  MAX_LEVEL,
  EXERCISES,
  emptyCounts,
  recordExp,
  dateKey,
  parseDate,
  isComplete,
  hasWorkout,
  stats,
  validateData,
  saveRecord,
  updateGoals,
  monthCells,
  stageIndex,
} from "./model";
const number = (value) => value.toLocaleString("ko-KR");
const dateLabel = (key) =>
  parseDate(key).toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "long",
  });
function Modal({
  title,
  onClose,
  children,
  dismissible = true,
  hideTitle = false,
}) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = ref.current;
    dialog.showModal();
    return () => {
      dialog.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        if (dismissible) onClose();
      }}
      onClick={(e) => {
        if (dismissible && e.target === ref.current) onClose();
      }}
      className="modal"
    >
      <div className="modal-inner">
        <div
          className={`section-heading${hideTitle ? " modal-close-only" : ""}`}
        >
          <h2 className={hideTitle ? "sr-only" : undefined}>{title}</h2>
          {dismissible && (
            <button className="icon-button" aria-label="닫기" onClick={onClose}>
              <X size={21} />
            </button>
          )}
        </div>
        {children}
      </div>
    </dialog>
  );
}
export function HelpDialog({ onClose }) {
  return (
    <Modal title="사용 가이드" onClose={onClose}>
      <OnboardingGuide onClose={onClose} />
    </Modal>
  );
}
function StageDialog({ stage, currentLevel, onClose }) {
  const locked = stage.level > currentLevel;
  const appearance = characterAppearance(stage.level);
  return (
    <Modal title={`LV. ${stage.level} 성장 단계`} onClose={onClose}>
      <p className="stage-reveal-name">{stage.name}</p>
      <div
        className={`stage-reveal character-stage character-evolved ${locked ? "stage-concealed" : "stage-unlocked"}`}
        data-powered={appearance.aura}
        style={{
          "--aura-color": `#${appearance.auraColor.toString(16).padStart(6, "0")}`,
        }}
      >
        <Character
          level={stage.level}
          stage={stageIndex(stage.level)}
          label={
            locked ? `${stage.level}레벨 잠긴 외형의 어두운 실루엣` : undefined
          }
        />
        {locked && <div className="conceal-veil" aria-hidden="true" />}
      </div>
      <p className={`stage-reveal-status ${locked ? "is-locked" : ""}`}>
        {locked ? <LockKeyhole size={17} /> : <Check size={17} />}
        {locked
          ? `LV. ${stage.level} 해금 · ${stage.level - currentLevel}레벨 남음`
          : "해금한 외형"}
      </p>
    </Modal>
  );
}
function RankingUserDialog({ entry, onClose }) {
  const day = useKoreaDay();
  const { todayCounts, todayExp } = displayedDailyActivity(entry, day);
  const level = displayedLevel(entry, day),
    appearance = characterAppearance(level);
  return (
    <Modal title={entry.characterName} onClose={onClose}>
      <p className="ranking-user-level">LV. {level}</p>
      {entry.tag && <p className="friend-profile-tag">#{entry.tag}</p>}
      <div
        className="stage-reveal character-stage character-evolved stage-unlocked"
        data-powered={appearance.aura}
        style={{
          "--aura-color": `#${appearance.auraColor.toString(16).padStart(6, "0")}`,
        }}
      >
        <Character level={level} stage={stageIndex(level)} />
      </div>
      <div className="ranking-user-totals">
        {EXERCISES.map(({ key, label, unit }) => (
          <div key={key}>
            <span>{label}</span>
            <strong>
              {number(entry.totals[key])}
              <small>{unit}</small>
            </strong>
            <small
              className="daily-count"
              style={{ color: dailyExpColor(todayExp) }}
            >
              오늘 ▲ {number(todayCounts[key])}
              {unit}
            </small>
          </div>
        ))}
      </div>
      <p className="hint">누적 운동량 · {number(entry.totalExp)} EXP</p>
    </Modal>
  );
}
function CharacterNameForm({ initialName = "", onSave, autofocus = false }) {
  const [name, setName] = useState(initialName);
  const [message, setMessage] = useState("");
  return (
    <form
      className="name-form"
      onSubmit={(e) => {
        e.preventDefault();
        try {
          const next = validateName(name);
          if (onSave(next)) {
            setName(next);
            setMessage("");
          } else
            setMessage(
              "이름을 저장하지 못했습니다. 저장 공간과 권한을 확인해 주세요.",
            );
        } catch (error) {
          setMessage(error.message);
        }
      }}
    >
      <label htmlFor="character-name">캐릭터 이름</label>
      <input
        id="character-name"
        type="text"
        value={name}
        maxLength={MAX_NAME_LENGTH}
        autoFocus={autofocus}
        autoComplete="off"
        placeholder="이름 입력"
        required
        aria-describedby="character-name-hint"
        aria-invalid={!!message}
        onChange={(e) => {
          setName(e.target.value);
          setMessage("");
        }}
      />
      <p id="character-name-hint" className="hint">
        최대 20자 · 설정에서 변경 가능
      </p>
      {message && (
        <p className="error-box" role="alert">
          {message}
        </p>
      )}
      <button type="submit" className="primary-button">
        이름 저장
      </button>
    </form>
  );
}
function ExerciseIcon({ type }) {
  return (
    <svg viewBox="0 0 60 42" fill="none" aria-hidden="true">
      <g
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {type === "pushups" ? (
          <>
            <circle cx="43" cy="10" r="4" fill="currentColor" stroke="none" />
            <path d="m8 29 14-12 15 1 7 14h7M37 18l-7 14h9M6 34h47" />
          </>
        ) : type === "runningKm" ? (
          <>
            <circle cx="34" cy="5" r="4" fill="currentColor" stroke="none" />
            <path d="m31 14-8 11 12 4 5 10M24 24l-9 12H6M31 14l9 7 10-4M29 14l-12 3-5 9" />
          </>
        ) : type === "situps" ? (
          <>
            <circle cx="15" cy="15" r="4" fill="currentColor" stroke="none" />
            <path d="m19 22 12 12 10-15 10 15M19 22l8-8 5 5M7 38h47" />
          </>
        ) : (
          <>
            <circle cx="33" cy="6" r="4" fill="currentColor" stroke="none" />
            <path d="m30 15-7 11 16 3-5 8h11M30 15l8 6 12-2M23 26l-9 9H7" />
          </>
        )}
      </g>
    </svg>
  );
}
function WorkoutCard({ type, label, value, goal, onChange }) {
  const { unit, step, max } = EXERCISES.find(({ key }) => key === type);
  const running = type === "runningKm";
  const done = goal > 0 && Number(value) >= goal;
  const add = (amount) =>
    onChange(
      Math.round(
        Math.min(max, Math.max(0, (Number(value) || 0) + amount)) * 10,
      ) / 10,
    );
  return (
    <div className={`exercise-card ${done ? "exercise-done" : ""}`}>
      <div className="exercise-top">
        <span className={`exercise-illustration ${type}`}>
          <ExerciseIcon type={type} />
        </span>
        <div>
          <h3>{label}</h3>
          <span>
            {goal > 0 ? `목표 ${goal}${unit}` : "선택 운동"}
            <br />
            {running ? "0.1km=2 EXP" : "1개=1 EXP"}
          </span>
        </div>
        <button
          type="button"
          className={`complete-toggle ${done ? "checked" : ""}`}
          aria-label={`${label} 목표 채우기`}
          disabled={!goal}
          aria-pressed={done}
          onClick={() =>
            onChange(done ? 0 : Math.max(Number(value) || 0, goal))
          }
        >
          <Check size={17} />
        </button>
      </div>
      <div className="count-row">
        <button
          type="button"
          className="counter-btn"
          aria-label={`${label} ${step}${unit} 빼기`}
          disabled={!Number(value)}
          onClick={() => add(-step)}
        >
          <Minus size={17} />
        </button>
        <label
          className={`count-field ${String(value).length > 3 ? "count-long" : String(value).length > 2 ? "count-medium" : ""}`}
        >
          <input
            aria-label={`${label} ${running ? "거리" : "횟수"}`}
            type="number"
            inputMode={running ? "decimal" : "numeric"}
            min="0"
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          <span>
            {goal > 0 ? `/ ${goal}` : ""}
            <small> {unit}</small>
          </span>
        </label>
        <button
          type="button"
          className="counter-btn"
          aria-label={`${label} ${step}${unit} 더하기`}
          disabled={Number(value) >= max}
          onClick={() => add(step)}
        >
          <Plus size={17} />
        </button>
      </div>
      <div className="track">
        <i
          style={{
            width: `${Math.min(100, Math.max(0, goal > 0 ? (Number(value) / goal) * 100 : 0))}%`,
          }}
        />
      </div>
      <div className="quick-add">
        {(running ? [0.1, 1] : [10, 25]).map((n) => (
          <button type="button" key={n} onClick={() => add(n)}>
            +{n}
            {unit}
          </button>
        ))}
        <button
          type="button"
          disabled={!goal}
          onClick={() => onChange(Math.max(Number(value) || 0, goal))}
        >
          목표 채우기 <Check size={13} />
        </button>
      </div>
    </div>
  );
}
function Calendar({ data, selected, onSelect, today, month, setMonth }) {
  const y = month.getFullYear(),
    m = month.getMonth();
  const prefix = `${y}-${String(m + 1).padStart(2, "0")}`;
  const complete = Object.entries(data.records).filter(
    ([k, r]) => k.startsWith(prefix) && isComplete(r),
  ).length;
  return (
    <section className="panel calendar-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">TRAINING LOG</span>
          <h2>운동 캘린더</h2>
        </div>
        <span className="month-badge">
          <span>{complete}</span>일 달성
        </span>
      </div>
      <div className="calendar-toolbar">
        <strong>
          {y}년 {m + 1}월
        </strong>
        <div>
          <button
            className="today-button"
            onClick={() => {
              setMonth(parseDate(today));
              onSelect(today);
            }}
          >
            오늘
          </button>
          <button
            className="icon-button"
            aria-label="이전 달"
            disabled={y === 2000 && m === 0}
            onClick={() => setMonth(new Date(y, m - 1, 1, 12))}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            className="icon-button"
            aria-label="다음 달"
            disabled={
              y === parseDate(today).getFullYear() &&
              m === parseDate(today).getMonth()
            }
            onClick={() => setMonth(new Date(y, m + 1, 1, 12))}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <div className="calendar-grid">
        <div className="weekdays">
          {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="days">
          {monthCells(y, m).map((key, i) =>
            key ? (
              <button
                key={key}
                className={`day ${isComplete(data.records[key]) ? "complete" : hasWorkout(data.records[key]) ? "partial" : ""} ${key === selected ? "selected" : ""} ${key === today ? "is-today" : ""}`}
                disabled={key > today}
                aria-label={`${dateLabel(key)}${isComplete(data.records[key]) ? ", 목표 달성" : hasWorkout(data.records[key]) ? ", 운동 기록 있음" : ""}`}
                aria-pressed={key === selected}
                onClick={() => onSelect(key)}
              >
                <span>{Number(key.slice(-2))}</span>
                <span className="day-indicator">
                  {isComplete(data.records[key]) ? (
                    <Check size={12} />
                  ) : hasWorkout(data.records[key]) ? (
                    <i />
                  ) : key === today ? (
                    <i />
                  ) : null}
                </span>
              </button>
            ) : (
              <span key={`blank${i}`} />
            ),
          )}
        </div>
      </div>
      <div className="calendar-legend">
        <span>
          <i className="legend-complete" />
          목표 달성
        </span>
        <span>
          <i className="legend-partial" />
          부분 기록
        </span>
        <span>
          <i className="legend-today" />
          오늘
        </span>
      </div>
    </section>
  );
}
function SettingsPanel({ data, persist, onClose, notify, error, account }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [adminRetry, setAdminRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setIsAdmin(false);
    setAdminError("");
    friendApi("admin-status")
      .then((result) => {
        if (active) setIsAdmin(result.allowed);
      })
      .catch((e) => {
        if (active) setAdminError(e.message);
      });
    return () => {
      active = false;
    };
  }, [account.user?.uid, adminRetry]);
  const [goals, setGoals] = useState(data.goals),
    [message, setMessage] = useState("");
  if (adminOpen && isAdmin)
    return (
      <Modal title="관리자 페이지" onClose={onClose}>
        <button
          className="secondary-button admin-back"
          onClick={() => setAdminOpen(false)}
        >
          설정으로 돌아가기
        </button>
        <AdminPanel />
      </Modal>
    );
  return (
    <Modal title="훈련소 설정" onClose={onClose}>
      <AccountControls account={account} showLink />
      {isAdmin && (
        <section className="settings-section">
          <button
            className="secondary-button"
            onClick={() => setAdminOpen(true)}
          >
            관리자 페이지
          </button>
        </section>
      )}
      {adminError && (
        <div className="error-box" role="alert">
          <p>관리자 권한을 확인하지 못했습니다. {adminError}</p>
          <button
            className="secondary-button"
            onClick={() => setAdminRetry((n) => n + 1)}
          >
            권한 확인 다시 시도
          </button>
        </div>
      )}
      {error && (
        <p className="error-box" role="alert">
          {error}
        </p>
      )}
      <section className="settings-section">
        <CharacterNameForm
          initialName={data.characterName}
          onSave={(characterName) => {
            if (!persist({ ...data, characterName })) return false;
            notify("캐릭터 이름을 저장했습니다.");
            return true;
          }}
        />
      </section>
      <section className="settings-section">
        <h3>
          <Dumbbell size={18} />
          하루 운동 목표
        </h3>
        <div className="goal-fields">
          {EXERCISES.map(({ key, label, unit, step, max }) => (
            <label key={key}>
              {label}
              <div>
                <input
                  type="number"
                  inputMode={step === 1 ? "numeric" : "decimal"}
                  min={key === "pushups" || key === "squats" ? 1 : 0}
                  max={max}
                  step={step}
                  value={goals[key]}
                  aria-label={`${label} 하루 목표`}
                  onChange={(e) =>
                    setGoals({ ...goals, [key]: e.target.value })
                  }
                />
                <span>{unit}</span>
              </div>
            </label>
          ))}
        </div>
        <div className="goal-presets">
          <button
            onClick={() => setGoals({ ...goals, pushups: 50, squats: 50 })}
          >
            푸쉬업·스쿼트 50개
          </button>
          <button
            onClick={() => setGoals({ ...goals, pushups: 100, squats: 100 })}
          >
            푸쉬업·스쿼트 100개
          </button>
        </div>
        <p className="hint">
          기타운동·달리기 목표 0은 선택 운동입니다. EXP는 목표와 관계없이
          적립됩니다. 새 목표는 오늘부터 적용되며 과거 기록의 목표는 유지됩니다.
        </p>
        <button
          className="primary-button"
          onClick={() => {
            try {
              const next = updateGoals(
                data,
                Object.fromEntries(
                  EXERCISES.map(({ key }) => [key, Number(goals[key])]),
                ),
              );
              if (persist(next)) {
                notify("새로운 목표를 저장했어요.");
                onClose();
              }
            } catch (e) {
              setMessage(e.message);
            }
          }}
        >
          목표 저장
        </button>
      </section>
      {message && (
        <p role="alert" className="error-box">
          {message}
        </p>
      )}
      <p className="settings-footer">
        <Zap size={14} />
        싸이따마훈련소 <span>v1.0</span>
      </p>
    </Modal>
  );
}
export default function App() {
  const {
    data,
    error,
    persist: saveLocal,
    storageKey,
    account,
  } = useWorkoutAccount();
  const friends = useFriends(account);
  const [rankingUser, setRankingUser] = useState(null);
  const [proof, setProof] = useState(null);
  const [today, setToday] = useState(dateKey()),
    [selected, setSelected] = useState(dateKey()),
    [month, setMonth] = useState(new Date()),
    [tab, setTab] = useState("home"),
    [settings, setSettings] = useState(false),
    [helpOpen, setHelpOpen] = useState(false),
    [toast, setToast] = useState(""),
    [celebrate, setCelebrate] = useState(false),
    [stageDetail, setStageDetail] = useState(null),
    [deleteOpen, setDeleteOpen] = useState(false);
  const [draft, setDraft] = useState(emptyCounts);
  const [formError, setFormError] = useState("");
  const toastTimer = useRef(null),
    celebrateTimer = useRef(null);
  const workoutRef = useRef(null);
  const onboardingSeen = useRef(new Set());
  const summary = stats(data, today);
  const appearance = characterAppearance(summary.level);
  const record = data.records[selected],
    goals = record?.goals || data.goals;
  const dirty = EXERCISES.some(
    ({ key }) => String(draft[key]) !== String(record?.[key] || 0),
  );
  const progress = summary.level === MAX_LEVEL ? 100 : summary.progressExp;
  const expDelta = recordExp(draft) - recordExp(record);
  useEffect(() => {
    setSettings(false);
    setHelpOpen(false);
    setRankingUser(null);
    setProof(null);
    setStageDetail(null);
    setDeleteOpen(false);
    setTab("home");
    setSelected(dateKey());
    setDraft(emptyCounts());
  }, [account.user?.uid]);
  useEffect(() => {
    if (!account.user || !account.ready) return;
    const open = () => {
      setTab("ranking");
      setStageDetail(null);
    };
    if (new URLSearchParams(window.location.search).get("view") === "friends") {
      open();
      const url = new URL(window.location.href);
      url.searchParams.delete("view");
      window.history.replaceState(
        null,
        "",
        url.pathname + url.search + url.hash,
      );
    }
    const handler = (event) => {
      if (event.data?.type === "OPEN_FRIENDS") open();
    };
    navigator.serviceWorker?.addEventListener("message", handler);
    return () =>
      navigator.serviceWorker?.removeEventListener("message", handler);
  }, [account.user?.uid, account.ready]);
  useEffect(() => {
    if (
      !account.user ||
      !account.ready ||
      !data.characterName ||
      error ||
      settings ||
      helpOpen ||
      proof ||
      rankingUser ||
      stageDetail ||
      deleteOpen
    )
      return;
    const timer = setTimeout(() => {
      let storage;
      try {
        storage = window.localStorage;
      } catch {
        /* Session-only fallback. */
      }
      if (claimOnboarding(account.user.uid, storage, onboardingSeen.current))
        setHelpOpen(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [
    account.user?.uid,
    account.ready,
    data.characterName,
    error,
    settings,
    helpOpen,
    proof,
    rankingUser,
    stageDetail,
    deleteOpen,
  ]);
  function notify(text) {
    clearTimeout(toastTimer.current);
    setToast(text);
    toastTimer.current = setTimeout(() => setToast(""), 4000);
  }
  function persist(nextData) {
    if (saveLocal(nextData)) return true;
    notify(
      error ||
        "기록을 저장하지 못했습니다. 연결 상태와 저장 공간을 확인해 주세요.",
    );
    return false;
  }
  useEffect(() => {
    setDraft(
      Object.fromEntries(EXERCISES.map(({ key }) => [key, record?.[key] || 0])),
    );
    setFormError("");
  }, [
    selected,
    storageKey,
    record?.pushups,
    record?.squats,
    record?.situps,
    record?.runningKm,
  ]);
  useEffect(() => {
    const refresh = () => setToday(dateKey());
    const timer = setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      clearTimeout(toastTimer.current);
      clearTimeout(celebrateTimer.current);
    };
  }, []);
  useEffect(() => {
    const warn = (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function selectDate(key) {
    if (
      dirty &&
      !window.confirm(
        "저장하지 않은 횟수가 있어요. 변경 내용을 버리고 날짜를 이동할까요?",
      )
    )
      return false;
    setSelected(key);
    return true;
  }
  function navigate(value) {
    if (value === "home" && selected !== today) {
      if (!selectDate(today)) return;
      setMonth(parseDate(today));
    }
    setStageDetail(null);
    setTab(value);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function save(e) {
    e?.preventDefault();
    try {
      if (EXERCISES.some(({ key }) => draft[key] === ""))
        throw new Error(
          "운동량을 입력해 주세요. 하지 않은 운동은 0으로 입력하면 됩니다.",
        );
      const nextData = saveRecord(
        data,
        selected,
        Object.fromEntries(
          EXERCISES.map(({ key }) => [key, Number(draft[key])]),
        ),
        dateKey(),
      );
      const oldLevel = summary.level;
      if (persist(nextData)) {
        setFormError("");
        if (
          stats(nextData).level > oldLevel ||
          (isComplete(nextData.records[selected]) && !isComplete(record))
        ) {
          setCelebrate(true);
          clearTimeout(celebrateTimer.current);
          celebrateTimer.current = setTimeout(() => setCelebrate(false), 2600);
        }
        notify(
          stats(nextData).level > oldLevel
            ? "레벨이 올랐습니다. 캐릭터 외형이 진화했습니다."
            : isComplete(nextData.records[selected])
              ? "운동 기록 저장 완료. 설정한 목표를 달성했습니다."
              : "운동 기록을 저장했습니다.",
        );
        return nextData;
      }
    } catch (e) {
      setFormError(e.message);
    }
    return null;
  }
  function openProof() {
    try {
      const day = dateKey();
      if (selected !== day) throw new Error("오늘 날짜를 선택해 주세요.");
      const saved = dirty || !record ? save() : data;
      if (saved) setProof(workoutProof(saved, day));
    } catch (e) {
      setFormError(e.message);
    }
  }
  const nav = [
    ["home", Dumbbell, "훈련소"],
    ["calendar", CalendarDays, "운동 기록"],
    ["growth", Sparkles, "성장 도감"],
    ["ranking", Trophy, "친구"],
  ];
  if (!account.user || !account.ready) return <LoginScreen account={account} />;
  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <button className="brand" onClick={() => navigate("home")}>
            <span className="brand-mark image-brand">
              <img
                src={`${import.meta.env.BASE_URL}images/hero-chibi.jpeg`}
                alt=""
              />
            </span>
            <span>
              싸이따마<span className="brand-thin">훈련소</span>
              <small>SAITAMA TRAINING</small>
            </span>
          </button>
          <nav aria-label="주 메뉴">
            {nav.map(([id, Icon, label]) => (
              <button
                key={id}
                className={tab === id ? "active" : ""}
                onClick={() => navigate(id)}
              >
                <Icon size={17} />
                {label}
                {id === "ranking" && friends.pending > 0 && (
                  <span
                    className="friend-badge"
                    aria-label={`${friends.pending}개 친구 요청`}
                  >
                    {friends.pending}
                  </span>
                )}
              </button>
            ))}
          </nav>
          <div className="header-actions">
            <button
              className="settings-button"
              onClick={() => setSettings(true)}
              aria-label="설정"
            >
              <Settings size={19} />
              <span>설정</span>
            </button>
            <button
              className="help-button"
              aria-label="도움말"
              aria-haspopup="dialog"
              onClick={() => setHelpOpen(true)}
            >
              <CircleHelp size={22} />
            </button>
          </div>
        </div>
      </header>
      <main>
        <div className="page-intro">
          <div>
            <span className="eyebrow">
              <span className="tiny-dot" /> WORKOUT TRACKER
            </span>
            <h1>
              {tab === "growth"
                ? "캐릭터 성장"
                : tab === "ranking"
                  ? "친구"
                  : tab === "calendar"
                    ? "운동 기록"
                    : "훈련소"}
            </h1>
          </div>
          <div className="date-chip">
            <CalendarDays size={17} />
            {dateLabel(today)}
          </div>
        </div>
        {error && (
          <button
            className="error-box storage-error"
            onClick={() => setSettings(true)}
          >
            {error} <ArrowRight size={16} />
          </button>
        )}
        <div
          className={`dashboard ${tab === "growth" ? "growth-layout" : ""} ${tab === "ranking" ? "ranking-layout" : ""} ${tab === "calendar" ? "calendar-layout" : ""}`}
        >
          {tab === "home" && (
            <aside className="hero-column">
              <section className="hero-card">
                <div className="hero-heading">
                  <span className="eyebrow">CHARACTER</span>
                  <span className="level-badge">
                    <Zap size={13} fill="currentColor" />
                    LV. {summary.level}
                  </span>
                </div>
                <div className="hero-title">
                  <h2>{data.characterName || "캐릭터"}</h2>
                  <p>LV. {summary.level}</p>
                </div>
                <div
                  className={`character-stage character-evolved`}
                  data-powered={appearance.aura}
                  style={{
                    "--aura-color": `#${appearance.auraColor.toString(16).padStart(6, "0")}`,
                  }}
                >
                  <div className="character-orbit" />
                  <Character
                    stage={summary.stage}
                    level={summary.level}
                    celebrate={celebrate}
                  />
                  <span className="drag-label">
                    <RotateCcw size={11} />
                    드래그해서 돌려보기
                  </span>
                </div>
                <div className="hero-progress">
                  <div>
                    <strong>
                      {summary.level < MAX_LEVEL
                        ? "다음 레벨까지"
                        : "최고 레벨 달성"}
                    </strong>
                    <span>
                      {summary.level < MAX_LEVEL ? (
                        <>
                          <b>{summary.expToNext}</b> EXP 남음
                        </>
                      ) : (
                        <Trophy size={18} />
                      )}
                    </span>
                  </div>
                  <div className="track">
                    <i style={{ width: `${progress}%` }} />
                  </div>
                  <p>
                    {summary.level === MAX_LEVEL
                      ? "MAX LEVEL"
                      : `${summary.progressExp} / 100 EXP`}{" "}
                    <span>· 100 EXP마다 +1레벨</span>
                  </p>
                  {summary.inactiveDays > 0 && summary.level > 1 && (
                    <p className="decay-status">
                      미기록 {summary.inactiveDays}일 · {summary.daysToDecay}일
                      뒤 −{summary.inactiveDays >= 5 ? 1 : 5}레벨
                    </p>
                  )}
                </div>
              </section>
              <div className="streak-card">
                <span className="streak-icon">
                  <Flame size={25} />
                </span>
                <div>
                  <strong>{summary.streak}일 연속 달성 중</strong>
                  <p>설정한 운동 목표 기준</p>
                </div>
                <span className="streak-deco">↗</span>
              </div>
              <section className="training-poster" aria-label="사이타마 훈련법">
                <img
                  src={`${import.meta.env.BASE_URL}images/training-manga.jpg`}
                  alt="사이타마 훈련법: 팔굽혀펴기 100회, 윗몸일으키기 100회, 스쿼트 100회, 10km 달리기를 매일 한다는 만화 장면"
                  width="620"
                  height="685"
                  loading="lazy"
                  decoding="async"
                />
              </section>
            </aside>
          )}
          <div className="content-column">
            {tab === "ranking" && (
              <FriendsPanel
                friends={friends}
                account={account}
                data={data}
                onUser={setRankingUser}
              />
            )}
            {(tab === "home" || tab === "calendar") && (
              <>
                <div className="stats-row">
                  <div>
                    <span>
                      <Dumbbell size={14} />
                      누적 EXP
                    </span>
                    <strong>
                      {number(summary.total)}
                      <small>EXP</small>
                    </strong>
                  </div>
                  <div>
                    <span>
                      <CalendarDays size={14} />
                      운동한 날
                    </span>
                    <strong>
                      {summary.days}
                      <small>일</small>
                    </strong>
                  </div>
                  <div>
                    <span>
                      <Trophy size={14} />
                      목표 달성
                    </span>
                    <strong>
                      {summary.completed}
                      <small>일</small>
                    </strong>
                  </div>
                </div>
                {tab === "calendar" && (
                  <Calendar
                    {...{ data, selected, today, month, setMonth }}
                    onSelect={selectDate}
                  />
                )}
                <section className="panel workout-panel" ref={workoutRef}>
                  <div className="section-heading">
                    <div>
                      <span className="eyebrow">
                        {selected === today
                          ? "TODAY’S MISSION"
                          : "DAILY MISSION"}
                      </span>
                      <h2>
                        {selected === today
                          ? "오늘의 훈련"
                          : `${parseDate(selected).getMonth() + 1}월 ${parseDate(selected).getDate()}일의 훈련`}{" "}
                        <span className="heading-dot">.</span>
                      </h2>
                    </div>
                    <span
                      className={`status-pill ${isComplete(record) ? "done" : ""}`}
                    >
                      {isComplete(record) ? (
                        <>
                          <Check size={13} />
                          훈련 완료
                        </>
                      ) : hasWorkout(record) ? (
                        "일부 완료"
                      ) : (
                        "미기록"
                      )}
                    </span>
                  </div>
                  <form onSubmit={save}>
                    <div className="exercise-grid">
                      {EXERCISES.map(({ key, label }) => (
                        <WorkoutCard
                          key={key}
                          type={key}
                          label={label}
                          value={draft[key]}
                          goal={goals[key]}
                          onChange={(value) =>
                            setDraft({ ...draft, [key]: value })
                          }
                        />
                      ))}
                    </div>
                    {formError && (
                      <p className="error-box" role="alert">
                        {formError}
                      </p>
                    )}
                    <div className="workout-save-actions">
                      <button
                        className={`primary-button save-button ${isComplete(record) && !dirty ? "saved" : ""}`}
                        type="submit"
                        disabled={!!error || (!dirty && !!record)}
                      >
                        <Check size={18} />
                        {!dirty && record
                          ? "기록 저장 완료"
                          : record
                            ? "변경한 기록 저장"
                            : "운동 기록 저장"}
                        {dirty && (
                          <span>
                            {expDelta >= 0 ? "+" : ""}
                            {number(expDelta)} EXP
                          </span>
                        )}
                      </button>
                      {selected === today && (
                        <button
                          type="button"
                          className="proof-button"
                          onClick={openProof}
                          disabled={!!error || !hasWorkout(draft)}
                          aria-haspopup="dialog"
                        >
                          <Camera size={19} />
                          오운완
                        </button>
                      )}
                    </div>
                    <div className="record-footer">
                      <span>
                        <ShieldCheck size={12} />
                        {dirty
                          ? "아직 저장하지 않은 기록이에요"
                          : account.busy
                            ? "동기화 중…"
                            : account.pending
                              ? "기기 저장 · 동기화 대기"
                              : "계정에 저장됨"}
                      </span>
                      {record && (
                        <button
                          type="button"
                          onClick={() => setDeleteOpen(true)}
                        >
                          기록 삭제
                        </button>
                      )}
                    </div>
                  </form>
                </section>
                {tab === "home" && (
                  <Calendar
                    {...{ data, selected, today, month, setMonth }}
                    onSelect={selectDate}
                  />
                )}
              </>
            )}
            {tab === "growth" && (
              <section className="panel growth-panel">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">EVOLUTION ROADMAP</span>
                    <h2>성장 단계</h2>
                  </div>
                  <span className="month-badge">
                    {
                      VISUAL_UNLOCKS.filter(
                        (unlock) => unlock.level <= summary.level,
                      ).length
                    }{" "}
                    / {VISUAL_UNLOCKS.length}
                  </span>
                </div>
                <p className="growth-description">
                  100 EXP마다 +1레벨 · 매 레벨 외형 변화
                  <br />
                  최대 1000레벨 · 미기록 5일째 −5레벨, 이후 매일 −1레벨
                </p>
                <div className="growth-rules">
                  <span>푸쉬업 · 스쿼트 · 기타운동 1개 = 1 EXP</span>
                  <span>달리기 0.1km = 2 EXP · 하루 여러 레벨 상승 가능</span>
                  <span>미기록 10일은 −10레벨 · 최저 1레벨</span>
                </div>
                <div className="stage-list">
                  {VISUAL_UNLOCKS.map((s, i) => (
                    <button
                      key={s.name}
                      className={`evolution-card ${s.level <= summary.level ? "unlocked" : ""} ${s.level <= summary.level && (!VISUAL_UNLOCKS[i + 1] || VISUAL_UNLOCKS[i + 1].level > summary.level) ? "current" : ""}`}
                      aria-haspopup="dialog"
                      onClick={() => setStageDetail(s)}
                    >
                      <span className="evolution-number">
                        {s.level <= summary.level ? (
                          <Zap size={21} />
                        ) : (
                          <LockKeyhole size={19} />
                        )}
                      </span>
                      <span>
                        <small>LV. {s.level}</small>
                        <strong>
                          {s.name}
                          {s.level <= summary.level && <em>해금</em>}
                        </strong>
                      </span>
                      <ChevronRight size={18} />
                    </button>
                  ))}
                </div>
                <p className="hint">
                  잠긴 단계는 실루엣만 표시됩니다. 해당 레벨에 도달하면 외형이
                  공개됩니다.
                </p>
              </section>
            )}
          </div>
        </div>
        <footer className="page-footer">
          <span>SAITAMA TRAINING © {new Date().getFullYear()}</span>
        </footer>
      </main>
      <nav className="mobile-nav" aria-label="모바일 주 메뉴">
        {nav.map(([id, Icon, label]) => (
          <button
            key={id}
            className={tab === id ? "active" : ""}
            onClick={() => navigate(id)}
          >
            <Icon size={20} />
            <span>{label}</span>
            {id === "ranking" && friends.pending > 0 && (
              <span
                className="friend-badge"
                aria-label={`${friends.pending}개 친구 요청`}
              >
                {friends.pending}
              </span>
            )}
          </button>
        ))}
      </nav>
      {rankingUser && (
        <RankingUserDialog
          entry={rankingUser}
          onClose={() => setRankingUser(null)}
        />
      )}
      {stageDetail && (
        <StageDialog
          stage={stageDetail}
          currentLevel={summary.level}
          onClose={() => setStageDetail(null)}
        />
      )}
      {!data.characterName && !error && !settings && (
        <Modal title="캐릭터 이름 설정" dismissible={false}>
          <CharacterNameForm
            autofocus
            onSave={(characterName) => persist({ ...data, characterName })}
          />
        </Modal>
      )}
      {helpOpen && <HelpDialog onClose={() => setHelpOpen(false)} />}
      {proof && (
        <Modal
          title="오늘의 훈련 완료 공유"
          hideTitle
          onClose={() => setProof(null)}
        >
          <WorkoutProofCard proof={proof} />
        </Modal>
      )}
      {settings && (
        <SettingsPanel
          {...{ data, persist, notify, error, account }}
          onClose={() => setSettings(false)}
        />
      )}{" "}
      {deleteOpen && (
        <Modal
          title="이 날짜의 기록을 삭제할까요?"
          onClose={() => setDeleteOpen(false)}
        >
          <p className="hint">
            {dateLabel(selected)} 기록이 삭제되고 캐릭터의 누적 성장에도
            반영돼요.
          </p>
          <div className="action-buttons">
            <button
              className="secondary-button"
              onClick={() => setDeleteOpen(false)}
            >
              취소
            </button>
            <button
              className="primary-button"
              onClick={() => {
                const records = { ...data.records };
                delete records[selected];
                if (persist({ ...data, records })) {
                  setDeleteOpen(false);
                  notify("해당 날짜의 기록을 삭제했어요.");
                }
              }}
            >
              기록 삭제
            </button>
          </div>
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
        </div>
      )}
      {celebrate && (
        <div className="confetti" aria-hidden="true">
          {Array.from({ length: 22 }, (_, i) => (
            <i
              key={i}
              style={{
                left: `${i * 4.7}%`,
                animationDelay: `${(i % 5) * 0.09}s`,
                "--confetti-color": ["#f17a46", "#efc655", "#8ca67c"][i % 3],
              }}
            />
          ))}
        </div>
      )}
    </>
  );
}
