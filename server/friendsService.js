import { createHash } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import {
  accountTag,
  normalizeTag,
  normalizeSearch,
  pairKey,
  FriendError,
  assertFriendCapacity,
  MAX_PENDING,
} from "./friendsModel.js";
import {
  koreaDay,
  rankingSummary,
  rankedEntries,
} from "../src/cloud/rankingModel.js";
import { parseBackup } from "../src/model.js";
import { dailyActivity } from "../src/cloud/dailyActivity.js";

const stamp = () => FieldValue.serverTimestamp();
const profileView = (snap) =>
  snap.exists
    ? { uid: snap.id, tag: snap.data().tag, name: snap.data().name }
    : null;
export function friendsService(db, messaging) {
  const profileRef = (uid) => db.doc(`socialProfiles/${uid}`);
  const listRef = (uid) => db.doc(`friendLists/${uid}`);
  const inboxRef = (uid) => db.doc(`friendInbox/${uid}`);
  async function ensureProfile(uid) {
    for (let attempt = 0; attempt < 6; attempt++) {
      const candidate = accountTag();
      const result = await db.runTransaction(async (tx) => {
        const ref = profileRef(uid),
          current = await tx.get(ref);
        const account = await tx.get(db.doc(`accounts/${uid}`));
        let name = "";
        if (account.exists)
          name = parseBackup(account.data().payload, koreaDay()).characterName;
        if (current.exists) {
          if (current.data().name !== name)
            tx.update(ref, {
              name,
              nameLower: name.normalize("NFKC").toLowerCase(),
            });
          return { uid, tag: current.data().tag, name };
        }
        const tagRef = db.doc(`socialTags/${candidate}`);
        if ((await tx.get(tagRef)).exists) return null;
        tx.create(tagRef, { uid });
        tx.create(ref, {
          tag: candidate,
          name,
          nameLower: name.normalize("NFKC").toLowerCase(),
          createdAt: stamp(),
        });
        return { uid, tag: candidate, name };
      });
      if (result) return result;
    }
    throw new FriendError(
      "계정 태그 생성에 실패했습니다. 다시 시도해 주세요.",
      503,
    );
  }
  async function resolveTag(tag) {
    const found = await db.doc(`socialTags/${normalizeTag(tag)}`).get();
    if (!found.exists) throw new FriendError("사용자를 찾을 수 없습니다.", 404);
    return found.data().uid;
  }
  async function state(uid) {
    const me = await ensureProfile(uid);
    const [list, incoming, outgoing] = await Promise.all([
      listRef(uid).get(),
      db
        .collection("friendRequests")
        .where("to", "==", uid)
        .limit(MAX_PENDING)
        .get(),
      db
        .collection("friendRequests")
        .where("from", "==", uid)
        .limit(MAX_PENDING)
        .get(),
    ]);
    const ids = list.data()?.ids || [];
    const profileIds = [
      ...new Set([
        ...ids,
        ...incoming.docs.map((r) => r.data().from),
        ...outgoing.docs.map((r) => r.data().to),
      ]),
    ];
    const profiles = profileIds.length
      ? await db.getAll(...profileIds.map(profileRef))
      : [];
    const map = new Map(profiles.map((p) => [p.id, profileView(p)]));
    return {
      me,
      friends: ids.map((id) => map.get(id)).filter(Boolean),
      incoming: incoming.docs
        .map((r) => ({ id: r.id, user: map.get(r.data().from) }))
        .filter((r) => r.user),
      outgoing: outgoing.docs
        .map((r) => ({ id: r.id, user: map.get(r.data().to) }))
        .filter((r) => r.user),
    };
  }
  async function search(uid, query) {
    const value = normalizeSearch(query);
    const own = await ensureProfile(uid);
    let profiles;
    if (/^#?st-/i.test(value)) {
      const prefix = value.replace(/^#/, "").toUpperCase();
      if (!/^ST-[A-HJ-NP-Z2-9]{1,8}$/.test(prefix)) return [];
      const result = await db
        .collection("socialProfiles")
        .orderBy("tag")
        .startAt(prefix)
        .endAt(prefix + "\uf8ff")
        .limit(20)
        .get();
      profiles = result.docs.map(profileView);
    } else {
      const result = await db
        .collection("socialProfiles")
        .orderBy("nameLower")
        .startAt(value)
        .endAt(value + "\uf8ff")
        .limit(20)
        .get();
      profiles = result.docs.map(profileView);
    }
    return profiles.filter((p) => p?.name && p.tag !== own.tag);
  }
  async function notify(to, sender) {
    if (!messaging) return { sent: 0, failed: 0 };
    const devices = await db
      .collection("pushDevices")
      .where("uid", "==", to)
      .limit(10)
      .get();
    if (devices.empty) return { sent: 0, failed: 0 };
    try {
      const result = await messaging.sendEachForMulticast({
        tokens: devices.docs.map((d) => d.data().token),
        data: {
          uid: to,
          title: "친구 요청",
          body: `${sender.name || "훈련생"} (#${sender.tag})님이 친구 요청을 보냈습니다.`,
          url: "/?view=friends",
          requestTag: sender.tag,
        },
        webpush: { headers: { TTL: "86400", Urgency: "normal" } },
      });
      await Promise.all(
        result.responses.map((r, i) =>
          !r.success &&
          [
            "messaging/registration-token-not-registered",
            "messaging/invalid-registration-token",
          ].includes(r.error?.code)
            ? devices.docs[i].ref.delete()
            : Promise.resolve(),
        ),
      );
      return { sent: result.successCount, failed: result.failureCount };
    } catch {
      return { sent: 0, failed: devices.size };
    }
  }
  async function request(uid, tag) {
    const me = await ensureProfile(uid),
      to = await resolveTag(tag);
    if (to === uid)
      throw new FriendError("본인에게는 친구 요청을 보낼 수 없습니다.");
    const id = pairKey(uid, to),
      requestRef = db.doc(`friendRequests/${id}`);
    const created = await db.runTransaction(async (tx) => {
      const [request, left, right, incoming, outgoing, cooldown] =
        await Promise.all([
          tx.get(requestRef),
          tx.get(listRef(uid)),
          tx.get(listRef(to)),
          tx.get(inboxRef(to)),
          tx.get(inboxRef(uid)),
          tx.get(db.doc(`friendCooldowns/${id}`)),
        ]);
      if ((left.data()?.ids || []).includes(to))
        throw new FriendError("이미 친구입니다.", 409);
      if (request.exists) {
        if (request.data().from === uid) return false;
        throw new FriendError(
          "받은 요청에서 이 사용자의 요청을 수락해 주세요.",
          409,
        );
      }
      assertFriendCapacity(left.data()?.ids, right.data()?.ids);
      if (
        (incoming.data()?.pending || 0) >= MAX_PENDING ||
        (outgoing.data()?.sent || 0) >= MAX_PENDING
      )
        throw new FriendError("대기 중인 친구 요청이 너무 많습니다.");
      const today = koreaDay(),
        daily =
          outgoing.data()?.requestDay === today
            ? outgoing.data().dailyRequests || 0
            : 0;
      if (daily >= 20)
        throw new FriendError("오늘 친구 요청 한도(20회)에 도달했습니다.", 429);
      if (
        cooldown.exists &&
        Date.now() - cooldown.data().at.toMillis() < 86400000
      )
        throw new FriendError(
          "이 사용자에게는 24시간 후 다시 요청할 수 있습니다.",
          429,
        );
      tx.create(requestRef, { from: uid, to, createdAt: stamp() });
      tx.set(
        inboxRef(to),
        { pending: (incoming.data()?.pending || 0) + 1, updatedAt: stamp() },
        { merge: true },
      );
      tx.set(
        inboxRef(uid),
        {
          sent: (outgoing.data()?.sent || 0) + 1,
          requestDay: today,
          dailyRequests: daily + 1,
          updatedAt: stamp(),
        },
        { merge: true },
      );
      return true;
    });
    const push = created ? await notify(to, me) : { sent: 0, failed: 0 };
    return { created, push };
  }
  async function respond(uid, id, action) {
    if (
      !/^[a-f0-9]{64}$/.test(id || "") ||
      !["accept", "reject", "cancel"].includes(action)
    )
      throw new FriendError("요청을 확인해 주세요.");
    const ref = db.doc(`friendRequests/${id}`);
    await db.runTransaction(async (tx) => {
      const request = await tx.get(ref);
      if (!request.exists) return;
      const { from, to } = request.data();
      if ((action === "cancel" ? from : to) !== uid)
        throw new FriendError("이 요청을 처리할 권한이 없습니다.", 403);
      const [left, right, incoming, outgoing] = await Promise.all([
        tx.get(listRef(from)),
        tx.get(listRef(to)),
        tx.get(inboxRef(to)),
        tx.get(inboxRef(from)),
      ]);
      if (action === "accept") {
        const a = left.data()?.ids || [],
          b = right.data()?.ids || [];
        if (!a.includes(to)) assertFriendCapacity(a, b);
        tx.set(listRef(from), { ids: [...new Set([...a, to])] });
        tx.set(listRef(to), { ids: [...new Set([...b, from])] });
      }
      tx.delete(ref);
      tx.set(db.doc(`friendCooldowns/${id}`), { at: stamp() });
      tx.set(
        inboxRef(to),
        {
          pending: Math.max(0, (incoming.data()?.pending || 0) - 1),
          updatedAt: stamp(),
        },
        { merge: true },
      );
      tx.set(
        inboxRef(from),
        {
          sent: Math.max(0, (outgoing.data()?.sent || 0) - 1),
          updatedAt: stamp(),
        },
        { merge: true },
      );
    });
    return { ok: true };
  }
  async function remove(uid, tag) {
    const other = await resolveTag(tag);
    await db.runTransaction(async (tx) => {
      const a = await tx.get(listRef(uid)),
        b = await tx.get(listRef(other));
      if (!(a.data()?.ids || []).includes(other)) return;
      tx.set(listRef(uid), { ids: a.data().ids.filter((id) => id !== other) });
      tx.set(listRef(other), {
        ids: (b.data()?.ids || []).filter((id) => id !== uid),
      });
      tx.set(inboxRef(uid), { updatedAt: stamp() }, { merge: true });
      tx.set(inboxRef(other), { updatedAt: stamp() }, { merge: true });
    });
    return { ok: true };
  }
  async function ranking(uid, period) {
    const list = await listRef(uid).get();
    const ids = [...new Set([uid, ...(list.data()?.ids || [])])];
    const accounts = await db.getAll(
      ...ids.map((id) => db.doc(`accounts/${id}`)),
    );
    const profiles = await db.getAll(...ids.map(profileRef));
    const tags = new Map(profiles.map((p) => [p.id, p.data()?.tag]));
    const field = period === "week" ? "weeklyExp" : "totalExp";
    const day = koreaDay();
    const rows = accounts
      .filter((a) => a.exists && a.data().participating)
      .map((a) => {
        const data = parseBackup(a.data().payload, day);
        return {
          uid: a.id,
          tag: tags.get(a.id),
          ...rankingSummary(data, day),
          ...dailyActivity(data, day),
        };
      })
      .filter((r) => r.characterName);
    rows.sort((a, b) => b[field] - a[field] || a.uid.localeCompare(b.uid));
    return rankedEntries(rows, field);
  }
  async function device(uid, token, enabled) {
    if (
      typeof token !== "string" ||
      token.length < 30 ||
      token.length > 4096 ||
      !/^[\w:.-]+$/.test(token)
    )
      throw new FriendError("알림 기기 등록에 실패했습니다.");
    const ref = db.doc(
      `pushDevices/${createHash("sha256").update(token).digest("hex")}`,
    );
    if (!enabled) {
      await db.runTransaction(async (tx) => {
        const doc = await tx.get(ref);
        if (doc.data()?.uid === uid) tx.delete(ref);
      });
    } else {
      const old = await db
        .collection("pushDevices")
        .where("uid", "==", uid)
        .get();
      const batch = db.batch();
      old.docs
        .filter((d) => d.id !== ref.id)
        .sort(
          (a, b) =>
            (b.data().updatedAt?.toMillis() || 0) -
            (a.data().updatedAt?.toMillis() || 0),
        )
        .slice(4)
        .forEach((d) => batch.delete(d.ref));
      batch.set(ref, { uid, token, updatedAt: stamp() });
      await batch.commit();
    }
    return { ok: true };
  }
  async function labels(uid, ids) {
    if (
      !Array.isArray(ids) ||
      ids.length > 50 ||
      ids.some(
        (id) =>
          typeof id !== "string" || !id || id.includes("/") || id.length > 128,
      )
    )
      throw new FriendError("사용자 목록을 확인해 주세요.");
    if (!ids.length) return [];
    const unique = [...new Set(ids)],
      day = koreaDay();
    const [profiles, accounts] = await Promise.all([
      db.getAll(...unique.map(profileRef)),
      db.getAll(...unique.map((id) => db.doc(`accounts/${id}`))),
    ]);
    return profiles
      .map((profile, index) => {
        const identity = profileView(profile),
          account = accounts[index];
        if (!identity || !account.exists || !account.data().participating)
          return null;
        const data = parseBackup(account.data().payload, day);
        const { level, calculatedOn, lastWorkout } = rankingSummary(data, day);
        return {
          ...identity,
          level,
          calculatedOn,
          lastWorkout,
          ...dailyActivity(data, day),
        };
      })
      .filter(Boolean);
  }
  return {
    ensureProfile,
    state,
    search,
    request,
    respond,
    remove,
    ranking,
    device,
    labels,
  };
}
