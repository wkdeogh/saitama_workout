// Only trusted Firebase ID-token claims are used, never workout backups or localStorage.
export function hasAdFreeAccess(claims) {
  return claims?.adFree === true || hasSuperAccountAccess(claims);
}
export function hasSuperAccountAccess(claims) {
  return claims?.superAccount === true;
}
export function canRequestAds(account, access) {
  return Boolean(
    account.ready &&
    !account.authLoading &&
    access.ready &&
    access.uid === (account.user?.uid || null) &&
    !access.adFree,
  );
}

export function observeAdEntitlements(
  { subscribe, readClaims, currentUid },
  listener,
) {
  let active = true,
    sequence = 0;
  const stop = subscribe(async (user) => {
    const ticket = ++sequence,
      uid = user?.uid || null;
    if (!active) return;
    listener({ uid, ready: false, adFree: false, superAccount: false });
    try {
      const claims = user ? await readClaims(user) : {};
      if (active && ticket === sequence && currentUid() === uid)
        listener({
          uid,
          ready: true,
          adFree: hasAdFreeAccess(claims),
          superAccount: hasSuperAccountAccess(claims),
        });
    } catch {
      if (active && ticket === sequence && currentUid() === uid)
        listener({ uid, ready: true, adFree: true, superAccount: false });
    }
  });
  return () => {
    active = false;
    stop();
  };
}
