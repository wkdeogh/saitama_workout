import { getIdTokenResult } from "firebase/auth";
import { auth } from "./firebaseClient";

export async function refreshAccountBenefits() {
  const user = auth?.currentUser;
  if (!user) throw new Error("로그인이 필요합니다.");
  let result;
  try {
    result = await getIdTokenResult(user, true);
  } catch {
    throw new Error("계정 상태를 확인하지 못했습니다. 다시 시도해 주세요.");
  }
  if (auth.currentUser?.uid !== user.uid)
    throw new Error("로그인 계정이 변경되었습니다.");
  return result.claims;
}

export async function redeemSuperCode(code) {
  const user = auth?.currentUser;
  if (!user) throw new Error("로그인이 필요합니다.");
  const token = await user.getIdToken();
  if (auth.currentUser?.uid !== user.uid)
    throw new Error("로그인 계정이 변경되었습니다.");
  let response;
  try {
    response = await fetch("/api/account/super-code", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ code }),
      signal: AbortSignal.timeout(20000),
      cache: "no-store",
    });
  } catch {
    throw new Error("슈퍼코드 서버에 연결하지 못했습니다. 다시 시도해 주세요.");
  }
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("슈퍼코드 서버에 연결하지 못했습니다. 다시 시도해 주세요.");
  }
  if (auth.currentUser?.uid !== user.uid)
    throw new Error("로그인 계정이 변경되었습니다.");
  if (!response.ok)
    throw new Error(
      result.error ||
        "슈퍼코드를 적용하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    );
  const claims = await refreshAccountBenefits();
  if (claims.superAccount !== true)
    throw new Error("계정 상태를 확인하지 못했습니다. 다시 시도해 주세요.");
}
