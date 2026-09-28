import { useCallback, useEffect, useRef, useState } from "react";
import { friendApi } from "./friendsClient";
import {
  enablePush,
  listenForeground,
  pushAvailable,
  pushPreference,
} from "./pushClient";
import { observeFriendInbox } from "./firebaseClient";
const empty = { me: null, friends: [], incoming: [], outgoing: [] };
export default function useFriends(account) {
  const [state, setState] = useState(empty),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [revision, setRevision] = useState(0),
    [pending, setPending] = useState(0);
  const generation = useRef(0),
    liveUid = useRef(account.user?.uid);
  liveUid.current = account.user?.uid;
  const refresh = useCallback(async () => {
    const uid = account.user?.uid;
    if (!uid || !account.ready) return;
    const ticket = ++generation.current;
    setLoading(true);
    try {
      const value = await friendApi("state");
      if (ticket === generation.current && liveUid.current === uid) {
        setState(value);
        setPending(value.incoming.length);
        setError("");
        setRevision((n) => n + 1);
      }
    } catch (e) {
      if (ticket === generation.current) setError(e.message);
    } finally {
      if (ticket === generation.current) setLoading(false);
    }
  }, [account.user?.uid, account.ready]);
  useEffect(() => {
    setState(empty);
    setPending(0);
    setError("");
    return () => {
      generation.current++;
    };
  }, [account.user?.uid]);
  useEffect(() => {
    if (account.ready && account.user) refresh();
  }, [refresh, account.lastSync]);
  useEffect(() => {
    if (!account.user || !account.ready) return;
    let first = true;
    const stop = observeFriendInbox(
      account.user.uid,
      (value) => {
        setPending(value.pending || 0);
        if (!first) refresh();
        first = false;
      },
      () => setError("친구 요청 실시간 연결이 끊겼습니다. 새로고침해 주세요."),
    );
    const focus = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", focus);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", focus);
    };
  }, [account.user?.uid, account.ready, refresh]);
  useEffect(() => {
    const uid = account.user?.uid;
    if (!uid || !account.ready) return;
    let active = true,
      stop = () => {};
    listenForeground(uid)
      .then((unsubscribe) => {
        if (active) stop = unsubscribe;
        else unsubscribe();
      })
      .catch(() => {});
    if (
      pushAvailable() &&
      Notification.permission === "granted" &&
      pushPreference(uid)
    )
      enablePush(false).catch(() => {
        if (active)
          setError(
            "푸시 알림 연결을 복구하지 못했습니다. 알림을 다시 켜 주세요.",
          );
      });
    return () => {
      active = false;
      stop();
    };
  }, [account.user?.uid, account.ready]);
  return { ...state, error, loading, revision, pending, refresh };
}
