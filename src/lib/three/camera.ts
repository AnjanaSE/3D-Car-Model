import { MathUtils, Vector3, type Box3, type Spherical } from "three";
import type { CameraView, Vehicle, VehicleOrbitLimits, Vec3 } from "@/types/vehicle";

/** A requested camera move. `key` changes on every request so repeats re-trigger. */
export interface CameraMove extends CameraView {
  key: number;
  /** Jump without animating (initial placement). */
  immediate?: boolean;
  /**
   * Pull back if needed so the whole vehicle stays in frame on the current
   * viewport (default true). Close-up views, e.g. hotspots, set this to false.
   */
  fitVehicle?: boolean;
}

export function getCameraPreset(vehicle: Vehicle, id: string): CameraView {
  const preset =
    vehicle.cameraPresets.find((p) => p.id === id) ??
    vehicle.cameraPresets.find((p) => p.id === vehicle.defaultCameraPresetId) ??
    vehicle.cameraPresets[0];
  if (!preset) throw new Error(`Vehicle "${vehicle.id}" has no camera presets.`);
  return preset;
}

/**
 * Orbit limits are authored for a landscape viewport. On narrow (portrait)
 * viewports the horizontal field of view shrinks, so allow zooming further out.
 */
const REFERENCE_ASPECT = 1.6;
const MAX_DISTANCE_SCALE = 2;

function getDistanceScale(aspect: number): number {
  if (!Number.isFinite(aspect) || aspect <= 0) return 1;
  return MathUtils.clamp(REFERENCE_ASPECT / aspect, 1, MAX_DISTANCE_SCALE);
}

/** The camera must stay inside the round showroom (radius 18 m, see CarShowroom). */
const ABSOLUTE_MAX_DISTANCE = 15;

export function getOrbitDistanceRange(limits: VehicleOrbitLimits, aspect: number) {
  return {
    min: limits.minDistance,
    max: Math.min(limits.maxDistance * getDistanceScale(aspect), ABSOLUTE_MAX_DISTANCE),
  };
}

/** Fraction of the viewport the vehicle may fill when fitted. */
const FRAME_FILL = 0.9;
const WORLD_UP = new Vector3(0, 1, 0);

/**
 * Smallest camera distance (along `direction`, from `target`) at which every
 * corner of `bounds` is inside the view frustum. Closed form per corner:
 * a point at lateral offset x and depth offset a fits when D ≥ |x| / tan(fov/2) + a.
 */
function distanceToFit(
  bounds: Box3,
  target: Vector3,
  direction: Vector3,
  fovDegrees: number,
  aspect: number,
): number {
  const tanY = Math.tan(MathUtils.degToRad(fovDegrees) / 2) * FRAME_FILL;
  const tanX = tanY * aspect;
  const forward = direction.clone().negate();
  const right = new Vector3().crossVectors(forward, WORLD_UP);
  if (right.lengthSq() < 1e-6) right.set(1, 0, 0); // looking straight down
  right.normalize();
  const up = new Vector3().crossVectors(right, forward);

  const corner = new Vector3();
  let required = 0;
  for (let i = 0; i < 8; i++) {
    corner
      .set(i & 1 ? bounds.max.x : bounds.min.x, i & 2 ? bounds.max.y : bounds.min.y, i & 4 ? bounds.max.z : bounds.min.z)
      .sub(target);
    const along = corner.dot(direction);
    required = Math.max(
      required,
      Math.abs(corner.dot(right)) / tanX + along,
      Math.abs(corner.dot(up)) / tanY + along,
    );
  }
  return required;
}

export interface ViewportInfo {
  aspect: number;
  fov: number;
}

/**
 * Adapts an authored view to the current viewport: keeps the authored distance
 * when the vehicle already fits (so desktop framing is exactly as designed),
 * pulls back only as far as needed on narrower screens, and respects the orbit limits.
 */
export function fitViewToViewport(
  view: CameraView & Pick<CameraMove, "fitVehicle">,
  limits: VehicleOrbitLimits,
  viewport: ViewportInfo,
  vehicleBounds: Box3 | null,
): { position: Vector3; target: Vector3 } {
  const target = new Vector3(...view.target);
  const offset = new Vector3(...view.position).sub(target);
  const { min, max } = getOrbitDistanceRange(limits, viewport.aspect);

  let distance = offset.length();
  if (view.fitVehicle === false) {
    // Close-ups: pull back gently on narrow screens so the part keeps some context.
    distance *= Math.sqrt(getDistanceScale(viewport.aspect));
  } else if (vehicleBounds) {
    const direction = offset.clone().normalize();
    distance = Math.max(
      distance,
      distanceToFit(vehicleBounds, target, direction, viewport.fov, viewport.aspect),
    );
  }
  distance = MathUtils.clamp(distance, min, max);
  offset.setLength(distance);

  // Respect the polar limits so a preset never fights OrbitControls' clamping.
  const polar = Math.acos(MathUtils.clamp(offset.y / distance, -1, 1));
  const clampedPolar = MathUtils.clamp(polar, limits.minPolarAngle, limits.maxPolarAngle);
  if (clampedPolar !== polar) {
    const azimuth = Math.atan2(offset.x, offset.z);
    offset.setFromSphericalCoords(distance, clampedPolar, azimuth);
  }

  return { position: target.clone().add(offset), target };
}

/** Frame-rate independent exponential ease of `current` towards `goal`. */
export function dampVector(current: Vector3, goal: Vector3, lambda: number, delta: number) {
  current.lerp(goal, 1 - Math.exp(-lambda * delta));
  return current.distanceTo(goal);
}

/**
 * Eases an orbit position (radius / polar / azimuth) towards `goal`, taking the
 * shortest way round. Orbiting — rather than lerping the position in a straight
 * line — keeps the camera from cutting through the car between presets.
 * Returns the remaining difference.
 */
export function dampSpherical(current: Spherical, goal: Spherical, lambda: number, delta: number) {
  const t = 1 - Math.exp(-lambda * delta);
  const azimuthDelta = MathUtils.euclideanModulo(goal.theta - current.theta + Math.PI, Math.PI * 2) - Math.PI;

  current.radius += (goal.radius - current.radius) * t;
  current.phi += (goal.phi - current.phi) * t;
  current.theta += azimuthDelta * t;

  return (
    Math.abs(goal.radius - current.radius) +
    Math.abs(goal.phi - current.phi) +
    Math.abs(azimuthDelta * (1 - t))
  );
}

export const toVec3 = (v: Vector3): Vec3 => [v.x, v.y, v.z];
