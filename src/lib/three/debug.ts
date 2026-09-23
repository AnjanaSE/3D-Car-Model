import type { Intersection } from "three";
import { FEATURE_ID_KEY } from "./model";

/**
 * Vehicle interaction debug mode (development builds only). Enable with either:
 *   - `NEXT_PUBLIC_VEHICLE_DEBUG=true` in `.env.local`, or
 *   - `?debug=vehicle` in the page URL.
 * When on, clicks on the model log the hit mesh and coordinates, and the
 * invisible feature hit areas are drawn as wireframes.
 * Client-only: read it from components that never render on the server.
 */
export function isVehicleDebugEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (process.env.NEXT_PUBLIC_VEHICLE_DEBUG === "true") return true;
  return typeof window !== "undefined" && new URLSearchParams(window.location.search).get("debug") === "vehicle";
}

const round = (n: number) => Math.round(n * 100) / 100;

/** Name prefix of proxy hit-area meshes (see CarFeatureHitAreas). */
export const HIT_AREA_PREFIX = "hit-area:";

function describe(label: string, hit: Intersection) {
  const world = hit.point.toArray().map(round);
  const local = hit.object.worldToLocal(hit.point.clone()).toArray().map(round);
  const material = (hit.object as { material?: { name?: string } | unknown[] }).material;
  const materialName = Array.isArray(material) ? "(multi)" : (material?.name ?? "");
  const featureId = (hit.object.userData[FEATURE_ID_KEY] as string | undefined) ?? "(none)";
  return (
    `  ${label}\n    Mesh: ${hit.object.name || "(unnamed)"}\n    Material: ${materialName}` +
    `\n    Feature: ${featureId}\n    World position: [${world.join(", ")}]` +
    `\n    Local position: [${local.join(", ")}]\n    Distance from camera: ${round(hit.distance)}`
  );
}

/**
 * Logs what a click hit, in a form that can be pasted straight into the vehicle
 * data. When an invisible hit area was in front, the car surface behind it is
 * logged too, so hit areas can be positioned against the real bodywork.
 */
export function logDebugHit(intersections: Intersection[], selected: Intersection | null) {
  const surface = intersections.find((hit) => !hit.object.name.startsWith(HIT_AREA_PREFIX));
  const lines = ["[vehicle debug]"];
  if (selected) lines.push(describe("Selected via", selected));
  if (surface && surface !== selected) lines.push(describe("Car surface", surface));
  console.log(lines.join("\n"));
}
