import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { t } from "../i18n/index.js";
import {
  redeemSuperCode,
  refreshAccountBenefits,
} from "./superAccountClient.js";

export default function SuperAccountSection({ account, access }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [checking, setChecking] = useState(true);
  const superAccount = access.uid === account.user?.uid && access.superAccount;
  useEffect(() => {
    let active = true;
    refreshAccountBenefits()
      .catch(() => {
        if (active)
          setMessage("계정 상태를 확인하지 못했습니다. 다시 시도해 주세요.");
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, []);
  return (
    <section
      className="settings-section super-account-section"
      aria-busy={busy || checking}
    >
      {superAccount ? (
        <p className="super-account-badge" role="status">
          <Sparkles size={18} aria-hidden="true" />
          {t("슈퍼계정")}
        </p>
      ) : (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (busy || checking || !code.trim()) return;
            setBusy(true);
            setMessage("");
            try {
              await redeemSuperCode(code);
              setCode("");
            } catch (error) {
              setMessage(error.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label htmlFor="super-code">{t("슈퍼코드")}</label>
          <div className="super-code-input">
            <input
              id="super-code"
              type="text"
              value={code}
              maxLength={64}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              disabled={busy || checking}
              onChange={(event) => {
                setCode(event.target.value);
                setMessage("");
              }}
            />
            <button
              className="primary-button"
              type="submit"
              disabled={busy || checking || !code.trim()}
            >
              {busy ? t("적용 중…") : t("적용")}
            </button>
          </div>
        </form>
      )}
      {message && !superAccount && (
        <p className="error-box" role="alert">
          {t(message)}
        </p>
      )}
    </section>
  );
}
