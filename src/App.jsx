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
  Download,
  Upload,
  ShieldCheck,
  Trophy,
  LockKeyhole,
  RotateCcw,
  ArrowRight,
} from "lucide-react";
import Character from "./Character";
import useWorkoutAccount from "./cloud/useWorkoutAccount";
import RankingPanel, {
  LoginScreen,
  AccountControls,
} from "./cloud/RankingPanel";
import { displayedLevel } from "./cloud/rankingModel";
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
  parseBackup,
  validateData,
  mergeBackup,
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
function Modal({ title, onClose, children, dismissible = true }) {
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
        <div className="section-heading">
          <h2>{title}</h2>
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
    <Modal title="도움말" onClose={onClose}>
      <div className="help-content">
        <section>
          <h3>운동 기록과 목표</h3>
          <p>
            기본 목표는 푸쉬업·스쿼트·윗몸일으키기 각 100개, 달리기 10km입니다.
            상단 설정에서 개인 목표를 바꿀 수 있습니다.
          </p>
          <p>
            실제로 한 횟수와 거리를 입력하고 ‘운동 기록 저장’을 누르세요.
            캘린더에서 날짜를 선택해 기록을 수정하거나 삭제할 수 있습니다. 과거
            기록의 목표는 당시 기준을 유지합니다.
          </p>
        </section>
        <p className="help-honesty">
          실제로 운동한 만큼만 입력 하세요.
          <br />
          속여서 입력하면 불행해집니다. (불운+1)
        </p>
        <section>
          <h3>EXP와 캐릭터 성장</h3>
          <p>
            푸쉬업·스쿼트·윗몸일으키기 1개 = 1 EXP, 달리기 0.1km = 1 EXP. 목표
            달성 여부와 관계없이 실제 운동량만큼 쌓입니다.
          </p>
          <p>
            100 EXP마다 1레벨 상승하며 최대 1000레벨입니다. 연속 미기록 5일마다
            5레벨 감소하고, 최저 1레벨까지 내려갑니다. 성장 도감에서 다음 단계의
            실루엣을 확인할 수 있습니다.
          </p>
        </section>
        <section>
          <h3>랭킹</h3>
          <p>
            이름 설정 후 자동 등록됩니다. 누적·주간 EXP 기준 상위 50명을
            표시하며 같은 EXP는 공동 순위입니다. 주간은 한국 시간 월요일
            00시부터 계산합니다.
          </p>
          <p>
            사용자나 내 캐릭터 카드를 누르면 캐릭터·레벨·종목별 누적 운동량을 볼
            수 있습니다. 이메일과 날짜별 기록은 다른 사용자에게 공개되지
            않습니다.
          </p>
        </section>
        <section>
          <h3>저장과 백업</h3>
          <p>
            같은 구글 계정으로 로그인하면 기록을 불러옵니다. 동기화 오류가 나면
            설정의 ‘동기화’를 누르세요. JSON 내보내기·가져오기로 따로 백업할 수
            있습니다.
          </p>
        </section>
        <section>
          <h3>아이폰 · 홈 화면에 추가</h3>
          <ol>
            <li>Safari에서 싸이따마훈련소를 엽니다.</li>
            <li>공유 버튼을 누릅니다. 메뉴 안에 있을 수도 있습니다.</li>
            <li>‘홈 화면에 추가’를 선택합니다.</li>
            <li>‘웹 앱으로 열기’가 보이면 켜고 ‘추가’를 누릅니다.</li>
          </ol>
          <a
            href="https://support.apple.com/ko-kr/guide/iphone/iphea86e5236/ios"
            target="_blank"
            rel="noreferrer"
          >
            Apple 안내
          </a>
        </section>
        <section>
          <h3>갤럭시 · 홈 화면에 추가</h3>
          <p>
            <strong>Chrome</strong>
          </p>
          <ol>
            <li>Chrome에서 싸이따마훈련소를 엽니다.</li>
            <li>오른쪽 위 ⋮ → ‘홈 화면에 추가’를 누릅니다.</li>
            <li>‘설치’ 또는 ‘바로가기 만들기’를 선택하고 추가합니다.</li>
          </ol>
          <p>
            <strong>삼성 인터넷</strong>: 메뉴 ☰ → ‘현재 페이지 추가’ → ‘홈
            화면’ → ‘추가’. 버전에 따라 ‘홈 화면에 추가’로 표시될 수 있습니다.
          </p>
          <p>
            카카오톡 등 앱 안에서는 추가 메뉴가 없을 수 있습니다.
            Safari·Chrome·삼성 인터넷에서 다시 열어 주세요. 홈 화면 아이콘으로
            실행한 뒤 로그인이 다시 필요할 수 있습니다.
          </p>
          <a
            href="https://support.google.com/chrome/answer/15085120?co=GENIE.Platform%3DAndroid&hl=ko"
            target="_blank"
            rel="noreferrer"
          >
            Chrome 안내
          </a>
        </section>
      </div>
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
  const level = displayedLevel(entry),
    appearance = characterAppearance(level);
  return (
    <Modal title={entry.characterName} onClose={onClose}>
      <p className="ranking-user-level">LV. {level}</p>
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
            {running ? "0.1km" : "1개"}=1 EXP
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
function SettingsPanel({
  data,
  persist,
  onClose,
  notify,
  error,
  setError,
  storageKey,
  account,
}) {
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
      <AccountControls account={account} />
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
          윗몸일으키기·달리기 목표 0은 선택 운동입니다. EXP는 목표와 관계없이
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
      <section className="settings-section">
        <h3>
          <ShieldCheck size={18} />
          기록 백업
        </h3>
        <p className="hint">
          기록은 이 기기에 저장되고 로그인한 계정과 동기화됩니다. JSON 파일로도
          백업할 수 있습니다.
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
              총 {number(stats(incoming).total)} EXP · 겹치는 날짜{" "}
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
                    localStorage.getItem(storageKey) || "{}",
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
        싸이따마훈련소 <span>v1.0</span>
      </p>
    </Modal>
  );
}
export default function App() {
  const {
    data,
    error,
    setError,
    persist: saveLocal,
    storageKey,
    account,
  } = useWorkoutAccount();
  const [rankingUser, setRankingUser] = useState(null);
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
    setStageDetail(null);
    setDeleteOpen(false);
    setTab("home");
    setSelected(dateKey());
    setDraft(emptyCounts());
  }, [account.user?.uid]);
  function notify(text) {
    clearTimeout(toastTimer.current);
    setToast(text);
    toastTimer.current = setTimeout(() => setToast(""), 4000);
  }
  function persist(nextData, recover = false) {
    if (saveLocal(nextData, recover)) return true;
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
    e.preventDefault();
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
      }
    } catch (e) {
      setFormError(e.message);
    }
  }
  const nav = [
    ["home", Dumbbell, "훈련소"],
    ["calendar", CalendarDays, "운동 기록"],
    ["growth", Sparkles, "성장 도감"],
    ["ranking", Trophy, "랭킹"],
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
              </button>
            ))}
          </nav>
          <div className="header-actions">
            <button
              className="settings-button"
              onClick={() => setSettings(true)}
              aria-label="설정 및 백업"
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
                  ? "랭킹"
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
                      뒤 −5레벨
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
              <RankingPanel
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
                  최대 1000레벨 · 연속 미기록 5일마다 −5레벨
                </p>
                <div className="growth-rules">
                  <span>푸쉬업 · 스쿼트 · 윗몸일으키기 1개 = 1 EXP</span>
                  <span>달리기 0.1km = 1 EXP · 하루 여러 레벨 상승 가능</span>
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
          <span>
            <Zap size={12} />
            계정 동기화 · JSON 백업 지원
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
          <button
            className="secondary-button name-import"
            onClick={() => setSettings(true)}
          >
            <Upload size={17} /> 백업 가져오기
          </button>
        </Modal>
      )}
      {helpOpen && <HelpDialog onClose={() => setHelpOpen(false)} />}
      {settings && (
        <SettingsPanel
          {...{ data, persist, notify, error, setError, storageKey, account }}
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
