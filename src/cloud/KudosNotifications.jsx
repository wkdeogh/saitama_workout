import { useEffect, useRef, useState } from "react";
import { ThumbsUp } from "lucide-react";
import { t } from "../i18n/index.js";
import { notificationsMuted } from "./pushClient";

// Notification identities survive cancellation and a page reload.
export default function KudosNotifications({ uid, day, notifications }) {
  const [queue, setQueue] = useState([]);
  const seen = useRef(new Set());
  const [muted, setMuted] = useState(() => notificationsMuted(uid));
  useEffect(() => {
    const update = () => setMuted(notificationsMuted(uid));
    update();
    window.addEventListener("saitama-push-change", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("saitama-push-change", update);
      window.removeEventListener("storage", update);
    };
  }, [uid]);
  useEffect(() => {
    const key = `saitama-kudos-seen:${uid}`;
    let stored;
    try {
      stored = JSON.parse(localStorage.getItem(key));
    } catch {}
    seen.current = new Set(
      stored?.day === day && Array.isArray(stored.ids) ? stored.ids : [],
    );
    setQueue([]);
  }, [uid, day]);
  useEffect(() => {
    if (muted) setQueue([]);
  }, [muted]);
  useEffect(() => {
    if (!uid) return;
    const fresh = notifications.filter((item) => !seen.current.has(item.id));
    if (!fresh.length) return;
    for (const item of fresh) seen.current.add(item.id);
    try {
      localStorage.setItem(
        `saitama-kudos-seen:${uid}`,
        JSON.stringify({ day, ids: [...seen.current] }),
      );
    } catch {}
    if (!muted) setQueue((items) => [...items, ...fresh]);
  }, [uid, day, notifications, muted]);
  const current = queue[0];
  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(() => setQueue((items) => items.slice(1)), 4500);
    return () => clearTimeout(timer);
  }, [current]);
  return current && !muted ? (
    <div className="toast kudos-toast" role="status">
      <ThumbsUp size={18} aria-hidden="true" />
      {t("{0}에게 따봉을 받았습니다!", { 0: current.name })}
    </div>
  ) : null;
}
