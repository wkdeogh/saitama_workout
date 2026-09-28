import { useEffect, useRef, useState } from "react";
import {
  Trophy,
  RefreshCw,
  LogOut,
  Cloud,
  UserRound,
  ChevronRight,
} from "lucide-react";
import { friendApi } from "./friendsClient";
import { fetchRanking, cloudError } from "./firebaseClient";
import {
  displayedLevel,
  rankingSummary,
  weekStart,
  koreaDay,
} from "./rankingModel";

export function GoogleLoginButton({ onClick, disabled }) {
  return (
    <button className="google-login" onClick={onClick} disabled={disabled}>
      <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true">
        <path
          fill="#EA4335"
          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"
        />
        <path
          fill="#4285F4"
          d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.17 7.09-10.31 7.09-17.65Z"
        />
        <path
          fill="#FBBC05"
          d="M10.53 28.59a14.4 14.4 0 0 1 0-9.18l-7.98-6.19a23.96 23.96 0 0 0 0 21.56l7.98-6.19Z"
        />
        <path
          fill="#34A853"
          d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.15 1.45-4.92 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"
        />
      </svg>
      Google로 로그인
    </button>
  );
}
export function LoginScreen({ account }) {
  const [opening, setOpening] = useState(false);
  return (
    <main className="login-screen">
      <section className="login-card">
        <img
          src={`${import.meta.env.BASE_URL}images/hero-chibi.jpeg`}
          alt=""
          width="88"
          height="88"
        />
        <h1>싸이따마훈련소</h1>
        <p>실제로 운동한 만큼만 입력 하세요. (속여서 입력시 불운+1)</p>
        {account.authLoading || (account.user && !account.ready) ? (
          <p role="status">계정과 기록을 불러오는 중…</p>
        ) : (
          <div className="login-options" aria-busy={opening}>
            <GoogleLoginButton
              disabled={!account.configured || opening}
              onClick={async () => {
                setOpening(true);
                await account.login();
                setOpening(false);
              }}
            />
            <button
              className="kakao-login"
              aria-label="카카오 로그인"
              disabled={!account.kakao?.enabled || opening}
              onClick={async () => {
                setOpening(true);
                await account.kakaoLogin();
                setOpening(false);
              }}
            >
              <img
                src={`${import.meta.env.BASE_URL}icons/kakao-login.svg`}
                alt="카카오 로그인"
              />
            </button>
            {opening && <p role="status">로그인하는 중…</p>}
            {!account.kakao?.enabled && <small>카카오 로그인 준비 중</small>}
          </div>
        )}
        {!account.configured && (
          <p role="status">로그인 서비스를 준비 중입니다.</p>
        )}
        {account.message && (
          <p className="error-box" role="alert">
            {account.message}
          </p>
        )}
        <small>캐릭터 이름·레벨·누적 운동량은 랭킹에 공개됩니다.</small>
      </section>
    </main>
  );
}
export function AccountControls({ account, showLink = false }) {
  const [linking, setLinking] = useState(false);
  return (
    <section className="account-controls">
      <div className="account-identity">
        <UserRound size={18} />
        <span>{account.user?.email || "카카오 계정"}</span>
      </div>
      {showLink &&
        account.kakao?.enabled &&
        (account.kakao.linked ? (
          <p className="hint">카카오 계정 연결됨</p>
        ) : (
          account.user?.providerData.some(
            (provider) => provider.providerId === "google.com",
          ) && (
            <div className="account-link">
              <button
                className="secondary-button"
                disabled={linking || account.busy || !account.ready}
                onClick={async () => {
                  setLinking(true);
                  await account.kakaoLogin("link");
                  setLinking(false);
                }}
              >
                {linking ? "계정 확인 중…" : "카카오 계정 연결"}
              </button>
              <p className="hint">
                연결하면 카카오 로그인으로도 현재 운동 기록을 사용할 수
                있습니다.
              </p>
            </div>
          )
        ))}
      <p className="hint" role="status">
        {account.busy
          ? "동기화 중…"
          : account.pending
            ? "이 기기에 저장됨 · 동기화 대기"
            : account.lastSync
              ? "동기화 완료"
              : "이 기기에 저장됨"}
      </p>
      <div className="action-buttons">
        <button
          className="secondary-button"
          disabled={account.busy || !account.ready}
          onClick={() => account.synchronize()}
        >
          <Cloud size={17} />
          동기화
        </button>
        <button
          className="secondary-button"
          disabled={account.busy}
          onClick={() => account.logout()}
        >
          <LogOut size={17} />
          로그아웃
        </button>
      </div>
      {account.message && (
        <p className="error-box" role="alert">
          {account.message}
        </p>
      )}
    </section>
  );
}
export default function RankingPanel({ account, data, onUser, friends }) {
  const [scope, setScope] = useState("all");
  const [period, setPeriod] = useState("all"),
    [entries, setEntries] = useState([]),
    [loading, setLoading] = useState(false);
  const [error, setError] = useState(""),
    [updated, setUpdated] = useState(null);
  const sequence = useRef(0);
  const summary = rankingSummary(data),
    field = period === "week" ? "weeklyExp" : "totalExp";
  const week = weekStart(koreaDay());
  async function refresh() {
    const ticket = ++sequence.current;
    setLoading(true);
    setError("");
    try {
      const rows =
        scope === "friends"
          ? await friendApi("ranking", { period })
          : await fetchRanking(period);
      if (scope === "all") {
        const labels = await friendApi("labels", {
          ids: rows.map((row) => row.uid),
        });
        const tags = new Map(labels.map((p) => [p.uid, p.tag]));
        rows.forEach((row) => {
          row.tag = tags.get(row.uid);
        });
      }
      if (ticket === sequence.current) {
        setEntries(rows);
        setUpdated(new Date());
      }
    } catch (error) {
      if (ticket === sequence.current) {
        setEntries([]);
        setError(cloudError(error));
      }
    } finally {
      if (ticket === sequence.current) setLoading(false);
    }
  }
  useEffect(() => {
    refresh();
    return () => {
      sequence.current++;
    };
  }, [
    period,
    scope,
    week,
    account.user.uid,
    account.lastSync,
    friends?.revision,
  ]);
  return (
    <section className="panel ranking-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">LEADERBOARD</span>
          <h2>훈련 랭킹</h2>
        </div>
        <Trophy size={24} />
      </div>
      <div className="ranking-scope" role="group" aria-label="랭킹 범위">
        <button aria-pressed={scope === "all"} onClick={() => setScope("all")}>
          전체 랭킹
        </button>
        <button
          aria-pressed={scope === "friends"}
          onClick={() => setScope("friends")}
        >
          친구 랭킹
        </button>
      </div>
      <div className="ranking-period" role="group" aria-label="랭킹 기간">
        <button
          aria-pressed={period === "all"}
          onClick={() => setPeriod("all")}
        >
          누적
        </button>
        <button
          aria-pressed={period === "week"}
          onClick={() => setPeriod("week")}
        >
          주간
        </button>
      </div>
      <div className="ranking-toolbar">
        <span>
          {period === "week"
            ? `${week.slice(5).replace("-", ".")}부터 · 월요일 00시 KST 기준`
            : "전체 운동 기록 기준"}
        </span>
        <button
          className="icon-button"
          aria-label="랭킹 새로고침"
          disabled={loading}
          onClick={refresh}
        >
          <RefreshCw size={18} />
        </button>
      </div>
      <button
        className="my-ranking"
        aria-haspopup="dialog"
        aria-label={`${data.characterName} 내 캐릭터 상세 보기`}
        onClick={() =>
          onUser({ ...summary, uid: account.user.uid, tag: friends?.me?.tag })
        }
      >
        <div>
          <strong>{data.characterName}</strong>
        </div>
        <div className="my-ranking-score">
          <b>LV. {summary.level}</b>
          <small>{summary[field].toLocaleString("ko-KR")} EXP</small>
        </div>
        <ChevronRight size={18} aria-hidden="true" />
      </button>
      {account.message && (
        <p className="error-box" role="alert">
          {account.message}
        </p>
      )}
      {error ? (
        <p className="error-box" role="alert">
          {error}
        </p>
      ) : loading ? (
        <p className="ranking-empty" role="status">
          랭킹을 불러오는 중…
        </p>
      ) : entries.length === 0 ? (
        <p className="ranking-empty">아직 등록된 훈련 기록이 없습니다.</p>
      ) : (
        <div className="ranking-table">
          <div className="ranking-table-head" aria-hidden="true">
            <span>순위</span>
            <span>훈련생</span>
            <span>레벨 / EXP</span>
            <span />
          </div>
          <ol className="ranking-list">
            {entries.map((entry) => (
              <li key={entry.uid}>
                <button
                  className={`ranking-row ${entry.uid === account.user.uid ? "is-me" : ""}`}
                  onClick={() => onUser(entry)}
                  aria-haspopup="dialog"
                  aria-label={`${entry.rank}위 ${entry.characterName}, 레벨 ${displayedLevel(entry)}, 상세 보기`}
                >
                  <span className={`rank-number rank-${entry.rank}`}>
                    {entry.rank <= 3 && <Trophy size={24} aria-hidden="true" />}
                    <b>
                      {entry.rank}
                      <small>위</small>
                    </b>
                  </span>
                  <span className="rank-user">
                    <strong>
                      {entry.characterName}
                      {entry.uid === account.user.uid && <em>나</em>}
                    </strong>
                  </span>
                  <span className="rank-score">
                    <strong>LV. {displayedLevel(entry)}</strong>
                    <small>{entry[field].toLocaleString("ko-KR")} EXP</small>
                  </span>
                  <ChevronRight
                    className="rank-open"
                    size={17}
                    aria-hidden="true"
                  />
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}
      <p className="hint ranking-footnote">
        {scope === "friends" ? "나와 친구들의 순위" : "상위 50명"} · 같은 EXP는
        공동 순위
        {updated
          ? ` · ${updated.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })} 갱신`
          : ""}
      </p>
      <AccountControls account={account} />
    </section>
  );
}
