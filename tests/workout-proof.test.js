import test from "node:test";
import assert from "node:assert/strict";
import { initialData, saveRecord, emptyCounts } from "../src/model.js";
import { characterAppearance } from "../src/characterAppearance.js";
import {
  workoutProof,
  nextProofPose,
  PROOF_POSES,
  armPose,
  proofShareData,
  APP_SHARE_URL,
} from "../src/workoutProofModel.js";
const day = "2026-09-28";
test("proof takes a detached snapshot of saved counts and the updated level", () => {
  const data = saveRecord(
    { ...initialData(), characterName: "근육대호" },
    day,
    { pushups: 50, squats: 50, situps: 10, runningKm: 5 },
    day,
  );
  const before = JSON.stringify(data);
  const proof = workoutProof(data, day);
  assert.deepEqual(proof, {
    day,
    name: "근육대호",
    level: 3,
    counts: { pushups: 50, squats: 50, situps: 10, runningKm: 5 },
  });
  assert.equal(JSON.stringify(data), before);
  proof.counts.pushups = 999;
  assert.equal(data.records[day].pushups, 50);
});
test("proof requires a real workout on the requested date, but not full goals", () => {
  assert.throws(() => workoutProof(initialData(), day), /먼저 입력/);
  let data = saveRecord(
    { ...initialData(), characterName: "훈련생" },
    day,
    emptyCounts(),
    day,
  );
  assert.throws(() => workoutProof(data, day), /먼저 입력/);
  data = saveRecord(data, day, { ...emptyCounts(), runningKm: 0.1 }, day);
  assert.equal(workoutProof(data, day).counts.runningKm, 0.1);
  assert.throws(() => workoutProof(data, "2026-09-29"), /먼저 입력/);
});
test("file sharing includes all four counts and the canonical app link", () => {
  const file = new File(["png"], "proof.png", { type: "image/png" });
  const payload = proofShareData(
    {
      day,
      name: "대호",
      counts: { pushups: 50, squats: 30, situps: 0, runningKm: 2.5 },
    },
    file,
  );
  assert.equal(payload.url, APP_SHARE_URL);
  assert.ok(payload.text.includes(APP_SHARE_URL));
  for (const value of ["50개", "30개", "0개", "2.5km", day])
    assert.ok(payload.text.includes(value));
  assert.equal(payload.files[0], file);
});
test("random pose changes do not repeat and remain in the supported set", () => {
  for (const previous of [undefined, ...PROOF_POSES])
    for (const n of [0, 0.49, 0.99999]) {
      const next = nextProofPose(previous, () => n);
      assert.ok(PROOF_POSES.includes(next));
      assert.notEqual(next, previous);
    }
});
test("posed arms remain finite and bounded across all 1000 levels", () => {
  for (let level = 1; level <= 1000; level++)
    for (const pose of PROOF_POSES)
      for (const side of [-1, 1]) {
        const p = characterAppearance(level),
          arm = armPose(p, side, pose);
        for (const joint of Object.values(arm))
          for (const coordinate of joint)
            assert.ok(Number.isFinite(coordinate) && Math.abs(coordinate) < 4);
        assert.ok(arm.hand[1] > arm.shoulder[1]);
        assert.notDeepEqual(arm, armPose(p, side));
      }
});
