import { useEffect, useRef } from "react";
import { adConfig } from "./adConfig.js";
import { loadAdSense } from "./loadAdSense.js";
const config = adConfig(import.meta.env);
export default function AdSenseRuntime({ access }) {
  const started = useRef(null),
    reloading = useRef(false);
  useEffect(() => {
    if (config.mode !== "adsense" || !access.ready) return;
    // An SDK that already ran cannot be safely unloaded. Start a clean document
    // after account/entitlement changes so its frames and timers cannot survive.
    if (
      started.current &&
      (started.current.uid !== access.uid || !access.allowed)
    ) {
      if (!reloading.current) {
        reloading.current = true;
        if (document.querySelector(".super-account-section")) {
          const url = new URL(window.location.href);
          url.searchParams.set("view", "account");
          window.history.replaceState(null, "", url);
        }
        window.location.reload();
      }
      return;
    }
    if (!access.allowed) return;
    started.current = { uid: access.uid };
    void loadAdSense(config.client).catch(() => {});
  }, [access.ready, access.allowed, access.uid]);
  return null;
}
