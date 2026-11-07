import { useCallback, useEffect, useRef, useState } from "react";
import { friendApi } from "./friendsClient";
import { observeFriendInbox } from "./firebaseClient";
import useKoreaDay from "./useKoreaDay";

const empty = { count: 0, received: [], notifications: [] };
export default function useKudos(account) {
  const day = useKoreaDay(),
    uid = account.user?.uid;
  const [state, setState] = useState(null),
    [error, setError] = useState("");
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    if (!uid || !account.ready) return;
    const ticket = ++generation.current;
    try {
      const value = await friendApi("kudos-state");
      if (ticket === generation.current) {
        setState({ ...value, uid });
        setError("");
      }
    } catch (e) {
      if (ticket === generation.current) setError(e.message);
    }
  }, [uid, account.ready, day]);
  useEffect(() => {
    if (!uid || !account.ready) return;
    let revision;
    const stop = observeFriendInbox(
      uid,
      (value) => {
        const next = `${value.kudosDay}:${value.kudosRevision}`;
        if (revision !== next) {
          revision = next;
          refresh();
        }
      },
      () => setError("따봉 정보를 불러오지 못했습니다. 다시 시도해 주세요."),
    );
    const focus = () => {
      if (document.visibilityState === "visible") refresh();
    };
    refresh();
    window.addEventListener("focus", focus);
    return () => {
      generation.current++;
      stop();
      window.removeEventListener("focus", focus);
    };
  }, [uid, account.ready, refresh]);
  return {
    ...(state?.uid === uid && state?.day === day ? state : empty),
    day,
    error,
    refresh,
  };
}
