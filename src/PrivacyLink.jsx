export default function PrivacyLink() {
  return (
    <a
      className="privacy-link"
      href={`${import.meta.env.BASE_URL}privacy.html`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="개인정보처리방침 (새 창)"
    >
      개인정보처리방침
    </a>
  );
}
