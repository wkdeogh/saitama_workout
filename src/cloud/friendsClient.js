import { auth } from "./firebaseClient";
export async function friendApi(action, body = {}) {
  const user = auth?.currentUser;
  if (!user) throw new Error("로그인이 필요합니다.");
  const token = await user.getIdToken();
  if (auth.currentUser?.uid !== user.uid)
    throw new Error("로그인 계정이 변경되었습니다.");
  const response = await fetch(`/api/friends/${action}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
    cache: "no-store",
  });
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("친구 서버에 연결하지 못했습니다. 다시 시도해 주세요.");
  }
  if (!response.ok)
    throw new Error(result.error || "요청을 처리하지 못했습니다.");
  if (auth.currentUser?.uid !== user.uid)
    throw new Error("로그인 계정이 변경되었습니다.");
  return result;
}
