"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree, type RootState } from "@react-three/fiber";
import { Spherical, Vector3, type Box3, type PerspectiveCamera } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three/examples/jsm/controls/OrbitControls.js";
import type { VehicleOrbitLimits } from "@/types/vehicle";
import {
  dampSpherical,
  dampVector,
  fitViewToViewport,
  getOrbitDistanceRange,
  type CameraMove,
} from "@/lib/three/camera";

/** Higher is snappier. ~4 gives a calm ~1s move. */
const TRANSITION_SPEED = 4;
const SETTLE_EPSILON = 0.001;

interface CarCameraControllerProps {
  move: CameraMove | null;
  limits: VehicleOrbitLimits;
  /** World-space bounds of the loaded vehicle; views are fitted to it once known. */
  vehicleBounds: Box3 | null;
  /** Fired once when the user starts dragging/zooming (not per frame). */
  onUserInteract?: () => void;
}

/** Applies the orbit limits (zoom range scaled for the viewport shape, vertical range). */
function applyLimits(controls: OrbitControlsImpl, limits: VehicleOrbitLimits, aspect: number) {
  const range = getOrbitDistanceRange(limits, aspect);
  controls.minDistance = range.min;
  controls.maxDistance = range.max;
  controls.minPolarAngle = limits.minPolarAngle;
  controls.maxPolarAngle = limits.maxPolarAngle;
}

/**
 * Lifts the limits while the camera flies between views with different limits
 * (e.g. outside the car → cabin), so OrbitControls doesn't snap the camera
 * into the new range on the first frame. Limits are re-applied once it settles.
 */
function relaxLimits(controls: OrbitControlsImpl) {
  controls.minDistance = 0;
  controls.maxDistance = Infinity;
  controls.minPolarAngle = 0;
  controls.maxPolarAngle = Math.PI;
}

/** Three.js objects are read from the store at use time rather than captured from hooks, since we mutate them. */
function getRig(state: RootState) {
  return {
    camera: state.camera as PerspectiveCamera,
    controls: state.controls as unknown as OrbitControlsImpl | null,
    aspect: state.size.width / Math.max(state.size.height, 1),
  };
}

/**
 * Smoothly moves the camera and orbit target to requested views. Runs entirely
 * in the render loop via refs — no React state updates per frame. Any user
 * interaction cancels an in-flight transition.
 */
export function CarCameraController({
  move,
  limits,
  vehicleBounds,
  onUserInteract,
}: CarCameraControllerProps) {
  const get = useThree((state) => state.get);
  // Selected only to re-run effects when the controls mount or the viewport changes shape.
  const controlsReady = useThree((state) => state.controls !== null);
  const aspect = useThree((state) => state.size.width / Math.max(state.size.height, 1));

  const transition = useRef({
    active: false,
    target: new Vector3(),
    goalTarget: new Vector3(),
    orbit: new Spherical(),
    goalOrbit: new Spherical(),
    offset: new Vector3(),
  });

  // Latest limits, for re-applying them when a transition settles.
  const limitsRef = useRef(limits);
  useEffect(() => {
    limitsRef.current = limits;
  }, [limits]);

  // Keep the limits in step with the view mode and viewport shape — but not
  // mid-transition; they're applied when the camera arrives.
  useEffect(() => {
    const { controls } = getRig(get());
    if (!controls || transition.current.active) return;
    applyLimits(controls, limits, aspect);
    controls.update();
    get().invalidate();
  }, [get, controlsReady, limits, aspect]);

  // Start a transition whenever a new move is requested (and re-fit the
  // initial placement once the vehicle's real bounds are known).
  useEffect(() => {
    const { camera, controls, aspect: currentAspect } = getRig(get());
    if (!move || !controls) return;
    const fitted = fitViewToViewport(
      move,
      limits,
      { aspect: currentAspect, fov: camera.fov },
      vehicleBounds,
    );
    const t = transition.current;

    // "Reset" also restores any zoom factor, not just position/target.
    if (camera.zoom !== 1) {
      camera.zoom = 1;
      camera.updateProjectionMatrix();
    }

    if (move.immediate) {
      t.active = false;
      applyLimits(controls, limits, currentAspect);
      camera.position.copy(fitted.position);
      controls.target.copy(fitted.target);
      controls.update();
    } else {
      relaxLimits(controls);
      t.target.copy(controls.target);
      t.orbit.setFromVector3(t.offset.copy(camera.position).sub(controls.target));
      t.goalTarget.copy(fitted.target);
      t.goalOrbit.setFromVector3(t.offset.copy(fitted.position).sub(fitted.target));
      t.active = true;
    }
    get().invalidate();
  }, [move, get, controlsReady, limits, vehicleBounds]);

  // User input always wins over an animation.
  useEffect(() => {
    const { controls } = getRig(get());
    if (!controls) return;
    const handleStart = () => {
      if (transition.current.active) {
        transition.current.active = false;
        applyLimits(controls, limitsRef.current, getRig(get()).aspect);
      }
      onUserInteract?.();
    };
    controls.addEventListener("start", handleStart);
    return () => controls.removeEventListener("start", handleStart);
  }, [get, controlsReady, onUserInteract]);

  useFrame((state, delta) => {
    const t = transition.current;
    const { camera, controls } = getRig(state);
    if (!t.active || !controls) return;

    const dt = Math.min(delta, 0.1);
    const targetRemaining = dampVector(t.target, t.goalTarget, TRANSITION_SPEED, dt);
    const orbitRemaining = dampSpherical(t.orbit, t.goalOrbit, TRANSITION_SPEED, dt);

    if (targetRemaining < SETTLE_EPSILON && orbitRemaining < SETTLE_EPSILON) {
      t.target.copy(t.goalTarget);
      t.orbit.copy(t.goalOrbit);
      t.active = false;
      applyLimits(controls, limitsRef.current, state.size.width / Math.max(state.size.height, 1));
    }

    controls.target.copy(t.target);
    camera.position.copy(t.target).add(t.offset.setFromSpherical(t.orbit));
    controls.update();
    state.invalidate();
  });

  return null;
}
