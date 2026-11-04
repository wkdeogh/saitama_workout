import { useEffect, useState } from "react";
import { onIdTokenChanged, getIdTokenResult } from "firebase/auth";
import { auth } from "../cloud/firebaseClient";
import { observeAdEntitlements, canRequestAds } from "./adAccess.js";
export default function useAdAccess(account) {
  const [access, setAccess] = useState({
    uid: null,
    ready: !auth,
    adFree: false,
    superAccount: false,
  });
  useEffect(() => {
    if (!auth) return;
    return observeAdEntitlements(
      {
        subscribe: (listener) => onIdTokenChanged(auth, listener),
        readClaims: async (user) => (await getIdTokenResult(user)).claims,
        currentUid: () => auth.currentUser?.uid || null,
      },
      setAccess,
    );
  }, []);
  return { ...access, allowed: canRequestAds(account, access) };
}
