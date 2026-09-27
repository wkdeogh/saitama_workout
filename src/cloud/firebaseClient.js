import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  connectAuthEmulator,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDocFromServer,
  getDocsFromServer,
  query,
  collection,
  orderBy,
  where,
  limit,
  runTransaction,
  serverTimestamp,
  connectFirestoreEmulator,
} from "firebase/firestore";
import { firebaseConfig, firebaseConfigured } from "./firebaseConfig";
import { initialData, parseBackup, upgradeDefaultGoals } from "../model";
import {
  mergeChanges,
  rankingSummary,
  weekStart,
  rankedEntries,
} from "./rankingModel";

const emulator =
  import.meta.env.DEV && import.meta.env.VITE_FIREBASE_EMULATORS === "true";
const app = firebaseConfigured ? initializeApp(firebaseConfig) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;
if (emulator && app) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}
export { firebaseConfigured, auth };
export function observeAccount(listener) {
  return auth ? onAuthStateChanged(auth, listener) : (listener(null), () => {});
}
export async function loginGoogle() {
  if (!auth) throw new Error("로그인 서비스를 준비 중입니다.");
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return signInWithPopup(auth, provider);
}
export async function logoutGoogle() {
  if (auth) await signOut(auth);
}
export async function fetchAccount(uid) {
  const snapshot = await getDocFromServer(doc(db, "accounts", uid));
  if (!snapshot.exists()) return { data: initialData(), participating: false };
  const value = snapshot.data();
  return {
    data: upgradeDefaultGoals(parseBackup(value.payload)),
    participating: value.participating,
  };
}
export async function syncAccount(uid, base, local) {
  if (auth?.currentUser?.uid !== uid)
    throw new Error("로그인 계정이 변경되었습니다.");
  return runTransaction(db, async (transaction) => {
    const accountRef = doc(db, "accounts", uid);
    const snapshot = await transaction.get(accountRef);
    const previous = snapshot.exists() ? snapshot.data() : null;
    const remote = previous
      ? upgradeDefaultGoals(parseBackup(previous.payload))
      : initialData();
    const merged = mergeChanges(base, local, remote);
    const payload = JSON.stringify(merged);
    if (new TextEncoder().encode(payload).length > 850000)
      throw new Error(
        "기록 용량이 동기화 한도를 넘었습니다. JSON 백업으로 보관해 주세요.",
      );
    const participating = true;
    const summary = rankingSummary(merged);
    transaction.set(accountRef, {
      payload,
      participating,
      updatedAt: serverTimestamp(),
    });
    const rankingRef = doc(db, "rankings", uid);
    if (participating && merged.characterName)
      transaction.set(rankingRef, { ...summary, updatedAt: serverTimestamp() });
    else transaction.delete(rankingRef);
    return { data: merged, participating };
  });
}
export async function fetchRanking(period) {
  const field = period === "week" ? "weeklyExp" : "totalExp";
  const conditions =
    period === "week" ? [where("weekStart", "==", weekStart())] : [];
  const snapshot = await getDocsFromServer(
    query(
      collection(db, "rankings"),
      ...conditions,
      orderBy(field, "desc"),
      limit(50),
    ),
  );
  return rankedEntries(
    snapshot.docs.map((item) => ({ uid: item.id, ...item.data() })),
    field,
  );
}
export function cloudError(error) {
  const messages = {
    "auth/popup-closed-by-user": "로그인이 취소되었습니다.",
    "auth/cancelled-popup-request": "다른 로그인 창을 확인해 주세요.",
    "auth/popup-blocked":
      "팝업이 차단되었습니다. 브라우저에서 팝업을 허용한 후 다시 로그인해 주세요.",
    "auth/unauthorized-domain": "이 주소에서는 아직 로그인할 수 없습니다.",
    "auth/network-request-failed": "인터넷 연결을 확인해 주세요.",
    "permission-denied":
      "계정 접근 권한을 확인하지 못했습니다. 다시 로그인해 주세요.",
    unavailable: "서버에 연결하지 못했습니다. 기록은 이 기기에 보관됩니다.",
    "resource-exhausted":
      "오늘의 서버 사용량 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.",
    "failed-precondition": "랭킹을 준비 중입니다. 잠시 후 다시 시도해 주세요.",
  };
  return (
    messages[error?.code] ||
    error?.message ||
    "연결하지 못했습니다. 다시 시도해 주세요."
  );
}
