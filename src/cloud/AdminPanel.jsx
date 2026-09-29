import { useEffect, useState } from "react";
import { EXERCISES, recordExp } from "../model";
import { friendApi } from "./friendsClient";

function TraineeEditor({ entry, onSaved }) {
  const [values, setValues] = useState(entry);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
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
        <p className="hint">
          매일 밤 9시 이후 · 한국 시간
          <br />
          운동일 80~120 EXP · 3일 중 하루 휴식
        </p>
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
          disabled={busy}
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
      {!busy && !error && !entries.length && (
        <button className="primary-button" onClick={() => load("admin-seed")}>
          고구마똥 추가
        </button>
      )}
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
