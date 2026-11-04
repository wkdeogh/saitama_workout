import test from "node:test";
import assert from "node:assert/strict";
import {
  LANGUAGE_KEY,
  createLanguageStore,
  resolveLanguage,
} from "../src/i18n/language.js";
import {
  languageStore,
  t,
  getLocale,
  localizeExercise,
} from "../src/i18n/index.js";
import { initialData, saveTodayRecord, emptyCounts } from "../src/model.js";

function environment(value = null, languages = ["ko-KR"]) {
  const values = new Map(value === null ? [] : [[LANGUAGE_KEY, value]]),
    handlers = new Map();
  return {
    values,
    handlers,
    languages,
    storage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, v) => values.set(key, v),
    },
    events: {
      addEventListener: (key, handler) => handlers.set(key, handler),
      removeEventListener: (key) => handlers.delete(key),
    },
    getLanguages() {
      return this.languages;
    },
  };
}
test("system preference matches supported browser languages in order and falls back to English", () => {
  assert.equal(resolveLanguage("system", ["ko-KR", "en-US"]), "ko");
  assert.equal(resolveLanguage("system", ["en-GB", "ko"]), "en");
  assert.equal(resolveLanguage("system", ["fr", "ko-KR"]), "ko");
  assert.equal(resolveLanguage("system", ["ja"]), "en");
  assert.equal(resolveLanguage("system", []), "en");
  assert.equal(resolveLanguage("ko", ["en-US"]), "ko");
  assert.equal(resolveLanguage("en", ["ko-KR"]), "en");
});
test("language preference persists separately from workout storage and survives reload", () => {
  const env = environment();
  env.values.set("saitama-training:v1", "original workout");
  const store = createLanguageStore({
    ...env,
    getLanguages: () => env.languages,
  });
  assert.equal(store.getPreference(), "system");
  assert.equal(store.getLanguage(), "ko");
  store.setPreference("en");
  assert.equal(store.getSnapshot(), "en:en");
  assert.equal(env.values.get("saitama-training:v1"), "original workout");
  assert.equal(
    createLanguageStore({
      ...env,
      getLanguages: () => env.languages,
    }).getPreference(),
    "en",
  );
  store.setPreference("system");
  assert.equal(store.getLanguage(), "ko");
});
test("browser language changes update system mode while manual choices remain selected", () => {
  const env = environment();
  const store = createLanguageStore({
    ...env,
    getLanguages: () => env.languages,
  });
  let updates = 0;
  const stop = store.subscribe(() => updates++);
  env.languages = ["en-US"];
  env.handlers.get("languagechange")();
  assert.equal(store.getSnapshot(), "system:en");
  store.setPreference("ko");
  env.handlers.get("languagechange")();
  assert.equal(store.getSnapshot(), "ko:ko");
  env.values.set(LANGUAGE_KEY, "system");
  env.handlers.get("storage")({ key: LANGUAGE_KEY });
  assert.equal(store.getLanguage(), "en");
  assert.ok(updates >= 3);
  stop();
  assert.equal(env.handlers.size, 0);
});
test("invalid preferences and blocked storage retain a usable session selection", () => {
  const env = environment("invalid");
  const store = createLanguageStore({ ...env, getLanguages: () => ["ko"] });
  assert.equal(store.getPreference(), "system");
  const blocked = createLanguageStore({
    storage: {
      getItem() {
        throw Error("blocked");
      },
      setItem() {
        throw Error("blocked");
      },
    },
    getLanguages: () => ["ko"],
  });
  assert.equal(blocked.getLanguage(), "ko");
  blocked.setPreference("en");
  assert.equal(blocked.getLanguage(), "en");
  blocked.setPreference("bad");
  assert.equal(blocked.getPreference(), "system");
});
test("translations interpolate values, preserve user content and switch locale without changing workouts", () => {
  const data = initialData();
  data.characterName = "푸쉬업";
  const before = JSON.stringify(data);
  try {
    languageStore.setPreference("en");
    assert.equal(getLocale(), "en-US");
    assert.equal(t("야외 훈련장"), "Outdoor Gym");
    assert.equal(
      t("{0}의 캐릭터", { 0: data.characterName }),
      "푸쉬업's character",
    );
    assert.equal(t("Page {1} of {0}", { 0: 8, 1: 3 }), "Page 3 of 8");
    assert.equal(t("처음 보는 닉네임"), "처음 보는 닉네임");
    const exercise = { key: "pushups", label: "푸쉬업", unit: "개" };
    assert.equal(localizeExercise(exercise).label, "Push-ups");
    assert.equal(exercise.label, "푸쉬업");
    languageStore.setPreference("ko");
    assert.equal(t("야외 훈련장"), "야외 훈련장");
    assert.equal(getLocale(), "ko-KR");
    assert.equal(JSON.stringify(data), before);
  } finally {
    languageStore.setPreference("system");
  }
});
test("model errors are translated at the display boundary without changing stored data contracts", () => {
  languageStore.setPreference("en");
  try {
    let error;
    try {
      saveTodayRecord(
        initialData(),
        "2026-11-04",
        { ...emptyCounts(), pushups: 301 },
        "2026-11-04",
      );
    } catch (e) {
      error = e;
    }
    assert.match(error.message, /푸쉬업/);
    assert.equal(t(error.message), "The daily limit for Push-ups is 300 reps.");
    assert.equal(
      t("이름은 공백을 제외하고 1~20자로 입력해 주세요."),
      "Enter a name with 1–20 characters, excluding surrounding spaces.",
    );
    assert.equal(t("친구 요청을 보냈습니다."), "Friend request sent.");
  } finally {
    languageStore.setPreference("system");
  }
});
