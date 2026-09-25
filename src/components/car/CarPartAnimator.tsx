"use client";

import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Object3D } from "three";
import type { VehicleFeature } from "@/types/vehicle";
import { createPartAnimator } from "@/lib/three/animation";

interface CarPartAnimatorProps {
  root: Object3D;
  features: VehicleFeature[];
  onFeatureIds: readonly string[];
}

/** Opens/closes animated parts (e.g. doors) as their features switch on and off. */
export function CarPartAnimator({ root, features, onFeatureIds }: CarPartAnimatorProps) {
  const animator = useMemo(() => createPartAnimator(root, features), [root, features]);
  const onIds = useMemo(() => new Set(onFeatureIds), [onFeatureIds]);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => animator.reset, [animator]);
  useEffect(() => invalidate(), [onIds, invalidate]);

  useFrame((state, delta) => {
    if (animator.update(onIds, Math.min(delta, 0.1))) state.invalidate();
  });

  return null;
}
