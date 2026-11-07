import { useEffect, useState } from "react";
import { koreaDay } from "./rankingModel";
export default function useKoreaDay() {
  const [day, setDay] = useState(koreaDay);
  useEffect(() => {
    const update = () => setDay(koreaDay());
    const timer = setInterval(update, 30000);
    const midnight = setTimeout(
      update,
      Math.max(1, Date.parse(`${day}T00:00:00+09:00`) + 86400000 - Date.now()),
    );
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      clearInterval(timer);
      clearTimeout(midnight);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [day]);
  return day;
}
