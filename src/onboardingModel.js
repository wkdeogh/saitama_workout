const KEY_PREFIX = "saitama-onboarding-seen:";

// Keep the one-time flag separate from workout backups and account records.
export function claimOnboarding(uid, storage, seenThisSession) {
  if (!uid || seenThisSession.has(uid)) return false;
  seenThisSession.add(uid);
  try {
    if (storage?.getItem(`${KEY_PREFIX}${uid}`) === "1") return false;
    storage?.setItem(`${KEY_PREFIX}${uid}`, "1");
  } catch {
    // Restricted storage still permits one automatic opening per app session.
  }
  return true;
}

export function swipePage(start, end) {
  if (!start) return 0;
  const dx = end.x - start.x,
    dy = end.y - start.y;
  if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.4) return 0;
  return dx < 0 ? 1 : -1;
}
