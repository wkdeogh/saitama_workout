import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

export default function Character({ stage = 0, level = 1, celebrate = false }) {
  const mount = useRef(null);
  const [fallback, setFallback] = useState(false);
  useEffect(() => {
    const host = mount.current;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "low-power",
      });
    } catch {
      setFallback(true);
      return;
    }
    setFallback(false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 100);
    camera.position.set(0, 2.9, 9.3);
    camera.lookAt(0, 1.8, 0);
    scene.add(new THREE.HemisphereLight(0xfff8e8, 0xa8876e, 2.2));
    const light = new THREE.DirectionalLight(0xffffff, 2.8);
    light.position.set(-3, 7, 5);
    light.castShadow = true;
    light.shadow.mapSize.set(1024, 1024);
    scene.add(light);
    const rim = new THREE.DirectionalLight(0xffbf71, 2);
    rim.position.set(3, 4, -3);
    scene.add(rim);
    const skin = new THREE.MeshStandardMaterial({
      color: 0xf2bf90,
      roughness: 0.52,
    });
    const skinLight = new THREE.MeshStandardMaterial({
      color: 0xf7c79e,
      roughness: 0.55,
    });
    const pants = new THREE.MeshStandardMaterial({
      color: stage >= 5 ? 0x7661a9 : 0xe2633e,
      roughness: 0.8,
    });
    const cream = new THREE.MeshStandardMaterial({
      color: 0xffeed4,
      roughness: 0.8,
    });
    const dark = new THREE.MeshStandardMaterial({
      color: 0x3e302c,
      roughness: 0.75,
    });
    const white = new THREE.MeshStandardMaterial({ color: 0xfff9ed });
    const hero = new THREE.Group();
    scene.add(hero);
    const sphere = (parent, mat, x, y, z, sx, sy, sz) => {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), mat);
      mesh.position.set(x, y, z);
      mesh.scale.set(sx, sy, sz);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const muscle = ((level - 1) / 199) * 0.48;
    sphere(
      hero,
      skin,
      0,
      1.64,
      0,
      0.42 + muscle * 0.58,
      0.62,
      0.29 + muscle * 0.12,
    );
    if (level >= 2)
      for (const side of [-1, 1])
        sphere(
          hero,
          skinLight,
          side * (0.19 + muscle * 0.45),
          1.99,
          0.25 + muscle * 0.13,
          0.23 + muscle * 0.4,
          0.2 + muscle * 0.15,
          0.035 + muscle * 0.35,
        );
    if (level >= 10)
      for (let i = 0; i < 3; i++)
        for (const side of [-1, 1])
          sphere(
            hero,
            skinLight,
            side * 0.13,
            1.77 - i * 0.17,
            0.3 + muscle * 0.15,
            0.119,
            0.087,
            0.008 + muscle * 0.16,
          );
    sphere(hero, pants, 0, 1.18, 0.025, 0.405 + muscle * 0.22, 0.26, 0.285);
    const belt = new THREE.Mesh(
      new THREE.CylinderGeometry(
        0.41 + muscle * 0.22,
        0.41 + muscle * 0.22,
        0.105,
        48,
      ),
      cream,
    );
    belt.position.set(0, 1.31, 0.025);
    belt.scale.z = 0.69;
    hero.add(belt);
    for (const side of [-1, 1]) {
      const leg = new THREE.Group();
      leg.position.set(side * 0.235, 1.1, 0);
      leg.rotation.z = side * 0.08;
      hero.add(leg);
      sphere(leg, skin, 0, -0.28, 0, 0.165 + muscle * 0.33, 0.35, 0.19);
      sphere(leg, skinLight, 0, -0.59, 0.035, 0.13 + muscle * 0.2, 0.23, 0.15);
      sphere(leg, skin, side * 0.01, -0.79, 0.14, 0.19, 0.115, 0.29);
      const arm = new THREE.Group();
      arm.position.set(side * (0.42 + muscle * 0.72), 2.1, 0);
      arm.rotation.z = side * 0.22;
      hero.add(arm);
      sphere(
        arm,
        skin,
        side * 0.09,
        -0.16,
        0,
        0.17 + muscle * 0.65,
        0.265,
        0.18 + muscle * 0.45,
      );
      sphere(
        arm,
        skinLight,
        side * 0.16,
        -0.46,
        0.045,
        0.135 + muscle * 0.35,
        0.23,
        0.15 + muscle * 0.2,
      );
      sphere(
        arm,
        skin,
        side * 0.18,
        -0.65,
        0.085,
        0.16 + muscle * 0.2,
        0.18,
        0.17,
      );
      for (let finger = 0; finger < 3; finger++)
        sphere(
          arm,
          skinLight,
          side * 0.18 + (finger - 1) * 0.066,
          -0.72,
          0.205,
          0.035,
          0.051,
          0.025,
        );
    }
    sphere(hero, skin, 0, 2.25, 0, 0.19, 0.22, 0.19);
    const head = new THREE.Group();
    head.position.y = 2.88;
    hero.add(head);
    sphere(head, skinLight, 0, 0, 0, 0.64, 0.69, 0.55);
    for (const side of [-1, 1]) {
      sphere(head, skin, side * 0.625, -0.12, 0, 0.11, 0.17, 0.09);
      sphere(head, white, side * 0.225, -0.12, 0.495, 0.145, 0.104, 0.046);
      sphere(head, dark, side * 0.225, -0.13, 0.534, 0.038, 0.054, 0.019);
      const brow = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.018, 0.19, 4, 8),
        dark,
      );
      brow.position.set(side * 0.235, 0.035, 0.52);
      brow.rotation.z = Math.PI / 2 + side * (stage >= 2 ? 0.16 : 0);
      head.add(brow);
    }
    sphere(head, skin, -0.018, -0.23, 0.557, 0.062, 0.065, 0.055);
    const mouth = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.013, 0.105, 4, 8),
      dark,
    );
    mouth.position.set(0, -0.39, 0.47);
    mouth.rotation.z = Math.PI / 2;
    head.add(mouth);
    sphere(
      head,
      new THREE.MeshStandardMaterial({
        color: 0xffdab1,
        transparent: true,
        opacity: 0.5,
      }),
      -0.22,
      0.36,
      0.449,
      0.16,
      0.09,
      0.025,
    );
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.18, 0.16, 64),
      new THREE.MeshStandardMaterial({ color: 0xe7d9b9, roughness: 0.85 }),
    );
    pedestal.position.y = 0.13;
    pedestal.receiveShadow = true;
    scene.add(pedestal);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.12, 0.014, 8, 80),
      new THREE.MeshStandardMaterial({ color: 0xc4b590 }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.22;
    scene.add(ring);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 30),
      new THREE.ShadowMaterial({ opacity: 0.12 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.position.y = 0.035;
    scene.add(floor);
    const aura = new THREE.Group();
    scene.add(aura);
    if (stage >= 3) {
      for (let i = 0; i < 16; i++) {
        const angle = (i / 16) * Math.PI * 2;
        const mat = new THREE.MeshBasicMaterial({
          color: stage >= 5 ? 0xc5a2ff : 0xffc65b,
          transparent: true,
          opacity: 0.11,
          depthWrite: false,
          side: THREE.DoubleSide,
        });
        const ray = new THREE.Mesh(
          new THREE.ConeGeometry(0.22, 0.8 + (i % 4) * 0.38, 5),
          mat,
        );
        ray.position.set(
          Math.cos(angle) * 1.05,
          1.8 + Math.sin(angle) * 1.1,
          -0.45,
        );
        ray.rotation.z = -angle + Math.PI / 2;
        aura.add(ray);
      }
      for (let i = 0; i < 26; i++) {
        const p = sphere(
          aura,
          new THREE.MeshBasicMaterial({
            color: stage >= 5 ? 0xb09aff : 0xffb229,
          }),
          Math.sin(i * 3) * 1.15,
          0.4 + (i % 9) * 0.36,
          Math.cos(i * 3) * 0.5,
          0.021,
          0.045,
          0.021,
        );
        p.userData.offset = i;
      }
    }
    const flames = [];
    if (stage >= 4)
      for (const side of [-1, 1])
        for (let i = 0; i < 3; i++) {
          const flame = new THREE.Mesh(
            new THREE.ConeGeometry(0.07 - i * 0.015, 0.28 + i * 0.06, 7),
            new THREE.MeshBasicMaterial({
              color: i === 2 ? 0xfff1a0 : i === 1 ? 0xffa528 : 0xf65a2e,
              transparent: true,
              opacity: 0.9,
            }),
          );
          flame.position.set(
            side * 0.225 + (i - 1) * 0.03,
            -0.05,
            0.56 + i * 0.017,
          );
          flame.rotation.z = -side * 0.2;
          head.add(flame);
          flames.push(flame);
        }
    let dragging = false,
      startX = 0,
      rotation = -0.16,
      visible = true;
    const down = (e) => {
      dragging = true;
      startX = e.clientX;
      host.setPointerCapture?.(e.pointerId);
    };
    const move = (e) => {
      if (dragging) {
        rotation += (e.clientX - startX) * 0.012;
        startX = e.clientX;
      }
    };
    const up = () => {
      dragging = false;
    };
    host.addEventListener("pointerdown", down);
    host.addEventListener("pointermove", move);
    host.addEventListener("pointerup", up);
    host.addEventListener("pointercancel", up);
    const resize = new ResizeObserver(() => {
      const { width, height } = host.getBoundingClientRect();
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    });
    resize.observe(host);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    observer.observe(host);
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let last = 0;
    renderer.setAnimationLoop((time) => {
      if (document.hidden || !visible || time - last < 32) return;
      last = time;
      const t = time * 0.001;
      hero.rotation.y = rotation + (reduced ? 0 : Math.sin(t * 0.7) * 0.075);
      hero.position.y = reduced ? 0 : Math.sin(t * 2) * 0.018;
      if (celebrate && !reduced)
        hero.position.y += Math.abs(Math.sin(t * 5)) * 0.14;
      aura.rotation.y = reduced ? 0 : Math.sin(t * 0.6) * 0.1;
      aura.children.forEach((p, i) => {
        if (i >= 16 && !reduced)
          p.position.y = 0.5 + ((t * 0.35 + i * 0.17) % 3);
      });
      flames.forEach((f, i) => {
        f.scale.y = reduced ? 1 : 1 + Math.sin(t * 10 + i) * 0.2;
      });
      renderer.render(scene, camera);
    });
    return () => {
      renderer.setAnimationLoop(null);
      resize.disconnect();
      observer.disconnect();
      host.removeEventListener("pointerdown", down);
      host.removeEventListener("pointermove", move);
      host.removeEventListener("pointerup", up);
      host.removeEventListener("pointercancel", up);
      scene.traverse((o) => {
        o.geometry?.dispose();
        if (o.material) {
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
            m.dispose(),
          );
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [stage, level, celebrate]);
  return (
    <div
      ref={mount}
      className="character-canvas"
      role="img"
      aria-label={`${level}레벨, 성장 ${stage + 1}단계, 빤쓰를 입은 빡빡이 3D 캐릭터. 좌우로 드래그하면 회전해요.`}
    >
      {fallback && (
        <div className={`fallback-character stage-${stage}`}>
          <div className="fallback-head">
            <span>• •</span>
            <small>―</small>
          </div>
          <div className="fallback-body" />
          <div className="fallback-pants" />
          <div className="fallback-legs" />
          <p>3D를 지원하지 않아 기본 캐릭터로 표시해요.</p>
        </div>
      )}
    </div>
  );
}
