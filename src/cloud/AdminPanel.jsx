import { useEffect, useRef, useState } from "react";
import { EXERCISES, recordExp, MAX_NAME_LENGTH, validateName } from "../model";
import {
  MAX_VIRTUAL_TRAINEES,
  DEFAULT_TRAINING_INTENSITY,
  DEFAULT_PREFERRED_EXERCISES,
  TRAINING_INTENSITIES,
  trainingIntensityLabel,
} from "./virtualLimits";
import { friendApi } from "./friendsClient";

function IntensitySelect({ value, onChange, disabled = false }) {
  return (
    <label className="virtual-intensity">
      훈련강도
      <select
        value={value ?? DEFAULT_TRAINING_INTENSITY}
        onChange={(event) => onChange(Number(event.target.value))}
        disabled={disabled}
      >
        {TRAINING_INTENSITIES.map((setting) => (
          <option key={setting.level} value={setting.level}>
            {trainingIntensityLabel(setting)}
          </option>
        ))}
      </select>
    </label>
  );
}

function PreferredExercises({
  value = DEFAULT_PREFERRED_EXERCISES,
  onChange,
  disabled = false,
}) {
  return (
    <fieldset className="virtual-preferences" disabled={disabled}>
      <legend>선호 운동 (복수 선택)</legend>
      <div>
        {EXERCISES.map(({ key, label }) => (
          <label key={key}>
            <input
              type="checkbox"
              checked={value.includes(key)}
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? [...value, key]
                    : value.filter((item) => item !== key),
                )
              }
            />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function TraineeEditor({ entry, onSaved }) {
  const [values, setValues] = useState(entry);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (values.preferredExercises?.length === 0)
        throw new Error("선호 운동을 1개 이상 선택해 주세요.");
      onSaved(await friendApi("admin-update", { uid: entry.uid, values }));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="virtual-editor" onSubmit={save}>
      <h3>{entry.characterName}</h3>
      <p className="hint">#{entry.tag}</p>
      <fieldset disabled={busy}>
        <legend>누적 운동량</legend>
        <div className="goal-fields">
          {EXERCISES.map(({ key, label, unit, step }) => (
            <label key={key}>
              {label} ({unit})
              <input
                type="number"
                required
                min={entry.todayCounts[key]}
                max={key === "runningKm" ? 40000000 : 400000000}
                step={step}
                value={values.totals[key]}
                onChange={(e) =>
                  setValues({
                    ...values,
                    totals: {
                      ...values.totals,
                      [key]:
                        e.target.value === "" ? "" : Number(e.target.value),
                    },
                  })
                }
              />
              <small>
                오늘 ▲ {entry.todayCounts[key]}
                {unit}
              </small>
            </label>
          ))}
        </div>
        <div className="goal-fields admin-scores">
          <label>
            현재 레벨
            <input
              type="number"
              required
              min="1"
              max="1000"
              step="1"
              value={values.level}
              onChange={(e) =>
                setValues({
                  ...values,
                  level: e.target.value === "" ? "" : Number(e.target.value),
                })
              }
            />
          </label>
          <label>
            누적 EXP
            <input
              type="number"
              required
              min={recordExp(entry.todayCounts)}
              max="2000000000"
              step="1"
              value={values.totalExp}
              onChange={(e) =>
                setValues({
                  ...values,
                  totalExp: e.target.value === "" ? "" : Number(e.target.value),
                })
              }
            />
          </label>
        </div>
        <p className="hint">레벨·EXP는 운동량과 별도로 수정됩니다.</p>
        <label className="virtual-enabled">
          <input
            type="checkbox"
            checked={values.enabled}
            onChange={(e) =>
              setValues({ ...values, enabled: e.target.checked })
            }
          />{" "}
          자동 운동
        </label>
        <IntensitySelect
          value={values.intensity}
          onChange={(intensity) => setValues({ ...values, intensity })}
        />
        <PreferredExercises
          value={values.preferredExercises}
          onChange={(preferredExercises) =>
            setValues({ ...values, preferredExercises })
          }
        />
        <p className="hint">운동일 밤 9시 이후 · 한국 시간</p>
        <button className="primary-button" type="submit">
          {busy ? "저장 중…" : "변경 저장"}
        </button>
      </fieldset>
      {error && (
        <p role="alert" className="error-box">
          {error}
        </p>
      )}
    </form>
  );
}

export default function AdminPanel() {
  const [entries, setEntries] = useState([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [intensity, setIntensity] = useState(DEFAULT_TRAINING_INTENSITY);
  const [preferredExercises, setPreferredExercises] = useState(
    DEFAULT_PREFERRED_EXERCISES,
  );
  const [creating, setCreating] = useState(false);
  const pendingCreate = useRef(null);
  const createInFlight = useRef(false);
  async function addTrainee(event) {
    event.preventDefault();
    if (createInFlight.current) return;
    createInFlight.current = true;
    setCreating(true);
    setError("");
    setMessage("");
    try {
      const normalized = validateName(name);
      if (!preferredExercises.length)
        throw new Error("선호 운동을 1개 이상 선택해 주세요.");
      if (
        !pendingCreate.current ||
        pendingCreate.current.name !== normalized ||
        pendingCreate.current.intensity !== intensity ||
        JSON.stringify(pendingCreate.current.preferredExercises) !==
          JSON.stringify(preferredExercises)
      )
        pendingCreate.current = {
          name: normalized,
          intensity,
          preferredExercises,
          requestId: crypto.randomUUID(),
        };
      const rows = await friendApi("admin-create", {
        values: pendingCreate.current,
      });
      setEntries(rows);
      pendingCreate.current = null;
      setName("");
      setMessage("가상 훈련생을 추가했습니다.");
    } catch (error) {
      setError(error.message);
    } finally {
      createInFlight.current = false;
      setCreating(false);
    }
  }
  async function load(action = "admin-list") {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      setEntries(await friendApi(action));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    let active = true;
    friendApi("admin-list")
      .then((value) => {
        if (active) setEntries(value);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, []);
  return (
    <section className="admin-panel">
      <div className="section-heading">
        <h2>가상 훈련생</h2>
        <button
          className="secondary-button"
          onClick={() => load()}
          disabled={busy || creating}
        >
          새로고침
        </button>
      </div>
      {busy && <p role="status">불러오는 중…</p>}
      {error && (
        <p className="error-box" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="success-box" role="status">
          {message}
        </p>
      )}
      <form className="virtual-create" onSubmit={addTrainee}>
        <div className="virtual-create-heading">
          <label htmlFor="virtual-name">훈련생 이름</label>
          <span>
            {entries.length} / {MAX_VIRTUAL_TRAINEES}명
          </span>
        </div>
        <div className="virtual-create-fields">
          <input
            id="virtual-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            maxLength={MAX_NAME_LENGTH}
            disabled={
              busy || creating || entries.length >= MAX_VIRTUAL_TRAINEES
            }
          />
          <button
            className="primary-button"
            type="submit"
            disabled={
              busy ||
              creating ||
              !name.trim() ||
              entries.length >= MAX_VIRTUAL_TRAINEES
            }
          >
            {creating ? "추가 중…" : "추가"}
          </button>
        </div>
        <IntensitySelect
          value={intensity}
          onChange={setIntensity}
          disabled={busy || creating || entries.length >= MAX_VIRTUAL_TRAINEES}
        />
        <PreferredExercises
          value={preferredExercises}
          onChange={setPreferredExercises}
          disabled={busy || creating || entries.length >= MAX_VIRTUAL_TRAINEES}
        />
        {entries.length >= MAX_VIRTUAL_TRAINEES && (
          <p className="hint">최대 10명까지 추가할 수 있습니다.</p>
        )}
      </form>
      {!busy &&
        entries.map((entry) => (
          <TraineeEditor
            key={`${entry.uid}:${entry.revision}`}
            entry={entry}
            onSaved={(rows) => {
              setEntries(rows);
              setMessage("변경사항을 저장했습니다.");
            }}
          />
        ))}
    </section>
  );
}
