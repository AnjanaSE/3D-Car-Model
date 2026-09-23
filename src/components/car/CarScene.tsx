"use client";

import { Suspense, useRef } from "react";
import type { Box3 } from "three";
import { ContactShadows, Environment, Lightformer, OrbitControls } from "@react-three/drei";
import type { Vehicle3DConfig, VehicleColor, VehicleFeature } from "@/types/vehicle";
import type { CameraMove } from "@/lib/three/camera";
import { CarModel } from "./CarModel";
import { CarCameraController } from "./CarCameraController";
import { CarFeatureInteraction } from "./CarFeatureInteraction";
import { CarFeatureHitAreas } from "./CarFeatureHitAreas";
import { CarFeatureCallout } from "./CarFeatureCallout";

interface CarSceneProps {
  model: Vehicle3DConfig;
  paint: VehicleColor;
  features: VehicleFeature[];
  selectedFeatureId: string | null;
  onFeatureIds: readonly string[];
  onSelectFeature: (featureId: string | null) => void;
  /** Taps on the car; separate from `onSelectFeature` so taps can also toggle. */
  onFeatureTap: (featureId: string | null) => void;
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
      <color attach="background" args={["#2c2c2e"]} />
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
  paint,
  features,
  selectedFeatureId,
  onFeatureIds,
  onSelectFeature,
  onFeatureTap,
  debug = false,
  cameraMove,
  vehicleBounds,
  onReady,
  onUserInteract,
}: CarSceneProps) {
  const { orbit } = model;
  const hoveredFeatureRef = useRef<string | null>(null);
  const selectedFeature = features.find((feature) => feature.id === selectedFeatureId) ?? null;

  return (
    <>
      <ambientLight intensity={0.25} />
      <directionalLight position={[4, 8, 5]} intensity={1.1} />
      <directionalLight position={[-5, 4, -4]} intensity={0.35} />
      <StudioEnvironment />

      <Suspense fallback={null}>
        <CarFeatureInteraction
          onSelect={onFeatureTap}
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
          <CarFeatureHitAreas features={features} debug={debug} />
        </CarFeatureInteraction>
        {selectedFeature && (
          <CarFeatureCallout
            key={selectedFeature.id}
            feature={selectedFeature}
            onClose={() => onSelectFeature(null)}
          />
        )}
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
          opacity={0.62}
          resolution={512}
          frames={1}
          color="#16181b"
        />
      </Suspense>

      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.55}
        zoomSpeed={0.7}
        minDistance={orbit.minDistance}
        maxDistance={orbit.maxDistance}
        minPolarAngle={orbit.minPolarAngle}
        maxPolarAngle={orbit.maxPolarAngle}
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
