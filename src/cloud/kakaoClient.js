import {
  GoogleAuthProvider,
  reauthenticateWithPopup,
  signInWithCustomToken,
} from "firebase/auth";
import { auth } from "./firebaseClient";
const errors = {
  not_configured:
    "카카오 로그인을 준비 중입니다. Google 로그인을 이용해 주세요.",
  cancelled: "카카오 로그인이 취소되었습니다.",
  expired: "로그인 시간이 지났습니다. 다시 시도해 주세요.",
  already_linked:
    "이미 다른 계정에 연결된 카카오 계정입니다. 기존 연결 계정으로 로그인해 주세요.",
  reauthenticate: "Google 계정을 다시 확인한 후 연결해 주세요.",
  disabled: "사용할 수 없는 계정입니다.",
  forbidden: "이 주소에서는 카카오 로그인을 사용할 수 없습니다.",
};
export const kakaoError = (code) =>
  errors[code] || "카카오 로그인에 실패했습니다. 다시 시도해 주세요.";
async function request(action, options = {}) {
  const response = await fetch(`/api/auth/kakao/${action}`, {
    credentials: "same-origin",
    cache: "no-store",
    ...options,
    signal: AbortSignal.timeout(15000),
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(kakaoError("not_configured"));
  }
  if (!response.ok) throw new Error(kakaoError(data.error));
  return data;
}
export async function kakaoStatus(user) {
  const headers = user
    ? { Authorization: `Bearer ${await user.getIdToken()}` }
    : {};
  return request("status", { headers });
}
export async function startKakao(mode = "login") {
  const headers = { "Content-Type": "application/json" };
  if (mode === "link") {
    const user = auth?.currentUser;
    if (!user) throw new Error(kakaoError("reauthenticate"));
    await reauthenticateWithPopup(user, new GoogleAuthProvider());
    headers.Authorization = `Bearer ${await user.getIdToken(true)}`;
  }
  const { url } = await request("start", {
    method: "POST",
    headers,
    body: JSON.stringify({ mode }),
  });
  const destination = new URL(url);
  if (destination.origin !== "https://kauth.kakao.com")
    throw new Error(kakaoError("failed"));
  window.location.assign(url);
}
let completion;
export function finishKakao() {
  // React StrictMode mounts effects twice. Consume the cookie only once.
  if (completion) return completion;
  const params = new URLSearchParams(window.location.search);
  if (!params.has("kakao") && !params.has("kakao_error"))
    return Promise.resolve(false);
  const error = params.get("kakao_error");
  params.delete("kakao");
  params.delete("kakao_error");
  window.history.replaceState(
    null,
    "",
    window.location.pathname +
      (params.size ? `?${params}` : "") +
      window.location.hash,
  );
  completion = (async () => {
    if (error) throw new Error(kakaoError(error));
    const { token, linked } = await request("complete", { method: "POST" });
    await signInWithCustomToken(auth, token);
    return linked;
  })();
  return completion;
}
