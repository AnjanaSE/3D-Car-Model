"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { Box3, type Group } from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import type { Vehicle3DConfig, VehicleColor, VehicleFeature } from "@/types/vehicle";
import { applyPaint, dampPaint, resolvePaint } from "@/lib/three/materials";
import { logModelInspection, prepareVehicleModel } from "@/lib/three/model";
import { CarFeatureHighlight } from "./CarFeatureHighlight";
import { CarPartAnimator } from "./CarPartAnimator";

const PAINT_TRANSITION_SPEED = 6;

interface CarModelProps {
  config: Vehicle3DConfig;
  paint: VehicleColor;
  /** Features whose `meshNames` make GLB meshes directly clickable. */
  features: VehicleFeature[];
  selectedFeatureId: string | null;
  onFeatureIds: readonly string[];
  hoveredFeatureRef: RefObject<string | null>;
  /** Called once the model is mounted, with its world-space bounds (used for camera framing). */
  onReady?: (bounds: Box3) => void;
}

/**
 * Loads the GLB, maps its meshes to material roles and keeps the body paint in
 * sync with `paint`. Changing the paint eases the existing materials; the model
 * is never reloaded.
 */
export function CarModel({
  config,
  paint,
  features,
  selectedFeatureId,
  onFeatureIds,
  hoveredFeatureRef,
  onReady,
}: CarModelProps) {
  const { scene } = useGLTF(config.url, config.dracoDecoderPath ?? false);
  const invalidate = useThree((state) => state.invalidate);

  const { meshMapping, transform } = config;
  const prepared = useMemo(
    () => prepareVehicleModel(scene, { meshMapping, transform }, features),
    [scene, meshMapping, transform, features],
  );

  useEffect(() => {
    logModelInspection(config.url, prepared.report);
    return prepared.dispose;
  }, [prepared, config.url]);

  const paintTarget = useMemo(() => resolvePaint(paint), [paint]);
  const paintedModel = useRef<typeof prepared | null>(null);
  const paintMoving = useRef(false);

  useEffect(() => {
    if (paintedModel.current !== prepared) {
      // First paint is applied instantly so the car never loads in the wrong colour.
      applyPaint(prepared.paintMaterials, paintTarget);
      paintedModel.current = prepared;
    } else {
      paintMoving.current = true;
    }
    invalidate();
  }, [prepared, paintTarget, invalidate]);

  useFrame((state, delta) => {
    if (!paintMoving.current) return;
    paintMoving.current = dampPaint(
      prepared.paintMaterials,
      paintTarget,
      PAINT_TRANSITION_SPEED,
      Math.min(delta, 0.1),
    );
    // The canvas renders on demand; keep frames coming until the paint settles.
    state.invalidate();
  });

  const groupRef = useRef<Group>(null);
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    group.updateWorldMatrix(true, true);
    onReady?.(new Box3().setFromObject(group));
  }, [prepared, onReady]);

  return (
    <group ref={groupRef} position={transform.position} rotation={transform.rotation} scale={transform.scale}>
      <primitive object={prepared.root} />
      <CarPartAnimator root={prepared.root} features={features} onFeatureIds={onFeatureIds} />
      <CarFeatureHighlight
        featureMaterials={prepared.featureMaterials}
        features={features}
        selectedFeatureId={selectedFeatureId}
        onFeatureIds={onFeatureIds}
        hoveredFeatureRef={hoveredFeatureRef}
      />
    </group>
  );
}

export function clearCarModel(url: string) {
  useGLTF.clear(url);
}
