import {
  Color,
  MathUtils,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  type Material,
  type MeshPhysicalMaterialParameters,
} from "three";
import type {
  PaintFinish,
  PaintMaterialSettings,
  VehicleColor,
  VehicleMaterialRole,
} from "@/types/vehicle";

/* -------------------------------------------------------------------------- */
/* Role materials                                                              */
/* -------------------------------------------------------------------------- */

interface RoleMaterialPreset {
  /** Physical materials support clearcoat; standard is cheaper. */
  kind: "physical" | "standard";
  /** Keep the source material's base colour (otherwise use `color`). */
  preserveColor: boolean;
  color?: string;
  /** Adds a faint self-illumination in the material's own colour. */
  glow?: number;
  params: MeshPhysicalMaterialParameters;
}

/**
 * Presentation per material role. Source GLB materials are often generic
 * (this demo's are all metalness 0.2 / roughness 0.8), so each role gets a
 * treatment that reads correctly under studio lighting.
 */
const ROLE_PRESETS: Record<VehicleMaterialRole, RoleMaterialPreset> = {
  body: {
    kind: "physical",
    preserveColor: true,
    params: { metalness: 0.6, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.03 },
  },
  glass: {
    kind: "physical",
    preserveColor: false,
    color: "#0d1116",
    // Tinted, reflective and semi-transparent. Cheaper than `transmission`,
    // which would need an extra render pass.
    params: {
      metalness: 0.2,
      roughness: 0.02,
      transparent: true,
      opacity: 0.5,
      envMapIntensity: 1.6,
      depthWrite: false,
    },
  },
  tyres: {
    kind: "standard",
    preserveColor: false,
    color: "#141414",
    params: { metalness: 0, roughness: 0.86 },
  },
  wheels: {
    kind: "physical",
    preserveColor: false,
    color: "#c9ccd0",
    params: { metalness: 1, roughness: 0.26, clearcoat: 0.4, clearcoatRoughness: 0.1 },
  },
  brakes: {
    kind: "standard",
    preserveColor: false,
    color: "#3b3c3f",
    params: { metalness: 0.85, roughness: 0.45 },
  },
  headlights: {
    kind: "physical",
    preserveColor: true,
    glow: 0.08,
    params: { metalness: 0.6, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0 },
  },
  taillights: {
    kind: "physical",
    preserveColor: true,
    glow: 0.35,
    params: { metalness: 0.2, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0 },
  },
  chrome: {
    kind: "standard",
    preserveColor: false,
    color: "#e4e5e7",
    params: { metalness: 1, roughness: 0.08 },
  },
  // Exterior plastics (arch liners, grilles, wipers): satin black, as on most performance cars.
  trim: {
    kind: "standard",
    preserveColor: false,
    color: "#1a1b1d",
    params: { metalness: 0.1, roughness: 0.55 },
  },
  interior: {
    kind: "standard",
    preserveColor: true,
    params: { metalness: 0, roughness: 0.75 },
  },
};

/**
 * Builds a new material for `role` from a source GLB material. The source is
 * never mutated, so the GLTF cache stays pristine and roles never share state.
 */
export function createRoleMaterial(source: Material, role: VehicleMaterialRole): Material {
  const preset = ROLE_PRESETS[role];
  const src = source as Partial<MeshStandardMaterial>;
  const params = { name: `${source.name || "material"}:${role}`, side: source.side, ...preset.params };

  const material =
    preset.kind === "physical"
      ? new MeshPhysicalMaterial(params)
      : new MeshStandardMaterial(params as ConstructorParameters<typeof MeshStandardMaterial>[0]);

  if (preset.preserveColor && src.color) material.color.copy(src.color);
  else if (preset.color) material.color.set(preset.color);

  // Carry over any textures the source had.
  if (src.map) material.map = src.map;
  if (src.normalMap) material.normalMap = src.normalMap;
  if (src.aoMap) material.aoMap = src.aoMap;

  if (preset.glow) {
    material.emissive.copy(material.color);
    material.emissiveIntensity = preset.glow;
  }

  return material;
}

/* -------------------------------------------------------------------------- */
/* Paint                                                                       */
/* -------------------------------------------------------------------------- */

type ResolvedPaintSettings = Required<PaintMaterialSettings>;

const FINISH_DEFAULTS: Record<PaintFinish, ResolvedPaintSettings> = {
  solid: { metalness: 0.05, roughness: 0.34, clearcoat: 1, clearcoatRoughness: 0.03 },
  metallic: { metalness: 0.72, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.03 },
  pearl: { metalness: 0.32, roughness: 0.26, clearcoat: 1, clearcoatRoughness: 0.02 },
};

export interface PaintTarget extends ResolvedPaintSettings {
  color: Color;
}

/** Resolves a data colour into the physical values the paint should reach. */
export function resolvePaint(paint: VehicleColor): PaintTarget {
  return {
    ...FINISH_DEFAULTS[paint.finish],
    ...paint.material,
    color: new Color(paint.hex),
  };
}

/** Applies a paint instantly (used for the first frame). */
export function applyPaint(materials: readonly MeshPhysicalMaterial[], target: PaintTarget) {
  for (const material of materials) {
    material.color.copy(target.color);
    material.metalness = target.metalness;
    material.roughness = target.roughness;
    material.clearcoat = target.clearcoat;
    material.clearcoatRoughness = target.clearcoatRoughness;
  }
}

const PAINT_EPSILON = 0.002;

/**
 * Frame-rate independent ease of the paint towards `target`.
 * Returns true while the transition is still in progress.
 */
export function dampPaint(
  materials: readonly MeshPhysicalMaterial[],
  target: PaintTarget,
  lambda: number,
  delta: number,
): boolean {
  const t = 1 - Math.exp(-lambda * delta);
  let moving = false;

  for (const material of materials) {
    material.color.lerp(target.color, t);
    material.metalness = MathUtils.lerp(material.metalness, target.metalness, t);
    material.roughness = MathUtils.lerp(material.roughness, target.roughness, t);
    material.clearcoat = MathUtils.lerp(material.clearcoat, target.clearcoat, t);
    material.clearcoatRoughness = MathUtils.lerp(
      material.clearcoatRoughness,
      target.clearcoatRoughness,
      t,
    );

    const c = material.color;
    const remaining =
      Math.abs(c.r - target.color.r) +
      Math.abs(c.g - target.color.g) +
      Math.abs(c.b - target.color.b) +
      Math.abs(material.metalness - target.metalness) +
      Math.abs(material.roughness - target.roughness);
    if (remaining > PAINT_EPSILON) moving = true;
  }

  if (!moving) applyPaint(materials, target);
  return moving;
}

/* -------------------------------------------------------------------------- */
/* Feature highlight                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Emissive added at full highlight, as a fraction of the material's own colour.
 * Scaling by the part's colour (rather than adding white) brightens chrome and
 * lights clearly while leaving black rubber black instead of turning it grey.
 */
const HIGHLIGHT_STRENGTH = 0.15;
const HOVER_LEVEL = 0.5;
const HIGHLIGHT_SPEED = 10;

type EmissiveMaterial = MeshStandardMaterial;

/** Glow for features that can be switched on (e.g. headlights), keyed by feature id. */
export type FeatureGlowMap = ReadonlyMap<string, { color: string; intensity: number }>;

export interface FeatureHighlightController {
  /**
   * Eases each feature towards its target highlight and on/off glow levels.
   * Returns true while anything is still animating.
   */
  update: (
    selectedId: string | null,
    hoveredId: string | null,
    onIds: ReadonlySet<string>,
    delta: number,
  ) => boolean;
  /** Restores the materials' original emissive values. */
  reset: () => void;
}

/** Moves `current` towards `target`; snaps when close. */
function approach(current: number, target: number, t: number) {
  return Math.abs(target - current) < 0.01 ? target : MathUtils.lerp(current, target, t);
}

/**
 * Subtle emissive lift for the selected (full) and hovered (half) feature, plus
 * an "on" glow for switchable features. Works on the per-feature material
 * clones made by `prepareVehicleModel`, and remembers each material's own
 * emissive (e.g. tail-light glow) so it can be restored.
 */
export function createFeatureHighlight(
  featureMaterials: Map<string, Material[]>,
  glows: FeatureGlowMap = new Map(),
): FeatureHighlightController {
  const entries = [...featureMaterials].map(([featureId, materials]) => {
    const emissive = materials.filter((m): m is EmissiveMaterial => "emissive" in m);
    const glow = glows.get(featureId);
    return {
      featureId,
      level: 0,
      onLevel: 0,
      glow: glow ? new Color(glow.color).multiplyScalar(glow.intensity) : null,
      materials: emissive.map((material) => ({
        material,
        base: material.emissive.clone().multiplyScalar(material.emissiveIntensity),
        lift: material.color.clone().multiplyScalar(HIGHLIGHT_STRENGTH),
      })),
    };
  });

  const scratch = new Color();
  const apply = (entry: (typeof entries)[number]) => {
    for (const { material, base, lift } of entry.materials) {
      material.emissiveIntensity = 1;
      material.emissive.copy(lift).multiplyScalar(entry.level).add(base);
      if (entry.glow) material.emissive.add(scratch.copy(entry.glow).multiplyScalar(entry.onLevel));
    }
  };

  return {
    update(selectedId, hoveredId, onIds, delta) {
      const t = 1 - Math.exp(-HIGHLIGHT_SPEED * delta);
      let moving = false;
      for (const entry of entries) {
        const target = entry.featureId === selectedId ? 1 : entry.featureId === hoveredId ? HOVER_LEVEL : 0;
        const onTarget = entry.glow && onIds.has(entry.featureId) ? 1 : 0;
        if (entry.level === target && entry.onLevel === onTarget) continue;
        entry.level = approach(entry.level, target, t);
        entry.onLevel = approach(entry.onLevel, onTarget, t);
        if (entry.level !== target || entry.onLevel !== onTarget) moving = true;
        apply(entry);
      }
      return moving;
    },
    reset() {
      for (const entry of entries) {
        entry.level = 0;
        entry.onLevel = 0;
        apply(entry);
      }
    },
  };
}
