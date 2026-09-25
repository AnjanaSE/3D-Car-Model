"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import type { CameraView, Vehicle, VehicleViewModeId } from "@/types/vehicle";
import { getCameraPreset, type CameraMove } from "@/lib/three/camera";
import { scrollToVehicleDetails } from "@/lib/configurator/scroll";
import { CarLoader } from "@/components/car/CarLoader";
import { CameraControls } from "./CameraControls";
import { ColorSelector } from "./ColorSelector";
import { SideNav, type SideNavItem } from "./SideNav";
import { InfoPanel, type InfoPanelContent } from "./InfoPanel";
import { useFullscreen } from "./useFullscreen";
import styles from "./CarConfigurator.module.scss";
import { VehicleDetails } from "./VehicleDetails";
import { useVehicleInteraction, type VehicleInteractionState } from "./useVehicleInteraction";

// Three.js is browser-only and heavy: keep it out of the server render and the initial bundle.
const CarViewer = dynamic(() => import("@/components/car/CarViewer"), {
  ssr: false,
  loading: () => <CarLoader />,
});

interface CarConfiguratorProps {
  vehicle: Vehicle;
  /** Optional model picker shown in the header (see VehicleShowroom). */
  vehicleSwitcher?: ReactNode;
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
export function CarConfigurator({ vehicle, vehicleSwitcher }: CarConfiguratorProps) {
  const defaultPresetId = vehicle.defaultCameraPresetId;
  const [activePresetId, setActivePresetId] = useState<string | null>(defaultPresetId);
  const [cameraMove, setCameraMove] = useState<CameraMove>(() => ({
    ...getCameraPreset(vehicle, defaultPresetId),
    key: 0,
    immediate: true,
  }));
  const [viewModeId, setViewModeId] = useState<VehicleViewModeId>("exterior");
  /** Specification category open in the side panel (from the side nav). */
  const [specGroupId, setSpecGroupId] = useState<string | null>(null);
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

  const viewMode = vehicle.viewModes.find((mode) => mode.id === viewModeId);
  // Each view mode can tighten the orbit (e.g. a short range inside the cabin).
  const orbitLimits = useMemo(
    () => ({ ...vehicle.model.orbit, ...viewMode?.orbit }),
    [vehicle.model.orbit, viewMode],
  );

  const viewPresets = useMemo(
    () => vehicle.cameraPresets.filter((p) => p.id !== defaultPresetId),
    [vehicle.cameraPresets, defaultPresetId],
  );

  const moveCamera = useCallback((view: CameraView, fitVehicle = true) => {
    setCameraMove((previous) => ({ ...view, key: previous.key + 1, fitVehicle }));
  }, []);

  // Camera presets are exploration: they close any open feature but never count as interaction.
  // They are exterior views, so they also leave the interior.
  const goToPreset = useCallback(
    (presetId: string) => {
      setViewModeId("exterior");
      setActivePresetId(presetId);
      clearFeature();
      moveCamera(getCameraPreset(vehicle, presetId));
    },
    [vehicle, clearFeature, moveCamera],
  );

  /** Exterior ↔ interior. Exploration too: it moves the camera but doesn't reveal the details. */
  const selectViewMode = useCallback(
    (id: VehicleViewModeId) => {
      const mode = vehicle.viewModes.find((m) => m.id === id);
      if (!mode?.available) return;
      clearFeature();
      setViewModeId(id);
      if (mode.camera) {
        setActivePresetId(null);
        moveCamera(mode.camera, false);
      } else {
        setActivePresetId(defaultPresetId);
        moveCamera(getCameraPreset(vehicle, defaultPresetId));
      }
    },
    [vehicle, clearFeature, moveCamera, defaultPresetId],
  );

  // Reset returns to the start of the current view.
  const resetView = useCallback(
    () => (viewModeId === "exterior" ? goToPreset(defaultPresetId) : selectViewMode(viewModeId)),
    [viewModeId, goToPreset, defaultPresetId, selectViewMode],
  );

  // Dragging/zooming leaves any named view, so un-highlight the preset buttons.
  const handleUserInteract = useCallback(() => setActivePresetId(null), []);

  const focusFeature = useCallback(
    (featureId: string) => {
      const feature = vehicle.features.find((f) => f.id === featureId);
      if (!feature) return;
      // A feature lives in one view (e.g. the steering wheel is interior); go there.
      setViewModeId(feature.viewMode ?? "exterior");
      if (!feature.camera) return;
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
      setSpecGroupId(null);
      if (feature.toggle) toggleFeature(feature.id);
      else selectFeature(feature.id);
      focusFeature(feature.id);
    },
    [vehicle.features, clearFeature, toggleFeature, selectFeature, focusFeature],
  );

  // Hotspot "+" buttons (open / close a feature) and background taps (null → close).
  const handleSelectFeature = useCallback(
    (featureId: string | null) => {
      if (featureId === null || featureId === state.selectedFeatureId) return clearFeature();
      setSpecGroupId(null);
      selectFeature(featureId);
      focusFeature(featureId);
    },
    [state.selectedFeatureId, clearFeature, selectFeature, focusFeature],
  );

  // Choosing from the dedicated feature menu: explicit, so bring its details into view.
  const handleMenuSelectFeature = useCallback(
    (featureId: string) => {
      setSpecGroupId(null);
      selectFeature(featureId);
      focusFeature(featureId);
      scrollToVehicleDetails();
    },
    [selectFeature, focusFeature],
  );

  // Double-click / double-tap on the car: step inside, or back out.
  const handleDoubleTap = useCallback(() => {
    setSpecGroupId(null);
    selectViewMode(viewModeId === "interior" ? "exterior" : "interior");
  }, [viewModeId, selectViewMode]);

  /** Side nav: view modes switch the 3D view; spec categories open in the panel. */
  const navItems = useMemo<SideNavItem[]>(
    () => [
      ...vehicle.viewModes.filter((m) => m.available).map((m) => ({ id: m.id, label: m.label })),
      ...(vehicle.navSpecGroupIds ?? []).flatMap((id) => {
        const group = vehicle.specifications.find((g) => g.id === id);
        return group ? [{ id: group.id, label: group.title }] : [];
      }),
    ],
    [vehicle.viewModes, vehicle.navSpecGroupIds, vehicle.specifications],
  );

  const handleNav = useCallback(
    (id: string) => {
      if (vehicle.viewModes.some((m) => m.id === id)) {
        setSpecGroupId(null);
        selectViewMode(id as VehicleViewModeId);
        return;
      }
      // Choosing a specification category is a meaningful interaction.
      clearFeature();
      setSpecGroupId((current) => (current === id ? null : id));
      markVehicleInteraction();
    },
    [vehicle.viewModes, selectViewMode, clearFeature, markVehicleInteraction],
  );

  const closePanel = useCallback(() => {
    clearFeature();
    setSpecGroupId(null);
  }, [clearFeature]);

  // Escape closes the open panel.
  useEffect(() => {
    if (!state.selectedFeatureId && !specGroupId) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePanel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [state.selectedFeatureId, specGroupId, closePanel]);

  const selectedFeature = vehicle.features.find((f) => f.id === state.selectedFeatureId);
  const specGroup = vehicle.specifications.find((g) => g.id === specGroupId);
  const panel: InfoPanelContent | null = selectedFeature
    ? { kind: "feature", feature: selectedFeature, on: Boolean(state.featureOn[selectedFeature.id]) }
    : specGroup
      ? { kind: "specs", group: specGroup }
      : null;

  const summary = state.hasInteracted ? selectionSummary(vehicle, state) : null;
  const { stageRef, isFullscreen, toggleFullscreen } = useFullscreen<HTMLElement>();

  return (
    <>
      {/* The showroom: the car fills the first screen; UI floats over it. */}
      <section ref={stageRef} aria-label={`${vehicle.name} configurator`} className={styles.stage}>
        <div className={styles.viewer}>
          <CarViewer
            model={vehicle.model}
            orbitLimits={orbitLimits}
            viewMode={viewModeId}
            paint={paint}
            features={vehicle.features}
            selectedFeatureId={state.selectedFeatureId}
            onFeatureIds={onFeatureIds}
            onSelectFeature={handleSelectFeature}
            onFeatureTap={handleFeatureTap}
            onDoubleTap={handleDoubleTap}
            cameraMove={cameraMove}
            fallbackImage={vehicle.fallbackImage}
            onUserInteract={handleUserInteract}
          />
        </div>

        <header className={styles.header}>
          <div>
            <h1 className={styles.name}>{vehicle.name}</h1>
            <p className={styles.subtitle}>{vehicle.subtitle}</p>
          </div>
          <div className={styles.headerActions}>
            {vehicleSwitcher}
            <p className={styles.price}>
              Starting from <strong>{vehicle.startingPrice}</strong>
            </p>
            <button
              type="button"
              className={styles.iconButton}
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? "Exit full screen" : "Full screen"}
              aria-pressed={isFullscreen}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path
                  d={isFullscreen ? "M7 2v5H2M11 2v5h5M7 16v-5H2M11 16v-5h5" : "M2 7V2h5M16 7V2h-5M2 11v5h5M16 11v5h-5"}
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </header>

        <div className={styles.nav}>
          <SideNav items={navItems} activeId={specGroupId ?? viewModeId} onSelect={handleNav} />
        </div>

        {panel && (
          <div className={styles.panel}>
            <InfoPanel
              content={panel}
              onClose={closePanel}
              onToggle={toggleFeature}
              onExplore={() => scrollToVehicleDetails()}
            />
          </div>
        )}

        <div className={styles.bottom} data-panel-open={panel !== null}>
          <div className={styles.identity}>
            <p className={styles.identityName}>{vehicle.name}</p>
            {vehicle.tags && <p className={styles.tags}>{vehicle.tags.join("  |  ")}</p>}
          </div>

          <div className={styles.hint}>
            <RotateHint />
            {summary ? (
              <p className={styles.hintText}>
                <span data-selection-summary>{summary}</span>
                <button type="button" className={styles.detailsLink} onClick={() => scrollToVehicleDetails()}>
                  View details ↓
                </button>
              </p>
            ) : (
              <p className={styles.hintText}>
                {viewMode?.hint ?? "Drag to rotate"}
                <span className={styles.hintSecondary}>
                  {viewModeId === "interior" ? " · Double-click to step out" : " · Double-click to enter"}
                </span>
              </p>
            )}
          </div>

          <div className={styles.controls}>
            <ColorSelector colors={vehicle.colors} selectedId={paint?.id ?? ""} onSelect={selectColour} />
            <CameraControls
              presets={viewPresets}
              activePresetId={activePresetId}
              onSelect={goToPreset}
              onReset={resetView}
            />
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
          {vehicle.modelCredit.href ? (
            <a
              href={vehicle.modelCredit.href}
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-4 hover:underline"
            >
              {vehicle.modelCredit.text}
            </a>
          ) : (
            vehicle.modelCredit.text
          )}
        </footer>
      )}
    </>
  );
}

/** "360°" ellipse with arrows under the car, as on a showroom turntable. */
function RotateHint() {
  return (
    <svg className={styles.rotate} width="190" height="44" viewBox="0 0 190 44" fill="none" aria-hidden="true">
      <path d="M58 32C26 29 6 24 6 18 6 10 46 4 95 4s89 6 89 14c0 6-20 11-52 14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M126 28l7 4-6 5M64 28l-7 4 6 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <text x="95" y="38" textAnchor="middle" fill="currentColor" fontSize="18" fontWeight="500" letterSpacing="0.5">
        360°
      </text>
    </svg>
  );
}
