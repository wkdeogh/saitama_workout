import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import {
  enablePush,
  disablePush,
  pushAvailable,
  pushPreference,
} from "./pushClient";
export default function PushControls({ uid }) {
  const [enabled, setEnabled] = useState(
      () =>
        pushPreference(uid) &&
        pushAvailable() &&
        Notification.permission === "granted",
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    setEnabled(
      pushPreference(uid) &&
        pushAvailable() &&
        Notification.permission === "granted",
    );
  }, [uid]);
  return (
    <div className="friend-push">
      <div>
        <strong>
          <Bell size={16} />
          친구 요청 알림
        </strong>
        <p>아이폰: 홈 화면에 추가한 앱에서 알림 허용</p>
      </div>
      <button
        className="secondary-button"
        disabled={busy || !pushAvailable()}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            if (enabled) await disablePush();
            else await enablePush();
            setEnabled(!enabled);
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "설정 중…" : enabled ? "알림 끄기" : "알림 켜기"}
      </button>
      {!pushAvailable() && (
        <p className="hint">현재 브라우저는 푸시 알림을 지원하지 않습니다.</p>
      )}
      {error && (
        <p className="error-box" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
