import test from "node:test";
import assert from "node:assert/strict";
import {
  createWorkoutSounds,
  SOUND_STORAGE_KEY,
} from "../src/workoutSounds.js";

function fixture(preference = null) {
  let stored = preference;
  const contexts = [];
  class AudioContext {
    constructor() {
      this.state = "running";
      this.currentTime = 10;
      this.destination = {};
      this.sources = [];
      contexts.push(this);
    }
    createGain() {
      return {
        gain: {
          setValueAtTime() {},
          linearRampToValueAtTime() {},
          exponentialRampToValueAtTime() {},
        },
        connect() {},
        disconnect() {},
      };
    }
    createOscillator() {
      const source = {
        stops: [],
        frequency: {
          setValueAtTime(value) {
            source.hz = value;
          },
        },
        connect() {},
        disconnect() {},
        start(time) {
          source.startTime = time;
        },
        stop(time) {
          source.stops.push(time);
        },
      };
      this.sources.push(source);
      return source;
    }
    async resume() {
      this.state = "running";
    }
  }
  const environment = {
    AudioContext,
    localStorage: {
      getItem: (key) => {
        assert.equal(key, SOUND_STORAGE_KEY);
        return stored;
      },
      setItem: (key, value) => {
        assert.equal(key, SOUND_STORAGE_KEY);
        stored = value;
      },
    },
  };
  return { environment, contexts, sounds: createWorkoutSounds(environment) };
}

test("no audio is created on initial load; muted preference survives reload", async () => {
  const { environment, contexts, sounds } = fixture("off");
  assert.equal(sounds.isEnabled(), false);
  assert.equal(await sounds.play("workout"), false);
  assert.equal(contexts.length, 0);
  sounds.setEnabled(true);
  assert.equal(createWorkoutSounds(environment).isEnabled(), true);
  sounds.setEnabled(false);
  assert.equal(createWorkoutSounds(environment).isEnabled(), false);
});

test("save cue is brief; level-up cue is distinct, rising and under one second", async () => {
  const { contexts, sounds } = fixture();
  assert.equal(await sounds.play("workout"), true);
  const confirmation = [...contexts[0].sources];
  assert.ok(confirmation.at(-1).stops[0] - 10 < 0.3);
  assert.equal(await sounds.play("levelUp"), true);
  const celebration = contexts[0].sources.slice(confirmation.length);
  assert.ok(celebration.length > confirmation.length);
  assert.ok(
    celebration.every(
      (note, index) => !index || note.hz > celebration[index - 1].hz,
    ),
  );
  assert.ok(celebration.at(-1).stops[0] - 10 < 1);
  assert.equal(contexts.length, 1);
  assert.ok(confirmation.every((note) => note.stops.includes(undefined)));
});

test("muting cancels every active or scheduled note and blocks future cues", async () => {
  const { contexts, sounds } = fixture();
  await sounds.play("levelUp");
  sounds.setEnabled(false);
  assert.ok(
    contexts[0].sources.every((note) => note.stops.includes(undefined)),
  );
  const count = contexts[0].sources.length;
  assert.equal(await sounds.play("workout"), false);
  assert.equal(contexts[0].sources.length, count);
});

test("unsupported browsers, storage failures and denied audio never reject a save action", async () => {
  const unavailable = createWorkoutSounds({});
  assert.equal(await unavailable.play("workout"), false);
  const blocked = createWorkoutSounds({
    get localStorage() {
      throw new Error("blocked storage");
    },
    AudioContext: class {
      constructor() {
        throw new Error("blocked audio");
      }
    },
  });
  assert.equal(await blocked.play("workout"), false);
  assert.equal(blocked.setEnabled(false), false);
  assert.equal(blocked.isEnabled(), false);
});

test("suspended audio resumes on interaction; muting during resume prevents delayed sound", async () => {
  const { contexts, sounds } = fixture();
  await sounds.play("workout");
  contexts[0].state = "suspended";
  let finish;
  contexts[0].resume = () =>
    new Promise((resolve) => {
      finish = resolve;
    });
  const pending = sounds.play("levelUp");
  sounds.setEnabled(false);
  contexts[0].state = "running";
  finish();
  assert.equal(await pending, false);
  assert.equal(contexts[0].sources.length, 2);
});
