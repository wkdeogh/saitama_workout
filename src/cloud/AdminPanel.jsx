import { virtualEditSummary } from "./virtualEdits";
import { ChevronDown, Plus, X, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { EXERCISES, MAX_NAME_LENGTH, validateName } from "../model";
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
  const summary = virtualEditSummary(values.totals, entry);
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
                min="0"
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
                오늘 ▲ {summary.todayCounts[key]}
                {unit}
              </small>
            </label>
          ))}
        </div>
        <div className="goal-fields admin-scores">
          <label>
            현재 레벨
            <input type="number" readOnly value={summary.level} />
          </label>
          <label>
            누적 EXP
            <input type="number" readOnly value={summary.totalExp} />
          </label>
        </div>
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
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  async function deleteTrainee(uid) {
    setDeleting(true);
    setError("");
    setMessage("");
    try {
      setEntries(await friendApi("admin-delete", { uid }));
      setDeleteTarget(null);
      setMessage("가상 훈련생을 삭제했습니다.");
    } catch (error) {
      setError(error.message);
    } finally {
      setDeleting(false);
    }
  }
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
      setShowCreate(false);
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
          disabled={busy || creating || deleting}
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
      <div className="virtual-list-toolbar">
        <span>
          {entries.length} / {MAX_VIRTUAL_TRAINEES}명
        </span>
        <button
          className="secondary-button"
          type="button"
          aria-expanded={showCreate}
          aria-controls="virtual-create-form"
          disabled={
            busy ||
            creating ||
            (!showCreate && entries.length >= MAX_VIRTUAL_TRAINEES)
          }
          onClick={() => {
            setShowCreate(!showCreate);
            setError("");
            setMessage("");
          }}
        >
          {showCreate ? (
            <X size={16} aria-hidden="true" />
          ) : (
            <Plus size={16} aria-hidden="true" />
          )}
          {showCreate ? "추가 취소" : "가상훈련생 추가"}
        </button>
      </div>
      {entries.length >= MAX_VIRTUAL_TRAINEES && (
        <p className="hint">최대 10명까지 추가할 수 있습니다.</p>
      )}
      {showCreate && (
        <form
          id="virtual-create-form"
          className="virtual-create"
          onSubmit={addTrainee}
        >
          <div className="virtual-create-heading">
            <label htmlFor="virtual-name">훈련생 이름</label>
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
            disabled={
              busy || creating || entries.length >= MAX_VIRTUAL_TRAINEES
            }
          />
          <PreferredExercises
            value={preferredExercises}
            onChange={setPreferredExercises}
            disabled={
              busy || creating || entries.length >= MAX_VIRTUAL_TRAINEES
            }
          />
        </form>
      )}
      {!busy && !error && !entries.length && (
        <p className="hint">등록된 가상 훈련생이 없습니다.</p>
      )}
      {!busy && (
        <ul className="virtual-list">
          {entries.map((entry) => (
            <li key={entry.uid} className="virtual-list-item">
              <details name="virtual-trainees">
                <summary className="virtual-list-row">
                  <span className="virtual-list-identity">
                    <strong>{entry.characterName}</strong>
                    <small>
                      LV. {entry.level} · 훈련강도{" "}
                      {entry.intensity ?? DEFAULT_TRAINING_INTENSITY}단계
                    </small>
                  </span>
                  <span className="virtual-list-status">
                    {entry.enabled ? "자동 운동" : "운동 중지"}
                  </span>
                  <ChevronDown size={18} aria-hidden="true" />
                </summary>
                <TraineeEditor
                  key={`${entry.uid}:${entry.revision}`}
                  entry={entry}
                  onSaved={(rows) => {
                    setEntries(rows);
                    setMessage("변경사항을 저장했습니다.");
                  }}
                />
              </details>
              <button
                className="virtual-delete-button"
                type="button"
                aria-label={`${entry.characterName} 삭제`}
                disabled={deleting}
                onClick={() => setDeleteTarget(entry.uid)}
              >
                <Trash2 size={17} aria-hidden="true" />
              </button>
              {deleteTarget === entry.uid && (
                <div
                  className="virtual-delete-confirm"
                  role="group"
                  aria-label={`${entry.characterName} 삭제 확인`}
                >
                  <p>{entry.characterName} 훈련생을 삭제할까요?</p>
                  <div className="action-buttons">
                    <button
                      className="secondary-button"
                      type="button"
                      disabled={deleting}
                      onClick={() => setDeleteTarget(null)}
                    >
                      취소
                    </button>
                    <button
                      className="secondary-button"
                      type="button"
                      disabled={deleting}
                      onClick={() => deleteTrainee(entry.uid)}
                    >
                      {deleting ? "삭제 중…" : "삭제 확인"}
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
