import { app, auth } from "./firebaseClient";
import { friendApi } from "./friendsClient";
export const VAPID_KEY =
  "BLflagtXTok-UCdtnr480oKqvAf-kjVJGxAfAI9DSO9gC4JOmdCJu0N1o05eKSTwZeZfA6AVcelkcyyooshMs7A";
let activeToken = null;
export const pushAvailable = () =>
  typeof Notification !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window;
export function pushPreference(uid) {
  try {
    return localStorage.getItem(`saitama-push:${uid}`) === "on";
  } catch {
    return false;
  }
}
function preference(uid, value) {
  try {
    localStorage.setItem(`saitama-push:${uid}`, value);
  } catch {}
}
export function setPushIdentity(uid) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("saitama-push", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("session");
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result,
        tx = db.transaction("session", "readwrite");
      tx.objectStore("session").put(uid || null, "uid");
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    };
  });
}
export async function enablePush(requestPermission = true) {
  if (!pushAvailable())
    throw new Error(
      "이 브라우저는 푸시를 지원하지 않습니다. 아이폰은 홈 화면에 추가한 앱에서 켜 주세요.",
    );
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("로그인이 필요합니다.");
  const permission = requestPermission
    ? await Notification.requestPermission()
    : Notification.permission;
  if (permission !== "granted")
    throw new Error(
      "알림이 차단되어 있습니다. 브라우저 또는 휴대폰 설정에서 알림을 허용해 주세요.",
    );
  const { getMessaging, getToken, isSupported } =
    await import("firebase/messaging");
  if (!(await isSupported()))
    throw new Error("이 브라우저는 푸시 알림을 지원하지 않습니다.");
  const registration = await navigator.serviceWorker.register(
    "/firebase-messaging-sw.js",
  );
  await navigator.serviceWorker.ready;
  const token = await getToken(getMessaging(app), {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: registration,
  });
  if (auth.currentUser?.uid !== uid)
    throw new Error("로그인 계정이 변경되었습니다.");
  await friendApi("device", { token, enabled: true });
  if (auth.currentUser?.uid !== uid)
    throw new Error("로그인 계정이 변경되었습니다.");
  await setPushIdentity(uid);
  activeToken = token;
  preference(uid, "on");
}
export async function disablePush({ forget = false } = {}) {
  const uid = auth.currentUser?.uid;
  if (!forget && uid) preference(uid, "off");
  await setPushIdentity(null).catch(() => {});
  if (activeToken) {
    try {
      await friendApi("device", { token: activeToken, enabled: false });
    } catch {
      /* An unsubscribed token will be removed on the next delivery attempt. */
    }
  }
  activeToken = null;
  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.getRegistration("/");
    if (registration?.active?.scriptURL.endsWith("/firebase-messaging-sw.js")) {
      const subscription = await registration.pushManager.getSubscription();
      await subscription?.unsubscribe();
      await registration.unregister();
    }
  }
}
export async function listenForeground(uid) {
  if (!pushAvailable()) return () => {};
  const { getMessaging, isSupported, onMessage } =
    await import("firebase/messaging");
  if (!(await isSupported())) return () => {};
  return onMessage(getMessaging(app), async (payload) => {
    if (
      auth.currentUser?.uid !== uid ||
      payload.data?.uid !== uid ||
      !pushPreference(uid)
    )
      return;
    const registration = await navigator.serviceWorker.getRegistration("/");
    await registration?.showNotification("친구 요청", {
      body: payload.data.body,
      icon: "/icons/icon-192.png",
      tag: `friend-${payload.data.requestTag}`,
      data: { url: "/?view=friends" },
    });
  });
}
