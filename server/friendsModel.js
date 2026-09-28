import { createHash, randomBytes } from "node:crypto";
export const MAX_FRIENDS = 200;
export const MAX_PENDING = 100;
export class FriendError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
export function accountTag() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return (
    "ST-" +
    [...randomBytes(8)].map((n) => alphabet[n % alphabet.length]).join("")
  );
}
export function normalizeTag(value) {
  const tag = String(value || "")
    .trim()
    .replace(/^#/, "")
    .toUpperCase();
  if (!/^ST-[A-HJ-NP-Z2-9]{8}$/.test(tag))
    throw new FriendError("계정 태그를 확인해 주세요.");
  return tag;
}
export function normalizeSearch(value) {
  const query = String(value || "")
    .normalize("NFKC")
    .trim()
    .toLowerCase();
  if (!query || query.length > 32)
    throw new FriendError("닉네임 또는 계정 태그를 입력해 주세요.");
  return query;
}
export const pairKey = (a, b) =>
  createHash("sha256")
    .update(JSON.stringify([a, b].sort()))
    .digest("hex");
export function requireProvider(token) {
  const provider = token?.firebase?.sign_in_provider;
  if (
    !token?.uid ||
    !(
      provider === "google.com" ||
      (provider === "custom" && token.kakao === true)
    )
  )
    throw new FriendError("로그인이 필요합니다.", 401);
  return token.uid;
}
export function assertFriendCapacity(left = [], right = []) {
  if (left.length >= MAX_FRIENDS || right.length >= MAX_FRIENDS)
    throw new FriendError("친구는 최대 200명까지 추가할 수 있습니다.");
}
