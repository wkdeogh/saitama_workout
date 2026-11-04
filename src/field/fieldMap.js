import { t } from "../i18n/index.js";
import * as THREE from "three";
import {
  TREES,
  GYM,
  TRACK,
  GYM_EQUIPMENT,
  onTrack,
  stadiumOutline,
} from "./fieldModel";

export function createMap(scene) {
  const root = new THREE.Group();
  scene.add(root);
  const mat = (color) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.95 });
  const wood = mat(0xa57749),
    darkWood = mat(0x725039),
    leaf = mat(0x668a42),
    lightLeaf = mat(0x89a653);
  const steel = mat(0x52645c),
    sand = mat(0xd8c697),
    stone = mat(0x9baca0);
  const frame = mat(0x41544e),
    padding = mat(0x3c5349),
    weights = mat(0x303b38),
    chrome = mat(0xb8c9c5);
  chrome.metalness = 0.65;
  chrome.roughness = 0.28;
  const box = new THREE.BoxGeometry(1, 1, 1),
    ball = new THREE.DodecahedronGeometry(1, 1);
  const cylinder = new THREE.CylinderGeometry(1, 1, 1, 8);
  function mesh(geometry, material, x, y, z, sx = 1, sy = sx, sz = sx) {
    const item = new THREE.Mesh(geometry, material);
    item.position.set(x, y, z);
    item.scale.set(sx, sy, sz);
    item.castShadow = true;
    item.receiveShadow = true;
    root.add(item);
    return item;
  }
  function beam(a, b, radius, material = wood) {
    const from = new THREE.Vector3(...a),
      to = new THREE.Vector3(...b),
      delta = to.clone().sub(from);
    const item = mesh(
      cylinder,
      material,
      ...from.clone().add(to).multiplyScalar(0.5).toArray(),
      radius,
      delta.length(),
      radius,
    );
    item.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      delta.normalize(),
    );
    return item;
  }
  const ground = mesh(
    new THREE.PlaneGeometry(180, 180),
    mat(0x9bb86d),
    0,
    -0.02,
    0,
  );
  ground.rotation.x = -Math.PI / 2;
  ground.castShadow = false;
  const clearing = mesh(
    new THREE.PlaneGeometry(GYM.maxX - GYM.minX, GYM.maxZ - GYM.minZ),
    sand,
    0,
    0.005,
    -5,
  );
  clearing.rotation.x = -Math.PI / 2;
  clearing.castShadow = false;
  // A soft footpath leads into the gate.
  const path = new THREE.Shape();
  path.moveTo(-1.5, -27);
  path.bezierCurveTo(-4, -18, 1, -10, -1.5, -GYM.maxZ);
  path.lineTo(1.5, -GYM.maxZ);
  path.bezierCurveTo(4, -10, 0, -19, 1.5, -27);
  path.closePath();
  const trail = mesh(
    new THREE.ShapeGeometry(path, 32),
    mat(0xc9bb8e),
    0,
    0.008,
    0,
  );
  trail.rotation.x = -Math.PI / 2;
  trail.castShadow = false;

  function trackStrip(inner, outer, material, y) {
    const points = (radius) =>
      stadiumOutline(radius).map(([x, z]) => new THREE.Vector2(x, -z));
    const shape = new THREE.Shape(points(outer));
    shape.holes.push(new THREE.Path(points(inner).reverse()));
    const strip = mesh(new THREE.ShapeGeometry(shape), material, 0, y, 0);
    strip.rotation.x = -Math.PI / 2;
    strip.castShadow = false;
    return strip;
  }
  trackStrip(
    TRACK.innerRadius,
    TRACK.innerRadius + TRACK.laneWidth * TRACK.lanes,
    mat(0xb97d68),
    0.016,
  );
  const paint = mat(0xf5ebda);
  for (let lane = 0; lane <= TRACK.lanes; lane++) {
    const radius = TRACK.innerRadius + lane * TRACK.laneWidth;
    trackStrip(radius - 0.025, radius + 0.025, paint, 0.024);
  }
  mesh(
    box,
    paint,
    -4,
    0.028,
    TRACK.centerZ + TRACK.innerRadius + (TRACK.laneWidth * TRACK.lanes) / 2,
    0.09,
    0.012,
    TRACK.laneWidth * TRACK.lanes,
  );

  for (const [x, z, size] of TREES) {
    beam([x, 0, z], [x, size * 4.1, z], size * 0.26, darkWood);
    for (let i = 0; i < 3; i++) {
      const angle = i * 2.4 + x;
      const cx = x + Math.cos(angle) * size * 0.85,
        cz = z + Math.sin(angle) * size * 0.75;
      beam([x, size * 2.4, z], [cx, size * 3.5, cz], size * 0.13, darkWood);
      const canopy = mesh(
        ball,
        i % 2 ? lightLeaf : leaf,
        cx,
        size * (3.8 + i * 0.3),
        cz,
        size * 1.5,
        size * 1.35,
        size * 1.4,
      );
      canopy.rotation.y = x + i;
    }
  }
  // Low hills surround the walkable meadow.
  const hillMat = mat(0x87a870);
  for (let i = 0; i < 14; i++) {
    const angle = (i / 14) * Math.PI * 2;
    mesh(
      ball,
      hillMat,
      Math.sin(angle) * 60,
      -3,
      Math.cos(angle) * 60,
      15,
      9 + (i % 3) * 3,
      15,
    );
  }
  // Deterministic placement keeps the same meadow on every device.
  let seed = 19;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const blades = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.07, 0.34, 3),
    mat(0x7c9b52),
    700,
  );
  const transform = new THREE.Object3D();
  for (let i = 0; i < 700; i++) {
    let x, z;
    do {
      x = random() * 68 - 34;
      z = random() * 68 - 34;
    } while (
      (x > GYM.minX - 1 &&
        x < GYM.maxX + 1 &&
        z > GYM.minZ - 1 &&
        z < GYM.maxZ + 1) ||
      onTrack(x, z, 0.45) ||
      (Math.abs(x) < 3 && z > GYM.maxZ)
    );
    transform.position.set(x, 0.14, z);
    transform.rotation.set(0, random() * 6.28, (random() - 0.5) * 0.3);
    transform.scale.setScalar(0.7 + random() * 0.7);
    transform.updateMatrix();
    blades.setMatrixAt(i, transform.matrix);
  }
  root.add(blades);
  for (const color of [0xffefd0, 0xe7b3a6, 0xe7ce69]) {
    const flowers = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(0.085, 0),
      mat(color),
      70,
    );
    for (let i = 0; i < 70; i++) {
      let x, z;
      do {
        const angle = random() * 6.28,
          radius = 17 + random() * 15;
        x = Math.cos(angle) * radius;
        z = Math.sin(angle) * radius;
      } while (onTrack(x, z, 0.6) || (Math.abs(x) < 18 && z > -16 && z < 6));
      transform.position.set(x, 0.17, z);
      transform.rotation.set(0, random() * 6.28, 0);
      transform.scale.setScalar(1);
      transform.updateMatrix();
      flowers.setMatrixAt(i, transform.matrix);
    }
    root.add(flowers);
  }
  function fence(x1, z1, x2, z2) {
    const length = Math.hypot(x2 - x1, z2 - z1),
      count = Math.ceil(length / 2);
    for (let i = 0; i <= count; i++) {
      const t = i / count,
        x = x1 + (x2 - x1) * t,
        z = z1 + (z2 - z1) * t;
      mesh(box, wood, x, 0.65, z, 0.2, 1.3, 0.2);
    }
    for (const y of [0.45, 0.96]) beam([x1, y, z1], [x2, y, z2], 0.08);
  }
  fence(GYM.minX, GYM.minZ, GYM.maxX, GYM.minZ);
  fence(GYM.minX, GYM.minZ, GYM.minX, GYM.maxZ);
  fence(GYM.maxX, GYM.minZ, GYM.maxX, GYM.maxZ);
  fence(GYM.minX, GYM.maxZ, -GYM.gateHalfWidth, GYM.maxZ);
  fence(GYM.gateHalfWidth, GYM.maxZ, GYM.maxX, GYM.maxZ);
  for (const x of [-GYM.gateHalfWidth, GYM.gateHalfWidth])
    mesh(box, darkWood, x, 1.6, GYM.maxZ, 0.25, 3.2, 0.25);
  mesh(box, wood, 0, 3.2, GYM.maxZ, GYM.gateHalfWidth * 2 + 0.8, 0.24, 0.45);
  const signCanvas = document.createElement("canvas");
  signCanvas.width = 768;
  signCanvas.height = 180;
  const ctx = signCanvas.getContext("2d");
  ctx.fillStyle = "#735439";
  ctx.fillRect(0, 0, 768, 180);
  ctx.fillStyle = "#fff7df";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 74px sans-serif";
  ctx.fillText(t("숲속 훈련장"), 384, 93);
  const signTexture = new THREE.CanvasTexture(signCanvas);
  signTexture.colorSpace = THREE.SRGBColorSpace;
  const sign = mesh(
    new THREE.PlaneGeometry(3.5, 0.82),
    new THREE.MeshStandardMaterial({
      map: signTexture,
      side: THREE.DoubleSide,
    }),
    0,
    2.75,
    GYM.maxZ + 0.16,
  );
  sign.castShadow = false;
  // Wooden pull-up bars, parallel bars, benches and exercise mats.
  const equipment = Object.fromEntries(
    GYM_EQUIPMENT.map((item) => [item.id, item]),
  );
  const pullup = equipment.pullup,
    parallel = equipment.parallel;
  for (const x of [pullup.x - 2, pullup.x + 2])
    beam([x, 0, pullup.z], [x, 2.9, pullup.z], 0.15);
  beam(
    [pullup.x - 2, 2.9, pullup.z],
    [pullup.x + 2, 2.9, pullup.z],
    0.075,
    steel,
  );
  for (const x of [parallel.x - 1.3, parallel.x + 1.3]) {
    for (const z of [parallel.z - 2, parallel.z + 2])
      beam([x, 0, z], [x, 1.3, z], 0.12);
    beam([x, 1.3, parallel.z - 2], [x, 1.3, parallel.z + 2], 0.07, steel);
  }
  for (const { x, z } of [equipment["bench-left"], equipment["bench-right"]]) {
    mesh(box, wood, x, 0.58, z, 2.6, 0.18, 0.75);
    for (const dx of [-0.9, 0.9])
      mesh(box, darkWood, x + dx, 0.25, z, 0.18, 0.5, 0.55);
  }
  for (const [x, z, color] of [
    [-3, -1.3, 0x759f9b],
    [0, -2.1, 0xc38d75],
    [3, -1.3, 0x8b9b70],
  ])
    mesh(box, mat(color), x, 0.035, z, 1.1, 0.06, 2.2);
  for (const x of [-3.4, 3.4]) {
    beam([x - 0.3, 0.2, -9.7], [x + 0.3, 0.2, -9.7], 0.055, steel);
    for (const dx of [-0.3, 0.3])
      mesh(cylinder, steel, x + dx, 0.2, -9.7, 0.18, 0.15, 0.18).rotation.z =
        Math.PI / 2;
  }
  function barbell(x, y, z, halfWidth = 1.5) {
    beam([x - halfWidth, y, z], [x + halfWidth, y, z], 0.045, chrome);
    for (const side of [-1, 1])
      for (let plate = 0; plate < 2; plate++) {
        const disc = mesh(
          cylinder,
          weights,
          x + side * (halfWidth - 0.3 + plate * 0.13),
          y,
          z,
          0.3 - plate * 0.045,
          0.12,
          0.3 - plate * 0.045,
        );
        disc.rotation.z = Math.PI / 2;
      }
  }
  function workoutBench(x, z) {
    mesh(box, padding, x, 0.65, z, 0.62, 0.18, 1.9);
    mesh(box, padding, x, 0.67, z - 1.05, 0.58, 0.18, 0.35);
    for (const dz of [-0.65, 0.65]) {
      beam([x, 0.1, z + dz], [x, 0.59, z + dz], 0.075, frame);
      mesh(box, frame, x, 0.08, z + dz, 1.1, 0.12, 0.28);
    }
    beam([x, 0.4, z - 0.7], [x, 0.4, z + 0.7], 0.07, frame);
  }
  const press = equipment["bench-press"];
  workoutBench(press.x, press.z + 0.15);
  for (const dx of [-1, 1]) {
    beam(
      [press.x + dx, 0.1, press.z - 0.8],
      [press.x + dx, 1.75, press.z - 0.8],
      0.09,
      frame,
    );
    mesh(box, frame, press.x + dx, 0.08, press.z - 0.65, 0.5, 0.12, 1.2);
    beam(
      [press.x + dx, 1.38, press.z - 0.8],
      [press.x + dx, 1.38, press.z - 0.55],
      0.065,
      chrome,
    );
  }
  barbell(press.x, 1.47, press.z - 0.62);
  const smith = equipment.smith;
  for (const side of [-1, 1]) {
    for (const dz of [-1.25, 1.25])
      beam(
        [smith.x + side * 1.55, 0.1, smith.z + dz],
        [smith.x + side * 1.55, 3.2, smith.z + dz],
        0.09,
        frame,
      );
    beam(
      [smith.x + side * 1.55, 3.2, smith.z - 1.25],
      [smith.x + side * 1.55, 3.2, smith.z + 1.25],
      0.09,
      frame,
    );
    mesh(box, frame, smith.x + side * 1.55, 0.08, smith.z, 0.42, 0.14, 3.2);
    beam(
      [smith.x + side * 1.23, 0.3, smith.z],
      [smith.x + side * 1.23, 3.05, smith.z],
      0.045,
      chrome,
    );
    mesh(box, chrome, smith.x + side * 1.23, 1.78, smith.z, 0.18, 0.24, 0.18);
    for (const y of [0.65, 1.1]) {
      beam(
        [smith.x + side * 1.55, y, smith.z - 0.8],
        [smith.x + side * 1.86, y, smith.z - 0.8],
        0.05,
        chrome,
      );
      mesh(
        cylinder,
        weights,
        smith.x + side * 1.72,
        y,
        smith.z - 0.8,
        0.25,
        0.12,
        0.25,
      ).rotation.z = Math.PI / 2;
    }
  }
  for (const z of [smith.z - 1.25, smith.z + 1.25])
    beam([smith.x - 1.55, 3.2, z], [smith.x + 1.55, 3.2, z], 0.09, frame);
  barbell(smith.x, 1.8, smith.z, 1.75);
  workoutBench(smith.x, smith.z + 0.25);
  for (const [x, z] of [
    [-19, 0],
    [19, 0],
    [-20, -12],
    [19, -13],
  ])
    mesh(ball, stone, x, 0.25, z, 0.8, 0.55, 0.65);
  return root;
}
