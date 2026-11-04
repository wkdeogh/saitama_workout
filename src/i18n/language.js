export const LANGUAGE_KEY = "saitama-language:v1";
export const normalizePreference = (value) =>
  ["ko", "en"].includes(value) ? value : "system";
export function resolveLanguage(preference, languages = []) {
  if (preference === "ko" || preference === "en") return preference;
  for (const value of languages) {
    const language = String(value).toLowerCase().split(/[-_]/)[0];
    if (language === "ko" || language === "en") return language;
  }
  return "en";
}
export function createLanguageStore(environment = {}) {
  const { storage, events, getLanguages = () => [] } = environment;
  let preference = "system";
  try {
    preference = normalizePreference(storage?.getItem(LANGUAGE_KEY));
  } catch {
    /* Session preference still works. */
  }
  let language = resolveLanguage(preference, getLanguages());
  const listeners = new Set();
  const snapshot = () => `${preference}:${language}`;
  function update() {
    language = resolveLanguage(preference, getLanguages());
    for (const listener of listeners) listener();
  }
  function onStorage(event) {
    if (event.key !== LANGUAGE_KEY && event.key !== null) return;
    try {
      preference = normalizePreference(storage?.getItem(LANGUAGE_KEY));
    } catch {
      return;
    }
    update();
  }
  return {
    getSnapshot: snapshot,
    getLanguage: () => language,
    getPreference: () => preference,
    setPreference(value) {
      preference = normalizePreference(value);
      try {
        storage?.setItem(LANGUAGE_KEY, preference);
      } catch {
        /* Keep the selection for this session. */
      }
      update();
    },
    subscribe(listener) {
      if (!listeners.size) {
        events?.addEventListener("languagechange", update);
        events?.addEventListener("storage", onStorage);
        update();
      }
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        if (!listeners.size) {
          events?.removeEventListener("languagechange", update);
          events?.removeEventListener("storage", onStorage);
        }
      };
    },
  };
}
