"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { CameraView, Vehicle } from "@/types/vehicle";
import { getCameraPreset, type CameraMove } from "@/lib/three/camera";
import { scrollToVehicleDetails } from "@/lib/configurator/scroll";
import { CarLoader } from "@/components/car/CarLoader";
import { CameraControls } from "./CameraControls";
import { ColorSelector } from "./ColorSelector";
import { VehicleDetails } from "./VehicleDetails";
import { useVehicleInteraction, type VehicleInteractionState } from "./useVehicleInteraction";

// Three.js is browser-only and heavy: keep it out of the server render and the initial bundle.
const CarViewer = dynamic(() => import("@/components/car/CarViewer"), {
  ssr: false,
  loading: () => <CarLoader />,
});

interface CarConfiguratorProps {
  vehicle: Vehicle;
}

/** One-line summary of the latest selection, shown under the car once details exist. */
function selectionSummary(vehicle: Vehicle, state: VehicleInteractionState): string | null {
  const selection = state.lastSelection;
  if (selection?.type === "colour") return vehicle.colors.find((c) => c.id === selection.id)?.name ?? null;
  if (selection?.type === "feature") {
    const feature = vehicle.features.find((f) => f.id === selection.id);
    if (!feature) return null;
    if (!feature.toggle) return feature.title;
    return `${feature.title} · ${state.featureOn[feature.id] ? feature.toggle.onLabel : feature.toggle.offLabel}`;
  }
  return null;
}

/**
 * Configurator shell. Receives a `Vehicle` from any source (local demo data
 * today, an API later). The first screen is the car alone; the details below
 * appear after the first meaningful selection (see `useVehicleInteraction`).
 * Camera exploration — rotate, zoom, view presets — never reveals them.
 */
export function CarConfigurator({ vehicle }: CarConfiguratorProps) {
  const defaultPresetId = vehicle.defaultCameraPresetId;
  const [activePresetId, setActivePresetId] = useState<string | null>(defaultPresetId);
  const [cameraMove, setCameraMove] = useState<CameraMove>(() => ({
    ...getCameraPreset(vehicle, defaultPresetId),
    key: 0,
    immediate: true,
  }));
  const [state, actions] = useVehicleInteraction(vehicle.defaultColorId);
  const { clearFeature, selectFeature, toggleFeature, selectColour, markVehicleInteraction } = actions;

  const paint = useMemo(
    () => vehicle.colors.find((c) => c.id === state.selectedColourId) ?? vehicle.colors[0],
    [vehicle.colors, state.selectedColourId],
  );

  const onFeatureIds = useMemo(
    () => Object.keys(state.featureOn).filter((id) => state.featureOn[id]),
    [state.featureOn],
  );

  const viewPresets = useMemo(
    () => vehicle.cameraPresets.filter((p) => p.id !== defaultPresetId),
    [vehicle.cameraPresets, defaultPresetId],
  );

  const moveCamera = useCallback((view: CameraView, fitVehicle = true) => {
    setCameraMove((previous) => ({ ...view, key: previous.key + 1, fitVehicle }));
  }, []);

  // Camera presets are exploration: they close any open feature but never count as interaction.
  const goToPreset = useCallback(
    (presetId: string) => {
      setActivePresetId(presetId);
      clearFeature();
      moveCamera(getCameraPreset(vehicle, presetId));
    },
    [vehicle, clearFeature, moveCamera],
  );

  const resetView = useCallback(() => goToPreset(defaultPresetId), [goToPreset, defaultPresetId]);

  // Dragging/zooming leaves any named view, so un-highlight the preset buttons.
  const handleUserInteract = useCallback(() => setActivePresetId(null), []);

  const focusFeature = useCallback(
    (featureId: string) => {
      const feature = vehicle.features.find((f) => f.id === featureId);
      if (!feature?.camera) return;
      setActivePresetId(null);
      moveCamera(feature.camera, false);
    },
    [vehicle.features, moveCamera],
  );

  /**
   * A tap on the car. Switchable features (headlights) toggle on each tap;
   * others are selected. Tapping bodywork that isn't a feature closes the
   * current one. The page never auto-scrolls here — the customer stays on the car.
   */
  const handleFeatureTap = useCallback(
    (featureId: string | null) => {
      const feature = featureId ? vehicle.features.find((f) => f.id === featureId) : undefined;
      if (!feature) return clearFeature();
      if (feature.toggle) toggleFeature(feature.id);
      else selectFeature(feature.id);
      focusFeature(feature.id);
    },
    [vehicle.features, clearFeature, toggleFeature, selectFeature, focusFeature],
  );

  // Closing from the callout (×) or a background tap.
  const handleSelectFeature = useCallback(
    (featureId: string | null) => {
      if (featureId === null) clearFeature();
      else selectFeature(featureId);
    },
    [clearFeature, selectFeature],
  );

  // Choosing from the dedicated feature menu: explicit, so bring its details into view.
  const handleMenuSelectFeature = useCallback(
    (featureId: string) => {
      selectFeature(featureId);
      focusFeature(featureId);
      scrollToVehicleDetails();
    },
    [selectFeature, focusFeature],
  );

  // Escape closes the open feature.
  useEffect(() => {
    if (!state.selectedFeatureId) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") clearFeature();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [state.selectedFeatureId, clearFeature]);

  const summary = state.hasInteracted ? selectionSummary(vehicle, state) : null;

  return (
    <>
      {/* First screen: the car alone. min-height (not a fixed height) so the page can still scroll. */}
      <section aria-label={`${vehicle.name} configurator`} className="flex min-h-[100svh] flex-col">
        <div className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-4 sm:px-8 lg:px-12">
          <header className="flex items-end justify-between gap-4 pt-6 sm:pt-8">
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-ink-muted sm:text-[11px]">
                {vehicle.subtitle}
              </p>
              <h1 className="mt-2 text-3xl font-light tracking-[-0.02em] text-ink sm:text-4xl lg:text-5xl">
                {vehicle.name}
              </h1>
            </div>
            <p className="hidden shrink-0 text-right text-sm text-ink-soft sm:block">
              Starting from
              <span className="block text-xl font-light tracking-tight text-ink lg:text-2xl">
                {vehicle.startingPrice}
              </span>
            </p>
          </header>

          {/* The viewer takes whatever height the header and controls leave. */}
          <div className="@container/vehicle-viewer relative min-h-[300px] flex-1">
            <div className="absolute inset-0">
              <CarViewer
                model={vehicle.model}
                paint={paint}
                features={vehicle.features}
                selectedFeatureId={state.selectedFeatureId}
                onFeatureIds={onFeatureIds}
                onSelectFeature={handleSelectFeature}
                onFeatureTap={handleFeatureTap}
                cameraMove={cameraMove}
                fallbackImage={vehicle.fallbackImage}
                onUserInteract={handleUserInteract}
              />
            </div>
          </div>

          <div className="border-t border-line pt-2 pb-3 sm:pb-4">
            <div className="flex flex-col gap-1 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
              <ColorSelector colors={vehicle.colors} selectedId={paint?.id ?? ""} onSelect={selectColour} />
              <CameraControls
                presets={viewPresets}
                activePresetId={activePresetId}
                onSelect={goToPreset}
                onReset={resetView}
              />
            </div>

            <div className="mt-2 flex min-h-11 items-center justify-center gap-4 text-xs tracking-wide text-ink-muted">
              {summary ? (
                <>
                  <span aria-live="polite" data-selection-summary className="truncate text-ink-soft">
                    {summary}
                  </span>
                  <button
                    type="button"
                    onClick={() => scrollToVehicleDetails()}
                    className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-ink transition-colors hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-ink"
                  >
                    View details
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <path d="M6 2v8M2.5 6.5 6 10l3.5-3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </>
              ) : (
                <>
                  <span className="pointer-coarse:hidden">Drag to rotate · Scroll to zoom · Click a part to explore</span>
                  <span className="hidden pointer-coarse:inline">Drag to rotate · Pinch to zoom · Tap a part to explore</span>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {state.hasInteracted && (
        <VehicleDetails
          vehicle={vehicle}
          state={state}
          onMenuSelectFeature={handleMenuSelectFeature}
          onToggleFeature={toggleFeature}
          onSpecificationCategory={markVehicleInteraction}
        />
      )}

      {vehicle.modelCredit && (
        <footer className="py-6 text-center text-[11px] text-ink-muted">
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
    </>
  );
}
