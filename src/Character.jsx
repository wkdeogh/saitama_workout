import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { characterAppearance } from "./characterAppearance";

function disposeGroup(group) {
  const geometries = new Set(),
    materials = new Set();
  group.traverse((node) => {
    if (node.geometry) geometries.add(node.geometry);
    if (node.material)
      (Array.isArray(node.material) ? node.material : [node.material]).forEach(
        (m) => materials.add(m),
      );
  });
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
}

function createFigure(p) {
  const root = new THREE.Group();
  const geometry = new THREE.SphereGeometry(1, 28, 20);
  const skin = new THREE.MeshStandardMaterial({
    color: 0xeab68a,
    roughness: 0.57,
  });
  const skinLight = new THREE.MeshStandardMaterial({
    color: 0xf0c298,
    roughness: 0.52,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: 0x342920,
    roughness: 0.8,
  });
  const white = new THREE.MeshStandardMaterial({ color: 0xfffaf0 });
  const red = new THREE.MeshStandardMaterial({
    color: 0xd62e25,
    roughness: 0.7,
  });
  const orange = new THREE.MeshStandardMaterial({
    color: 0xf36b0b,
    roughness: 0.78,
  });
  const navy = new THREE.MeshStandardMaterial({
    color: 0x143f85,
    roughness: 0.75,
  });
  const hairMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x161b27).lerp(
      new THREE.Color(0xffd12b),
      p.hairGold,
    ),
    roughness: 0.4,
    metalness: p.golden ? 0.2 : 0,
    emissive: 0xffbc14,
    emissiveIntensity: p.hairGold * 0.22,
  });
  const sphere = (parent, material, pos, scale) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...pos);
    mesh.scale.set(...scale);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const limb = (from, to, radius, material = skin) => {
    const a = new THREE.Vector3(...from),
      b = new THREE.Vector3(...to),
      delta = b.clone().sub(a);
    const mesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(
        radius,
        Math.max(0.01, delta.length() - radius * 2),
        6,
        16,
      ),
      material,
    );
    mesh.position.copy(a.add(b).multiplyScalar(0.5));
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      delta.normalize(),
    );
    mesh.castShadow = true;
    root.add(mesh);
    return mesh;
  };
  const g = p.growth,
    waist = p.waist,
    chest = p.shoulder;
  // A tapered torso keeps high-level shoulders broad without turning the waist into a sphere.
  const outline = [
    [0, 1.22],
    [waist * 0.7, 1.23],
    [waist, 1.31],
    [waist * 1.04, 1.48],
    [waist + (chest - waist) * 0.45, 1.73],
    [chest * 0.94, 1.96],
    [chest, 2.04],
    [chest * 0.76, 2.15],
    [0.08 + g * 0.1, 2.22],
    [0, 2.23],
  ];
  const torso = new THREE.Mesh(
    new THREE.LatheGeometry(
      outline.map(([x, y]) => new THREE.Vector2(x, y)),
      40,
    ),
    skin,
  );
  torso.scale.z = 0.62;
  torso.castShadow = true;
  torso.receiveShadow = true;
  root.add(torso);
  if (p.chest > 0)
    for (const side of [-1, 1]) {
      sphere(
        root,
        skinLight,
        [side * chest * 0.47, 1.98, chest * 0.49],
        [chest * 0.51, 0.12 + 0.1 * p.chest, 0.01 + 0.16 * p.chest],
      );
    }
  if (p.abs > 0)
    for (let row = 0; row < 3; row++)
      for (const side of [-1, 1]) {
        const y = 1.76 - row * 0.16;
        const depth =
          (waist +
            (chest - waist) * (row === 0 ? 0.5 : row === 1 ? 0.25 : 0.05)) *
          0.62;
        sphere(
          root,
          skinLight,
          [side * (0.062 + g * 0.068), y, depth],
          [0.054 + g * 0.071, 0.064 + 0.019 * g, 0.008 + 0.06 * p.abs],
        );
      }
  if (p.back > 0)
    for (const side of [-1, 1]) {
      sphere(
        root,
        skin,
        [side * (0.17 + 0.12 * g), 2.1, -0.045],
        [0.09 + 0.18 * p.back, 0.075 + 0.08 * p.back, 0.12 + 0.04 * g],
      );
      sphere(
        root,
        skin,
        [side * chest * 0.46, 1.91, -chest * 0.45],
        [chest * 0.43, 0.23, 0.04 + 0.1 * p.back],
      );
    }
  const hip = waist * 1.12;
  sphere(
    root,
    p.shorts ? (p.pants ? orange : navy) : red,
    [0, 1.2, 0],
    [hip, 0.225, 0.145 + 0.13 * g],
  );
  const belt = new THREE.Mesh(
    new THREE.CylinderGeometry(hip, hip, 0.06, 40),
    p.sash ? navy : white,
  );
  belt.scale.z = (0.145 + 0.13 * g) / hip;
  belt.position.y = 1.34;
  root.add(belt);
  const fists = [];
  for (const side of [-1, 1]) {
    const shoulder = [side * (chest * 0.96), 2.04, 0];
    const elbow = [side * (chest + 0.08 + 0.1 * g), 1.67, 0.005];
    const hand = [side * (chest + 0.1 + 0.18 * g), 1.29, 0.14 * g];
    limb(shoulder, elbow, p.arm);
    limb(elbow, hand, p.arm * 0.8);
    if (g > 0.015)
      sphere(root, skinLight, shoulder, [
        0.066 + 0.21 * g,
        0.105 + 0.13 * g,
        0.068 + 0.19 * g,
      ]);
    sphere(root, skin, hand, [
      0.08 + 0.11 * g,
      0.11 + 0.07 * g,
      0.085 + 0.08 * g,
    ]);
    if (p.level >= 30)
      for (let finger = 0; finger < 3; finger++) {
        sphere(
          root,
          skinLight,
          [
            hand[0] + (finger - 1) * (0.035 + g * 0.012),
            hand[1] - 0.045,
            hand[2] + 0.075 + 0.08 * g,
          ],
          [0.024, 0.045, 0.024],
        );
      }
    const hipJoint = [side * (0.09 + 0.105 * g), 1.12, 0];
    const knee = [side * (0.12 + 0.14 * g), 0.67, 0.025];
    const ankle = [side * (0.12 + 0.2 * g), 0.31, 0];
    limb(hipJoint, knee, 0.064 + 0.15 * g);
    limb(knee, ankle, 0.046 + 0.12 * g);
    sphere(
      root,
      skin,
      [ankle[0], 0.285, 0.1],
      [0.09 + 0.08 * g, 0.075 + 0.025 * g, 0.15 + 0.11 * g],
    );
    if (p.wraps)
      limb(
        [hand[0] - side * 0.025, hand[1] + 0.1, hand[2] * 0.8],
        [hand[0] - side * 0.05, hand[1] + 0.22, hand[2] * 0.5],
        p.arm * 0.84,
        navy,
      );
    if (p.shorts)
      limb(hipJoint, knee, 0.082 + 0.17 * g, p.pants ? orange : navy);
    if (p.pants) {
      limb(knee, [ankle[0], 0.45, 0], 0.065 + 0.15 * g, orange);
      limb([ankle[0], 0.51, 0], ankle, 0.058 + 0.13 * g, navy);
      sphere(
        root,
        navy,
        [ankle[0], 0.285, 0.12],
        [0.12 + 0.08 * g, 0.105, 0.18 + 0.11 * g],
      );
      sphere(
        root,
        orange,
        [ankle[0], 0.49, 0],
        [0.065 + 0.14 * g, 0.035, 0.065 + 0.14 * g],
      );
    }
    if (p.fists) {
      const glow = new THREE.Mesh(
        geometry,
        new THREE.MeshBasicMaterial({
          color: p.auraEdge,
          transparent: true,
          opacity: 0.14,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      glow.position.set(...hand);
      glow.scale.setScalar(0.27);
      root.add(glow);
      fists.push(glow);
      const cuff = new THREE.Mesh(
        new THREE.TorusGeometry(0.23, 0.014, 6, 36),
        new THREE.MeshBasicMaterial({ color: p.auraColor }),
      );
      cuff.position.set(...hand);
      cuff.rotation.x = 0.5;
      root.add(cuff);
      fists.push(cuff);
    }
  }
  if (p.vest) {
    const vest = new THREE.Mesh(torso.geometry.clone(), orange);
    vest.scale.set(1.055, 1, 0.75);
    vest.castShadow = true;
    root.add(vest);
    // Blue undershirt and overlapping lapels read as a martial arts gi from the front.
    const bib = new THREE.Shape();
    bib.moveTo(-chest * 0.62, 2.15);
    bib.lineTo(chest * 0.62, 2.15);
    bib.lineTo(0, 1.61);
    bib.closePath();
    const undershirt = new THREE.Mesh(new THREE.ShapeGeometry(bib), navy);
    undershirt.position.z = chest * 0.72;
    root.add(undershirt);
    for (const side of [-1, 1]) {
      limb(
        [side * chest * 0.65, 2.16, chest * 0.72],
        [0, 1.59, chest * 0.72],
        0.045,
        orange,
      );
    }
  }
  if (p.sash) {
    const sash = new THREE.Mesh(
      new THREE.CylinderGeometry(waist * 1.16, waist * 1.16, 0.14, 32),
      navy,
    );
    sash.scale.z = 0.8;
    sash.position.y = 1.4;
    root.add(sash);
    sphere(root, navy, [0.13, 1.4, waist * 0.91], [0.13, 0.1, 0.08]);
    for (const side of [-1, 1]) {
      const tail = new THREE.Mesh(
        new THREE.BoxGeometry(0.09, 0.35, 0.045),
        navy,
      );
      tail.position.set(0.13 + side * 0.075, 1.2, waist * 0.96);
      tail.rotation.z = side * 0.25;
      root.add(tail);
    }
  }
  sphere(root, skin, [0, 2.23, 0], [0.085 + 0.095 * g, 0.19, 0.09 + 0.09 * g]);
  const head = new THREE.Group();
  head.position.set(0, 2.84, 0);
  root.add(head);
  const headWidth = 0.6 + 0.04 * g;
  sphere(head, skinLight, [0, 0, 0], [headWidth, 0.69, 0.55]);
  if (p.hair > 0) {
    if (p.level >= 250) {
      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.47),
        hairMaterial,
      );
      cap.scale.set(headWidth * 1.035, 0.72, 0.57);
      head.add(cap);
    }
    const spike = (base, tip, width) => {
      const start = new THREE.Vector3(...base),
        end = new THREE.Vector3(...tip);
      const direction = end.clone().sub(start);
      const mesh = new THREE.Mesh(
        new THREE.ConeGeometry(width, direction.length(), 5),
        hairMaterial,
      );
      mesh.position.copy(start.add(end).multiplyScalar(0.5));
      mesh.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction.normalize(),
      );
      mesh.castShadow = true;
      head.add(mesh);
    };
    const h = p.hair;
    // A crown of swept angular locks grows continuously at each level.
    for (let i = -3; i <= 3; i++) {
      const x = i * 0.16;
      spike(
        [x * h, 0.58 - Math.abs(i) * 0.06, 0.03],
        [x * (0.3 + h * 1.7), 0.66 + h * (1.02 - Math.abs(i) * 0.14), -0.04],
        0.045 + h * 0.19,
      );
    }
    if (p.level >= 250)
      for (const side of [-1, 1]) {
        spike(
          [side * 0.47, 0.34, -0.17],
          [side * (0.58 + h * 0.35), 0.53 + h * 0.56, -0.23],
          0.17 + h * 0.06,
        );
        spike([side * 0.25, 0.57, 0.38], [side * 0.12, 0.18, 0.55], 0.13);
      }
  }
  const eyeGlow = new THREE.MeshBasicMaterial({
    color: p.hairGold > 0 ? 0x3fffe0 : 0xffec90,
  });
  for (const side of [-1, 1]) {
    sphere(head, skin, [side * headWidth, -0.12, 0], [0.085, 0.135, 0.075]);
    sphere(
      head,
      white,
      [side * 0.225, -0.12, 0.49],
      [0.145, 0.1 - g * 0.025, 0.047],
    );
    sphere(
      head,
      p.eyes ? eyeGlow : dark,
      [side * 0.225, -0.13, 0.533],
      [p.eyes ? 0.07 : 0.032, 0.045, 0.019],
    );
    const brow = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.016, 0.19, 4, 8),
      p.hairGold > 0 ? hairMaterial : dark,
    );
    brow.position.set(side * 0.235, 0.015, 0.524);
    brow.rotation.z = Math.PI / 2 + side * (-0.22 + g * 0.55);
    head.add(brow);
  }
  sphere(head, skin, [0, -0.24, 0.55], [0.045, 0.058, 0.043]);
  const mouth = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.012, 0.075, 4, 8),
    dark,
  );
  mouth.position.set(0, -0.39, 0.47);
  mouth.rotation.z = Math.PI / 2;
  head.add(mouth);
  const eyeFlames = [];
  if (p.eyes && !p.hairGold)
    for (const side of [-1, 1])
      for (let layer = 0; layer < 3; layer++) {
        const shape = new THREE.Shape();
        shape.moveTo(-0.11, 0);
        shape.bezierCurveTo(-0.22, 0.18, -0.08, 0.36, -0.1, 0.57);
        shape.bezierCurveTo(0.14, 0.37, 0.01, 0.26, 0.14, 0.19);
        shape.bezierCurveTo(0.2, 0.05, 0.04, -0.08, -0.11, 0);
        const flame = new THREE.Mesh(
          new THREE.ShapeGeometry(shape, 14),
          new THREE.MeshBasicMaterial({
            color: [0xf33b0b, 0xffb817, 0xfff5be][layer],
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.92,
            depthWrite: false,
          }),
        );
        flame.position.set(side * 0.225, -0.13, 0.58 + layer * 0.014);
        flame.scale.setScalar(1 - layer * 0.24);
        flame.rotation.z = -side * 0.19;
        head.add(flame);
        eyeFlames.push({ mesh: flame, scale: 1 - layer * 0.24 });
      }
  root.scale.setScalar(p.height);
  // Feet remain on the platform while the whole silhouette grows from 64% to 100% height.
  const floorOffset = 0.21 * (1 - p.height);
  root.position.y = floorOffset;
  return { root, floorOffset, eyeFlames, fists };
}

const auraVertex = `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
const auraFragment = `
  varying vec2 vUv;
  uniform float time; uniform float power; uniform vec3 tint; uniform vec3 edge;
  void main(){
    float y=vUv.y; float x=vUv.x*2.0-1.0;
    float warp=sin(y*20.0-time*2.3)*.025+sin(y*37.0-time*3.1)*.015;
    float w=(.36+.31*sin(y*3.14159))*(1.0-smoothstep(.72,1.0,y));
    w+=sin(y*31.0-time*1.8)*.025;
    float d=abs(x+warp);
    float outer=1.0-smoothstep(w-.025,w+.09,d);
    float inner=1.0-smoothstep(w-.22,w-.08,d);
    float shell=max(0.0,outer-inner*.83);
    float tongues=.8+.2*sin(x*36.0+y*16.0-time*3.0);
    float alpha=shell*smoothstep(0.0,.08,y)*(1.0-smoothstep(.91,1.0,y))*tongues;
    vec3 color=mix(tint,edge,smoothstep(w-.16,w,d));
    gl_FragColor=vec4(color,alpha*(.65+power*.28));
  }`;
function createEnergy(p) {
  const root = new THREE.Group(),
    rings = [],
    bolts = [];
  let flame = null,
    particles = null;
  if (!p.aura) return { root, rings, bolts, flame, particles };
  const uniforms = {
    time: { value: 0 },
    power: { value: p.auraPower },
    tint: { value: new THREE.Color(p.auraColor) },
    edge: { value: new THREE.Color(p.auraEdge) },
  };
  flame = new THREE.Mesh(
    new THREE.PlaneGeometry(4.6 + p.hair * 0.7, 4.2 + p.hair * 1.6),
    new THREE.ShaderMaterial({
      uniforms,
      vertexShader: auraVertex,
      fragmentShader: auraFragment,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    }),
  );
  flame.position.set(0, 2.1 + p.hair * 0.6, -0.56);
  root.add(flame);
  const count = 40 + Math.round(p.growth * 48),
    positions = new Float32Array(count * 3);
  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const particleMat = new THREE.ShaderMaterial({
    uniforms: { tint: { value: new THREE.Color(p.auraEdge) } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);gl_PointSize=clamp(42.0/-mv.z,2.0,10.0);gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `uniform vec3 tint;void main(){float r=length(gl_PointCoord-.5);float a=1.0-smoothstep(.04,.5,r);gl_FragColor=vec4(tint,a);}`,
  });
  particles = new THREE.Points(particleGeo, particleMat);
  particles.frustumCulled = false;
  root.add(particles);
  for (let i = 0; i < p.rings; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(
        1.08 + i * 0.16,
        0.015 + (p.awakened ? 0.006 : 0),
        6,
        96,
      ),
      new THREE.MeshBasicMaterial({
        color: i % 2 ? p.auraEdge : p.auraColor,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    ring.position.y = 0.75 + i * 0.7;
    ring.rotation.set(1.15, 0, (i % 2 ? 1 : -1) * 0.4);
    root.add(ring);
    rings.push(ring);
  }
  const ground = new THREE.Mesh(
    new THREE.TorusGeometry(1.1, 0.025, 8, 80),
    new THREE.MeshBasicMaterial({ color: p.auraColor }),
  );
  ground.rotation.x = Math.PI / 2;
  ground.position.y = 0.23;
  root.add(ground);
  if (p.lightning)
    for (let i = 0; i < (p.awakened ? 8 : 4); i++) {
      const side = i % 2 ? 1 : -1,
        layer = Math.floor(i / 2);
      const points = Array.from(
        { length: 8 },
        (_, j) =>
          new THREE.Vector3(
            side * (0.95 + layer * 0.09 + Math.sin(j * 2.5 + i) * 0.15),
            0.45 + j * 0.4,
            -0.25 + layer * 0.12,
          ),
      );
      const line = new THREE.Mesh(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.01),
          42,
          0.009,
          4,
          false,
        ),
        new THREE.MeshBasicMaterial({
          color: p.auraEdge,
          transparent: true,
          opacity: 0.85,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      root.add(line);
      bolts.push(line);
    }
  return { root, rings, bolts, flame, particles };
}

export default function Character({ stage = 0, level = 1, celebrate = false }) {
  const mount = useRef(null),
    runtime = useRef(null),
    celebration = useRef(celebrate);
  const [fallback, setFallback] = useState(false);
  useEffect(() => {
    celebration.current = celebrate;
  }, [celebrate]);
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
    camera.lookAt(0, 1.85, 0);
    scene.add(new THREE.HemisphereLight(0xfff5e6, 0x695c70, 2.1));
    const light = new THREE.DirectionalLight(0xffffff, 2.9);
    light.position.set(-3, 6, 5);
    light.castShadow = true;
    light.shadow.mapSize.set(1024, 1024);
    scene.add(light);
    const rim = new THREE.DirectionalLight(0xffcf85, 2);
    rim.position.set(3, 3, -2);
    scene.add(rim);
    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(1.08, 1.16, 0.16, 64),
      new THREE.MeshStandardMaterial({
        color: 0xddd6c6,
        roughness: 0.65,
        metalness: 0.15,
      }),
    );
    platform.position.y = 0.13;
    platform.receiveShadow = true;
    scene.add(platform);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.ShadowMaterial({ opacity: 0.15 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.035;
    floor.receiveShadow = true;
    scene.add(floor);
    const state = {
      scene,
      camera,
      figure: null,
      energy: null,
      rotation: -0.16,
    };
    runtime.current = state;
    let dragging = false,
      startX = 0,
      visible = true,
      last = 0;
    const down = (e) => {
      dragging = true;
      startX = e.clientX;
      host.setPointerCapture?.(e.pointerId);
    };
    const move = (e) => {
      if (dragging) {
        state.rotation += (e.clientX - startX) * 0.012;
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
      if (!width || !height) return;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    });
    resize.observe(host);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    observer.observe(host);
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    renderer.setAnimationLoop((time) => {
      if (document.hidden || !visible || time - last < 32) return;
      last = time;
      const reduced = motion.matches,
        t = reduced ? 0 : time * 0.001,
        figure = state.figure,
        energy = state.energy;
      if (figure) {
        figure.root.rotation.y =
          state.rotation + (reduced ? 0 : Math.sin(t * 0.7) * 0.05);
        figure.root.position.y =
          figure.floorOffset + (reduced ? 0 : Math.sin(t * 1.8) * 0.01);
        if (celebration.current && !reduced)
          figure.root.position.y += Math.abs(Math.sin(t * 4)) * 0.13;
        figure.eyeFlames.forEach(({ mesh, scale }, i) => {
          mesh.scale.y =
            scale * (1 + (reduced ? 0 : Math.sin(t * 5 + i) * 0.12));
        });
        figure.fists.forEach((mesh, i) => {
          if (i % 2) mesh.rotation.z = t * 0.8;
        });
      }
      if (energy) {
        if (energy.flame) energy.flame.material.uniforms.time.value = t;
        energy.rings.forEach((ring, i) => {
          ring.rotation.z = (i % 2 ? -1 : 1) * (0.4 + t * 0.4);
          ring.rotation.y = Math.sin(t * 0.6 + i) * 0.3;
        });
        energy.bolts.forEach((bolt, i) => {
          bolt.material.opacity = 0.5 + Math.sin(t * 2 + i) * 0.25;
        });
        if (energy.particles) {
          const array = energy.particles.geometry.attributes.position.array;
          for (let i = 0; i < array.length / 3; i++) {
            const a = i * 2.399 + t * 0.12;
            const r = 0.85 + (i % 7) * 0.085;
            array[i * 3] = Math.cos(a) * r;
            array[i * 3 + 1] =
              0.3 + ((i * 0.137 + t * (0.23 + (i % 3) * 0.09)) % 3.5);
            array[i * 3 + 2] = Math.sin(a) * 0.65;
          }
          energy.particles.geometry.attributes.position.needsUpdate = true;
        }
      }
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
      disposeGroup(scene);
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
      runtime.current = null;
    };
  }, []);
  useEffect(() => {
    const state = runtime.current;
    if (!state) return;
    const p = characterAppearance(level),
      figure = createFigure(p),
      energy = createEnergy(p);
    state.camera.position.set(0, 2.9 + p.hair * 0.5, 9.3 + p.hair * 1.7);
    state.camera.lookAt(0, 1.85 + p.hair * 0.42, 0);
    state.figure = figure;
    state.energy = energy;
    state.scene.add(figure.root, energy.root);
    return () => {
      state.scene.remove(figure.root, energy.root);
      disposeGroup(figure.root);
      disposeGroup(energy.root);
      if (state.figure === figure) {
        state.figure = null;
        state.energy = null;
      }
    };
  }, [level]);
  return (
    <div
      ref={mount}
      className="character-canvas"
      role="img"
      aria-label={`${level}레벨, 성장 ${stage + 1}단계, ${level >= 850 ? "금발 도복 전사" : level >= 650 ? "도복 전사" : level >= 200 ? "머리카락이 자라는 전사" : "빤쓰를 입은 빡빡이"} 3D 캐릭터. 좌우로 드래그하면 회전해요.`}
    >
      {fallback && (
        <div
          className={`fallback-character stage-${stage}`}
          style={{
            scale: characterAppearance(level).height,
            transformOrigin: "bottom center",
          }}
        >
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
