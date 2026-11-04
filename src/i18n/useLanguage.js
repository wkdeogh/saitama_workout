import { useSyncExternalStore } from "react";
import { languageStore } from "./index.js";
export default function useLanguage() {
  useSyncExternalStore(
    languageStore.subscribe,
    languageStore.getSnapshot,
    languageStore.getSnapshot,
  );
  return {
    language: languageStore.getLanguage(),
    preference: languageStore.getPreference(),
    setPreference: languageStore.setPreference,
  };
}
