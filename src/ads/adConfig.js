export const ADSENSE_CLIENT = "ca-pub-6094417231997652";
export function adConfig(env = {}) {
  const mode = env.VITE_ADS_MODE || (env.DEV ? "preview" : "connect");
  const client = (env.VITE_ADSENSE_CLIENT || ADSENSE_CLIENT).trim();
  const slot = (env.VITE_ADSENSE_SLOT || "").trim();
  if (mode === "preview") return { mode };
  if (mode === "connect" && /^ca-pub-\d{16}$/.test(client))
    return { mode, client };
  if (
    mode === "adsense" &&
    /^ca-pub-\d{16}$/.test(client) &&
    /^\d+$/.test(slot)
  )
    return { mode, client, slot };
  return { mode: "off" };
}
