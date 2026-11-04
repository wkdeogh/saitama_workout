import english from "./en.json" with { type: "json" };
import { createLanguageStore } from "./language.js";
let storage;
try {
  storage = globalThis.localStorage;
} catch {
  /* Storage can be restricted. */
}
export const languageStore = createLanguageStore({
  storage,
  events: typeof window === "undefined" ? undefined : window,
  getLanguages: () =>
    globalThis.navigator?.languages?.length
      ? navigator.languages
      : [globalThis.navigator?.language || "en"],
});
export const getLanguage = () => languageStore.getLanguage();
export const getLocale = () => (getLanguage() === "ko" ? "ko-KR" : "en-US");
export function t(source, values = {}) {
  if (typeof source !== "string") return source;
  let result = source;
  if (getLanguage() === "en") {
    const key = source.trim().replace(/\s+/g, " ");
    if (Object.hasOwn(english, key)) {
      result = source.match(/^\s*/)[0] + english[key] + source.match(/\s*$/)[0];
    } else {
      // Model and server errors arrive as complete messages rather than template keys.
      for (const [pattern, translation, exerciseError] of patterns) {
        const match = source.match(pattern);
        if (match) {
          result = translation.replace(/\{(\d+)\}/g, (_, i) => {
            const value = match[Number(i) + 1];
            return exerciseError ? t(value) : value;
          });
          break;
        }
      }
    }
  }
  return result.replace(/\{(\d+)\}/g, (match, key) =>
    Object.hasOwn(values, key) ? String(values[key]) : match,
  );
}
const patterns = Object.entries(english)
  .filter(([key]) => /\{\d+\}/.test(key))
  .map(([key, value]) => [
    key === "{0} 기록은 하루 최대 {1}{2}까지 입력할 수 있어요."
      ? /^(.+) 기록은 하루 최대 ([\d.]+)(개|km)까지 입력할 수 있어요\.$/
      : new RegExp(
          "^" +
            key
              .split(/\{\d+\}/)
              .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
              .join("(.*?)") +
            "$",
        ),
    value,
    key.startsWith("{0} 기록은") || key.startsWith("{0}: "),
  ]);
export const localizeExercise = (exercise) => ({
  ...exercise,
  label: t(exercise.label),
  unit: t(exercise.unit),
});
export function applyDocumentLanguage() {
  if (typeof document === "undefined") return;
  document.documentElement.lang = getLanguage();
  document.title = t("빡빡이훈련소");
}
applyDocumentLanguage();
const unsubscribeDocument = languageStore.subscribe(applyDocumentLanguage);
if (import.meta.hot) import.meta.hot.dispose(unsubscribeDocument);
