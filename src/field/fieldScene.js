import * as THREE from "three";
import { createAvatar } from "./fieldAvatar";
import { createMap } from "./fieldMap";
import { disposeGroup } from "../Character";
import {
  movePlayer,
  clamp,
  shortestAngle,
  CHAT_DURATION,
  playerLabelOpacity,
} from "./fieldModel";

export function createFieldScene(
  host,
  labelsHost,
  controls,
  { onFrame, onAction, onError },
) {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);
  renderer.domElement.setAttribute(
    "aria-label",
    "야외 훈련장 3D 화면. WASD 또는 방향키로 이동하고 화면을 드래그해 둘러보세요.",
  );
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xc9e1e5);
  scene.fog = new THREE.Fog(0xc9e1d7, 35, 95);
  const camera = new THREE.PerspectiveCamera(57, 1, 0.1, 150);
  scene.add(new THREE.HemisphereLight(0xfff5dc, 0x6f8c61, 2.6));
  const sun = new THREE.DirectionalLight(0xfff1d3, 2.6);
  sun.position.set(-15, 28, 13);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, {
    left: -32,
    right: 32,
    top: 32,
    bottom: -32,
    far: 80,
  });
  sun.shadow.bias = -0.001;
  sun.shadow.normalBias = 0.08;
  scene.add(sun);
  const map = createMap(scene);
  const cameraObstacles = map.children.filter(
    (object) => object.isMesh && !object.isInstancedMesh,
  );
  const cameraRay = new THREE.Raycaster();
  const cameraDirection = new THREE.Vector3();
  const avatars = new Map();
  let roster = {},
    ownKey = "",
    previous = 0,
    labelFrame = 0,
    stopped = false;
  let dragging = null,
    firstFrame = true;
  const target = new THREE.Vector3(),
    desired = new THREE.Vector3(),
    projected = new THREE.Vector3();
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  function ensure(key, player) {
    const signature = `${player.level}:${player.streak}`;
    let item = avatars.get(key);
    if (item && item.signature !== signature) {
      removeAvatar(key);
      item = null;
    }
    if (!item) {
      const avatar = createAvatar(player.level, player.streak);
      avatar.root.position.set(player.x, 0, player.z);
      avatar.root.rotation.y = player.yaw;
      scene.add(avatar.root);
      const label = document.createElement("div");
      label.className = "field-label";
      const bubble = document.createElement("span");
      bubble.className = "field-bubble";
      bubble.hidden = true;
      const name = document.createElement("span");
      name.className = "field-nickname";
      label.append(bubble, name);
      labelsHost.appendChild(label);
      item = { avatar, label, bubble, name, signature };
      avatars.set(key, item);
    }
    item.name.textContent = player.name;
    item.label.classList.toggle("is-self", key === "self");
    return item;
  }
  function removeAvatar(key) {
    const item = avatars.get(key);
    if (!item) return;
    scene.remove(item.avatar.root);
    item.avatar.dispose();
    item.label.remove();
    avatars.delete(key);
  }
  const canvas = renderer.domElement;
  const down = (event) => {
    if (dragging || (event.pointerType === "mouse" && event.button !== 0))
      return;
    dragging = { id: event.pointerId, x: event.clientX, y: event.clientY };
    canvas.setPointerCapture(event.pointerId);
  };
  const move = (event) => {
    if (dragging?.id !== event.pointerId) return;
    controls.cameraYaw -= (event.clientX - dragging.x) * 0.006;
    controls.cameraPitch = clamp(
      controls.cameraPitch + (event.clientY - dragging.y) * 0.004,
      0.16,
      0.95,
    );
    dragging.x = event.clientX;
    dragging.y = event.clientY;
  };
  const up = (event) => {
    if (dragging?.id === event.pointerId) dragging = null;
  };
  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", up);
  canvas.addEventListener("lostpointercapture", up);
  const loseContext = (event) => {
    event.preventDefault();
    onError("3D 화면이 중단됐어요. 나갔다가 다시 입장해 주세요.");
  };
  canvas.addEventListener("webglcontextlost", loseContext);
  let width = 1,
    height = 1;
  const resize = new ResizeObserver(() => {
    width = host.clientWidth;
    height = host.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  });
  resize.observe(host);
  renderer.setAnimationLoop((ms) => {
    if (stopped || document.hidden || ms - previous < 30) return;
    const delta = previous ? Math.min((ms - previous) / 1000, 0.05) : 0;
    previous = ms;
    const input = controls.typing
      ? { x: 0, y: 0 }
      : {
          x:
            controls.joystick.x +
            Number(
              controls.keys.has("KeyD") || controls.keys.has("ArrowRight"),
            ) -
            Number(controls.keys.has("KeyA") || controls.keys.has("ArrowLeft")),
          y:
            controls.joystick.y +
            Number(
              controls.keys.has("KeyS") || controls.keys.has("ArrowDown"),
            ) -
            Number(controls.keys.has("KeyW") || controls.keys.has("ArrowUp")),
        };
    const before = controls.player.action;
    controls.player = movePlayer(
      controls.player,
      input,
      controls.cameraYaw,
      controls.running,
      delta,
    );
    if (before !== controls.player.action) onAction(controls.player.action);
    const self = ensure("self", controls.player);
    self.avatar.root.position.set(controls.player.x, 0, controls.player.z);
    self.avatar.root.rotation.y = shortestAngle(
      self.avatar.root.rotation.y,
      controls.player.yaw,
      1 - Math.exp(-delta * 15),
    );
    self.avatar.update(
      controls.player.action,
      ms * 0.001,
      reducedMotion.matches,
    );
    self.avatar.cameraTarget(target);
    const distance = Math.max(
      width < 600 ? 6.3 : 7.1,
      self.avatar.height * 1.7,
    );
    desired.set(
      target.x +
        Math.sin(controls.cameraYaw) *
          Math.cos(controls.cameraPitch) *
          distance,
      target.y + Math.sin(controls.cameraPitch) * distance,
      target.z +
        Math.cos(controls.cameraYaw) *
          Math.cos(controls.cameraPitch) *
          distance,
    );
    // Keep a low camera orbit above the ground.
    desired.y = Math.max(2.4, desired.y);
    cameraDirection.copy(desired).sub(target);
    cameraRay.set(target, cameraDirection.clone().normalize());
    cameraRay.far = cameraDirection.length();
    const obstacle = cameraRay.intersectObjects(cameraObstacles, false)[0];
    if (obstacle)
      desired
        .copy(target)
        .addScaledVector(
          cameraRay.ray.direction,
          Math.max(1.15, obstacle.distance - 0.3),
        );
    if (firstFrame || reducedMotion.matches || obstacle)
      camera.position.copy(desired);
    else camera.position.lerp(desired, 1 - Math.exp(-delta * 14));
    firstFrame = false;
    camera.lookAt(target);
    camera.updateMatrixWorld();
    const now = controls.now();
    if (controls.player.chat && now - controls.player.chatAt > CHAT_DURATION)
      controls.player.chat = "";
    for (const [key, player] of Object.entries(roster)) {
      if (key === ownKey || now - player.updatedAt > 45000) continue;
      const item = ensure(key, player);
      item.avatar.root.position.lerp(
        new THREE.Vector3(player.x, 0, player.z),
        1 - Math.exp(-delta * 12),
      );
      item.avatar.root.rotation.y = shortestAngle(
        item.avatar.root.rotation.y,
        player.yaw,
        1 - Math.exp(-delta * 12),
      );
    }
    for (const [key, item] of avatars) {
      const player = key === "self" ? controls.player : roster[key];
      if (
        !player ||
        (key !== "self" && (key === ownKey || now - player.updatedAt > 45000))
      ) {
        removeAvatar(key);
        continue;
      }
      if (key !== "self")
        item.avatar.update(player.action, ms * 0.001, reducedMotion.matches);
      if (ms - labelFrame >= 60) {
        item.avatar.labelPosition(projected);
        projected.project(camera);
        const opacity = playerLabelOpacity(
          controls.player,
          player,
          key === "self",
        );
        const visible =
          opacity > 0 &&
          projected.z > -1 &&
          projected.z < 1 &&
          Math.abs(projected.x) < 1.15 &&
          Math.abs(projected.y) < 1.2;
        item.label.hidden = !visible;
        item.label.style.opacity = opacity;
        if (visible)
          item.label.style.transform = `translate(-50%, -100%) translate(${((projected.x + 1) * width) / 2}px, ${((1 - projected.y) * height) / 2}px)`;
        item.bubble.textContent = player.chat;
        item.bubble.hidden =
          !player.chat ||
          now - player.chatAt > CHAT_DURATION ||
          player.chatAt > now + 15000;
      }
    }
    if (ms - labelFrame >= 60) {
      labelFrame = ms;
      canvas.dataset.x = controls.player.x.toFixed(3);
      canvas.dataset.z = controls.player.z.toFixed(3);
      canvas.dataset.action = controls.player.action;
      canvas.dataset.yaw = controls.cameraYaw.toFixed(3);
    }
    renderer.render(scene, camera);
    onFrame(controls.player);
  });
  return {
    setPlayers: (players, key) => {
      roster = players;
      ownKey = key;
    },
    dispose: () => {
      stopped = true;
      renderer.setAnimationLoop(null);
      resize.disconnect();
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      canvas.removeEventListener("lostpointercapture", up);
      canvas.removeEventListener("webglcontextlost", loseContext);
      for (const key of avatars.keys()) removeAvatar(key);
      sun.shadow.dispose();
      scene.traverse((object) => {
        if (object.material?.map) object.material.map.dispose();
      });
      disposeGroup(scene);
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
