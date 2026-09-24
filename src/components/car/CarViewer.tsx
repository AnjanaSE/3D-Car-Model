"use client";

import { useCallback, useState } from "react";
import { Canvas } from "@react-three/fiber";
import type { Box3 } from "three";
import type {
  Vehicle3DConfig,
  VehicleColor,
  VehicleFeature,
  VehicleImage,
  VehicleOrbitLimits,
  VehicleViewModeId,
} from "@/types/vehicle";
import type { CameraMove } from "@/lib/three/camera";
import { isWebGLAvailable } from "@/lib/three/webgl";
import { isVehicleDebugEnabled } from "@/lib/three/debug";
import { CarScene } from "./CarScene";
import { CarLoaderWithProgress } from "./CarLoader";
import { CarViewerErrorBoundary } from "./CarViewerErrorBoundary";
import { CarViewerFallback } from "./CarViewerFallback";
import { clearCarModel } from "./CarModel";

export interface CarViewerProps {
  model: Vehicle3DConfig;
  orbitLimits?: VehicleOrbitLimits;
  viewMode?: VehicleViewModeId;
  paint: VehicleColor;
  features: VehicleFeature[];
  selectedFeatureId: string | null;
  onFeatureIds: readonly string[];
  /** Closing a feature (background tap, callout ×). */
  onSelectFeature: (featureId: string | null) => void;
  /** A tap/click on a part of the car (or on bodywork that isn't a feature → null). */
  onFeatureTap: (featureId: string | null) => void;
  cameraMove: CameraMove | null;
  fallbackImage?: VehicleImage;
  onUserInteract?: () => void;
}

/**
 * Self-contained 3D viewer. Client-only: load it with `next/dynamic` and
 * `ssr: false`. Handles WebGL detection, loading progress and load errors so
 * a failure never takes the surrounding page down.
 */
export default function CarViewer({
  model,
  orbitLimits,
  viewMode,
  paint,
  features,
  selectedFeatureId,
  onFeatureIds,
  onSelectFeature,
  onFeatureTap,
  cameraMove,
  fallbackImage,
  onUserInteract,
}: CarViewerProps) {
  // This module only ever runs in the browser, so detection can happen during the first render.
  const [webGLAvailable] = useState(isWebGLAvailable);
  const [debug] = useState(isVehicleDebugEnabled);
  const [vehicleBounds, setVehicleBounds] = useState<Box3 | null>(null);
  const ready = vehicleBounds !== null;
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const handleReady = useCallback((bounds: Box3) => setVehicleBounds(bounds), []);
  const handleError = useCallback(() => setFailed(true), []);
  const handleRetry = useCallback(() => {
    clearCarModel(model.url);
    setFailed(false);
    setVehicleBounds(null);
    setAttempt((n) => n + 1);
  }, [model.url]);

  if (!webGLAvailable) {
    return <CarViewerFallback reason="webgl" image={fallbackImage} />;
  }

  const initialPosition = cameraMove?.position ?? [6, 2, 6];

  return (
    <>
      <CarViewerErrorBoundary
        key={attempt}
        onError={handleError}
        fallback={<CarViewerFallback reason="error" image={fallbackImage} onRetry={handleRetry} />}
      >
        <Canvas
          className={`transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`}
          frameloop="demand"
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          camera={{ fov: model.orbit.fov, near: 0.1, far: 100, position: initialPosition }}
          aria-label="Interactive 3D vehicle. Drag to rotate, scroll or pinch to zoom, tap a part to learn about it."
          // Tapping empty space closes the selected feature (R3F ignores drags here).
          onPointerMissed={() => onSelectFeature(null)}
        >
          <CarScene
            model={model}
            orbitLimits={orbitLimits}
            viewMode={viewMode}
            paint={paint}
            features={features}
            selectedFeatureId={selectedFeatureId}
            onFeatureIds={onFeatureIds}
            onSelectFeature={onSelectFeature}
            onFeatureTap={onFeatureTap}
            debug={debug}
            cameraMove={cameraMove}
            vehicleBounds={vehicleBounds}
            onReady={handleReady}
            onUserInteract={onUserInteract}
          />
        </Canvas>
      </CarViewerErrorBoundary>
      <CarLoaderWithProgress visible={!ready && !failed} />
    </>
  );
}
