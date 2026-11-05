import { t, getLocale } from "./i18n/index.js";

export default function PublicGuideLink() {
  return (
    <a
      className="privacy-link"
      href={`${import.meta.env.BASE_URL}guide/${getLocale() === "en-US" ? "en/" : ""}index.html`}
    >
      {t("자세한 이용 안내")}
    </a>
  );
}
