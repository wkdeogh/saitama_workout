import { useRef, useState } from "react";
import {
  Search,
  UserPlus,
  Check,
  X,
  Copy,
  RefreshCw,
  Users,
} from "lucide-react";
import RankingPanel from "./RankingPanel";
import PushControls from "./PushControls";
import { friendApi } from "./friendsClient";
export default function FriendsPanel({ account, data, onUser, friends }) {
  const [section, setSection] = useState("search"),
    [query, setQuery] = useState(""),
    [results, setResults] = useState([]),
    [searched, setSearched] = useState(false),
    [searching, setSearching] = useState(false),
    [working, setWorking] = useState(""),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const sequence = useRef(0);
  async function search(e) {
    e.preventDefault();
    const ticket = ++sequence.current;
    setSearching(true);
    setError("");
    setSearched(true);
    try {
      const result = await friendApi("search", { query });
      if (ticket === sequence.current) setResults(result);
    } catch (e) {
      if (ticket === sequence.current) setError(e.message);
    } finally {
      if (ticket === sequence.current) setSearching(false);
    }
  }
  async function action(key, endpoint, body, success) {
    setWorking(key);
    setMessage("");
    setError("");
    try {
      const result = await friendApi(endpoint, body);
      setMessage(
        result.push?.failed
          ? "친구 요청은 전달됐습니다. 푸시는 발송하지 못했지만 받은 요청 목록에서 확인할 수 있습니다."
          : success,
      );
      await friends.refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setWorking("");
    }
  }
  const relation = (user) =>
    friends.friends.some((f) => f.uid === user.uid)
      ? "friend"
      : friends.incoming.some((r) => r.user.uid === user.uid)
        ? "incoming"
        : friends.outgoing.some((r) => r.user.uid === user.uid)
          ? "outgoing"
          : "none";
  const identity = (user) => (
    <div className="friend-person">
      <strong>{user.name || "이름 미설정"}</strong>
      <small>#{user.tag}</small>
    </div>
  );
  return (
    <>
      <section className="panel friends-panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">FRIENDS</span>
            <h2>친구</h2>
          </div>
          <button
            className="icon-button"
            aria-label="친구 새로고침"
            disabled={friends.loading || !!working}
            onClick={friends.refresh}
          >
            <RefreshCw size={19} />
          </button>
        </div>
        <div className="my-account-tag">
          <div>
            <span>내 계정 태그</span>
            <strong>
              {friends.me ? `#${friends.me.tag}` : "불러오는 중…"}
            </strong>
          </div>
          <button
            className="icon-button"
            disabled={!friends.me}
            aria-label="내 계정 태그 복사"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(`#${friends.me.tag}`);
                setMessage("계정 태그를 복사했습니다.");
              } catch {
                setMessage(`내 계정 태그: #${friends.me.tag}`);
              }
            }}
          >
            <Copy size={19} />
          </button>
        </div>
        <PushControls uid={account.user.uid} />
        <div className="friend-tabs" role="group" aria-label="친구 메뉴">
          {[
            ["search", "친구 찾기"],
            ["requests", `받은 요청 ${friends.incoming.length}`],
            ["friends", `내 친구 ${friends.friends.length}`],
          ].map(([id, label]) => (
            <button
              key={id}
              aria-pressed={section === id}
              onClick={() => {
                setSection(id);
                setError("");
                setMessage("");
              }}
            >
              {label}
            </button>
          ))}
        </div>
        {(error || friends.error) && (
          <p className="error-box" role="alert">
            {error || friends.error}
          </p>
        )}
        {message && (
          <p className="friend-message" role="status">
            {message}
          </p>
        )}
        {section === "search" && (
          <>
            <form className="friend-search" onSubmit={search}>
              <label className="sr-only" htmlFor="friend-search">
                닉네임 또는 계정 태그
              </label>
              <input
                id="friend-search"
                value={query}
                maxLength={32}
                placeholder="닉네임 또는 #ST-계정태그"
                autoComplete="off"
                onChange={(e) => {
                  setQuery(e.target.value);
                  sequence.current++;
                  setResults([]);
                  setSearching(false);
                  setSearched(false);
                }}
              />
              <button
                type="submit"
                className="primary-button"
                disabled={!query.trim() || searching}
              >
                <Search size={17} />
                {searching ? "검색 중" : "검색"}
              </button>
            </form>
            <p className="hint">
              닉네임의 앞부분 또는 전체 계정 태그로 검색하세요.
            </p>
            {searched && !searching && !error && results.length === 0 && (
              <p className="ranking-empty">검색 결과가 없습니다.</p>
            )}
            <ul className="friend-list">
              {results.map((user) => (
                <li key={user.uid}>
                  {identity(user)}
                  {relation(user) === "none" ? (
                    <button
                      className="secondary-button"
                      disabled={!!working}
                      onClick={() =>
                        action(
                          user.uid,
                          "request",
                          { tag: user.tag },
                          "친구 요청을 보냈습니다.",
                        )
                      }
                    >
                      <UserPlus size={16} />
                      요청
                    </button>
                  ) : (
                    <span className="friend-relation">
                      {relation(user) === "friend"
                        ? "친구"
                        : relation(user) === "incoming"
                          ? "받은 요청 있음"
                          : "요청 보냄"}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
        {section === "requests" && (
          <>
            <h3>받은 요청</h3>
            {friends.incoming.length === 0 && (
              <p className="ranking-empty">받은 친구 요청이 없습니다.</p>
            )}
            <ul className="friend-list">
              {friends.incoming.map((r) => (
                <li key={r.id}>
                  {identity(r.user)}
                  <div className="friend-row-actions">
                    <button
                      className="secondary-button"
                      disabled={!!working}
                      onClick={() =>
                        action(
                          r.id,
                          "respond",
                          { id: r.id, action: "accept" },
                          "친구가 되었습니다.",
                        )
                      }
                    >
                      <Check size={15} />
                      수락
                    </button>
                    <button
                      className="secondary-button"
                      disabled={!!working}
                      onClick={() =>
                        action(
                          r.id,
                          "respond",
                          { id: r.id, action: "reject" },
                          "친구 요청을 거절했습니다.",
                        )
                      }
                    >
                      <X size={15} />
                      거절
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <h3>보낸 요청</h3>
            {friends.outgoing.length === 0 && (
              <p className="ranking-empty">보낸 친구 요청이 없습니다.</p>
            )}
            <ul className="friend-list">
              {friends.outgoing.map((r) => (
                <li key={r.id}>
                  {identity(r.user)}
                  <button
                    className="secondary-button"
                    disabled={!!working}
                    onClick={() =>
                      action(
                        r.id,
                        "respond",
                        { id: r.id, action: "cancel" },
                        "요청을 취소했습니다.",
                      )
                    }
                  >
                    취소
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        {section === "friends" && (
          <>
            {friends.friends.length === 0 && (
              <p className="ranking-empty">
                <Users size={20} /> 아직 추가한 친구가 없습니다.
              </p>
            )}
            <ul className="friend-list">
              {friends.friends.map((user) => (
                <li key={user.uid}>
                  {identity(user)}
                  <button
                    className="secondary-button"
                    disabled={!!working}
                    onClick={() => {
                      if (
                        window.confirm(`${user.name}님을 친구에서 삭제할까요?`)
                      )
                        action(
                          user.uid,
                          "remove",
                          { tag: user.tag },
                          "친구를 삭제했습니다.",
                        );
                    }}
                  >
                    삭제
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        {!!working && (
          <p className="hint" role="status">
            처리 중…
          </p>
        )}
      </section>
      <RankingPanel
        account={account}
        data={data}
        onUser={onUser}
        friends={friends}
      />
    </>
  );
}
