import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";

async function worker() {
  const notifications = [],
    opened = [],
    messages = [],
    handlers = {};
  let receive,
    uid = "recipient",
    windows = [];
  const self = {
    location: { origin: "https://saitama-workout.vercel.app" },
    addEventListener: (name, fn) => {
      handlers[name] = fn;
    },
    registration: {
      showNotification: async (...args) => notifications.push(args),
    },
    clients: {
      matchAll: async () => windows,
      openWindow: async (url) => opened.push(url),
    },
  };
  runInNewContext(await readFile("public/firebase-messaging-sw.js", "utf8"), {
    self,
    URL,
    importScripts() {},
    firebase: {
      initializeApp() {},
      messaging: () => ({
        onBackgroundMessage: (fn) => {
          receive = fn;
        },
      }),
    },
    indexedDB: {
      open: () => {
        const request = {};
        queueMicrotask(() => {
          request.result = {
            close() {},
            transaction: () => ({
              objectStore: () => ({
                get: () => {
                  const read = { result: uid };
                  queueMicrotask(() => read.onsuccess());
                  return read;
                },
              }),
            }),
          };
          request.onsuccess();
        });
        return request;
      },
    },
  });
  return {
    notifications,
    opened,
    messages,
    receive: (data) => receive({ data }),
    session: (value) => {
      uid = value;
    },
    existing: () => {
      windows = [
        {
          url: self.location.origin,
          focus: async () => {},
          postMessage: (value) => messages.push(value.type),
        },
      ];
    },
    click: async (url) => {
      let done;
      handlers.notificationclick({
        notification: { close() {}, data: { url } },
        waitUntil: (value) => {
          done = value;
        },
      });
      await done;
    },
  };
}
test("kudos background pushes display the exact message and open the received list, while friend pushes keep their route", async () => {
  const w = await worker();
  await w.receive({
    uid: "recipient",
    title: "따봉",
    body: "훈련친구에게 따봉을 받았습니다!",
    notificationTag: "kudos-2026-11-07-sender",
    url: "/?view=kudos",
  });
  assert.equal(w.notifications[0][0], "따봉");
  assert.equal(w.notifications[0][1].body, "훈련친구에게 따봉을 받았습니다!");
  assert.equal(w.notifications[0][1].tag, "kudos-2026-11-07-sender");
  await w.click(w.notifications[0][1].data.url);
  assert.deepEqual(w.opened, ["/?view=kudos"]);
  w.existing();
  await w.click("/?view=kudos");
  await w.receive({
    uid: "recipient",
    body: "친구 요청",
    requestTag: "ST-ABCDEFGH",
  });
  assert.equal(w.notifications[1][0], "친구 요청");
  assert.equal(w.notifications[1][1].tag, "friend-ST-ABCDEFGH");
  await w.click("/?view=friends");
  assert.deepEqual(w.messages, ["OPEN_KUDOS", "OPEN_FRIENDS"]);
});
test("signed-out or switched-account devices cannot display another user's kudos", async () => {
  const w = await worker();
  await w.receive({ uid: "other", body: "not mine" });
  w.session(null);
  await w.receive({ uid: "recipient", body: "signed out" });
  await w.receive({ body: "missing recipient" });
  assert.equal(w.notifications.length, 0);
});
