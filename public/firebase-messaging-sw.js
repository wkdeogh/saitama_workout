/* No offline page cache: authentication and workout data remain network controlled. */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const existing = windows.find(
        (client) => new URL(client.url).origin === self.location.origin,
      );
      if (existing) {
        await existing.focus();
        existing.postMessage({ type: "OPEN_FRIENDS" });
      } else await self.clients.openWindow("/?view=friends");
    })(),
  );
});
importScripts(
  "https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js",
);
firebase.initializeApp({
  apiKey: "AIzaSyAIJsfzZLBTYTKoPcf__wyVTX30q84XC0Y",
  authDomain: "saitama-workout-ff2d5.firebaseapp.com",
  projectId: "saitama-workout-ff2d5",
  messagingSenderId: "1093654679193",
  appId: "1:1093654679193:web:fdc265df2f247be1e8b208",
});
async function currentUser() {
  return new Promise((resolve) => {
    const request = indexedDB.open("saitama-push", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("session");
    request.onerror = () => resolve(null);
    request.onsuccess = () => {
      const db = request.result,
        read = db.transaction("session").objectStore("session").get("uid");
      read.onsuccess = () => {
        db.close();
        resolve(read.result);
      };
      read.onerror = () => {
        db.close();
        resolve(null);
      };
    };
  });
}
firebase.messaging().onBackgroundMessage(async (payload) => {
  if (!payload.data?.uid || (await currentUser()) !== payload.data.uid) return;
  return self.registration.showNotification("친구 요청", {
    body: payload.data?.body || "새 친구 요청이 도착했습니다.",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: `friend-${payload.data?.requestTag || "request"}`,
    data: { url: "/?view=friends" },
  });
});
