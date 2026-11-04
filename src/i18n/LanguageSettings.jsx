import useLanguage from "./useLanguage.js";
import { t } from "./index.js";
export default function LanguageSettings() {
  const { language, preference, setPreference } = useLanguage();
  return (
    <section className="settings-section language-settings">
      <label htmlFor="app-language">Language / 언어</label>
      <select
        id="app-language"
        value={preference}
        onChange={(event) => setPreference(event.target.value)}
      >
        <option value="system">{t("시스템 설정")}</option>
        <option value="ko">한국어</option>
        <option value="en">English</option>
      </select>
      {preference === "system" && (
        <p className="hint">
          {t("현재 언어")}: {language === "ko" ? "한국어" : "English"}
        </p>
      )}
    </section>
  );
}
