export const FIELD_LIMIT = 34;
export const WALK_SPEED = 3.2;
export const RUN_SPEED = 6.4;
export const CHAT_DURATION = 5000;
export const CHAT_COOLDOWN = 2000;
export const CHAT_MAX_LENGTH = 80;
export const LABEL_DISTANCE = 10;
export function playerLabelOpacity(self, other, isSelf = false) {
  if (isSelf) return 1;
  const distance = Math.hypot(self.x - other.x, self.z - other.z);
  return Math.max(0, Math.min(1, (LABEL_DISTANCE - distance) / 2));
}
export const ACTIONS = ["idle", "walk", "run", "pushup", "squat"];
export const GYM = {
  minX: -17,
  maxX: 17,
  minZ: -15,
  maxZ: 5,
  gateHalfWidth: 2.2,
};
export const TRACK = {
  centerZ: -5,
  straightHalf: 11,
  innerRadius: 13.5,
  laneWidth: 1.1,
  lanes: 3,
};
export const GYM_EQUIPMENT = [
  { id: "pullup", x: -9, z: -11, width: 4, depth: 0.65 },
  { id: "parallel", x: 9, z: -10, width: 3, depth: 4 },
  { id: "bench-left", x: -12.5, z: 0, width: 2.6, depth: 0.8 },
  { id: "bench-right", x: 12.5, z: 0, width: 2.6, depth: 0.8 },
  { id: "bench-press", x: -8, z: -5, width: 3.6, depth: 3.2 },
  { id: "smith", x: 6, z: -5.5, width: 3.8, depth: 3.4 },
];

export function trackRadiusAt(x, z) {
  return Math.hypot(
    Math.max(0, Math.abs(x) - TRACK.straightHalf),
    z - TRACK.centerZ,
  );
}
export function onTrack(x, z, margin = 0) {
  const radius = trackRadiusAt(x, z);
  return (
    radius >= TRACK.innerRadius - margin &&
    radius <= TRACK.innerRadius + TRACK.laneWidth * TRACK.lanes + margin
  );
}
export function stadiumOutline(radius, steps = 64) {
  const points = [];
  for (let i = 0; i <= steps; i++) {
    const angle = -Math.PI / 2 + (i / steps) * Math.PI;
    points.push([
      TRACK.straightHalf + Math.cos(angle) * radius,
      TRACK.centerZ + Math.sin(angle) * radius,
    ]);
  }
  for (let i = 0; i <= steps; i++) {
    const angle = Math.PI / 2 + (i / steps) * Math.PI;
    points.push([
      -TRACK.straightHalf + Math.cos(angle) * radius,
      TRACK.centerZ + Math.sin(angle) * radius,
    ]);
  }
  return points;
}

export const TREES = [
  [-23, -24, 1.3],
  [-15, -28, 1.1],
  [-5, -30, 1.4],
  [9, -27, 1.2],
  [22, -24, 1.5],
  [29, -13, 1.2],
  [31, 1, 1.5],
  [30, 14, 1.1],
  [22, 26, 1.4],
  [8, 29, 1.2],
  [-8, 27, 1.5],
  [-22, 23, 1.2],
  [-29, 12, 1.4],
  [-31, -2, 1.2],
  [-29, -15, 1.3],
  [17, 15, 0.9],
  [-18, 17, 1.1],
  [19, -10, 0.95],
];
// These bounds also drive the rendered fence and equipment.
export const WALLS = [
  [GYM.minX - 0.1, GYM.minZ, GYM.minX + 0.1, GYM.maxZ],
  [GYM.maxX - 0.1, GYM.minZ, GYM.maxX + 0.1, GYM.maxZ],
  [GYM.minX, GYM.minZ - 0.1, GYM.maxX, GYM.minZ + 0.1],
  [GYM.minX, GYM.maxZ - 0.1, -GYM.gateHalfWidth, GYM.maxZ + 0.1],
  [GYM.gateHalfWidth, GYM.maxZ - 0.1, GYM.maxX, GYM.maxZ + 0.1],
  ...GYM_EQUIPMENT.map(({ x, z, width, depth }) => [
    x - width / 2,
    z - depth / 2,
    x + width / 2,
    z + depth / 2,
  ]),
];

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function blocked(x, z) {
  const radius = 0.45;
  if (Math.abs(x) > FIELD_LIMIT || Math.abs(z) > FIELD_LIMIT) return true;
  if (
    TREES.some(
      ([tx, tz, size]) => Math.hypot(x - tx, z - tz) < size * 0.45 + radius,
    )
  )
    return true;
  return WALLS.some(
    ([x1, z1, x2, z2]) =>
      x > x1 - radius && x < x2 + radius && z > z1 - radius && z < z2 + radius,
  );
}

export function movePlayer(player, input, yaw, running, delta) {
  const length = Math.hypot(input.x, input.y);
  if (length < 0.12)
    return {
      ...player,
      action: ["walk", "run"].includes(player.action) ? "idle" : player.action,
    };
  const magnitude = Math.min(1, length);
  const x = (input.x / length) * magnitude,
    y = (input.y / length) * magnitude;
  const dx = x * Math.cos(yaw) + y * Math.sin(yaw);
  const dz = -x * Math.sin(yaw) + y * Math.cos(yaw);
  const distance = (running ? RUN_SPEED : WALK_SPEED) * clamp(delta, 0, 0.05);
  const next = {
    ...player,
    yaw: Math.atan2(dx, dz),
    action: running ? "run" : "walk",
  };
  // Resolve each axis separately so the player slides along a fence.
  if (!blocked(player.x + dx * distance, player.z)) next.x += dx * distance;
  if (!blocked(next.x, player.z + dz * distance)) next.z += dz * distance;
  if (next.x === player.x && next.z === player.z) next.action = "idle";
  return next;
}

export function cleanChat(value) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .trim()
    .slice(0, CHAT_MAX_LENGTH);
}

export function validPlayer(value) {
  return (
    value &&
    typeof value.name === "string" &&
    value.name.length > 0 &&
    value.name.length <= 24 &&
    [
      value.x,
      value.z,
      value.yaw,
      value.level,
      value.streak,
      value.updatedAt,
      value.chatAt,
    ].every(Number.isFinite) &&
    Math.abs(value.x) <= FIELD_LIMIT &&
    Math.abs(value.z) <= FIELD_LIMIT &&
    Math.abs(value.yaw) <= Math.PI * 2 &&
    value.level >= 1 &&
    value.level <= 1000 &&
    value.streak >= 0 &&
    value.streak <= 10000 &&
    typeof value.guest === "boolean" &&
    ACTIONS.includes(value.action) &&
    typeof value.chat === "string" &&
    value.chat.length <= CHAT_MAX_LENGTH
  );
}

export function visiblePlayers(tree, now) {
  const players = {};
  for (const [uid, sessions] of Object.entries(tree || {})) {
    for (const [session, value] of Object.entries(sessions || {})) {
      if (
        validPlayer(value) &&
        now - value.updatedAt < 45000 &&
        value.updatedAt <= now + 15000
      )
        players[`${uid}/${session}`] = value;
    }
  }
  return players;
}

export function shortestAngle(from, to, amount) {
  return from + Math.atan2(Math.sin(to - from), Math.cos(to - from)) * amount;
}
