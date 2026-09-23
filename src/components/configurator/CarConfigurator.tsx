"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { Vehicle } from "@/types/vehicle";
import { getCameraPreset, type CameraMove } from "@/lib/three/camera";
import { CarLoader } from "@/components/car/CarLoader";
import { CameraControls } from "./CameraControls";
import { FeatureMenu } from "./FeatureMenu";

// Three.js is browser-only and heavy: keep it out of the server render and the initial bundle.
const CarViewer = dynamic(() => import("@/components/car/CarViewer"), {
  ssr: false,
  loading: () => <CarLoader />,
});

interface CarConfiguratorProps {
  vehicle: Vehicle;
}

/**
 * Configurator shell. Receives a `Vehicle` from any source (local demo data
 * today, an API later) and owns the UI state: selected paint and camera view.
 */
export function CarConfigurator({ vehicle }: CarConfiguratorProps) {
  const defaultPresetId = vehicle.defaultCameraPresetId;
  const [activePresetId, setActivePresetId] = useState<string | null>(defaultPresetId);
  const [cameraMove, setCameraMove] = useState<CameraMove>(() => ({
    ...getCameraPreset(vehicle, defaultPresetId),
    key: 0,
    immediate: true,
  }));
  const [colorId] = useState(vehicle.defaultColorId);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);

  const paint = useMemo(
    () => vehicle.colors.find((c) => c.id === colorId) ?? vehicle.colors[0],
    [vehicle.colors, colorId],
  );

  const viewPresets = useMemo(
    () => vehicle.cameraPresets.filter((p) => p.id !== defaultPresetId),
    [vehicle.cameraPresets, defaultPresetId],
  );

  const goToPreset = useCallback(
    (presetId: string) => {
      setActivePresetId(presetId);
      setSelectedFeatureId(null);
      setCameraMove((previous) => ({ ...getCameraPreset(vehicle, presetId), key: previous.key + 1 }));
    },
    [vehicle],
  );

  const resetView = useCallback(() => goToPreset(defaultPresetId), [goToPreset, defaultPresetId]);

  // Dragging/zooming leaves any named view, so un-highlight the preset buttons.
  const handleUserInteract = useCallback(() => setActivePresetId(null), []);

  /**
   * The single entry point for feature selection — used by taps on the 3D car
   * and by the feature menu alike. Selecting moves the camera to the feature;
   * clearing (null) leaves the camera where it is.
   */
  const selectFeature = useCallback(
    (featureId: string | null) => {
      const feature = featureId ? vehicle.features.find((f) => f.id === featureId) : undefined;
      setSelectedFeatureId(feature?.id ?? null);
      if (!feature?.camera) return;
      setActivePresetId(null);
      setCameraMove((previous) => ({ ...feature.camera!, key: previous.key + 1, fitVehicle: false }));
    },
    [vehicle.features],
  );

  // Escape closes the open feature.
  useEffect(() => {
    if (!selectedFeatureId) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedFeatureId(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedFeatureId]);

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-8 lg:px-12">
      <header className="flex flex-col gap-4 pt-8 sm:flex-row sm:items-end sm:justify-between sm:pt-12">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-ink-muted">
            {vehicle.subtitle}
          </p>
          <h1 className="mt-3 text-4xl font-light tracking-[-0.02em] text-ink sm:text-5xl lg:text-6xl">
            {vehicle.name}
          </h1>
        </div>
        <p className="text-sm text-ink-soft sm:text-right">
          Starting from
          <span className="ml-2 text-xl font-light tracking-tight text-ink sm:ml-0 sm:block sm:text-2xl">
            {vehicle.startingPrice}
          </span>
        </p>
      </header>

      <section aria-label="3D vehicle viewer" className="mt-4 sm:mt-6">
        <div className="@container/vehicle-viewer relative h-[48svh] min-h-[300px] w-full sm:h-[68vh] sm:min-h-[460px] lg:h-[74vh] lg:max-h-[860px]">
          <CarViewer
            model={vehicle.model}
            paint={paint}
            features={vehicle.features}
            selectedFeatureId={selectedFeatureId}
            onSelectFeature={selectFeature}
            cameraMove={cameraMove}
            fallbackImage={vehicle.fallbackImage}
            onUserInteract={handleUserInteract}
          />
        </div>

        <div className="mt-2 border-t border-line pt-3">
          <CameraControls
            presets={viewPresets}
            activePresetId={activePresetId}
            onSelect={goToPreset}
            onReset={resetView}
          />
          <p className="mt-3 text-center text-xs tracking-wide text-ink-muted">
            <span className="pointer-coarse:hidden">Drag to rotate · Scroll to zoom · Click a part to explore</span>
            <span className="hidden pointer-coarse:inline">Drag to rotate · Pinch to zoom · Tap a part to explore</span>
          </p>
        </div>
      </section>

      <FeatureMenu
        features={vehicle.features}
        selectedFeatureId={selectedFeatureId}
        onSelect={selectFeature}
      />

      {vehicle.modelCredit && (
        <footer className="py-10 text-center text-[11px] text-ink-muted">
          <a
            href={vehicle.modelCredit.href}
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-4 hover:underline"
          >
            {vehicle.modelCredit.text}
          </a>
        </footer>
      )}
    </div>
  );
}
