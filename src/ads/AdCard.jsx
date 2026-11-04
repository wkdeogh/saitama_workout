import { t } from "../i18n/index.js";
import { useEffect, useRef, useState } from "react";
import { Dumbbell } from "lucide-react";
import { adConfig } from "./adConfig.js";
import { loadAdSense } from "./loadAdSense.js";
import "./ads.css";

const config = adConfig(import.meta.env);

function PreviewAd() {
  return (
    <section
      className="ad-card ad-preview"
      aria-label={t("광고 카드 미리보기")}
    >
      <div className="ad-label-row">
        <span className="ad-label">{t("광고")}</span>
        <span>{t("미리보기")}</span>
      </div>
      <div className="ad-preview-brand">
        <span className="ad-preview-icon" aria-hidden="true">
          <Dumbbell size={24} />
        </span>
        <div>
          <strong>{t("운동 브랜드")}</strong>
          <p>{t("샘플 광고")}</p>
        </div>
      </div>
      <div className="ad-preview-media">
        <div>
          <span>DAILY TRAINING</span>
          <h2>
            {t("매일의 루틴을")}
            <br />
            {t("더 가볍게.")}
          </h2>
        </div>
        <Dumbbell size={100} strokeWidth={1.5} aria-hidden="true" />
      </div>
      <div className="ad-preview-cta" aria-hidden="true">
        {t("자세히 보기")}
      </div>
    </section>
  );
}

function AdSenseCard({ client, slot }) {
  const cardRef = useRef(null);
  const unitRef = useRef(null);
  const requested = useRef(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const card = cardRef.current;
    const unit = unitRef.current;
    let disposed = false;
    const statusObserver = new MutationObserver(() => {
      if (unit.dataset.adStatus === "unfilled") setFailed(true);
    });
    statusObserver.observe(unit, {
      attributes: true,
      attributeFilter: ["data-ad-status"],
    });
    const request = async () => {
      try {
        await loadAdSense(client);
        if (disposed || requested.current || !unit.isConnected) return;
        if (unit.getBoundingClientRect().width <= 0) return;
        requested.current = true;
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch {
        if (!disposed) setFailed(true);
      }
    };
    const intersectionObserver =
      "IntersectionObserver" in window
        ? new IntersectionObserver(
            (entries) => {
              if (entries.some((entry) => entry.isIntersecting)) {
                intersectionObserver.disconnect();
                void request();
              }
            },
            { rootMargin: "200px" },
          )
        : null;
    if (intersectionObserver) intersectionObserver.observe(card);
    else void request();
    return () => {
      disposed = true;
      intersectionObserver?.disconnect();
      statusObserver.disconnect();
    };
  }, [client, slot]);

  // Keep the SDK-owned DOM intact, even when an unfilled slot is collapsed.
  return (
    <section
      className="ad-card"
      aria-label={t("광고")}
      hidden={failed}
      ref={cardRef}
    >
      <div className="ad-label-row">
        <span className="ad-label">{t("광고")}</span>
      </div>
      <ins
        className="adsbygoogle"
        ref={unitRef}
        style={{ display: "block", width: "100%", height: "250px" }}
        data-ad-client={client}
        data-ad-slot={slot}
      />
    </section>
  );
}

export default function AdCard({ enabled = false }) {
  if (!enabled) return null;
  if (config.mode === "preview") return <PreviewAd />;
  if (config.mode === "adsense") return <AdSenseCard {...config} />;
  return null;
}
