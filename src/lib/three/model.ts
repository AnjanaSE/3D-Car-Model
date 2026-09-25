import {
  Box3,
  Mesh,
  MeshPhysicalMaterial,
  Vector3,
  type Material,
  type Object3D,
} from "three";
import type {
  MeshMatcher,
  Vehicle3DConfig,
  VehicleFeature,
  VehicleMaterialRole,
  VehicleMeshMapping,
} from "@/types/vehicle";
import { createRoleMaterial } from "./materials";

/* -------------------------------------------------------------------------- */
/* Name matching                                                               */
/* -------------------------------------------------------------------------- */

/**
 * GLTFLoader sanitises node names (spaces → "_") and de-duplicates repeats
 * with a numeric suffix ("tire", "tire_1", …). Normalise both sides so the
 * mapping can use the names as they appear in the source file.
 */
export function normalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[\s.]+/g, "_")
    .replace(/_\d+$/, "");
}

function patternToRegExp(pattern: string): RegExp {
  const normalized = pattern.trim().toLowerCase().replace(/[\s.]+/g, "_");
  const escaped = normalized.replace(/[|\\{}()[\]^$+?]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`);
}

interface CompiledMatcher {
  role: VehicleMaterialRole;
  meshes: RegExp[];
  materials: RegExp[];
}

function compileMapping(mapping: VehicleMeshMapping): CompiledMatcher[] {
  return (Object.entries(mapping) as [VehicleMaterialRole, MeshMatcher | undefined][]).map(
    ([role, matcher]) => ({
      role,
      meshes: (matcher?.meshes ?? []).map(patternToRegExp),
      materials: (matcher?.materials ?? []).map(patternToRegExp),
    }),
  );
}

/** First role (in mapping order) whose mesh or material pattern matches. */
function resolveRole(
  matchers: CompiledMatcher[],
  meshName: string,
  materialName: string,
): VehicleMaterialRole | null {
  const mesh = normalizeName(meshName);
  const material = normalizeName(materialName);
  for (const matcher of matchers) {
    if (matcher.meshes.some((re) => re.test(mesh))) return matcher.role;
    if (material && matcher.materials.some((re) => re.test(material))) return matcher.role;
  }
  return null;
}

interface CompiledFeatureMatcher {
  featureId: string;
  meshes: RegExp[];
}

function compileFeatures(features: Pick<VehicleFeature, "id" | "meshNames">[]): CompiledFeatureMatcher[] {
  return features
    .filter((feature) => feature.meshNames?.length)
    .map((feature) => ({ featureId: feature.id, meshes: feature.meshNames!.map(patternToRegExp) }));
}

function resolveFeature(matchers: CompiledFeatureMatcher[], meshName: string): string | null {
  const mesh = normalizeName(meshName);
  return matchers.find((matcher) => matcher.meshes.some((re) => re.test(mesh)))?.featureId ?? null;
}

/** Name of the prepared model's root object, for finding the car in the scene. */
export const VEHICLE_ROOT_NAME = "vehicle-root";

/** Key under which a clickable mesh stores its feature id in `userData`. */
export const FEATURE_ID_KEY = "vehicleFeatureId";

/* -------------------------------------------------------------------------- */
/* Model preparation                                                           */
/* -------------------------------------------------------------------------- */

export interface ModelInspectionEntry {
  mesh: string;
  material: string;
  role: VehicleMaterialRole | "(unmapped)";
  feature: string;
}

export interface PreparedVehicleModel {
  root: Object3D;
  /** Body paint materials; the only materials the colour selector touches. */
  paintMaterials: MeshPhysicalMaterial[];
  /** Materials owned by each clickable feature's meshes (never shared with other meshes). */
  featureMaterials: Map<string, Material[]>;
  report: ModelInspectionEntry[];
  dispose: () => void;
}

/**
 * Clones the cached GLTF scene and assigns role materials according to the
 * vehicle's mesh mapping. The cached scene is never mutated, so the model can
 * be mounted more than once and recoloured without reloading.
 *
 * Meshes listed in a feature's `meshNames` are tagged with the feature id in
 * `userData` (for click handling) and get their own material instances, so a
 * highlight on one feature never bleeds onto other meshes sharing a material.
 */
export function prepareVehicleModel(
  scene: Object3D,
  config: Pick<Vehicle3DConfig, "meshMapping" | "transform">,
  features: Pick<VehicleFeature, "id" | "meshNames">[] = [],
): PreparedVehicleModel {
  const root = scene.clone(true);
  root.name = VEHICLE_ROOT_NAME;
  const matchers = compileMapping(config.meshMapping);
  const featureMatchers = compileFeatures(features);
  const cache = new Map<string, Material>();
  const paintMaterials = new Set<MeshPhysicalMaterial>();
  const featureMaterials = new Map<string, Material[]>();
  const report: ModelInspectionEntry[] = [];

  const materialFor = (
    source: Material,
    role: VehicleMaterialRole,
    featureId: string | null,
  ): Material => {
    // Share one material per (source material, role, feature), never across roles or features.
    const key = `${source.uuid}:${role}:${featureId ?? ""}`;
    let material = cache.get(key);
    if (!material) {
      material = createRoleMaterial(source, role);
      cache.set(key, material);
      if (featureId) featureMaterials.set(featureId, [...(featureMaterials.get(featureId) ?? []), material]);
    }
    if (role === "body" && material instanceof MeshPhysicalMaterial) paintMaterials.add(material);
    return material;
  };

  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    // Contact shadows are used instead of realtime shadow maps.
    object.castShadow = false;
    object.receiveShadow = false;

    const featureId = resolveFeature(featureMatchers, object.name);
    if (featureId) object.userData[FEATURE_ID_KEY] = featureId;

    const slots: Material[] = Array.isArray(object.material) ? object.material : [object.material];
    const mapped = slots.map((source) => {
      const role = resolveRole(matchers, object.name, source.name);
      report.push({
        mesh: object.name,
        material: source.name,
        role: role ?? "(unmapped)",
        feature: featureId ?? "",
      });
      return role ? materialFor(source, role, featureId) : source;
    });
    object.material = Array.isArray(object.material) ? mapped : mapped[0];
  });

  if (config.transform.normalize) {
    const box = new Box3().setFromObject(root);
    const center = box.getCenter(new Vector3());
    root.position.set(-center.x, -box.min.y, -center.z);
  }

  return {
    root,
    paintMaterials: [...paintMaterials],
    featureMaterials,
    report,
    dispose: () => cache.forEach((material) => material.dispose()),
  };
}

/**
 * Development aid: prints every mesh/material in the model and the role it was
 * mapped to, so the mapping can be checked against the real GLB.
 */
export function logModelInspection(url: string, report: ModelInspectionEntry[]) {
  if (process.env.NODE_ENV === "production") return;
  const unmapped = report.filter((entry) => entry.role === "(unmapped)");
  console.groupCollapsed(
    `[vehicle] ${url}: ${report.length} mesh slots, ${unmapped.length} unmapped`,
  );
  console.table(report);
  console.groupEnd();
  if (!report.some((entry) => entry.role === "body")) {
    console.warn(`[vehicle] ${url}: no meshes matched the "body" role; paint changes will have no effect.`);
  }
}
