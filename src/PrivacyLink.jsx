import { t, getLocale } from "./i18n/index.js";
export default function PrivacyLink() {
  return (
    <a
      className="privacy-link"
      href={`${import.meta.env.BASE_URL}${getLocale() === "en-US" ? "privacy-en.html" : "privacy.html"}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("개인정보처리방침 (새 창)")}
    >
      {t("개인정보처리방침")}
    </a>
  );
}
