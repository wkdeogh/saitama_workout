import { FieldValue } from "firebase-admin/firestore";
import { friendsService } from "./friendsService.js";
import { FriendError, normalizeUid } from "./friendsModel.js";
import { koreaDay } from "../src/cloud/rankingModel.js";
import { sendSocialPush } from "./socialPush.js";

export function kudosService(db, messaging, now = () => new Date()) {
  const social = friendsService(db);
  const dayRef = (to, day) => db.doc(`dailyKudos/${to}/days/${day}`);
  async function state(uid, to = uid) {
    normalizeUid(to);
    const day = koreaDay(now()),
      ref = dayRef(to, day);
    if (to !== uid) await social.user(uid, to);
    // Read a consistent count and sender list while other users are reacting.
    return db.runTransaction(async (tx) => {
      const summary = await tx.get(ref);
      const own = await tx.get(ref.collection("senders").doc(uid));
      const result = {
        day,
        count: summary.data()?.count || 0,
        given: own.data()?.active === true,
      };
      if (to === uid) {
        const senders = await tx.get(ref.collection("senders"));
        const rows = senders.docs
          .map((snap) => ({
            uid: snap.id,
            name: snap.data().name,
            tag: snap.data().tag,
            active: snap.data().active,
            notifiedAt: snap.data().notifiedAt?.toMillis() || 0,
          }))
          .sort(
            (a, b) => a.notifiedAt - b.notifiedAt || a.uid.localeCompare(b.uid),
          );
        result.received = rows.filter((row) => row.active);
        result.notifications = rows.map(({ uid: from, name, notifiedAt }) => ({
          id: `${day}:${from}`,
          name,
          notifiedAt,
        }));
      }
      return result;
    });
  }
  async function set(uid, to, active) {
    normalizeUid(to);
    if (to === uid)
      throw new FriendError("본인에게는 따봉을 보낼 수 없습니다.");
    if (typeof active !== "boolean")
      throw new FriendError("따봉 상태를 확인해 주세요.");
    const sender = await social.ensureProfile(uid);
    await social.user(uid, to);
    const result = await db.runTransaction(async (tx) => {
      // The server decides the day on every transaction attempt, including a midnight retry.
      const day = koreaDay(now()),
        ref = dayRef(to, day),
        edge = ref.collection("senders").doc(uid);
      const [summary, previous, inbox] = await Promise.all([
        tx.get(ref),
        tx.get(edge),
        tx.get(db.doc(`friendInbox/${uid}`)),
      ]);
      const count = summary.data()?.count || 0;
      if ((previous.data()?.active === true) === active)
        return {
          day,
          count,
          given: active,
          notify: false,
          promptForPush: false,
        };
      const first = active && !previous.exists;
      const promptForPush = active && inbox.data()?.kudosPushPrompted !== true;
      const nextCount = count + (active ? 1 : -1);
      tx.set(
        edge,
        {
          active,
          name: sender.name || "훈련생",
          tag: sender.tag,
          ...(first ? { notifiedAt: FieldValue.serverTimestamp() } : {}),
        },
        { merge: true },
      );
      tx.set(ref, { count: nextCount });
      tx.set(
        db.doc(`friendInbox/${to}`),
        {
          kudosDay: day,
          kudosCount: nextCount,
          kudosRevision: FieldValue.increment(1),
        },
        { merge: true },
      );
      if (promptForPush)
        tx.set(
          db.doc(`friendInbox/${uid}`),
          { kudosPushPrompted: true },
          { merge: true },
        );
      return {
        day,
        count: nextCount,
        given: active,
        notify: first,
        promptForPush,
      };
    });
    const { notify, ...value } = result;
    const push = notify
      ? await sendSocialPush(db, messaging, to, {
          type: "kudos",
          title: "따봉",
          body: `${sender.name || "훈련생"}에게 따봉을 받았습니다!`,
          url: "/?view=kudos",
          notificationTag: `kudos-${result.day}-${uid}`,
        })
      : { sent: 0, failed: 0 };
    return { ...value, push };
  }
  return { state, set };
}
