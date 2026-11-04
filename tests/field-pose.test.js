import test from "node:test";
import assert from "node:assert/strict";
import {
  pushupBody,
  exerciseArms,
  squatDrop,
  squatJoints,
  locomotionBody,
  locomotionJoints,
} from "../src/field/fieldPose.js";
import { armPose, legPose } from "../src/workoutProofModel.js";
import { characterAppearance } from "../src/characterAppearance.js";
const distance = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
const close = (a, b, text) =>
  assert.ok(Math.abs(a - b) < 1e-8, `${text}: ${a} != ${b}`);

test("pushup keeps the toes planted and both arm bone lengths unchanged across the rep", () => {
  for (const level of [1, 60, 200, 650, 1000]) {
    const p = characterAppearance(level);
    for (let step = 0; step <= 20; step++) {
      const body = pushupBody(p, step / 20);
      close(
        body.y +
          p.height *
            (body.toeY * Math.cos(body.angle) -
              body.toeZ * Math.sin(body.angle)),
        0.02,
        "toe height",
      );
      close(
        body.z +
          p.height *
            (body.toeY * Math.sin(body.angle) +
              body.toeZ * Math.cos(body.angle)),
        0,
        "toe position",
      );
      for (const side of [-1, 1]) {
        const limb = { side, ...armPose(p, side) };
        const next = exerciseArms(p, limb, body);
        close(
          distance(limb.shoulder, next.elbow),
          distance(limb.shoulder, limb.elbow),
          "upper arm",
        );
        close(
          distance(next.elbow, next.hand),
          distance(limb.elbow, limb.hand),
          "forearm",
        );
        close(
          body.y +
            p.height *
              (next.hand[1] * Math.cos(body.angle) -
                next.hand[2] * Math.sin(body.angle)),
          (0.1 + p.growth * 0.06) * p.height,
          "palm height",
        );
        close(
          body.z +
            p.height *
              (next.hand[1] * Math.sin(body.angle) +
                next.hand[2] * Math.cos(body.angle)),
          1.67 * p.height,
          "palm position",
        );
      }
    }
  }
});

test("squat holds hands at the chest without stretching the arms at every level", () => {
  for (let level = 1; level <= 1000; level++) {
    const p = characterAppearance(level);
    for (const side of [-1, 1]) {
      const limb = { side, ...armPose(p, side) };
      const next = exerciseArms(p, limb);
      close(
        distance(limb.shoulder, next.elbow),
        distance(limb.shoulder, limb.elbow),
        "upper arm",
      );
      close(
        distance(next.elbow, next.hand),
        distance(limb.elbow, limb.hand),
        "forearm",
      );
      assert.equal(next.hand[1], 1.96);
      assert.ok(Math.abs(next.hand[0]) < p.shoulder * 0.4);
      assert.ok(next.hand[2] < p.shoulder * 0.62 + 0.14);
    }
  }
});

test("squat keeps both leg lengths and planted feet throughout the rep at every level", () => {
  for (let level = 1; level <= 1000; level++) {
    const p = characterAppearance(level);
    for (const side of [-1, 1]) {
      const limb = { side, ...legPose(p, side) };
      const standing = squatJoints(p, limb, 0);
      for (let step = 0; step <= 20; step++) {
        const phase = step / 20;
        const next = squatJoints(p, limb, phase);
        close(
          distance(limb.hip, next.knee),
          distance(limb.hip, limb.knee),
          "thigh",
        );
        close(
          distance(next.knee, next.ankle),
          distance(limb.knee, limb.ankle),
          "shin",
        );
        close(next.ankle[0], standing.ankle[0], "planted foot x");
        close(next.ankle[2], standing.ankle[2], "planted foot z");
        close(
          next.ankle[1] - squatDrop(phase),
          limb.ankle[1],
          "planted foot height",
        );
        assert.ok(
          [...next.knee, ...next.ankle, next.footYaw].every(Number.isFinite),
        );
      }
    }
  }
});

test("squat knees open symmetrically toward the outward-facing toes as the body lowers", () => {
  for (const level of [1, 200, 650, 1000]) {
    const p = characterAppearance(level);
    const poses = [-1, 1].map((side) => {
      const limb = { side, ...legPose(p, side) };
      const top = squatJoints(p, limb, 0);
      const bottom = squatJoints(p, limb, 1);
      assert.ok(side * bottom.knee[0] > side * top.knee[0] + 0.05);
      assert.ok(side * bottom.ankle[0] > side * limb.ankle[0]);
      assert.ok(side * bottom.footYaw > 0.2 && side * bottom.footYaw < 0.4);
      const forward = bottom.knee[2] - bottom.ankle[2];
      assert.ok(forward > 0.3);
      assert.ok(side * (bottom.knee[0] - bottom.ankle[0]) > -0.01);
      return bottom;
    });
    close(poses[0].knee[0], -poses[1].knee[0], "mirrored knee x");
    close(poses[0].knee[1], poses[1].knee[1], "mirrored knee y");
    close(poses[0].knee[2], poses[1].knee[2], "mirrored knee z");
  }
});

test("walking and running preserve all four limb lengths through the complete stride at every level", () => {
  for (let level = 1; level <= 1000; level++) {
    const p = characterAppearance(level);
    for (const running of [false, true])
      for (let step = 0; step < 16; step++)
        for (const side of [-1, 1]) {
          const limb = { side, ...armPose(p, side), ...legPose(p, side) };
          const body = locomotionBody(
            p,
            ((step / 16) * Math.PI * 2) / (running ? 10.5 : 6.6),
            running,
          );
          const next = locomotionJoints(p, limb, body, running);
          close(
            distance(limb.hip, next.knee),
            distance(limb.hip, limb.knee),
            "thigh",
          );
          close(
            distance(next.knee, next.ankle),
            distance(limb.knee, limb.ankle),
            "shin",
          );
          close(
            distance(limb.shoulder, next.elbow),
            distance(limb.shoulder, limb.elbow),
            "upper arm",
          );
          close(
            distance(next.elbow, next.hand),
            distance(limb.elbow, limb.hand),
            "forearm",
          );
          assert.ok(
            [
              ...next.knee,
              ...next.ankle,
              ...next.elbow,
              ...next.hand,
              next.footPitch,
            ].every(Number.isFinite),
          );
        }
  }
});

test("running plants the support foot, lifts the recovery knee, and swings the matching arm backwards", () => {
  for (const level of [1, 200, 650, 1000]) {
    const p = characterAppearance(level),
      side = -1;
    const limb = { side, ...armPose(p, side), ...legPose(p, side) };
    const pose = (phase) => {
      const body = locomotionBody(p, phase / 10.5, true);
      return { body, ...locomotionJoints(p, limb, body, true) };
    };
    for (const phase of [0, 0.4, 1, 1.7]) {
      const next = pose(phase);
      const height =
        next.body.y / p.height +
        next.ankle[1] * Math.cos(next.body.angle) -
        next.ankle[2] * Math.sin(next.body.angle);
      close(height, limb.ankle[1] - (p.pants ? 0.18 : 0.21), "planted ankle");
      close(next.footPitch + next.body.angle, 0, "level support foot");
    }
    const contact = pose(0),
      recovery = pose(Math.PI * 1.5);
    assert.ok(recovery.ankle[1] - contact.ankle[1] > 0.35);
    assert.ok(contact.elbow[2] < limb.shoulder[2]);
    assert.ok(pose(Math.PI).elbow[2] > limb.shoulder[2]);
    const upper = contact.elbow.map((v, i) => v - limb.shoulder[i]);
    const lower = contact.hand.map((v, i) => v - contact.elbow[i]);
    const bend = Math.acos(
      upper.reduce((sum, v, i) => sum + v * lower[i], 0) /
        Math.hypot(...upper) /
        Math.hypot(...lower),
    );
    assert.ok(bend > 1.1 && bend < 1.9);
  }
});
