import test from "node:test";
import assert from "node:assert/strict";
import {
  movePlayer,
  blocked,
  cleanChat,
  visiblePlayers,
  shortestAngle,
  playerLabelOpacity,
  GYM,
  TRACK,
  GYM_EQUIPMENT,
  stadiumOutline,
} from "../src/field/fieldModel.js";

const player = { x: 0, z: 8, yaw: Math.PI, action: "idle" };
test("nearby names and bubbles fade out together at ten metres, while own label stays visible", () => {
  const self = { x: 0, z: 0 };
  assert.equal(playerLabelOpacity(self, { x: 0, z: 7 }), 1);
  assert.equal(playerLabelOpacity(self, { x: 0, z: 9 }), 0.5);
  assert.equal(playerLabelOpacity(self, { x: 6, z: 8 }), 0);
  assert.equal(playerLabelOpacity(self, { x: 0, z: 20 }), 0);
  assert.equal(playerLabelOpacity(self, { x: 0, z: 20 }, true), 1);
});
test("movement is camera relative, normalizes diagonals, and running doubles speed", () => {
  const forward = movePlayer(player, { x: 0, y: -1 }, 0, false, 0.05);
  assert.ok(forward.z < player.z);
  const rotated = movePlayer(player, { x: 0, y: -1 }, Math.PI / 2, false, 0.05);
  assert.ok(rotated.x < player.x);
  const diagonal = movePlayer(player, { x: 1, y: -1 }, 0, false, 0.05);
  assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.z - 8) - 0.16) < 1e-9);
  const run = movePlayer(player, { x: 0, y: -1 }, 0, true, 0.05);
  assert.ok(Math.abs((8 - run.z) / (8 - forward.z) - 2) < 1e-9);
});
test("fences and field edges stop the player, while the gym gate remains passable", () => {
  assert.equal(blocked(0, GYM.maxZ), false);
  assert.equal(blocked(4, GYM.maxZ), true);
  assert.equal(blocked(12, -6), false);
  assert.equal(blocked(GYM.maxX, -8), true);
  assert.equal(blocked(35, 0), true);
  const stopped = movePlayer(
    { ...player, x: 4, z: GYM.maxZ + 0.8 },
    { x: 0, y: -1 },
    0,
    true,
    0.05,
  );
  assert.equal(stopped.z, GYM.maxZ + 0.8);
  const gate = movePlayer(
    { ...player, z: GYM.maxZ + 0.5 },
    { x: 0, y: -1 },
    0,
    false,
    0.05,
  );
  assert.ok(gate.z < GYM.maxZ + 0.5);
});
test("expanded gym doubles the enclosed area and every equipment footprint blocks movement", () => {
  const area = (GYM.maxX - GYM.minX) * (GYM.maxZ - GYM.minZ);
  assert.ok(area / (24 * 14) > 1.9 && area / (24 * 14) < 2.1);
  for (const item of GYM_EQUIPMENT) {
    assert.equal(blocked(item.x, item.z), true, item.id);
    assert.ok(
      item.x - item.width / 2 > GYM.minX && item.x + item.width / 2 < GYM.maxX,
    );
    assert.ok(
      item.z - item.depth / 2 > GYM.minZ && item.z + item.depth / 2 < GYM.maxZ,
    );
  }
});
test("all three running lanes form unobstructed loops within the field", () => {
  for (let lane = 0; lane < TRACK.lanes; lane++) {
    const radius = TRACK.innerRadius + (lane + 0.5) * TRACK.laneWidth;
    const loop = stadiumOutline(radius);
    for (let x = -TRACK.straightHalf; x <= TRACK.straightHalf; x += 0.25)
      loop.push([x, TRACK.centerZ - radius], [x, TRACK.centerZ + radius]);
    for (const [x, z] of loop)
      assert.equal(blocked(x, z), false, `${lane}: ${x}, ${z}`);
  }
});
test("movement interrupts exercises but releasing movement preserves an active exercise", () => {
  const exercising = { ...player, action: "pushup" };
  assert.equal(
    movePlayer(exercising, { x: 0, y: 0 }, 0, false, 0.03).action,
    "pushup",
  );
  assert.equal(
    movePlayer(exercising, { x: 1, y: 0 }, 0, false, 0.03).action,
    "walk",
  );
  assert.equal(
    movePlayer({ ...player, action: "run" }, { x: 0, y: 0 }, 0, true, 0.03)
      .action,
    "idle",
  );
});
test("roster discards stale and malformed sessions and keeps multiple tabs separate", () => {
  const now = Date.now();
  const valid = {
    ...player,
    name: "테스트",
    level: 1,
    streak: 0,
    guest: true,
    updatedAt: now,
    chat: "",
    chatAt: 0,
  };
  const roster = visiblePlayers(
    {
      guest: {
        first: valid,
        second: valid,
        old: { ...valid, updatedAt: now - 60000 },
        invalid: { ...valid, x: NaN },
      },
    },
    now,
  );
  assert.deepEqual(Object.keys(roster), ["guest/first", "guest/second"]);
  assert.equal(cleanChat("  안녕\n반가워요  "), "안녕 반가워요");
  assert.equal(cleanChat("가".repeat(100)).length, 80);
  assert.ok(
    Math.abs(shortestAngle(Math.PI - 0.1, -Math.PI + 0.1, 0.5) - Math.PI) <
      1e-9,
  );
});
