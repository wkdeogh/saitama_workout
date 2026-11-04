// Shared server-only grant path for future promo-code redemption and verified purchases.
// Do not expose this helper directly as a client-controlled endpoint.
export async function setAdFreeAccount(adminAuth, uid, enabled) {
  if (typeof uid !== "string" || !uid || typeof enabled !== "boolean")
    throw new TypeError("A user ID and a boolean entitlement are required.");
  const user = await adminAuth.getUser(uid);
  const claims = { ...user.customClaims };
  if (enabled) claims.adFree = true;
  else delete claims.adFree;
  await adminAuth.setCustomUserClaims(uid, claims);
}
