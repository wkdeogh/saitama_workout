export const SOUND_STORAGE_KEY = "saitama-training:sound";

const melodies = {
  workout: [
    { frequency: 659.25, at: 0, duration: 0.1 },
    { frequency: 880, at: 0.075, duration: 0.16 },
  ],
  levelUp: [
    { frequency: 523.25, at: 0, duration: 0.13 },
    { frequency: 659.25, at: 0.1, duration: 0.13 },
    { frequency: 783.99, at: 0.2, duration: 0.15 },
    { frequency: 1046.5, at: 0.32, duration: 0.36 },
  ],
};

// Synthesize short, original cues without downloading audio assets. Create the
// context only from a user action, and isolate audio failures from record saves.
export function createWorkoutSounds(environment = globalThis) {
  let context, master;
  let enabled = true;
  const active = new Set();
  try {
    enabled = environment.localStorage?.getItem(SOUND_STORAGE_KEY) !== "off";
  } catch {
    /* Keep the session preference when browser storage is unavailable. */
  }

  function stop() {
    for (const source of active) {
      try {
        source.stop();
      } catch {
        /* Already ended. */
      }
    }
    active.clear();
  }

  function setEnabled(value) {
    enabled = !!value;
    if (!enabled) stop();
    try {
      environment.localStorage?.setItem(
        SOUND_STORAGE_KEY,
        enabled ? "on" : "off",
      );
    } catch {
      /* Muting still works for this session. */
    }
    return enabled;
  }

  async function play(kind) {
    if (!enabled || !melodies[kind]) return false;
    try {
      const AudioContext =
        environment.AudioContext || environment.webkitAudioContext;
      if (!AudioContext) return false;
      if (!context || context.state === "closed") {
        context = new AudioContext();
        master = context.createGain();
        master.gain.value = 0.65;
        master.connect(context.destination);
      }
      if (context.state !== "running") await context.resume();
      if (!enabled || context.state !== "running") return false;
      // Replace any unfinished cue instead of stacking rapid saves.
      stop();
      const start = context.currentTime + 0.01;
      for (const { frequency, at, duration } of melodies[kind]) {
        const source = context.createOscillator();
        const gain = context.createGain();
        const time = start + at;
        source.type = "triangle";
        source.frequency.setValueAtTime(frequency, time);
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.09, time + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        gain.gain.linearRampToValueAtTime(0, time + duration + 0.015);
        source.connect(gain);
        gain.connect(master);
        active.add(source);
        source.onended = () => {
          active.delete(source);
          source.disconnect();
          gain.disconnect();
        };
        source.start(time);
        source.stop(time + duration + 0.02);
      }
      return true;
    } catch {
      stop();
      return false;
    }
  }

  return { isEnabled: () => enabled, setEnabled, play };
}

const sounds = createWorkoutSounds();
export const workoutSoundsEnabled = sounds.isEnabled;
export const setWorkoutSoundsEnabled = sounds.setEnabled;
export const playWorkoutSound = sounds.play;
