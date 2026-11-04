const distance = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));

// Solve a two-segment limb without changing either bone's length.
export function bendJoint(start, end, upperLength, lowerLength, hint) {
  const reach = distance(start, end);
  const direction = end.map((v, i) => (v - start[i]) / reach);
  const along =
    (upperLength ** 2 - lowerLength ** 2 + reach ** 2) / (2 * reach);
  const bend = Math.sqrt(Math.max(0, upperLength ** 2 - along ** 2));
  const dot = hint.reduce((sum, v, i) => sum + v * direction[i], 0);
  const perpendicular = hint.map((v, i) => v - dot * direction[i]);
  const length = Math.hypot(...perpendicular);
  return start.map(
    (v, i) => v + direction[i] * along + (perpendicular[i] / length) * bend,
  );
}

export function pushupBody(p, phase) {
  const angle = 1.3 + phase * 0.2;
  // Rock a straight plank around the toes instead of folding the knees.
  const toeY = 0.285;
  const toeZ = (p.pants ? 0.3 : 0.25) + p.growth * 0.11;
  return {
    angle,
    y: (toeZ * Math.sin(angle) - toeY * Math.cos(angle)) * p.height + 0.02,
    z: -(toeY * Math.sin(angle) + toeZ * Math.cos(angle)) * p.height,
    toeY,
    toeZ,
  };
}

export function exerciseArms(p, limb, body) {
  const { side, shoulder, elbow, hand } = limb;
  let target;
  if (body) {
    // Both palms stay in the same place on the ground throughout the rep.
    const y = 0.1 + p.growth * 0.06 - body.y / p.height;
    const z = 1.67 - body.z / p.height;
    target = [
      side * (p.shoulder + 0.06),
      y * Math.cos(body.angle) + z * Math.sin(body.angle),
      -y * Math.sin(body.angle) + z * Math.cos(body.angle),
    ];
  } else {
    // Hold both hands together in front of the chest, including at the top.
    target = [side * (0.07 + p.growth * 0.16), 1.96, p.shoulder * 0.62 + 0.13];
  }
  return {
    hand: target,
    elbow: bendJoint(
      shoulder,
      target,
      distance(shoulder, elbow),
      distance(elbow, hand),
      [side, -0.7, -0.15],
    ),
  };
}

export function squatDrop(phase) {
  // A small bend at the top leaves room for a wider, planted stance.
  return 0.035 + phase * 0.505;
}

export function squatJoints(p, limb, phase) {
  const { side, hip, knee, ankle } = limb;
  const nextAnkle = [
    ankle[0] + side * (0.09 + p.growth * 0.02),
    ankle[1] + squatDrop(phase),
    ankle[2],
  ];
  return {
    ankle: nextAnkle,
    knee: bendJoint(
      hip,
      nextAnkle,
      distance(hip, knee),
      distance(knee, ankle),
      [side * 0.35, 0, 1],
    ),
    footYaw: side * Math.atan(0.35),
  };
}

const turn = Math.PI * 2;
const smooth = (value) => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};

export function locomotionBody(p, time, running) {
  const cycle = time * (running ? 10.5 : 6.6);
  const crouch =
    (running ? 0.15 : 0.07) - Math.cos(cycle * 2) * (running ? 0.025 : 0.015);
  return {
    cycle,
    angle: running ? 0.1 : 0.035,
    y: (-(p.pants ? 0.18 : 0.21) - crouch) * p.height,
    crouch,
  };
}

export function locomotionJoints(p, limb, body, running) {
  const { side, shoulder, elbow, hand, hip, knee, ankle } = limb;
  const phase =
    (((body.cycle + (side === 1 ? Math.PI : 0)) % turn) + turn) % turn;
  const swing = Math.max(0, -Math.sin(phase));
  const toeOff = phase <= Math.PI ? smooth((phase / Math.PI - 0.7) / 0.3) : 0;
  const swingProgress = Math.max(0, (phase - Math.PI) / Math.PI);
  const footPitch =
    phase <= Math.PI
      ? toeOff * (running ? 0.35 : 0.22)
      : (running ? 0.35 : 0.22) * (1 - swingProgress) ** 3 -
        Math.sin(swingProgress * Math.PI) * (running ? 0.2 : 0.1);
  const footY =
    ankle[1] +
    body.crouch +
    swing ** 1.1 * (running ? 0.45 : 0.14) +
    toeOff * 0.06;
  const footZ = Math.cos(phase) * (running ? 0.29 : 0.16);
  const nextAnkle = [
    ankle[0],
    footY * Math.cos(body.angle) + footZ * Math.sin(body.angle),
    -footY * Math.sin(body.angle) + footZ * Math.cos(body.angle),
  ];
  const nextKnee = bendJoint(
    hip,
    nextAnkle,
    distance(hip, knee),
    distance(knee, ankle),
    [side * 0.05, 0, 1],
  );
  // The shoulder swings opposite to the leg; elbows stay bent while running.
  const armAngle = -Math.cos(phase) * (running ? 0.65 : 0.3);
  const elbowBend = running
    ? 1.5 + Math.cos(phase) * 0.12
    : 0.35 + Math.cos(phase) * 0.08;
  const upperX = elbow[0] - shoulder[0];
  const upper = Math.sqrt(distance(shoulder, elbow) ** 2 - upperX ** 2);
  const lowerX = -side * (0.035 + p.growth * 0.045);
  const lower = Math.sqrt(distance(elbow, hand) ** 2 - lowerX ** 2);
  const nextElbow = [
    elbow[0],
    shoulder[1] - Math.cos(armAngle) * upper,
    shoulder[2] + Math.sin(armAngle) * upper,
  ];
  const nextHand = [
    nextElbow[0] + lowerX,
    nextElbow[1] - Math.cos(armAngle + elbowBend) * lower,
    nextElbow[2] + Math.sin(armAngle + elbowBend) * lower,
  ];
  return {
    knee: nextKnee,
    ankle: nextAnkle,
    elbow: nextElbow,
    hand: nextHand,
    footPitch: footPitch - body.angle,
    phase,
  };
}
