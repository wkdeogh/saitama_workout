import { useCallback, useEffect, useRef, useState } from "react";
import { STORAGE_KEY, initialData, parseBackup, validateData } from "../model";
import {
  observeAccount,
  fetchAccount,
  syncAccount,
  loginGoogle,
  logoutGoogle,
  cloudError,
  firebaseConfigured,
} from "./firebaseClient";
import { mergeChanges, needsAccountSync } from "./rankingModel";
import { disablePush, setPushIdentity } from "./pushClient";
import { kakaoStatus, startKakao, finishKakao } from "./kakaoClient";
import {
  readGuest,
  storeGuest,
  claimGuestTransfer,
  completeGuestTransfer,
  prepareAccountScope,
} from "./guestStorage.js";

export const accountKey = (uid) =>
  uid ? `${STORAGE_KEY}:account:${uid}` : STORAGE_KEY;
function loadLocal(uid) {
  const key = accountKey(uid);
  try {
    const raw = localStorage.getItem(key);
    if (!raw)
      return {
        key,
        uid,
        data: initialData(),
        base: initialData(),
        participating: false,
        error: "",
        exists: false,
      };
    const packet = JSON.parse(raw);
    return {
      key,
      uid,
      data: uid
        ? parseBackup(JSON.stringify(packet.data))
        : readGuest(localStorage).data,
      base:
        uid && packet.base
          ? parseBackup(JSON.stringify(packet.base))
          : initialData(),
      participating: uid ? !!packet.participating : false,
      guestImport: uid ? packet.guestImport || null : null,
      guestReceipt: uid ? packet.guestReceipt || null : null,
      needsPublication: uid ? !!packet.needsPublication : false,
      error: "",
      exists: true,
    };
  } catch {
    return {
      key,
      uid,
      data: initialData(),
      base: initialData(),
      participating: false,
      exists: true,
      error: uid
        ? "이 기기에 저장된 기록을 불러오지 못했습니다. 다른 브라우저에서 같은 계정으로 로그인해 서버에 저장된 기록을 확인해 주세요."
        : "이 기기의 운동 기록을 읽을 수 없습니다. 브라우저 저장 공간과 권한을 확인해 주세요.",
    };
  }
}
function storeLocal(scope) {
  if (!scope.uid) {
    storeGuest(localStorage, scope.data);
    return;
  }
  localStorage.setItem(
    scope.key,
    JSON.stringify({
      data: scope.data,
      base: scope.base,
      participating: scope.participating,
      guestImport: scope.guestImport || null,
      guestReceipt: scope.guestReceipt || null,
      needsPublication: !!scope.needsPublication,
    }),
  );
}
const withTimeout = async (promise) => {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new Error(
                "서버 응답이 지연됩니다. 잠시 후 다시 동기화해 주세요.",
              ),
            ),
          12000,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
};
export default function useWorkoutAccount() {
  const [kakao, setKakao] = useState({ enabled: false, linked: false });
  const [kakaoProcessing, setKakaoProcessing] = useState(() =>
    new URLSearchParams(window.location.search).has("kakao"),
  );
  const [scope, setScope] = useState(() => loadLocal(null));
  const [user, setUser] = useState(null),
    [authLoading, setAuthLoading] = useState(firebaseConfigured);
  const [ready, setReady] = useState(!firebaseConfigured),
    [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(""),
    [lastSync, setLastSync] = useState(null);
  const live = useRef(scope),
    generation = useRef(0),
    syncing = useRef(false),
    readyRef = useRef(!firebaseConfigured);
  const publish = useCallback((value) => {
    live.current = value;
    setScope(value);
  }, []);
  const setError = useCallback(
    (error) => publish({ ...live.current, error }),
    [publish],
  );
  const persist = useCallback(
    (data, recover = false) => {
      const current = live.current;
      if (!readyRef.current || (current.error && !recover)) return false;
      try {
        const next = {
          ...current,
          data: validateData(data),
          error: recover ? "" : current.error,
        };
        storeLocal(next);
        publish(next);
        return true;
      } catch (error) {
        setMessage(cloudError(error));
        return false;
      }
    },
    [publish],
  );
  const synchronize = useCallback(async () => {
    const current = live.current;
    if (
      !current.uid ||
      !current.data.characterName ||
      current.error ||
      !readyRef.current ||
      syncing.current
    )
      return false;
    const ticket = generation.current;
    syncing.current = true;
    setBusy(true);
    setMessage("");
    try {
      const result = await withTimeout(
        syncAccount(
          current.uid,
          current.base,
          current.data,
          current.guestImport?.data,
        ),
      );
      if (ticket !== generation.current) return false;
      // Preserve edits made while the transaction was in flight.
      const data = mergeChanges(current.data, live.current.data, result.data);
      const next = {
        ...live.current,
        data,
        base: result.data,
        participating: result.participating,
        needsPublication: false,
        guestImport: null,
        guestReceipt: current.guestImport?.id || current.guestReceipt || null,
      };
      storeLocal(next);
      publish(next);
      // The receipt is durable before cleanup, so a reload cannot reimport an
      // acknowledged transfer if localStorage cleanup fails.
      try {
        completeGuestTransfer(
          localStorage,
          current.uid,
          current.guestImport?.id,
        );
      } catch {
        /* The account receipt will finish cleanup at the next login. */
      }
      setLastSync(new Date());
      return true;
    } catch (error) {
      if (ticket === generation.current) setMessage(cloudError(error));
      return false;
    } finally {
      if (ticket === generation.current) {
        syncing.current = false;
        setBusy(false);
      }
    }
  }, [publish]);
  useEffect(
    () =>
      observeAccount(async (account) => {
        setPushIdentity(null).catch(() => {});
        const ticket = ++generation.current;
        readyRef.current = false;
        setReady(false);
        setAuthLoading(false);
        setUser(account);
        syncing.current = false;
        setBusy(false);
        setMessage("");
        setLastSync(null);
        const local = loadLocal(account?.uid || null);
        publish(local);
        if (account && !local.error) {
          let guestImport = local.guestImport || null;
          try {
            guestImport = claimGuestTransfer(
              localStorage,
              account.uid,
              local.guestReceipt,
            );
            // Persist the claimed import before any network request. Offline
            // sessions and interrupted login redirects can resume safely.
            const staged = prepareAccountScope(
              local,
              { data: local.base, participating: local.participating },
              guestImport,
            );
            publish(staged);
            storeLocal(staged);
            const remote = await withTimeout(fetchAccount(account.uid));
            if (ticket !== generation.current) return;
            const next = prepareAccountScope(local, remote, guestImport);
            storeLocal(next);
            publish(next);
            setLastSync(new Date());
          } catch (error) {
            if (ticket === generation.current) setMessage(cloudError(error));
          }
        }
        if (ticket === generation.current) {
          readyRef.current = true;
          setReady(true);
        }
      }),
    [publish],
  );
  useEffect(() => {
    let active = true;
    kakaoStatus(user)
      .then((value) => {
        if (active) setKakao(value);
      })
      .catch(() => {
        if (active) setKakao({ enabled: false, linked: false });
      });
    return () => {
      active = false;
    };
  }, [user]);
  useEffect(() => {
    let active = true;
    finishKakao()
      .catch((error) => {
        if (active) setMessage(cloudError(error));
      })
      .finally(() => {
        if (active) setKakaoProcessing(false);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!scope.uid || !ready || scope.error || busy || !needsAccountSync(scope))
      return;
    // An explicit retry is required after failure, preventing quota-draining loops.
    if (message) return;
    const timer = setTimeout(() => synchronize(), 1200);
    return () => clearTimeout(timer);
  }, [scope, ready, busy, message, synchronize]);
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== live.current.key) return;
      publish(loadLocal(live.current.uid));
    };
    const reconnect = () => {
      if (live.current.uid) synchronize();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("online", reconnect);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("online", reconnect);
    };
  }, [publish, synchronize]);
  async function login() {
    setMessage("");
    try {
      await loginGoogle();
    } catch (error) {
      setMessage(cloudError(error));
    }
  }
  async function logout() {
    setMessage("");
    try {
      try {
        await disablePush({ forget: true });
      } finally {
        await logoutGoogle();
      }
    } catch (error) {
      setMessage(cloudError(error));
    }
  }
  async function kakaoLogin(mode = "login") {
    setMessage("");
    try {
      if (
        mode === "link" &&
        needsAccountSync(live.current) &&
        !(await synchronize())
      )
        throw new Error("기록 동기화를 마친 후 카카오 계정을 연결해 주세요.");
      await startKakao(mode);
    } catch (error) {
      setMessage(cloudError(error));
    }
  }
  return {
    data: scope.data,
    error: scope.error,
    setError,
    persist,
    storageKey: scope.key,
    account: {
      user,
      authLoading: authLoading || kakaoProcessing,
      kakao,
      kakaoLogin,
      ready,
      busy,
      message,
      lastSync,
      participating: scope.participating,
      configured: firebaseConfigured,
      login,
      logout,
      synchronize,
      pending: !!scope.uid && needsAccountSync(scope),
    },
  };
}
