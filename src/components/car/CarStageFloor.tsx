"use client";

import { AdditiveBlending, DoubleSide } from "three";

const RADIUS = 2.85;
const HEIGHT = 0.14;
const HALO_STEPS = 7;
const noRaycast = () => null;

/**
 * Raised turntable the car stands on: a satin platform with a light top (so
 * every paint reads clearly against it), a glowing edge ring and a soft halo —
 * no shaders or textures. Its top sits just below the contact shadow (see
 * CarScene). Not raycastable, so taps and hotspot occlusion ignore it.
 */
export function CarStageFloor() {
  return (
    <group>
      {/* Platform side */}
      <mesh position-y={-0.012 - HEIGHT / 2} raycast={noRaycast}>
        <cylinderGeometry args={[RADIUS, RADIUS + 0.06, HEIGHT, 128, 1, true]} />
        <meshStandardMaterial color="#1b2230" metalness={0.6} roughness={0.35} side={DoubleSide} />
      </mesh>
      <group rotation-x={-Math.PI / 2} position-y={-0.012}>
        {/* Top surface */}
        <mesh renderOrder={-2} raycast={noRaycast}>
          <circleGeometry args={[RADIUS, 128]} />
          <meshStandardMaterial color="#5a6477" metalness={0.55} roughness={0.32} />
        </mesh>
        {/* Faint inner guide ring */}
        <mesh renderOrder={-1} raycast={noRaycast}>
          <ringGeometry args={[RADIUS * 0.72, RADIUS * 0.72 + 0.012, 128]} />
          <meshBasicMaterial color="#8fa6c6" transparent opacity={0.45} depthWrite={false} side={DoubleSide} />
        </mesh>
        {/* Glowing edge */}
        <mesh renderOrder={-1} raycast={noRaycast}>
          <ringGeometry args={[RADIUS - 0.03, RADIUS + 0.005, 160]} />
          <meshBasicMaterial color="#e3f1ff" toneMapped={false} depthWrite={false} side={DoubleSide} />
        </mesh>
        {/* Soft halo outside the edge */}
        {Array.from({ length: HALO_STEPS }, (_, i) => {
          const spread = 0.05 + i * 0.05;
          return (
            <mesh key={i} renderOrder={-1} raycast={noRaycast}>
              <ringGeometry args={[RADIUS, RADIUS + spread, 160]} />
              <meshBasicMaterial
                color="#3b8bff"
                transparent
                opacity={0.11 * (1 - i / HALO_STEPS)}
                blending={AdditiveBlending}
                depthWrite={false}
                toneMapped={false}
                side={DoubleSide}
              />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}
