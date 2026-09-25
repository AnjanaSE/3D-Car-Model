"use client";

import { AdditiveBlending, DoubleSide } from "three";

const RADIUS = 2.85;
const HALO_STEPS = 7;

/**
 * Showroom turntable: a slightly lighter platform disc with a glowing edge
 * ring. The halo is a few concentric rings with falling opacity — no shaders
 * or textures. Sits just below the contact shadow (see CarScene).
 */
export function CarStageFloor() {
  return (
    <group rotation-x={-Math.PI / 2} position-y={-0.012} raycast={() => null}>
      <mesh renderOrder={-2}>
        <circleGeometry args={[RADIUS, 96]} />
        <meshBasicMaterial color="#132038" transparent opacity={0.55} depthWrite={false} />
      </mesh>
      {/* Faint inner guide ring */}
      <mesh renderOrder={-1}>
        <ringGeometry args={[RADIUS * 0.72, RADIUS * 0.72 + 0.012, 128]} />
        <meshBasicMaterial color="#5c8fd6" transparent opacity={0.25} depthWrite={false} side={DoubleSide} />
      </mesh>
      {/* Bright edge */}
      <mesh renderOrder={-1}>
        <ringGeometry args={[RADIUS - 0.02, RADIUS + 0.02, 160]} />
        <meshBasicMaterial color="#9cc8ff" toneMapped={false} depthWrite={false} side={DoubleSide} />
      </mesh>
      {/* Soft halo either side of the edge */}
      {Array.from({ length: HALO_STEPS }, (_, i) => {
        const spread = 0.05 + i * 0.05;
        return (
          <mesh key={i} renderOrder={-1}>
            <ringGeometry args={[RADIUS - spread, RADIUS + spread, 160]} />
            <meshBasicMaterial
              color="#3b8bff"
              transparent
              opacity={0.06 * (1 - i / HALO_STEPS)}
              blending={AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
              side={DoubleSide}
            />
          </mesh>
        );
      })}
    </group>
  );
}
