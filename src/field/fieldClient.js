import { initializeApp, getApps } from "firebase/app";
import { getAuth, signInAnonymously, connectAuthEmulator } from "firebase/auth";
import {
  getDatabase,
  connectDatabaseEmulator,
  ref,
  onValue,
  onDisconnect,
  set,
  remove,
  serverTimestamp,
} from "firebase/database";
import { app, auth } from "../cloud/firebaseClient";
import { firebaseConfig } from "../cloud/firebaseConfig";
import { visiblePlayers } from "./fieldModel";

const emulator =
  import.meta.env.DEV && import.meta.env.VITE_FIREBASE_EMULATORS === "true";
const databaseURL =
  import.meta.env.VITE_FIREBASE_DATABASE_URL ||
  (emulator
    ? "https://demo-saitama-default-rtdb.firebaseio.com"
    : firebaseConfig.projectId === "saitama-workout-ff2d5"
      ? "https://saitama-workout-ff2d5-default-rtdb.asia-southeast1.firebasedatabase.app"
      : "");
const configuredDatabases = new WeakSet();
let guestLogin;

async function fieldIdentity(user) {
  if (user && auth?.currentUser?.uid === user.uid)
    return { app, uid: user.uid };
  let guestApp = getApps().find((item) => item.name === "outdoor-field-guest");
  if (!guestApp) {
    guestApp = initializeApp(firebaseConfig, "outdoor-field-guest");
    if (emulator)
      connectAuthEmulator(getAuth(guestApp), "http://127.0.0.1:9099", {
        disableWarnings: true,
      });
  }
  const guestAuth = getAuth(guestApp);
  await guestAuth.authStateReady();
  if (!guestAuth.currentUser) {
    guestLogin ||= signInAnonymously(guestAuth).finally(() => {
      guestLogin = null;
    });
    await guestLogin;
  }
  return { app: guestApp, uid: guestAuth.currentUser.uid };
}

export async function connectField({
  user,
  initial,
  onPlayers,
  onStatus,
  signal,
}) {
  if (!databaseURL)
    throw new Error("야외 훈련장 공유 서버가 아직 설정되지 않았어요.");
  const identity = await fieldIdentity(user);
  if (signal.aborted) return null;
  const db = getDatabase(identity.app, databaseURL);
  if (emulator && !configuredDatabases.has(db)) {
    connectDatabaseEmulator(db, "127.0.0.1", 9000);
    configuredDatabases.add(db);
  }
  const session = crypto.randomUUID();
  const key = `${identity.uid}/${session}`;
  const playerRef = ref(db, `worlds/meadow/players/${key}`);
  const disconnect = onDisconnect(playerRef);
  let closed = false,
    connected = false,
    ready = false,
    clockOffset = 0;
  let latest = initial,
    inFlight = null,
    pending = false,
    lastWrite = 0,
    lastSignature = "",
    trailing;
  const fail = (error) => {
    ready = false;
    if (!closed)
      onStatus({
        state: "error",
        message: error.code?.includes("permission")
          ? "공유 서버의 접속 권한을 확인해 주세요."
          : "공유 서버 연결이 끊겼어요. 다시 연결해 주세요.",
      });
  };
  function flush(force = false) {
    if (
      closed ||
      !connected ||
      !ready ||
      (!force && Date.now() - lastWrite < 120)
    )
      return;
    if (inFlight) {
      pending = true;
      return;
    }
    pending = false;
    lastWrite = Date.now();
    lastSignature = JSON.stringify(latest);
    inFlight = set(playerRef, { ...latest, updatedAt: serverTimestamp() })
      .then(() => {
        if (!closed && connected) onStatus({ state: "online", message: "" });
      })
      .catch(fail)
      .finally(() => {
        inFlight = null;
        if (pending && !closed) flush(true);
      });
  }
  const stopOffset = onValue(ref(db, ".info/serverTimeOffset"), (snap) => {
    clockOffset = snap.val() || 0;
  });
  const stopRoster = onValue(
    ref(db, "worlds/meadow/players"),
    (snap) => {
      if (!closed)
        onPlayers(visiblePlayers(snap.val(), Date.now() + clockOffset), key);
    },
    fail,
  );
  let connectionVersion = 0;
  const stopConnected = onValue(ref(db, ".info/connected"), async (snap) => {
    const version = ++connectionVersion;
    connected = snap.val() === true;
    ready = false;
    if (closed) return;
    if (!connected) {
      onStatus({ state: "offline", message: "공유 서버에 연결 중…" });
      return;
    }
    try {
      // Register server-side cleanup before making this session visible.
      await disconnect.remove();
      if (closed || version !== connectionVersion) return;
      ready = true;
      flush(true);
    } catch (error) {
      fail(error);
    }
  });
  const heartbeat = setInterval(() => flush(true), 12000);
  function close() {
    if (closed) return;
    closed = true;
    connectionVersion++;
    clearInterval(heartbeat);
    clearTimeout(trailing);
    stopOffset();
    stopRoster();
    stopConnected();
    // Wait for an outstanding position write so it cannot recreate a departed player.
    Promise.resolve(inFlight)
      .then(() => remove(playerRef))
      .then(() => disconnect.cancel())
      .catch(() => {});
  }
  signal.addEventListener("abort", close, { once: true });
  if (signal.aborted) close();
  return {
    key,
    now: () => Date.now() + clockOffset,
    publish: (value, force = false) => {
      latest = value;
      if (!force && JSON.stringify(value) === lastSignature) return;
      clearTimeout(trailing);
      const wait = 120 - (Date.now() - lastWrite);
      if (!force && wait > 0) trailing = setTimeout(() => flush(), wait + 2);
      else flush(force);
    },
    close,
  };
}

export function fieldConnectionError(error) {
  if (
    [
      "auth/operation-not-allowed",
      "auth/admin-restricted-operation",
      "auth/configuration-not-found",
    ].includes(error.code)
  )
    return "공유 서버의 비회원 접속 설정이 아직 활성화되지 않았어요.";
  return error.message?.startsWith("야외 훈련장")
    ? error.message
    : "공유 서버에 연결하지 못했어요. 다시 연결해 주세요.";
}
