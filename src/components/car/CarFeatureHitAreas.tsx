"use client";

import { memo } from "react";
import type { VehicleFeature } from "@/types/vehicle";
import { FEATURE_ID_KEY } from "@/lib/three/model";
import { HIT_AREA_PREFIX } from "@/lib/three/debug";

interface CarFeatureHitAreasProps {
  features: VehicleFeature[];
  /** Draw the hit areas as wireframes (debug mode only). */
  debug?: boolean;
}

/**
 * Method B: invisible proxy shapes for parts that aren't separate meshes in the
 * GLB. They are `visible={false}`, which three.js still raycasts, so they cost
 * no draw calls. Clicks are handled by `CarFeatureInteraction`, which reads the
 * feature id from `userData` — the same path as directly clickable meshes.
 */
export const CarFeatureHitAreas = memo(function CarFeatureHitAreas({
  features,
  debug = false,
}: CarFeatureHitAreasProps) {
  return (
    <group name="feature-hit-areas">
      {features.flatMap((feature) =>
        (feature.hitAreas ?? []).map((area, index) => (
          <mesh
            key={`${feature.id}-${index}`}
            name={`${HIT_AREA_PREFIX}${feature.id}:${index}`}
            position={area.position}
            rotation={area.type === "box" ? area.rotation : undefined}
            userData={{ [FEATURE_ID_KEY]: feature.id }}
            visible={debug}
          >
            {area.type === "sphere" ? (
              <sphereGeometry args={[area.radius, 16, 12]} />
            ) : (
              <boxGeometry args={area.size} />
            )}
            <meshBasicMaterial color="#00a3ff" wireframe transparent opacity={0.6} depthWrite={false} />
          </mesh>
        )),
      )}
    </group>
  );
});
