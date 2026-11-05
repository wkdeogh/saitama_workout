export const ADSENSE_CLIENT = "ca-pub-6094417231997652";
export function adConfig(env = {}) {
  const mode = env.VITE_ADS_MODE || "off";
  const client = (env.VITE_ADSENSE_CLIENT || ADSENSE_CLIENT).trim();
  const slot = (env.VITE_ADSENSE_SLOT || "").trim();
  if (mode === "preview" && env.DEV) return { mode };
  if (
    mode === "adsense" &&
    env.VITE_ADS_APPROVED === "true" &&
    /^ca-pub-\d{16}$/.test(client) &&
    /^\d+$/.test(slot)
  )
    return { mode, client, slot };
  return { mode: "off" };
}
