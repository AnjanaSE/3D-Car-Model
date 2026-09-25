"use client";

import { useCallback, useEffect, useRef, type ReactNode, type RefObject } from "react";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import { Bvh } from "@react-three/drei";
import type { Intersection } from "three";
import { FEATURE_ID_KEY } from "@/lib/three/model";
import { logDebugHit } from "@/lib/three/debug";

/** Pointer travel (px) between down and up above which a click counts as a drag. */
const DRAG_THRESHOLD = 5;
/**
 * A feature hit counts if it is within this distance (m) behind the first
 * surface hit. Lets proxy hit areas that sit just inside the bodywork still
 * win, without selecting parts on the far side of the car.
 */
const DEPTH_TOLERANCE = 0.25;
/** Two taps within this time (ms) and distance (px) make a double-tap. */
const DOUBLE_TAP_MS = 320;
const DOUBLE_TAP_PX = 24;

function featureIdOf(hit: Intersection): string | null {
  const id: unknown = hit.object.userData[FEATURE_ID_KEY];
  return typeof id === "string" ? id : null;
}

function resolveHit(intersections: Intersection[]): { featureId: string | null; hit: Intersection | null } {
  const first = intersections[0];
  if (!first) return { featureId: null, hit: null };
  for (const hit of intersections) {
    if (hit.distance - first.distance > DEPTH_TOLERANCE) break;
    const featureId = featureIdOf(hit);
    if (featureId) return { featureId, hit };
  }
  return { featureId: null, hit: first };
}

interface CarFeatureInteractionProps {
  children: ReactNode;
  onSelect: (featureId: string | null) => void;
  /** Double-click / double-tap anywhere on the car. */
  onDoubleTap?: () => void;
  /** Written (not React state) so hover never re-renders; read by the highlight. */
  hoveredFeatureRef: RefObject<string | null>;
  debug?: boolean;
}

/**
 * Makes the car clickable through React Three Fiber's own raycasting.
 * Handles both interaction methods with one code path:
 *   A. GLB meshes tagged with a feature id in `userData` (see prepareVehicleModel)
 *   B. invisible proxy hit areas tagged the same way (see CarFeatureHitAreas)
 * A tap/click selects; a drag (> DRAG_THRESHOLD px) is left to OrbitControls.
 */
export function CarFeatureInteraction({
  children,
  onSelect,
  onDoubleTap,
  hoveredFeatureRef,
  debug = false,
}: CarFeatureInteractionProps) {
  const get = useThree((state) => state.get);
  const lastTap = useRef({ time: -Infinity, x: 0, y: 0 });

  const setHovered = useCallback(
    (featureId: string | null) => {
      if (hoveredFeatureRef.current === featureId) return;
      hoveredFeatureRef.current = featureId;
      const { gl, invalidate } = get();
      gl.domElement.style.cursor = featureId ? "pointer" : "";
      invalidate();
    },
    [get, hoveredFeatureRef],
  );

  // Never leave a pointer cursor behind if the scene unmounts mid-hover.
  useEffect(() => () => void (get().gl.domElement.style.cursor = ""), [get]);

  const handleClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      // One handler call per click: stop R3F bubbling to further intersections.
      event.stopPropagation();
      if (event.delta > DRAG_THRESHOLD) return;

      // Detected here rather than via `dblclick`, which mobile browsers don't fire reliably.
      const { timeStamp, clientX, clientY } = event.nativeEvent;
      const previous = lastTap.current;
      const isDouble =
        timeStamp - previous.time < DOUBLE_TAP_MS &&
        Math.hypot(clientX - previous.x, clientY - previous.y) < DOUBLE_TAP_PX;
      lastTap.current = isDouble ? { time: -Infinity, x: 0, y: 0 } : { time: timeStamp, x: clientX, y: clientY };
      if (isDouble && onDoubleTap) {
        onDoubleTap();
        return;
      }

      const { featureId, hit } = resolveHit(event.intersections);
      if (debug) logDebugHit(event.intersections, featureId ? hit : null);
      // Tapping bodywork that isn't a feature dismisses the current selection.
      onSelect(featureId);
    },
    [onSelect, onDoubleTap, debug],
  );

  const handlePointerMove = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      // Hover is a desktop nicety only; touch selects on tap.
      if (event.pointerType !== "mouse" || event.buttons !== 0) return;
      event.stopPropagation();
      setHovered(resolveHit(event.intersections).featureId);
    },
    [setHovered],
  );

  const handlePointerOut = useCallback(() => setHovered(null), [setHovered]);

  return (
    // Bounding-volume hierarchy keeps raycasts against the dense car mesh cheap.
    <Bvh firstHitOnly={false}>
      <group onClick={handleClick} onPointerMove={handlePointerMove} onPointerOut={handlePointerOut}>
        {children}
      </group>
    </Bvh>
  );
}
