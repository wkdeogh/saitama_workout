import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { AuthError } from "./kakaoAuth.js";

export function getServices() {
  let app = getApps().find((a) => a.name === "kakao-server");
  if (!app) {
    const account = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    if (account.project_id !== "saitama-workout-ff2d5")
      throw new Error("Invalid Firebase project");
    app = initializeApp({ credential: cert(account) }, "kakao-server");
  }
  const auth = getAuth(app),
    db = getFirestore(app);
  return {
    verifyIdToken: (token) => auth.verifyIdToken(token, true),
    createCustomToken: (uid, claims) => auth.createCustomToken(uid, claims),
    isLinked: async (uid) => (await db.doc(`authLinks/${uid}`).get()).exists,
    async resolveIdentity(subject, linkUid) {
      if (linkUid && (await auth.getUser(linkUid)).disabled)
        throw new AuthError("disabled", 403);
      const identityRef = db.doc(`kakaoIdentities/${subject}`);
      // Serialize identity and reverse mapping together; neither is client-readable.
      const uid = await db.runTransaction(async (tx) => {
        const identity = await tx.get(identityRef);
        const existingUid = identity.exists ? identity.data().uid : null;
        if (linkUid && existingUid && existingUid !== linkUid)
          throw new AuthError("already_linked", 409);
        const target = existingUid || linkUid || `kakao:${subject}`;
        const linkRef = db.doc(`authLinks/${target}`);
        const reverse = await tx.get(linkRef);
        if (reverse.exists && reverse.data().kakaoId !== subject)
          throw new AuthError("already_linked", 409);
        if (!identity.exists)
          tx.set(identityRef, {
            uid: target,
            createdAt: FieldValue.serverTimestamp(),
          });
        if (!reverse.exists)
          tx.set(linkRef, {
            kakaoId: subject,
            createdAt: FieldValue.serverTimestamp(),
          });
        return target;
      });
      let user;
      try {
        user = await auth.getUser(uid);
      } catch (error) {
        if (
          error.code !== "auth/user-not-found" ||
          linkUid ||
          !uid.startsWith("kakao:")
        )
          throw error;
        try {
          user = await auth.createUser({ uid });
        } catch (error) {
          if (error.code !== "auth/uid-already-exists") throw error;
          user = await auth.getUser(uid);
        }
      }
      if (user.disabled) throw new AuthError("disabled", 403);
      return uid;
    },
  };
}
