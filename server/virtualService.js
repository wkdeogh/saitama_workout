import { randomUUID } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { emptyCounts, shiftDate } from "../src/model.js";
import { koreaDay, weekStart } from "../src/cloud/rankingModel.js";
import { accountTag, FriendError } from "./friendsModel.js";
import {
  FIRST_VIRTUAL_UID,
  advanceVirtual,
  dueDay,
  publicVirtual,
  validateVirtualEdit,
} from "./virtualModel.js";

export function virtualService(db, now = () => new Date()) {
  const ref = (uid) => db.doc(`virtualTrainees/${uid}`);
  const stamp = () => FieldValue.serverTimestamp();
  function publish(tx, bot) {
    const view = publicVirtual(bot, koreaDay(now()));
    const { uid, tag, activityDay, todayCounts, todayExp, ...summary } = view;
    tx.set(db.doc(`rankings/${bot.uid}`), { ...summary, updatedAt: stamp() });
  }
  async function seed() {
    const day = koreaDay(now());
    for (let attempt = 0; attempt < 6; attempt++) {
      const tag = accountTag();
      const result = await db.runTransaction(async (tx) => {
        const current = await tx.get(ref(FIRST_VIRTUAL_UID));
        if (current.exists) return current.data();
        const tagRef = db.doc(`socialTags/${tag}`);
        if ((await tx.get(tagRef)).exists) return null;
        const bot = {
          uid: FIRST_VIRTUAL_UID,
          name: "고구마똥",
          tag,
          seed: randomUUID(),
          enabled: true,
          createdDay: day,
          processedThrough: shiftDate(day, -1),
          calculatedOn: day,
          lastWorkout: day,
          activityDay: day,
          totals: emptyCounts(),
          todayCounts: emptyCounts(),
          totalExp: 0,
          weeklyExp: 0,
          weekStart: weekStart(day),
          level: 1,
          progressExp: 0,
          revision: 1,
        };
        tx.create(ref(bot.uid), bot);
        tx.create(tagRef, { uid: bot.uid });
        tx.create(db.doc(`socialProfiles/${bot.uid}`), {
          tag,
          name: bot.name,
          nameLower: bot.name,
          createdAt: stamp(),
        });
        publish(tx, bot);
        return bot;
      });
      if (result) return result;
    }
    throw new FriendError("계정 태그 생성에 실패했습니다.", 503);
  }
  async function advance(uid) {
    return db.runTransaction(async (tx) => {
      const snapshot = await tx.get(ref(uid));
      if (!snapshot.exists)
        throw new FriendError("가상 훈련생을 찾을 수 없습니다.", 404);
      const old = snapshot.data();
      const bot = advanceVirtual(old, dueDay(now()));
      if (bot.processedThrough !== old.processedThrough) {
        bot.revision++;
        tx.set(ref(uid), bot);
        publish(tx, bot);
      }
      return bot;
    });
  }
  async function refresh() {
    const snapshots = await db.collection("virtualTrainees").limit(20).get();
    await Promise.all(snapshots.docs.map((doc) => advance(doc.id)));
    return { ok: true, count: snapshots.size };
  }
  async function list() {
    await refresh();
    const snapshots = await db.collection("virtualTrainees").limit(20).get();
    return snapshots.docs.map((doc) => {
      const bot = doc.data();
      return {
        ...publicVirtual(bot, koreaDay(now())),
        enabled: bot.enabled,
        revision: bot.revision,
        processedThrough: bot.processedThrough,
      };
    });
  }
  async function update(actor, uid, input) {
    if (typeof uid !== "string" || !/^virtual-[a-z0-9-]{1,80}$/.test(uid))
      throw new FriendError("가상 훈련생을 확인해 주세요.");
    await advance(uid);
    await db.runTransaction(async (tx) => {
      const snapshot = await tx.get(ref(uid));
      const bot = snapshot.data();
      if (input?.revision !== bot.revision)
        throw new FriendError(
          "자동 운동 또는 다른 화면에서 값이 변경됐습니다. 새로고침 후 저장해 주세요.",
          409,
        );
      const view = publicVirtual(bot, koreaDay(now()));
      const edited = validateVirtualEdit(input, {
        ...bot,
        todayCounts: view.todayCounts,
      });
      const next = {
        ...bot,
        ...edited,
        calculatedOn: koreaDay(now()),
        progressExp: edited.level === 1000 ? 0 : edited.totalExp % 100,
        weeklyExp: Math.min(bot.weeklyExp, edited.totalExp),
        revision: bot.revision + 1,
      };
      tx.set(ref(uid), next);
      publish(tx, next);
      tx.create(db.collection("adminAudit").doc(), {
        actor,
        target: uid,
        action: "virtual-update",
        before: {
          level: bot.level,
          totalExp: bot.totalExp,
          totals: bot.totals,
          enabled: bot.enabled,
        },
        after: edited,
        at: stamp(),
      });
    });
    return list();
  }
  return { seed, refresh, list, update };
}
