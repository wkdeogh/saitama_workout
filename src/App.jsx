import { useEffect, useRef, useState } from "react";
import {
  Zap,
  Flame,
  CalendarDays,
  Dumbbell,
  Sparkles,
  Settings,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  Check,
  Plus,
  Minus,
  X,
  Download,
  Upload,
  ShieldCheck,
  Trophy,
  LockKeyhole,
  RotateCcw,
  ArrowRight,
} from "lucide-react";
import Character from "./Character";
import { characterAppearance, VISUAL_UNLOCKS } from "./characterAppearance";
import {
  STORAGE_KEY,
  STAGES,
  MAX_REPS,
  dateKey,
  parseDate,
  initialData,
  isComplete,
  hasWorkout,
  stats,
  parseBackup,
  validateData,
  mergeBackup,
  saveRecord,
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
function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return { data: raw ? parseBackup(raw) : initialData(), error: "" };
  } catch {
    return {
      data: initialData(),
      error:
        "저장된 기록을 불러오지 못했어요. 설정에서 원본을 백업하거나 정상 백업 파일을 가져와 주세요.",
    };
  }
}
function downloadJSON(data, name) {
  const url = URL.createObjectURL(
    new Blob(
      [typeof data === "string" ? data : JSON.stringify(data, null, 2)],
      { type: "application/json" },
    ),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
function Modal({ title, onClose, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    ref.current.showModal();
    return () => {
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="modal"
    >
      <div className="modal-inner">
        <div className="section-heading">
          <h2>{title}</h2>
          <button className="icon-button" aria-label="닫기" onClick={onClose}>
            <X size={21} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
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
  const done = Number(value) >= goal;
  return (
    <div className={`exercise-card ${done ? "exercise-done" : ""}`}>
      <div className="exercise-top">
        <span className={`exercise-illustration ${type}`}>
          <ExerciseIcon type={type} />
        </span>
        <div>
          <h3>{label}</h3>
          <span>목표 {goal}개</span>
        </div>
        <button
          type="button"
          className={`complete-toggle ${done ? "checked" : ""}`}
          aria-label={`${label} 목표 채우기`}
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
          aria-label={`${label} 1개 빼기`}
          disabled={!Number(value)}
          onClick={() => onChange(Math.max(0, Number(value) - 1))}
        >
          <Minus size={17} />
        </button>
        <label
          className={`count-field ${String(value).length > 3 ? "count-long" : String(value).length > 2 ? "count-medium" : ""}`}
        >
          <input
            aria-label={`${label} 횟수`}
            type="number"
            inputMode="numeric"
            min="0"
            max={MAX_REPS}
            step="1"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          <span>
            / {goal}
            <small> 개</small>
          </span>
        </label>
        <button
          type="button"
          className="counter-btn"
          aria-label={`${label} 1개 더하기`}
          disabled={Number(value) >= MAX_REPS}
          onClick={() => onChange(Math.min(MAX_REPS, (Number(value) || 0) + 1))}
        >
          <Plus size={17} />
        </button>
      </div>
      <div className="track">
        <i
          style={{
            width: `${Math.min(100, Math.max(0, (Number(value) / goal) * 100))}%`,
          }}
        />
      </div>
      <div className="quick-add">
        {[10, 25].map((n) => (
          <button
            type="button"
            key={n}
            onClick={() =>
              onChange(Math.min(MAX_REPS, (Number(value) || 0) + n))
            }
          >
            +{n}개
          </button>
        ))}
        <button
          type="button"
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
function SettingsPanel({ data, persist, onClose, notify, error, setError }) {
  const [goals, setGoals] = useState(data.goals),
    [incoming, setIncoming] = useState(null),
    [replace, setReplace] = useState(false),
    [message, setMessage] = useState("");
  const file = useRef(null);
  async function importFile(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      if (f.size > 2 * 1024 * 1024)
        throw new Error("백업 파일은 2MB 이하로 선택해 주세요.");
      setIncoming(parseBackup(await f.text()));
      setReplace(!!error);
      setMessage("");
    } catch (e) {
      setMessage(e.message);
    }
  }
  return (
    <Modal title="훈련소 설정" onClose={onClose}>
      <section className="settings-section">
        <h3>
          <Dumbbell size={18} />
          하루 운동 목표
        </h3>
        <div className="goal-fields">
          {[
            ["pushups", "푸쉬업"],
            ["squats", "스쿼트"],
          ].map(([key, label]) => (
            <label key={key}>
              {label}
              <div>
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="10000"
                  value={goals[key]}
                  aria-label={`${label} 하루 목표`}
                  onChange={(e) =>
                    setGoals({ ...goals, [key]: e.target.value })
                  }
                />
                <span>개</span>
              </div>
            </label>
          ))}
        </div>
        <div className="goal-presets">
          <button onClick={() => setGoals({ pushups: 50, squats: 50 })}>
            각각 50개
          </button>
          <button onClick={() => setGoals({ pushups: 100, squats: 100 })}>
            각각 100개
          </button>
        </div>
        <p className="hint">새 목표는 아직 기록하지 않은 날짜부터 적용돼요.</p>
        <button
          className="primary-button"
          onClick={() => {
            try {
              const next = validateData({
                ...data,
                goals: {
                  pushups: Number(goals.pushups),
                  squats: Number(goals.squats),
                },
              });
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
      <section className="settings-section">
        <h3>
          <ShieldCheck size={18} />
          기록 백업
        </h3>
        <p className="hint">
          기록은 이 브라우저에 저장돼요. 기기를 바꾸거나 브라우저 데이터를
          지우기 전에 백업해 주세요.
        </p>
        <div className="backup-actions">
          <button
            className="secondary-button"
            onClick={() => {
              downloadJSON(
                { ...data, exportedAt: new Date().toISOString() },
                `saitama-backup-${dateKey()}.json`,
              );
              notify("백업 파일을 내보냈어요.");
            }}
            disabled={!!error}
          >
            <Download size={17} />
            JSON 내보내기
          </button>
          <button
            className="secondary-button"
            onClick={() => file.current.click()}
          >
            <Upload size={17} />
            JSON 가져오기
          </button>
        </div>
        <input
          ref={file}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={importFile}
        />
        {incoming && (
          <div className="import-preview">
            <strong>
              백업에서 {Object.keys(incoming.records).length}일의 기록을
              찾았어요.
            </strong>
            <p>
              총 {number(stats(incoming).total)}개 · 겹치는 날짜{" "}
              {
                Object.keys(incoming.records).filter((k) => data.records[k])
                  .length
              }
              일
            </p>
            <label className="radio-row">
              <input
                type="radio"
                name="import"
                checked={!replace}
                disabled={!!error}
                onChange={() => setReplace(false)}
              />
              합치기 · 겹치는 날짜는 백업 기록 사용
            </label>
            <label className="radio-row">
              <input
                type="radio"
                name="import"
                checked={replace}
                onChange={() => setReplace(true)}
              />
              전체 교체 · 목표와 모든 기록을 백업으로 변경
            </label>
            <div className="backup-actions">
              <button
                className="secondary-button"
                onClick={() => setIncoming(null)}
              >
                취소
              </button>
              <button
                className="primary-button"
                onClick={() => {
                  const next = mergeBackup(data, incoming, replace);
                  if (persist(next, true)) {
                    setError("");
                    notify("백업 기록을 복원했어요.");
                    onClose();
                  }
                }}
              >
                복원하기
              </button>
            </div>
          </div>
        )}
        {error && (
          <div className="error-box">
            <p>{error}</p>
            <button
              className="secondary-button"
              onClick={() => {
                try {
                  downloadJSON(
                    localStorage.getItem(STORAGE_KEY) || "{}",
                    `saitama-recovery-${dateKey()}.json`,
                  );
                } catch {
                  setMessage(
                    "브라우저의 저장 공간에 접근할 수 없어요. 사이트 저장 권한을 확인해 주세요.",
                  );
                }
              }}
            >
              저장된 원본 내보내기
            </button>
          </div>
        )}
      </section>
      {message && (
        <p role="alert" className="error-box">
          {message}
        </p>
      )}
      <p className="settings-footer">
        <Zap size={14} />
        사이타마훈련소 <span>v1.0</span>
      </p>
    </Modal>
  );
}
export default function App() {
  const [loaded] = useState(readStore),
    [data, setData] = useState(loaded.data),
    [error, setError] = useState(loaded.error);
  const [today, setToday] = useState(dateKey()),
    [selected, setSelected] = useState(dateKey()),
    [month, setMonth] = useState(new Date()),
    [tab, setTab] = useState("home"),
    [settings, setSettings] = useState(false),
    [toast, setToast] = useState(""),
    [celebrate, setCelebrate] = useState(false),
    [preview, setPreview] = useState(null),
    [deleteOpen, setDeleteOpen] = useState(false);
  const [draft, setDraft] = useState({ pushups: 0, squats: 0 });
  const [formError, setFormError] = useState("");
  const toastTimer = useRef(null),
    celebrateTimer = useRef(null);
  const workoutRef = useRef(null);
  const summary = stats(data, today),
    current = STAGES[summary.stage];
  const appearance = characterAppearance(preview ?? summary.level);
  const nextVisual = characterAppearance(summary.level).nextUnlock;
  const record = data.records[selected],
    goals = record?.goals || data.goals;
  const dirty =
    String(draft.pushups) !== String(record?.pushups || 0) ||
    String(draft.squats) !== String(record?.squats || 0);
  const progress = summary.level === 200 ? 100 : summary.progressDays * 10;
  function notify(text) {
    clearTimeout(toastTimer.current);
    setToast(text);
    toastTimer.current = setTimeout(() => setToast(""), 4000);
  }
  function persist(nextData, recover = false) {
    if (error && !recover) {
      notify("먼저 설정에서 저장된 기록을 복원해 주세요.");
      return false;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextData));
      setData(nextData);
      return true;
    } catch {
      notify("저장하지 못했어요. 브라우저의 저장 공간과 권한을 확인해 주세요.");
      return false;
    }
  }
  useEffect(() => {
    setDraft({ pushups: record?.pushups || 0, squats: record?.squats || 0 });
    setFormError("");
  }, [selected, record]);
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
    const sync = (e) => {
      if (e.key === STORAGE_KEY) {
        const loaded = readStore();
        setData(loaded.data);
        setError(loaded.error);
        notify("다른 탭의 기록을 반영했어요.");
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
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
    setPreview(null);
    setTab(value);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function save(e) {
    e.preventDefault();
    try {
      if (draft.pushups === "" || draft.squats === "")
        throw new Error(
          "두 운동의 횟수를 입력해 주세요. 하지 않은 운동은 0으로 입력하면 돼요.",
        );
      const nextData = saveRecord(
        data,
        selected,
        { pushups: Number(draft.pushups), squats: Number(draft.squats) },
        dateKey(),
      );
      const oldLevel = summary.level;
      if (persist(nextData)) {
        setFormError("");
        if (isComplete(nextData.records[selected]) && !isComplete(record)) {
          setCelebrate(true);
          clearTimeout(celebrateTimer.current);
          celebrateTimer.current = setTimeout(() => setCelebrate(false), 2600);
        }
        notify(
          stats(nextData).level > oldLevel
            ? "레벨이 올랐습니다. 캐릭터 외형이 진화했습니다."
            : isComplete(nextData.records[selected])
              ? "운동 기록 저장 완료. 두 운동의 목표를 달성했습니다."
              : "운동 기록을 저장했습니다.",
        );
      }
    } catch (e) {
      setFormError(e.message);
    }
  }
  const nav = [
    ["home", Dumbbell, "훈련소"],
    ["calendar", CalendarDays, "운동 기록"],
    ["growth", Sparkles, "성장 도감"],
  ];
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
              사이타마<span className="brand-thin">훈련소</span>
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
              </button>
            ))}
          </nav>
          <button
            className="settings-button"
            onClick={() => setSettings(true)}
            aria-label="설정 및 백업"
          >
            <Settings size={19} />
            <span>설정</span>
          </button>
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
          className={`dashboard ${tab === "growth" ? "growth-layout" : ""} ${tab === "calendar" ? "calendar-layout" : ""}`}
        >
          {tab !== "calendar" && (
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
                  <h2>
                    {preview !== null
                      ? STAGES[stageIndex(preview)].name
                      : current.name}
                  </h2>
                  <p>
                    {preview !== null
                      ? `LV. ${preview} 미리보기`
                      : `LV. ${summary.level} / 200`}
                  </p>
                </div>
                <div
                  className={`character-stage character-evolved`}
                  data-powered={appearance.aura}
                  data-awakened={appearance.awakened}
                >
                  <div className="character-orbit" />
                  <Character
                    stage={
                      preview !== null ? stageIndex(preview) : summary.stage
                    }
                    level={preview ?? summary.level}
                    celebrate={celebrate}
                  />
                  <span className="drag-label">
                    <RotateCcw size={11} />
                    드래그해서 돌려보기
                  </span>
                  {preview !== null && (
                    <button
                      className="preview-exit"
                      onClick={() => setPreview(null)}
                    >
                      미리보기 종료 <X size={13} />
                    </button>
                  )}
                </div>
                {tab === "growth" && (
                  <div className="preview-stepper">
                    <button
                      aria-label="이전 레벨 미리보기"
                      disabled={appearance.level === 1}
                      onClick={() => setPreview(appearance.level - 1)}
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <span>
                      미리보기 <strong>LV. {appearance.level}</strong>
                    </span>
                    <button
                      aria-label="다음 레벨 미리보기"
                      disabled={appearance.level === 200}
                      onClick={() => setPreview(appearance.level + 1)}
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                )}
                <div className="hero-progress">
                  <div>
                    <strong>
                      {summary.level < 200 ? "다음 레벨까지" : "최고 레벨 달성"}
                    </strong>
                    <span>
                      {summary.level < 200 ? (
                        <>
                          <b>{summary.daysToNext}</b>일 남음
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
                    {summary.level === 200
                      ? "MAX LEVEL"
                      : `${summary.progressDays} / 10 DAYS`}{" "}
                    <span>· 운동한 날 기준</span>
                  </p>
                  {summary.inactiveDays > 0 && summary.level > 1 && (
                    <p className="decay-status">
                      미기록 {summary.inactiveDays}일 · {summary.daysToDecay}일
                      뒤 −1레벨
                    </p>
                  )}
                </div>
                <button
                  className="evolution-link"
                  onClick={() => navigate("growth")}
                >
                  <Sparkles size={16} />
                  {nextVisual
                    ? `다음 외형 · LV. ${nextVisual.level} ${nextVisual.name}`
                    : "모든 외형 해금 완료"}
                  <ArrowUpRight size={17} />
                </button>
              </section>
              <div className="streak-card">
                <span className="streak-icon">
                  <Flame size={25} />
                </span>
                <div>
                  <strong>{summary.streak}일 연속 달성 중</strong>
                  <p>푸쉬업 · 스쿼트 목표 기준</p>
                </div>
                <span className="streak-deco">↗</span>
              </div>
              <section className="training-poster" aria-label="사이타마 훈련법">
                <h2>사이타마 훈련법</h2>
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
            {tab !== "growth" && (
              <>
                <div className="stats-row">
                  <div>
                    <span>
                      <Dumbbell size={14} />
                      누적 운동
                    </span>
                    <strong>
                      {number(summary.total)}
                      <small>개</small>
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
                      <WorkoutCard
                        type="pushups"
                        label="푸쉬업"
                        value={draft.pushups}
                        goal={goals.pushups}
                        onChange={(pushups) => setDraft({ ...draft, pushups })}
                      />
                      <WorkoutCard
                        type="squats"
                        label="스쿼트"
                        value={draft.squats}
                        goal={goals.squats}
                        onChange={(squats) => setDraft({ ...draft, squats })}
                      />
                    </div>
                    {formError && (
                      <p className="error-box" role="alert">
                        {formError}
                      </p>
                    )}
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
                          +
                          {number(
                            Math.max(
                              0,
                              (Number(draft.pushups) || 0) +
                                (Number(draft.squats) || 0) -
                                (record?.pushups || 0) -
                                (record?.squats || 0),
                            ),
                          )}{" "}
                          REP
                        </span>
                      )}
                    </button>
                    <div className="record-footer">
                      <span>
                        <ShieldCheck size={12} />
                        {dirty ? "아직 저장하지 않은 기록이에요" : "로컬 저장"}
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
                  운동 10일마다 +1레벨 · 매 레벨 외형 변화
                  <br />
                  최대 200레벨 · 미기록 10일마다 −1레벨
                </p>
                <div className="growth-rules">
                  <span>1개 이상 기록한 날만 하루로 계산</span>
                  <span>연속일 필요 없이 누적 10일마다 성장</span>
                  <span>미기록 20일은 −2레벨 · 최저 1레벨</span>
                </div>
                <div className="level-preview">
                  <label htmlFor="level-preview">
                    레벨별 외형 미리보기{" "}
                    <strong>LV. {preview ?? summary.level}</strong>
                  </label>
                  <input
                    id="level-preview"
                    type="range"
                    min="1"
                    max="200"
                    value={preview ?? summary.level}
                    onChange={(e) => setPreview(Number(e.target.value))}
                  />
                  <div>
                    <span>LV. 1</span>
                    <span>LV. 200</span>
                  </div>
                </div>
                <div className="stage-list">
                  {VISUAL_UNLOCKS.map((s, i) => (
                    <button
                      key={s.name}
                      className={`evolution-card ${s.level <= summary.level ? "unlocked" : ""} ${s.level <= summary.level && (!VISUAL_UNLOCKS[i + 1] || VISUAL_UNLOCKS[i + 1].level > summary.level) ? "current" : ""} ${preview === s.level ? "previewing" : ""}`}
                      onClick={() => {
                        setPreview(s.level);
                        if (window.innerWidth < 760)
                          window.scrollTo({ top: 100, behavior: "smooth" });
                      }}
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
                  각 단계를 눌러 진화한 모습을 미리 볼 수 있어요.
                </p>
              </section>
            )}
          </div>
        </div>
        <footer className="page-footer">
          <span>
            <Zap size={12} />
            로컬 저장 · JSON 백업 지원
          </span>
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
          </button>
        ))}
        <button onClick={() => setSettings(true)}>
          <Settings size={20} />
          <span>설정</span>
        </button>
      </nav>
      {settings && (
        <SettingsPanel
          {...{ data, persist, notify, error, setError }}
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
          <div className="backup-actions">
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
