"use client";

import { useEffect, useMemo, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Material } from "three";
import type { VehicleFeature } from "@/types/vehicle";
import { createFeatureHighlight } from "@/lib/three/materials";

interface CarFeatureHighlightProps {
  featureMaterials: Map<string, Material[]>;
  features: VehicleFeature[];
  selectedFeatureId: string | null;
  /** Switchable features that are currently on (e.g. headlights). */
  onFeatureIds: readonly string[];
  hoveredFeatureRef: RefObject<string | null>;
}

/**
 * Brightens the selected (and, on desktop, hovered) feature's own meshes, and
 * makes switchable features glow while on. Only features with direct GLB meshes
 * can be lit; proxy-only features are indicated by their callout instead.
 */
export function CarFeatureHighlight({
  featureMaterials,
  features,
  selectedFeatureId,
  onFeatureIds,
  hoveredFeatureRef,
}: CarFeatureHighlightProps) {
  const highlight = useMemo(() => {
    const glows = new Map(
      features.flatMap((f) => (f.toggle?.emissive ? [[f.id, f.toggle.emissive] as const] : [])),
    );
    return createFeatureHighlight(featureMaterials, glows);
  }, [featureMaterials, features]);
  const onIds = useMemo(() => new Set(onFeatureIds), [onFeatureIds]);

  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => highlight.reset, [highlight]);
  // The canvas renders on demand: start the ease when selection or on/off state changes.
  useEffect(() => invalidate(), [selectedFeatureId, onIds, invalidate]);

  useFrame((state, delta) => {
    if (highlight.update(selectedFeatureId, hoveredFeatureRef.current, onIds, Math.min(delta, 0.1))) {
      state.invalidate();
    }
  });

  return null;
}
