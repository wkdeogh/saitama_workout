import * as THREE from "three";
import { createFigure, createEnergy, disposeGroup } from "../Character";
import { characterAppearance } from "../characterAppearance";
import {
  pushupBody,
  exerciseArms,
  locomotionBody,
  locomotionJoints,
} from "./fieldPose";

const vector = (v) => new THREE.Vector3(...v);
function segment(group, from, to, start, end) {
  const original = vector(to).sub(vector(from));
  const target = vector(end).sub(vector(start));
  group.position.set(...start);
  group.quaternion.setFromUnitVectors(
    original.normalize(),
    target.clone().normalize(),
  );
  group.scale.setScalar(target.length() / vector(to).distanceTo(vector(from)));
}

export function createAvatar(level, streak) {
  const appearance = characterAppearance(level, streak);
  const figure = createFigure(appearance, "idle", true);
  const energy = createEnergy(appearance);
  const root = new THREE.Group();
  root.add(figure.root, energy.root);
  root.scale.setScalar(0.85);
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.55, 24),
    new THREE.MeshBasicMaterial({
      color: 0x293e28,
      transparent: true,
      opacity: 0.17,
      depthWrite: false,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.018;
  root.add(shadow);

  let currentAction = "idle";
  function update(action, time, reducedMotion = false) {
    currentAction = action;
    const moving = action === "walk" || action === "run";
    const gait = moving
      ? locomotionBody(appearance, time, action === "run")
      : null;
    const squat = action === "squat" ? (1 - Math.cos(time * 3.7)) / 2 : 0;
    const pushup = action === "pushup";
    const push = (1 - Math.cos(time * 4.1)) / 2;
    const plank = pushup ? pushupBody(appearance, push) : null;
    const drop = squat * 0.54;
    const baseY = -(appearance.pants ? 0.18 : 0.21) * appearance.height;
    figure.root.rotation.x = plank?.angle || gait?.angle || 0;
    figure.root.position.y = pushup
      ? plank.y
      : gait
        ? gait.y
        : baseY - drop * appearance.height;
    figure.root.position.z = plank?.z || 0;
    for (const limb of figure.limbs) {
      const { side, shoulder, elbow, hand, hip, knee, ankle } = limb;
      const legHip = [...hip];
      let legKnee = [...knee],
        legAnkle = [...ankle];
      let armElbow = [...elbow],
        armHand = [...hand];
      let footPitch = 0;
      if (moving) {
        const joints = locomotionJoints(
          appearance,
          limb,
          gait,
          action === "run",
        );
        legKnee = joints.knee;
        legAnkle = joints.ankle;
        armElbow = joints.elbow;
        armHand = joints.hand;
        footPitch = joints.footPitch;
      } else if (action === "squat") {
        legKnee = [knee[0], knee[1] + drop * 0.35, knee[2] + squat * 0.43];
        legAnkle = [ankle[0], ankle[1] + drop, ankle[2]];
        const arms = exerciseArms(appearance, limb);
        armElbow = arms.elbow;
        armHand = arms.hand;
      } else if (pushup) {
        const arms = exerciseArms(appearance, limb, plank);
        armElbow = arms.elbow;
        armHand = arms.hand;
      }
      segment(limb.arm, shoulder, elbow, shoulder, armElbow);
      segment(limb.forearm, elbow, hand, armElbow, armHand);
      segment(limb.thigh, hip, knee, legHip, legKnee);
      segment(limb.shin, knee, ankle, legKnee, legAnkle);
      limb.foot.position.set(...legAnkle);
      limb.foot.rotation.set(footPitch, 0, 0);
    }
    energy.root.visible = !pushup;
    if (energy.flame)
      energy.flame.material.uniforms.time.value = reducedMotion ? 0 : time;
    energy.rings.forEach((ring, i) => {
      ring.rotation.z =
        (i % 2 ? -1 : 1) * (0.4 + (reducedMotion ? 0 : time * 0.4));
    });
    energy.bolts.forEach((bolt, i) => {
      bolt.material.opacity = reducedMotion
        ? 0.6
        : 0.55 + Math.sin(time * 2 + i) * 0.2;
    });
    if (energy.particles) {
      const positions = energy.particles.geometry.attributes.position;
      const t = reducedMotion ? 0 : time;
      for (let i = 0; i < positions.count; i++) {
        const angle = i * 2.399 + t * 0.12;
        positions.setXYZ(
          i,
          Math.cos(angle) * (0.85 + (i % 7) * 0.085),
          0.3 + ((i * 0.137 + t * (0.23 + (i % 3) * 0.09)) % 3.5),
          Math.sin(angle) * 0.65,
        );
      }
      positions.needsUpdate = true;
    }
  }
  return {
    root,
    update,
    cameraTarget: (target) => {
      if (currentAction === "pushup") {
        figure.root.localToWorld(target.set(0, 1.65, 0));
        target.y = 1.1;
      } else {
        target.copy(root.position);
        target.y = Math.max(
          1.3,
          ((3.65 + appearance.hair * 1.1) * appearance.height * 0.85 + 0.13) *
            0.56,
        );
      }
      return target;
    },
    labelPosition: (target) => {
      target.set(0, 2.84, 0);
      figure.root.localToWorld(target);
      target.y +=
        (currentAction === "pushup" ? 0.62 : 0.83 + appearance.hair * 1.1) *
          appearance.height *
          0.85 +
        0.12;
      return target;
    },
    height: (3.65 + appearance.hair * 1.1) * appearance.height * 0.85 + 0.13,
    dispose: () => disposeGroup(root),
  };
}
