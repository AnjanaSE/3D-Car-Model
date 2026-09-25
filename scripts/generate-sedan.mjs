#!/usr/bin/env node
/**
 * Generates a stylised compact-sedan GLB with separately named parts, built to
 * roughly the proportions of the Proton Saga. It is a STAND-IN, not a replica:
 * replace public/models/proton-saga.glb with the real model when available.
 *
 *   npm run generate:sedan            # writes public/models/proton-saga.glb
 *
 * How it's built: the lower body is lofted through fixed-topology cross-sections
 * (underbody, wheel well, side, shoulder, top), so wheel arches, panel cuts and
 * shading stay smooth. Doors, bonnet and boot are cut from the same surface by
 * index/length ranges. Lamps, grille and plates are thin patches that follow
 * the body surface. The glasshouse is lofted the same way.
 *
 * Conventions (match the app's vehicle space): metres, ground at y = 0,
 * nose towards +Z, the car's left side towards +X. Right-hand drive.
 *
 * Part names (used by the vehicle data):
 *   Body_Front (incl. bonnet), Body_Rear (incl. boot), Sill, Roof, Windscreen,
 *   Rear_Window, Door_FL/FR/RL/RR (groups, pivot on the hinge), Mirror_L/R,
 *   Headlight_L/R, DRL_L/R, Grille, Grille_Chrome, TailLight_L/R, TailLight_Bar,
 *   Wheel_FL/FR/RL/RR (Tyre_*, Rim_*, RimSpokes_*, Brake_*),
 *   Seat_*, Dashboard, Steering_Wheel, Screen_Infotainment, Screen_Meter.
 */
import { writeFileSync } from "node:fs";
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { readFileSync } from "node:fs";

// Helvetiker Bold from the three.js repo (MAGENTA Ltd. licence, see scripts/fonts/LICENSE).
const FONT = new FontLoader().parse(
  JSON.parse(readFileSync(new URL("./fonts/helvetiker_bold.typeface.json", import.meta.url), "utf8")),
);

// GLTFExporter uses the browser FileReader API.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buffer) => {
      this.result = buffer;
      this.onloadend?.();
    });
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then((buffer) => {
      this.result = `data:${blob.type || "application/octet-stream"};base64,${Buffer.from(buffer).toString("base64")}`;
      this.onloadend?.();
    });
  }
};

// --- Dimensions (metres) ---------------------------------------------------------
const HALF_L = 2.165; // 4.33 m long
const W = 0.845; // half width (1.69 m)
const ROOF = 1.5;
// Proportions measured from Proton's left-side photo, scaled to the 4.33 m length.
const FRONT_AXLE = 1.318;
const REAR_AXLE = -1.21; // wheelbase ≈ 2.53 m
const TYRE_R = 0.292; // 185/55 R15
const TYRE_W = 0.19;
const TRACK = 0.735;
const ARCH_R = 0.36;
const SILL_Y = 0.2;
const BEVEL = 0.1; // rounding of the long edges (shoulder, sill, corners)

const Z_WINDSCREEN = 1.0; // base of the windscreen (long, raked screen)
const Z_ROOF_FRONT = 0.2;
const Z_ROOF_REAR = -1.05;
const Z_ROOF_PEAK = -0.42;
const Z_DECK = -1.72; // base of the fastback rear window
const DOOR_FRONT = [-0.22, 0.82]; // B-pillar → front door leading edge
const DOOR_REAR = [-1.3, -0.22]; // rear door wraps over the rear arch
const GAP = 0.005;

// --- Helpers ------------------------------------------------------------------------
const clamp01 = (t) => Math.min(Math.max(t, 0), 1);
const smooth = (t) => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};
const lerp = (a, b, t) => a + (b - a) * t;

const mat = (name, params) => Object.assign(new THREE.MeshStandardMaterial(params), { name });
const M = {
  paint: mat("Paint", { color: "#125488", metalness: 0.6, roughness: 0.35 }),
  glass: mat("Glass", { color: "#0b1118", metalness: 0.2, roughness: 0.05, transparent: true, opacity: 0.55, side: THREE.DoubleSide }),
  black: mat("Trim_Black", { color: "#0d0e10", roughness: 0.55 }),
  gloss: mat("Trim_Gloss", { color: "#08090b", metalness: 0.3, roughness: 0.15 }),
  chrome: mat("Chrome", { color: "#d9dde2", metalness: 1, roughness: 0.15 }),
  tyre: mat("Tyre", { color: "#121212", roughness: 0.9 }),
  // Machined alloy: satin so it reads bright under the dark showroom (mirror metal turns black).
  rimSilver: mat("Rim_Silver", { color: "#d9dde2", metalness: 0.55, roughness: 0.28 }),
  rimDark: mat("Rim_Dark", { color: "#2a2d31", metalness: 0.6, roughness: 0.4 }),
  brake: mat("Brake", { color: "#3a3c40", metalness: 0.8, roughness: 0.45 }),
  headlight: mat("Headlight", { color: "#262b33", metalness: 0.8, roughness: 0.08 }), // smoked projector units
  drl: mat("DRL", { color: "#f4f8ff", emissive: "#f4f8ff", emissiveIntensity: 0.6 }),
  tail: mat("TailLight", { color: "#a3101a", metalness: 0.2, roughness: 0.15 }),
  // Smoked lamp lenses with the red LEDs showing through.
  tailSmoked: mat("TailLight_Smoked", { color: "#1c0608", metalness: 0.6, roughness: 0.08 }),
  lettering: mat("Lettering", { color: "#eef0f3", metalness: 0.45, roughness: 0.3 }), // satin silver
  intDark: mat("Interior_Dark", { color: "#1b1c1f", roughness: 0.8, side: THREE.DoubleSide }),
  intLight: mat("Interior_Light", { color: "#8a8278", roughness: 0.75 }),
  headliner: mat("Headliner", { color: "#4a4845", roughness: 0.9, side: THREE.DoubleSide }),
  screen: mat("Screen", { color: "#05070a", metalness: 0.3, roughness: 0.1, emissive: "#0d2744", emissiveIntensity: 0.5 }),
};
const mesh = (name, geometry, material) => Object.assign(new THREE.Mesh(geometry, material), { name });

// --- Side profile ----------------------------------------------------------------------
/** Top line of the lower body: bonnet, cowl/beltline, boot deck. */
function top(z) {
  // Bonnet: 1.0 m at the windscreen, falling to 0.82 m, then the nose drops away.
  if (z > 2.0) return lerp(0.82, 0.72, ((z - 2.0) / (HALF_L - 2.0)) ** 1.5);
  if (z > Z_WINDSCREEN) return lerp(1.0, 0.82, smooth((z - Z_WINDSCREEN) / (2.0 - Z_WINDSCREEN)) ** 0.85);
  // Beltline rises towards the rear, as on the Saga.
  if (z > Z_DECK) return lerp(1.1, 0.99, (z - Z_DECK) / (Z_WINDSCREEN - Z_DECK));
  // Short boot deck with a small lip, then the tail drops.
  if (z > -2.05) return lerp(1.12, 1.07, (-z + Z_DECK) / (2.05 + Z_DECK));
  return lerp(1.07, 0.97, ((-z - 2.05) / (HALF_L - 2.05)) ** 1.3);
}
/** Bottom line, lifting at the overhangs. */
function bottom(z) {
  return SILL_Y + 0.03 * smooth((z - 1.8) / (HALF_L - 1.8)) + 0.03 * smooth((-z - 1.75) / (HALF_L - 1.75));
}
// --- Glasshouse (lofted) --------------------------------------------------------------
/** Gently arched roof, highest over the front seats. */
const roofArc = (z) => ROOF - 0.05 * ((z - Z_ROOF_PEAK) / (Z_ROOF_FRONT - Z_ROOF_PEAK)) ** 2;
function roofLine(z) {
  const belt = top(z) - 0.02;
  if (z > Z_ROOF_FRONT) {
    const t = clamp01((Z_WINDSCREEN - z) / (Z_WINDSCREEN - Z_ROOF_FRONT));
    return lerp(belt, roofArc(Z_ROOF_FRONT), 1 - (1 - t) ** 1.5);
  }
  if (z > Z_ROOF_REAR) return roofArc(z);
  const t = clamp01((Z_ROOF_REAR - z) / (Z_ROOF_REAR - Z_DECK));
  return lerp(roofArc(Z_ROOF_REAR), belt, t ** 1.35);
}
const CAB_SIDE = 10;
const CAB_ARC = 8;
const CAB_TOP = 6;
/** Open cross-section of the glasshouse: left belt → over the roof → right belt. */
function cabinSection(z) {
  const base = top(z) - 0.02;
  const R = Math.max(roofLine(z), base + 0.003);
  // From the front photo: windscreen base ≈ ±0.62 m, roof ≈ ±0.5 m; the side
  // glass sits further out along the doors.
  // …and from the rear photo: rear window base ≈ ±0.62 m.
  const front = lerp(W - BEVEL * 0.7, 0.64, smooth((z - 0.55) / (Z_WINDSCREEN - 0.55)));
  const Wb = lerp(front, 0.64, smooth((-z - 1.15) / (-Z_DECK - 1.15)));
  const Wt = 0.6;
  const r = Math.min(0.13, (R - base) * 0.45);
  const left = [];
  for (let i = 0; i < CAB_SIDE; i++) left.push([lerp(Wb, Wt, i / CAB_SIDE), lerp(base, R - r, i / CAB_SIDE)]);
  for (let i = 0; i <= CAB_ARC; i++) {
    const a = (i / CAB_ARC) * (Math.PI / 2);
    left.push([Wt - r + r * Math.cos(a), R - r + r * Math.sin(a)]);
  }
  for (let i = 1; i < CAB_TOP; i++) left.push([lerp(Wt - r, 0, i / CAB_TOP), R]);
  left.push([0, R]);
  return [...left, ...left.slice(0, -1).reverse().map(([x, y]) => [-x, y])];
}
const CAB_N = cabinSection(0).length;
const RANGE = {
  left: [0, CAB_SIDE],
  right: [CAB_N - 1 - CAB_SIDE, CAB_N - 1],
  top: [CAB_SIDE, CAB_N - 1 - CAB_SIDE],
};
const stations = (z0, z1, step = 0.02) => {
  const n = Math.max(1, Math.round(Math.abs(z1 - z0) / step));
  return Array.from({ length: n + 1 }, (_, i) => lerp(z0, z1, i / n));
};
function loft(zs, [i0, i1], offset = 0) {
  const positions = [];
  const indices = [];
  const cols = i1 - i0 + 1;
  for (const z of zs) {
    const ring = cabinSection(z);
    for (let i = i0; i <= i1; i++) positions.push(ring[i][0], ring[i][1] + offset, z);
  }
  for (let s = 0; s < zs.length - 1; s++) {
    for (let c = 0; c < cols - 1; c++) {
      const a = s * cols + c;
      indices.push(a, a + cols, a + 1, a + 1, a + cols, a + cols + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

// --- Lower body (lofted cross-sections) -----------------------------------------------
const END_R = 0.16; // length over which the nose/tail round off
/** 0 at the very tip of the nose/tail, 1 away from it. */
function endFactor(z) {
  const d = Math.max(z - (HALF_L - END_R), -HALF_L + END_R - z, 0);
  return Math.sqrt(Math.max(1 - (d / END_R) ** 2, 0));
}
function planHalfWidth(z) {
  const taper =
    1 - 0.06 * smooth((z - 1.55) / (HALF_L - 1.55)) ** 1.3 - 0.04 * smooth((-z - 1.7) / (HALF_L - 1.7)) ** 1.3;
  return W * taper * lerp(0.86, 1, endFactor(z));
}
/** Side fullness: widest just below the beltline. */
/** Side fullness: widest just below the beltline, with a crisp shoulder line at ~0.87 m. */
const fullness = (y) =>
  1 - 0.05 * Math.min(((y - 0.62) / 0.36) ** 2, 1.4) + 0.009 * Math.exp(-(((y - 0.87) / 0.014) ** 2));
function archY(z) {
  let y = 0;
  for (const az of [FRONT_AXLE, REAR_AXLE]) {
    const dz = Math.abs(z - az);
    if (dz < ARCH_R) y = Math.max(y, TYRE_R + Math.sqrt(ARCH_R * ARCH_R - dz * dz));
  }
  return y;
}

const N_UNDER = 6;
const N_WELL = 4;
const N_CORNER = 6;
const N_SIDE = 16;
const N_TOP = 20; // fine across the top so the bonnet creases stay crisp
/** Fixed-topology ring (left half mirrored): underbody → wheel well → side → top. */
/**
 * Bonnet creases (from Proton's photos): two sharp lines run from the base of
 * the windscreen towards the inner edge of each headlamp, with the centre panel
 * between them slightly raised. Fades out at the windscreen and the nose.
 */
function bonnetRelief(x, z) {
  if (z <= Z_WINDSCREEN) return 0;
  const crease = lerp(0.34, 0.47, clamp01((z - Z_WINDSCREEN) / (HALF_L - Z_WINDSCREEN)));
  const fade = smooth((z - Z_WINDSCREEN) / 0.25) * smooth((HALF_L - 0.06 - z) / 0.22);
  return 0.013 * fade * smooth((crease - Math.abs(x)) / 0.035);
}

function bodySection(z) {
  const e = endFactor(z);
  const Wz = planHalfWidth(z);
  const mid = (bottom(z) + top(z)) / 2;
  const squash = lerp(0.93, 1, e);
  const B = mid + (bottom(z) - mid) * squash;
  const T = mid + (top(z) - mid) * squash;
  const A = Math.max(B, archY(z));
  const xIn = Wz - 0.27;
  const rB = 0.06;
  const rT = Math.min(0.14, (T - A) * 0.3);
  const shoulder = Wz * 0.93;
  const left = [];
  for (let i = 0; i < N_UNDER; i++) left.push([lerp(0, xIn, i / N_UNDER), B]);
  for (let i = 0; i < N_WELL; i++) left.push([xIn, lerp(B, A, i / N_WELL)]);
  for (let i = 0; i < N_WELL; i++) left.push([lerp(xIn, Wz - rB, i / N_WELL), A]);
  for (let i = 0; i <= N_CORNER; i++) {
    const a = -Math.PI / 2 + (i / N_CORNER) * (Math.PI / 2);
    left.push([Wz - rB + rB * Math.cos(a), A + rB + rB * Math.sin(a)]);
  }
  for (let i = 1; i < N_SIDE; i++) {
    const y = lerp(A + rB, T - rT, i / N_SIDE);
    left.push([lerp(Wz, shoulder, (i / N_SIDE) ** 2) * fullness(y), y]);
  }
  for (let i = 0; i <= N_CORNER; i++) {
    const a = (i / N_CORNER) * (Math.PI / 2);
    left.push([shoulder - rT + rT * Math.cos(a), T - rT + rT * Math.sin(a)]);
  }
  for (let i = 1; i < N_TOP; i++) {
    const x = lerp(shoulder - rT, 0, i / N_TOP);
    left.push([x, T + bonnetRelief(x, z)]);
  }
  left.push([0, T + bonnetRelief(0, z)]);
  return [...left, ...left.slice(1, -1).reverse().map(([x, y]) => [-x, y])];
}
const BODY_N = bodySection(0).length;
const iCornerMid = N_UNDER + 2 * N_WELL + Math.floor(N_CORNER / 2);
const iTopCornerMid = N_UNDER + 2 * N_WELL + N_CORNER + 1 + (N_SIDE - 1) + Math.floor(N_CORNER / 2);
const mirror = (i) => (BODY_N - i) % BODY_N;
const SIDE_L = [iCornerMid, iTopCornerMid];
const SIDE_R = [mirror(iTopCornerMid), mirror(iCornerMid)];
const TOP = [iTopCornerMid, mirror(iTopCornerMid)];
const UNDER = [mirror(iCornerMid), iCornerMid + BODY_N];
const LEDGE_L = [iTopCornerMid, iTopCornerMid + Math.floor(N_CORNER / 2) + 1];
const LEDGE_R = [mirror(iTopCornerMid) - Math.floor(N_CORNER / 2) - 1, mirror(iTopCornerMid)];

/** Pulls the bumper corners back so the nose and tail are curved in plan. */
function pushCorners(x, z) {
  const u = x / W;
  if (z > 1.45) return z - 0.2 * u * u * smooth((z - 1.45) / (HALF_L - 1.45));
  if (z < -1.55) return z + 0.14 * u * u * smooth((-z - 1.55) / (HALF_L - 1.55));
  return z;
}

function bodyLoft(zs, [i0, i1]) {
  const positions = [];
  const indices = [];
  const cols = i1 - i0 + 1;
  for (const z of zs) {
    const ring = bodySection(z);
    for (let i = i0; i <= i1; i++) {
      const [x, y] = ring[i % BODY_N];
      positions.push(x, y, pushCorners(x, z));
    }
  }
  for (let s = 0; s < zs.length - 1; s++) {
    for (let c = 0; c < cols - 1; c++) {
      const a = s * cols + c;
      indices.push(a, a + cols, a + 1, a + 1, a + cols, a + cols + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}
/** Fan cap for the tip of the nose/tail. */
function tipCap(z, facing) {
  const ring = bodySection(z);
  const c = ring.reduce((acc, [x, y]) => [acc[0] + x / ring.length, acc[1] + y / ring.length], [0, 0]);
  const positions = [c[0], c[1], z];
  for (const [x, y] of ring) positions.push(x, y, pushCorners(x, z));
  const indices = [];
  for (let i = 0; i < ring.length; i++) {
    const a = 1 + i;
    const b = 1 + ((i + 1) % ring.length);
    // The ring runs counter-clockwise seen from the front.
    if (facing > 0) indices.push(0, a, b);
    else indices.push(0, b, a);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

// --- Build ----------------------------------------------------------------------------
const car = new THREE.Group();
car.name = "Car";
const STEP_Z = 0.012;
const zRange = (z0, z1) => stations(z0, z1, STEP_Z);
const ALL = zRange(HALF_L, -HALF_L);

const bodyParts = [bodyLoft(ALL, UNDER)];
for (const zs of [zRange(HALF_L, DOOR_FRONT[1]), zRange(DOOR_REAR[0], -HALF_L)]) {
  bodyParts.push(bodyLoft(zs, SIDE_L), bodyLoft(zs, SIDE_R));
}
const cabinZone = zRange(Z_WINDSCREEN, Z_DECK);
bodyParts.push(bodyLoft(cabinZone, LEDGE_L), bodyLoft(cabinZone, LEDGE_R));
bodyParts.push(tipCap(HALF_L, 1), tipCap(-HALF_L, -1));
car.add(mesh("Body", bodyParts.reduce(mergeInto), M.paint));
car.add(mesh("Bonnet", bodyLoft(zRange(HALF_L, Z_WINDSCREEN), TOP), M.paint));
car.add(mesh("Boot", bodyLoft(zRange(Z_DECK, -HALF_L), TOP), M.paint));

// Glasshouse.
car.add(mesh("Roof", loft(stations(Z_ROOF_FRONT, Z_ROOF_REAR), RANGE.top, 0.004), M.paint));
car.add(mesh("Windscreen", loft(stations(Z_WINDSCREEN, Z_ROOF_FRONT), RANGE.top), M.glass));
car.add(mesh("Rear_Window", loft(stations(Z_ROOF_REAR, Z_DECK), RANGE.top), M.glass));
car.add(mesh("Headliner", loft(stations(Z_ROOF_FRONT + 0.04, Z_ROOF_REAR - 0.04), RANGE.top, -0.03), M.headliner));
car.add(
  mesh(
    "Pillars",
    [
      loft(stations(Z_WINDSCREEN, 0.75), RANGE.left),
      loft(stations(Z_WINDSCREEN, 0.75), RANGE.right),
      loft(stations(-0.18, -0.26), RANGE.left),
      loft(stations(-0.18, -0.26), RANGE.right),
      loft(stations(-1.2, Z_DECK), RANGE.left),
      loft(stations(-1.2, Z_DECK), RANGE.right),
    ].reduce(mergeInto),
    M.gloss,
  ),
);
function mergeInto(a, b) {
  const pos = [...a.getAttribute("position").array, ...b.getAttribute("position").array];
  const nor = [...a.getAttribute("normal").array, ...b.getAttribute("normal").array];
  const offset = a.getAttribute("position").count;
  const idx = [...Array.from(a.getIndex().array), ...Array.from(b.getIndex().array).map((i) => i + offset)];
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  return g;
}
const indexed = (g) => (g.getIndex() ? g : (() => {
  const n = g.getAttribute("position").count;
  g.setIndex(Array.from({ length: n }, (_, i) => i));
  return g;
})());

// Doors: panel cut from the body surface, window, inner card, handle. Pivot on the hinge.
const DOOR_T = 0.06;
function makeDoor(name, side, [zRear, zFront], windowZ) {
  const panel = bodyLoft(zRange(zFront - GAP, zRear + GAP), side > 0 ? SIDE_L : SIDE_R);
  panel.computeBoundingBox();
  const hinge = new THREE.Vector3(side > 0 ? panel.boundingBox.max.x : panel.boundingBox.min.x, 0, zFront - GAP);
  const group = new THREE.Group();
  group.name = name;
  group.position.copy(hinge);
  const add = (childName, geometry, material) => {
    geometry.translate(-hinge.x, -hinge.y, -hinge.z);
    group.add(mesh(childName, geometry, material));
  };
  add(`${name}_Panel`, panel, M.paint);
  add(`${name}_Window`, loft(stations(windowZ[1], windowZ[0]), side > 0 ? RANGE.left : RANGE.right), M.glass);
  const card = new RoundedBoxGeometry(0.03, 0.5, Math.abs(zFront - zRear) - 0.08, 2, 0.012);
  card.translate(side * (W - DOOR_T - 0.02), 0.62, (zFront + zRear) / 2);
  add(`${name}_Card`, card, M.intDark);
  const handle = new RoundedBoxGeometry(0.03, 0.035, 0.17, 2, 0.012);
  const handleZ = zRear + 0.2;
  handle.translate(side * (W * 0.955 + 0.012), top(handleZ) - 0.15, handleZ);
  add(`${name}_Handle`, handle, M.chrome);
  car.add(group);
  return group;
}
const doorFL = makeDoor("Door_FL", 1, DOOR_FRONT, [-0.18, 0.75]);
const doorFR = makeDoor("Door_FR", -1, DOOR_FRONT, [-0.18, 0.75]);
makeDoor("Door_RL", 1, DOOR_REAR, [-1.2, -0.26]);
makeDoor("Door_RR", -1, DOOR_REAR, [-1.2, -0.26]);

// Mirrors, mounted on the front doors.
for (const [door, side, suffix] of [
  [doorFL, 1, "L"],
  [doorFR, -1, "R"],
]) {
  const housing = new RoundedBoxGeometry(0.2, 0.14, 0.1, 3, 0.045);
  housing.translate(side * (W + 0.02), 1.05, 0.72);
  const arm = new RoundedBoxGeometry(0.09, 0.04, 0.06, 2, 0.012);
  arm.translate(side * (W - 0.1), 1.0, 0.74);
  const glassFace = new RoundedBoxGeometry(0.17, 0.11, 0.01, 2, 0.004);
  glassFace.translate(side * (W + 0.02), 1.05, 0.668);
  for (const [n, g, m] of [
    [`Mirror_${suffix}`, housing, M.gloss],
    [`Mirror_${suffix}_Arm`, arm, M.black],
    [`Mirror_${suffix}_Glass`, glassFace, M.chrome],
  ]) {
    g.translate(-door.position.x, -door.position.y, -door.position.z);
    door.add(mesh(n, g, m));
  }
}

// --- Surface patches (lamps, grille, plates) --------------------------------------------
/** Z of the body surface at (x, y) on the nose (end = 1) or tail (end = −1). */
function surfaceZ(x, y, end) {
  for (let t = 0; t < 0.6; t += 0.001) {
    const z = end * (HALF_L - t);
    const e = endFactor(z);
    const mid = (bottom(z) + top(z)) / 2;
    const squash = lerp(0.93, 1, e);
    const B = mid + (bottom(z) - mid) * squash;
    const T = mid + (top(z) - mid) * squash;
    if (y >= B && y <= T && Math.abs(x) <= planHalfWidth(z) * fullness(y) * 0.985) return pushCorners(x, z);
  }
  return end * (HALF_L - 0.6);
}
/**
 * Thin patch lying on the nose/tail surface. `yRange(x)` gives the patch's
 * [bottom, top] at each x, so trapezoids and chevrons are easy.
 */
function surfacePatch(x0, x1, yRange, end, offset = 0.004, nx = 28, ny = 6) {
  const positions = [];
  const indices = [];
  for (let i = 0; i <= nx; i++) {
    const x = lerp(x0, x1, i / nx);
    const [ya, yb] = yRange(x);
    for (let j = 0; j <= ny; j++) {
      const y = lerp(ya, yb, j / ny);
      positions.push(x, y, surfaceZ(x, y, end) + end * offset);
    }
  }
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < ny; j++) {
      const a = i * (ny + 1) + j;
      const b = a + ny + 1;
      if (end > 0) indices.push(a, b, a + 1, a + 1, b, b + 1);
      else indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}
const band = (ya, yb) => () => [ya, yb];


/**
 * Raised lettering lying on the nose (end = 1) or tail (end = −1), readable
 * from outside. Letters are laid out one by one (for tracking) and every vertex
 * is pushed onto the curved body, so the badge hugs the surface.
 */
function lettering(name, text, { end, centreY, height, tracking = 0, depth = 0.004, offset = 0.004 }) {
  const glyphs = [];
  let cursor = 0;
  for (const char of text) {
    if (char === " ") {
      cursor += height * 0.5 + tracking;
      continue;
    }
    const g = new TextGeometry(char, { font: FONT, size: height, depth, curveSegments: 6 });
    g.computeBoundingBox();
    const { min, max } = g.boundingBox;
    g.translate(cursor - min.x, 0, 0);
    cursor += max.x - min.x + tracking;
    glyphs.push(g);
  }
  const width = cursor - tracking;
  const merged = glyphs.map(indexed).reduce(mergeInto);
  // Centre; on the tail, mirror in X so it reads correctly from behind (−Z).
  merged.translate(-width / 2, centreY - height / 2, 0);
  const p = merged.getAttribute("position");
  for (let i = 0; i < p.count; i++) {
    const x = end > 0 ? p.getX(i) : -p.getX(i);
    const y = p.getY(i);
    const lift = p.getZ(i); // 0 = on the body, depth = outer face
    p.setXYZ(i, x, y, surfaceZ(x, y, end) + end * (offset + lift));
  }
  if (end < 0) {
    // Mirroring flipped the winding; restore outward-facing triangles.
    const idx = merged.getIndex();
    for (let i = 0; i < idx.count; i += 3) {
      const t = idx.getX(i + 1);
      idx.setX(i + 1, idx.getX(i + 2));
      idx.setX(i + 2, t);
    }
  }
  merged.computeVertexNormals();
  car.add(mesh(name, merged, M.lettering));
}

// Front (measured from Proton's front photo): wide grille under the bonnet edge,
// chrome "V" wing dipping under a large round badge, slim lamps rising outwards,
// wide plate, lower intake, dark corner vents and a silver skid strip.
{
  const grilleTop = (x) => 0.71 - 0.07 * smooth((Math.abs(x) - 0.42) / 0.3);
  const grilleBottom = (x) => 0.5 + 0.08 * (Math.abs(x) / 0.72) ** 2;
  car.add(mesh("Grille", surfacePatch(-0.72, 0.72, (x) => [grilleBottom(x), grilleTop(x)], 1, 0.004, 48, 8), M.gloss));
  const vY = (x) => 0.565 + 0.085 * smooth(Math.abs(x) / 0.72);
  car.add(mesh("Grille_Chrome", surfacePatch(-0.74, 0.74, (x) => [vY(x) - 0.026, vY(x)], 1, 0.008, 60, 2), M.lettering));
  const bz = surfaceZ(0, 0.62, 1);
  const badge = new THREE.CylinderGeometry(0.065, 0.065, 0.025, 40);
  badge.rotateX(Math.PI / 2);
  badge.translate(0, 0.62, bz + 0.012);
  car.add(mesh("Badge", badge, M.lettering));
  // 'Sulaman Songket' pattern: a lattice of small silver diamonds across the
  // grille, leaving the chrome V wing and the badge clear.
  {
    const diamonds = [];
    const dx = 0.042;
    const dy = 0.03;
    for (let row = 0; row * dy < 0.26; row++) {
      const cy = 0.5 + row * dy;
      for (let cx = -0.72 + (row % 2) * (dx / 2); cx <= 0.72; cx += dx) {
        const hw = dx * 0.32;
        const hh = dy * 0.34;
        if (cy - hh < grilleBottom(cx) + 0.005 || cy + hh > grilleTop(cx) - 0.005) continue;
        if (Math.abs(cy - (vY(cx) - 0.013)) < 0.028) continue;
        if (Math.hypot(cx, cy - 0.62) < 0.09) continue;
        diamonds.push(
          surfacePatch(cx - hw, cx + hw, (x) => {
            const k = 1 - Math.abs(x - cx) / hw;
            return [cy - hh * k, cy + hh * k];
          }, 1, 0.006, 4, 1),
        );
      }
    }
    car.add(mesh("Grille_Pattern", diamonds.reduce(mergeInto), M.lettering));
  }
  car.add(mesh("Front_Plate", surfacePatch(-0.28, 0.28, band(0.32, 0.44), 1, 0.008), M.black));
  lettering("Front_Plate_SAGA", "SAGA", { end: 1, centreY: 0.38, height: 0.045, tracking: 0.011, offset: 0.011 });
  car.add(mesh("Lower_Intake", surfacePatch(-0.62, 0.62, band(0.24, 0.31), 1), M.gloss));
  car.add(mesh("Skid_Strip", surfacePatch(-0.6, 0.6, band(0.205, 0.225), 1, 0.006, 40, 1), M.chrome));
  for (const [side, suffix] of [
    [1, "L"],
    [-1, "R"],
  ]) {
    const [xa, xb] = side > 0 ? [0.5, 0.8] : [-0.8, -0.5];
    car.add(mesh(`Corner_Vent_${suffix}`, surfacePatch(xa, xb, band(0.25, 0.4), 1), M.gloss));
    // Slim lamp that rises towards the outer edge.
    const lampY = (x) => {
      const t = (Math.abs(x) - 0.46) / 0.36;
      return [0.66 + 0.06 * t, 0.74 + 0.08 * t];
    };
    const [la, lb] = side > 0 ? [0.46, 0.82] : [-0.82, -0.46];
    car.add(mesh(`Headlight_${suffix}`, surfacePatch(la, lb, lampY, 1, 0.005), M.headlight));
    car.add(mesh(`DRL_${suffix}`, surfacePatch(la, lb, (x) => [lampY(x)[0] - 0.004, lampY(x)[0] + 0.01], 1, 0.008, 28, 1), M.drl));
    // LED strip hooks up at the outer end.
    const [ha, hb] = side > 0 ? [0.775, 0.795] : [-0.795, -0.775];
    car.add(mesh(`DRL_${suffix}_Hook`, surfacePatch(ha, hb, (x) => [lampY(x)[0], lampY(x)[1] - 0.012], 1, 0.008, 3, 4), M.drl));
    // Silver brow along the top edge of the lamp.
    car.add(mesh(`Headlight_${suffix}_Brow`, surfacePatch(la, lb, (x) => [lampY(x)[1] - 0.008, lampY(x)[1]], 1, 0.008, 28, 1), M.lettering));
    // Round projector lens on the inner side: silver ring around a dark lens.
    {
      const lx = side * 0.57;
      const ly = (lampY(lx)[0] + lampY(lx)[1]) / 2 + 0.004;
      const lz = surfaceZ(lx, ly, 1);
      // Face the lens along the surface normal (the nose curves back in plan).
      const slope = (surfaceZ(lx + 0.01, ly, 1) - surfaceZ(lx - 0.01, ly, 1)) / 0.02;
      const yaw = Math.atan(slope);
      for (const [part, r, depth, material] of [
        ["Lens_Ring", 0.03, 0.012, M.lettering],
        ["Lens", 0.021, 0.016, M.gloss],
      ]) {
        const g = new THREE.CylinderGeometry(r, r, depth, 32);
        g.rotateX(Math.PI / 2);
        g.rotateY(-yaw);
        g.translate(lx, ly, lz + 0.004);
        car.add(mesh(`Headlight_${suffix}_${part}`, g, material));
      }
    }
  }
}

// Rear (measured from Proton's rear photos): smoked corner lamps with red LED
// blades and chevrons at the outer ends, joined by a thin full-width red bar;
// chrome "PROTON" spaced across the boot lid above the bar; "SAGA" plate;
// large gloss-black lower bumper with reflectors and diffuser; shark-fin antenna.
{
  car.add(mesh("TailLight_Bar", surfacePatch(-0.6, 0.6, band(0.868, 0.878), -1, 0.008, 48, 1), M.tail));
  for (const [side, suffix] of [
    [1, "L"],
    [-1, "R"],
  ]) {
    const [xa, xb] = side > 0 ? [0.55, 0.83] : [-0.83, -0.55];
    // Lamp body tapers towards the bar.
    const lampY = (x) => {
      const t = (Math.abs(x) - 0.55) / 0.28;
      return [0.86 - 0.055 * t, 0.886 + 0.05 * t];
    };
    car.add(mesh(`TailLight_${suffix}`, surfacePatch(xa, xb, lampY, -1, 0.006), M.tailSmoked));
    // Red LED blade continuing the bar through the lamp.
    car.add(mesh(`TailLight_${suffix}_Blade`, surfacePatch(xa, xb, band(0.868, 0.878), -1, 0.009, 24, 1), M.tail));
    // Slanted LED strokes ("///") at the outer end, above the blade.
    for (let i = 0; i < 3; i++) {
      const x0 = side * (0.7 + i * 0.03);
      const stroke = (x) => {
        const y = 0.884 + side * 1.2 * (x - x0) + 0.012;
        return [y - 0.012, y];
      };
      car.add(mesh(`TailLight_${suffix}_Chevron_${i}`, surfacePatch(x0 - 0.005, x0 + 0.005, stroke, -1, 0.009, 3, 1), M.tail));
    }
    const [ra, rb] = side > 0 ? [0.5, 0.76] : [-0.76, -0.5];
    car.add(mesh(`Reflector_${suffix}`, surfacePatch(ra, rb, band(0.45, 0.475), -1, 0.009, 16, 1), M.tail));
  }
  lettering("Rear_Lettering_PROTON", "PROTON", { end: -1, centreY: 0.905, height: 0.03, tracking: 0.045 });
  car.add(mesh("Rear_Plate", surfacePatch(-0.28, 0.28, band(0.7, 0.83), -1, 0.006), M.black));
  lettering("Rear_Plate_SAGA", "SAGA", { end: -1, centreY: 0.765, height: 0.05, tracking: 0.012, offset: 0.01 });
  car.add(mesh("Rear_Bumper_Lower", surfacePatch(-0.8, 0.8, band(0.24, 0.51), -1, 0.005, 48, 8), M.gloss));
  car.add(mesh("Rear_Diffuser", surfacePatch(-0.45, 0.45, band(0.27, 0.35), -1, 0.008), M.black));
  const fin = new RoundedBoxGeometry(0.05, 0.07, 0.16, 3, 0.02);
  fin.translate(0, roofArc(-0.98) + 0.03, -0.98);
  car.add(mesh("Shark_Fin", fin, M.gloss));
}

// Wheels: tyre, two-tone ten-spoke rim, brake disc.
function wheel(name, x, z, side) {
  const suffix = name.split("_")[1];
  const group = new THREE.Group();
  group.name = name;
  group.position.set(x, TYRE_R, z);
  const rIn = 0.19;
  const profile = [];
  for (let i = 0; i <= 16; i++) {
    const a = (i / 16) * Math.PI;
    profile.push(new THREE.Vector2(rIn + (TYRE_R - rIn) * Math.sin(a) ** 0.35, -(TYRE_W / 2) * Math.cos(a)));
  }
  const tyre = new THREE.LatheGeometry(profile, 56);
  tyre.rotateZ(Math.PI / 2);
  group.add(mesh(`Tyre_${suffix}`, tyre, M.tyre));
  const barrel = new THREE.CylinderGeometry(rIn, rIn, TYRE_W * 0.9, 40, 1, true);
  barrel.rotateZ(Math.PI / 2);
  group.add(mesh(`Rim_${suffix}`, barrel, M.rimDark));
  const face = new THREE.CylinderGeometry(rIn - 0.005, rIn - 0.005, 0.01, 40);
  face.rotateZ(Math.PI / 2);
  face.translate(side * (TYRE_W * 0.22), 0, 0); // dark face sits behind the spokes
  // Five twin spokes, wide at the rim, with a machined lip and centre cap.
  const spokes = [];
  for (let i = 0; i < 5; i++) {
    for (const offset of [-0.17, 0.17]) {
      const shape = new THREE.Shape();
      shape.moveTo(-0.007, 0.05);
      shape.lineTo(0.007, 0.05);
      shape.lineTo(0.013, rIn - 0.012);
      shape.lineTo(-0.013, rIn - 0.012);
      shape.closePath();
      const s = new THREE.ExtrudeGeometry(shape, { depth: 0.025, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004, bevelSegments: 2 });
      // Shape is in XY; spin it into the wheel's YZ plane, facing outwards.
      s.rotateY(side > 0 ? Math.PI / 2 : -Math.PI / 2);
      s.rotateX((i / 5) * Math.PI * 2 + offset);
      s.translate(side * (TYRE_W * 0.3), 0, 0);
      spokes.push(s.toNonIndexed());
    }
  }
  const lip = new THREE.TorusGeometry(rIn - 0.006, 0.008, 8, 64);
  lip.rotateY(Math.PI / 2);
  lip.translate(side * (TYRE_W * 0.42), 0, 0);
  spokes.push(lip);
  const hub = new THREE.CylinderGeometry(0.05, 0.05, 0.03, 24);
  hub.rotateZ(Math.PI / 2);
  hub.translate(side * (TYRE_W * 0.44), 0, 0);
  spokes.push(hub);
  group.add(mesh(`RimSpokes_${suffix}`, spokes.map(indexed).reduce(mergeInto), M.rimSilver));
  group.children.at(-1).geometry.computeVertexNormals();
  // Dark face behind the spokes (two-tone look).
  group.add(mesh(`RimFace_${suffix}`, face, M.rimDark));
  const brake = new THREE.CylinderGeometry(0.15, 0.15, 0.02, 32);
  brake.rotateZ(Math.PI / 2);
  group.add(mesh(`Brake_${suffix}`, brake, M.brake));
  car.add(group);
}
wheel("Wheel_FL", TRACK, FRONT_AXLE, 1);
wheel("Wheel_FR", -TRACK, FRONT_AXLE, -1);
wheel("Wheel_RL", TRACK, REAR_AXLE, 1);
wheel("Wheel_RR", -TRACK, REAR_AXLE, -1);

// Interior (right-hand drive: the driver sits on the −X side).
{
  const box = (name, [w, h, d], [x, y, z], material, rx = 0, radius = 0.03) => {
    const g = new RoundedBoxGeometry(w, h, d, 3, Math.min(radius, w / 2, h / 2, d / 2));
    if (rx) g.rotateX(rx);
    g.translate(x, y, z);
    car.add(mesh(name, g, material));
  };
  box("Interior_Floor", [1.52, 0.03, 2.0], [0, 0.32, -0.32], M.intDark, 0, 0.01);
  box("Dashboard", [1.4, 0.26, 0.42], [0, 0.86, 0.66], M.intDark, 0, 0.06);
  box("Dashboard_Trim", [1.36, 0.035, 0.05], [0, 0.95, 0.44], M.intLight, 0, 0.012);
  box("Screen_Infotainment", [0.25, 0.15, 0.02], [0.03, 1.06, 0.5], M.screen, -0.25, 0.01);
  box("Screen_Meter", [0.2, 0.09, 0.02], [-0.37, 1.01, 0.55], M.screen, -0.25, 0.01);
  box("Centre_Console", [0.22, 0.3, 0.72], [0, 0.47, -0.03], M.intDark, 0, 0.04);
  const ring = new THREE.TorusGeometry(0.18, 0.018, 14, 48);
  ring.rotateX(-0.4);
  ring.translate(-0.37, 0.92, 0.33);
  car.add(mesh("Steering_Wheel", ring, M.intDark));
  const hub = new THREE.CylinderGeometry(0.065, 0.065, 0.045, 24);
  hub.rotateX(Math.PI / 2 - 0.4);
  hub.translate(-0.37, 0.92, 0.33);
  car.add(mesh("Steering_Hub", hub, M.intDark));
  const seat = (name, x, z, width) => {
    box(name, [width, 0.13, 0.5], [x, 0.47, z], M.intDark, 0, 0.05);
    box(`${name}_Back`, [width, 0.62, 0.12], [x, 0.8, z - 0.28], M.intDark, -0.18, 0.05);
    box(`${name}_Insert`, [width * 0.6, 0.48, 0.02], [x, 0.8, z - 0.215], M.intLight, -0.18, 0.008);
  };
  seat("Seat_Driver", -0.37, -0.1, 0.5);
  seat("Seat_Passenger", 0.37, -0.1, 0.5);
  seat("Seat_Rear", 0, -0.95, 1.3);
}

// --- Export ---------------------------------------------------------------------------
const scene = new THREE.Scene();
scene.add(car);
const out = process.argv[2] ?? "public/models/proton-saga.glb";
new GLTFExporter().parse(
  scene,
  (result) => {
    writeFileSync(out, Buffer.from(result));
    console.log(`Wrote ${out} (${(result.byteLength / 1024).toFixed(0)} KB)`);
  },
  (error) => {
    console.error(error);
    process.exit(1);
  },
  { binary: true },
);
