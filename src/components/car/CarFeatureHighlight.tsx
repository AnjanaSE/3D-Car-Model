"use client";

import { useEffect, useMemo, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Material } from "three";
import { createFeatureHighlight } from "@/lib/three/materials";

interface CarFeatureHighlightProps {
  featureMaterials: Map<string, Material[]>;
  selectedFeatureId: string | null;
  hoveredFeatureRef: RefObject<string | null>;
}

/**
 * Brightens the selected (and, on desktop, hovered) feature's own meshes.
 * Only features with direct GLB meshes can be highlighted; proxy-only features
 * are indicated by their callout instead.
 */
export function CarFeatureHighlight({
  featureMaterials,
  selectedFeatureId,
  hoveredFeatureRef,
}: CarFeatureHighlightProps) {
  const highlight = useMemo(() => createFeatureHighlight(featureMaterials), [featureMaterials]);

  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => highlight.reset, [highlight]);
  // The canvas renders on demand: start the ease when the selection changes.
  useEffect(() => invalidate(), [selectedFeatureId, invalidate]);

  useFrame((state, delta) => {
    if (highlight.update(selectedFeatureId, hoveredFeatureRef.current, Math.min(delta, 0.1))) {
      state.invalidate();
    }
  });

  return null;
}
