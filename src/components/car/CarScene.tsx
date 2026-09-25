"use client";

import { Suspense, useMemo, useRef } from "react";
import type { Box3 } from "three";
import { ContactShadows, Environment, Lightformer, OrbitControls } from "@react-three/drei";
import type {
  Vehicle3DConfig,
  VehicleColor,
  VehicleFeature,
  VehicleOrbitLimits,
  VehicleViewModeId,
} from "@/types/vehicle";
import type { CameraMove } from "@/lib/three/camera";
import { CarModel } from "./CarModel";
import { CarCameraController } from "./CarCameraController";
import { CarFeatureInteraction } from "./CarFeatureInteraction";
import { CarFeatureHitAreas } from "./CarFeatureHitAreas";
import { CarFeatureHotspots } from "./CarFeatureHotspots";
import { CarStageFloor } from "./CarStageFloor";
import { CarShowroom } from "./CarShowroom";

interface CarSceneProps {
  model: Vehicle3DConfig;
  /** Active orbit limits (vary by view mode); defaults to `model.orbit`. */
  orbitLimits?: VehicleOrbitLimits;
  paint: VehicleColor;
  features: VehicleFeature[];
  /** Only this view's invisible hit areas are active, so exterior proxies don't block cabin taps. */
  viewMode?: VehicleViewModeId;
  selectedFeatureId: string | null;
  onFeatureIds: readonly string[];
  onSelectFeature: (featureId: string | null) => void;
  /** Taps on the car; separate from `onSelectFeature` so taps can also toggle. */
  onFeatureTap: (featureId: string | null) => void;
  /** Double-click / double-tap on the car (enters or leaves the interior). */
  onDoubleTap?: () => void;
  debug?: boolean;
  cameraMove: CameraMove | null;
  vehicleBounds: Box3 | null;
  onReady?: (bounds: Box3) => void;
  onUserInteract?: () => void;
}

/**
 * Studio lighting built from Lightformers: renders once into the environment
 * map (no HDR download, no per-frame cost) and gives the paint long, soft
 * highlight streaks like a photo studio.
 */
function StudioEnvironment() {
  return (
    <Environment resolution={256} frames={1}>
      {/* Mid-grey studio: bright enough that dark paints still show their shape. */}
      <color attach="background" args={["#6b7688"]} />
      {/* Overhead softbox */}
      <Lightformer form="rect" intensity={2.4} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[10, 4, 1]} />
      {/* Long side strips for the shoulder-line highlight */}
      <Lightformer form="rect" intensity={1.6} position={[-6, 2, 0]} rotation-y={Math.PI / 2} scale={[12, 0.8, 1]} />
      <Lightformer form="rect" intensity={1.6} position={[6, 2, 0]} rotation-y={-Math.PI / 2} scale={[12, 0.8, 1]} />
      {/* Front and rear fill */}
      <Lightformer form="rect" intensity={1.2} position={[0, 2.5, 8]} scale={[8, 2, 1]} />
      <Lightformer form="rect" intensity={0.8} position={[0, 2.5, -8]} rotation-y={Math.PI} scale={[8, 2, 1]} />
      {/* Warm kicker for a little colour in the reflections */}
      <Lightformer form="ring" color="#ffe9d2" intensity={1.5} position={[8, 5, 6]} scale={2.5} target={[0, 0, 0]} />
    </Environment>
  );
}

export function CarScene({
  model,
  orbitLimits,
  paint,
  features,
  viewMode = "exterior",
  selectedFeatureId,
  onFeatureIds,
  onSelectFeature,
  onFeatureTap,
  onDoubleTap,
  debug = false,
  cameraMove,
  vehicleBounds,
  onReady,
  onUserInteract,
}: CarSceneProps) {
  const orbit = orbitLimits ?? model.orbit;
  const hoveredFeatureRef = useRef<string | null>(null);
  // Only the current view's features get hit areas and hotspots.
  const viewFeatures = useMemo(
    () => features.filter((feature) => (feature.viewMode ?? "exterior") === viewMode),
    [features, viewMode],
  );

  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 8, 5]} intensity={1.4} />
      <directionalLight position={[-5, 4, -4]} intensity={0.35} />
      <StudioEnvironment />
      {/* Own boundary: the car never waits for the view photo. */}
      <Suspense fallback={null}>
        <CarShowroom />
      </Suspense>

      <Suspense fallback={null}>
        <CarFeatureInteraction
          onSelect={onFeatureTap}
          onDoubleTap={onDoubleTap}
          hoveredFeatureRef={hoveredFeatureRef}
          debug={debug}
        >
          <CarModel
            config={model}
            paint={paint}
            features={features}
            selectedFeatureId={selectedFeatureId}
            onFeatureIds={onFeatureIds}
            hoveredFeatureRef={hoveredFeatureRef}
            onReady={onReady}
          />
          <CarFeatureHitAreas features={viewFeatures} debug={debug} />
        </CarFeatureInteraction>
        <CarFeatureHotspots
          features={viewFeatures}
          selectedFeatureId={selectedFeatureId}
          onSelect={onSelectFeature}
        />
        <CarStageFloor />
        {/*
          Rendered once after the model mounts; the car is static so it never needs updating.
          Must sit slightly *below* y = 0: Drei renders its blur plane at the world origin through
          the shadow camera (near = 0), so a camera above the origin clips the blur pass to nothing.
        */}
        <ContactShadows
          position={[0, -0.005, 0]}
          scale={12}
          far={2.5}
          blur={2.4}
          opacity={0.8}
          resolution={512}
          frames={1}
          color="#000000"
        />
      </Suspense>

      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.55}
        zoomSpeed={0.7}
        // Distance and polar limits are managed by CarCameraController (they vary by view mode).
      />
      <CarCameraController
        move={cameraMove}
        limits={orbit}
        vehicleBounds={vehicleBounds}
        onUserInteract={onUserInteract}
      />
    </>
  );
}
