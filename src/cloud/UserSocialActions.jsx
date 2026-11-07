import { useEffect, useRef, useState } from "react";
import { Check, ThumbsUp, UserPlus } from "lucide-react";
import { t } from "../i18n/index.js";
import { friendApi } from "./friendsClient";
import { declinePush, enablePush, pushPreference } from "./pushClient";
import useKoreaDay from "./useKoreaDay";

export default function UserSocialActions({ uid, account, friends, Dialog }) {
  const day = useKoreaDay(),
    viewer = account.user?.uid;
  const [kudos, setKudos] = useState(null),
    [busy, setBusy] = useState("");
  const [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [pushPrompt, setPushPrompt] = useState(false);
  const generation = useRef(0),
    working = useRef(false);
  useEffect(() => {
    let active = true;
    async function refresh() {
      if (!viewer || !account.ready || uid === viewer || working.current)
        return;
      const ticket = ++generation.current;
      try {
        const result = await friendApi("kudos-state", { to: uid });
        if (active && ticket === generation.current) {
          setKudos(result);
          setError("");
        }
      } catch (e) {
        if (active && ticket === generation.current) setError(e.message);
      }
    }
    refresh();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 30000);
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      generation.current++;
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [uid, viewer, account.ready, day]);
  if (!viewer || uid === viewer) return null;
  const incoming = friends.incoming.find((r) => r.user.uid === uid);
  const isFriend = friends.friends.some((f) => f.uid === uid);
  const outgoing = friends.outgoing.some((r) => r.user.uid === uid);
  const current = kudos?.day === day ? kudos : null;
  async function run(kind, action) {
    if (working.current) return;
    working.current = true;
    if (kind === "kudos") generation.current++;
    setBusy(kind);
    setError("");
    setMessage("");
    try {
      await action();
    } catch (e) {
      setError(e.message);
    } finally {
      working.current = false;
      setBusy("");
    }
  }
  return (
    <>
      <div className="user-social-actions">
        <button
          className="secondary-button"
          disabled={
            !account.ready || !!busy || friends.loading || isFriend || outgoing
          }
          onClick={() =>
            run("friend", async () => {
              const result = incoming
                ? await friendApi("respond", {
                    id: incoming.id,
                    action: "accept",
                  })
                : await friendApi("request-user", { to: uid });
              setMessage(
                incoming || result.accepted
                  ? "친구가 되었습니다."
                  : "친구 요청을 보냈습니다.",
              );
              await friends.refresh();
            })
          }
        >
          {isFriend ? (
            <Check size={17} aria-hidden="true" />
          ) : (
            <UserPlus size={17} aria-hidden="true" />
          )}
          {busy === "friend"
            ? t("처리 중…")
            : isFriend
              ? t("친구")
              : outgoing
                ? t("요청 보냄")
                : incoming
                  ? t("친구 수락")
                  : t("친구 요청")}
        </button>
        <button
          className="secondary-button kudos-toggle"
          aria-pressed={current?.given === true}
          aria-label={t(current?.given ? "따봉 취소" : "따봉 보내기")}
          disabled={!account.ready || !!busy || !current}
          onClick={() =>
            run("kudos", async () => {
              const result = await friendApi("kudos-set", {
                to: uid,
                active: !current.given,
              });
              setKudos(result);
              if (result.promptForPush && !pushPreference(viewer))
                setPushPrompt(true);
            })
          }
        >
          <ThumbsUp
            size={18}
            aria-hidden="true"
            fill={current?.given ? "currentColor" : "none"}
          />
          {busy === "kudos"
            ? t("처리 중…")
            : t(current?.given ? "따봉 취소" : "따봉")}
          {!!current?.count && <span>+{current.count}</span>}
        </button>
      </div>
      {pushPrompt && (
        <Dialog
          title={t("알림을 켜시겠습니까?")}
          onClose={() => setPushPrompt(false)}
        >
          <p>{t("설정에서 알림을 켜거나 끌 수 있습니다.")}</p>
          <div className="action-buttons">
            <button
              className="secondary-button"
              disabled={!!busy}
              onClick={() =>
                run("push", async () => {
                  await enablePush();
                  setPushPrompt(false);
                })
              }
            >
              {busy === "push" ? t("설정 중…") : t("예")}
            </button>
            <button
              className="secondary-button"
              disabled={!!busy}
              onClick={() => {
                declinePush(viewer);
                setPushPrompt(false);
              }}
            >
              {t("아니오")}
            </button>
          </div>
          {error && (
            <p className="error-box" role="alert">
              {t(error)}
            </p>
          )}
        </Dialog>
      )}
      {message && (
        <p className="friend-message" role="status">
          {t(message)}
        </p>
      )}
      {error && (
        <p className="error-box" role="alert">
          {t(error)}
        </p>
      )}
    </>
  );
}
