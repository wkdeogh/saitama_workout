import { useEffect, useState } from "react";
import { koreaDay } from "./rankingModel";
export default function useKoreaDay() {
  const [day, setDay] = useState(koreaDay);
  useEffect(() => {
    const update = () => setDay(koreaDay());
    const timer = setInterval(update, 30000);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  return day;
}
