"use client";

import { useMemo } from "react";
import { useTexture } from "@react-three/drei";
import { BackSide, DoubleSide, MirroredRepeatWrapping, SRGBColorSpace, type Texture } from "three";

/** Round showroom centred on the turntable, so the glass wall follows the stage's curve. */
export const SHOWROOM_RADIUS = 18;
const FLOOR_Y = -0.152; // underside of the turntable (see CarStageFloor)
const CEILING_Y = 6.5;
const MULLIONS = 32;
const VIEW_RADIUS = 150;
const EYE_Y = 1.5;

/*
 * The view photo is a crop of an equirectangular panorama spanning 178° across
 * and +52.6° … −15.9° vertically ("Signal Hill Dawn", Greg Zaal / Poly Haven, CC0).
 * It's wrapped round a far cylinder, mirrored to fill 360°, at the heights those
 * angles land on from eye level — so the horizon sits where it should.
 */
const VIEW_SRC = "/textures/showroom/city-view.webp";
const VIEW_SPAN_DEG = 178;
const VIEW_TOP_DEG = 52.6;
const VIEW_BOTTOM_DEG = -15.9;
/** Turns the panorama so the harbour and city sit behind the car in the default view. */
const VIEW_YAW = 1.55;
/**
 * The camera looks down at the car, so only a thin band of window is on screen.
 * The photo's height is compressed by this factor, with its horizon placed just
 * above the sill, so that band shows evening sky over a far-off city.
 */
const VIEW_SQUASH = 1.9;
const VIEW_HORIZON_DEG = -1.2;

const noRaycast = () => null;
const deg = (d: number) => (d * Math.PI) / 180;

function prepareView(texture: Texture | Texture[]) {
  for (const t of Array.isArray(texture) ? texture : [texture]) {
    t.colorSpace = SRGBColorSpace;
    t.wrapS = MirroredRepeatWrapping;
    // Negative repeat un-mirrors the image, since it's seen from inside the cylinder.
    t.repeat.set(-360 / VIEW_SPAN_DEG, 1);
    t.anisotropy = 8;
  }
}

/**
 * The showroom around the stage: a far panorama seen through a curved glass
 * wall (window frames, knee wall), a glossy dark floor and a ceiling with a
 * glowing ring light. None of it is raycast, so taps go to the car.
 */
export function CarShowroom() {
  const view = useTexture(VIEW_SRC, prepareView);

  const elevation = (photoDeg: number) => deg(VIEW_HORIZON_DEG + photoDeg / VIEW_SQUASH);
  const viewBottom = EYE_Y + VIEW_RADIUS * Math.tan(elevation(VIEW_BOTTOM_DEG));
  const viewTop = EYE_Y + VIEW_RADIUS * Math.tan(elevation(VIEW_TOP_DEG));
  const wallHeight = CEILING_Y - FLOOR_Y;

  const mullions = useMemo(
    () => Array.from({ length: MULLIONS }, (_, i) => (i / MULLIONS) * Math.PI * 2),
    [],
  );

  return (
    <group>
      <color attach="background" args={["#0a111d"]} />

      {/* Far view */}
      <mesh position-y={(viewTop + viewBottom) / 2} rotation-y={VIEW_YAW} raycast={noRaycast}>
        <cylinderGeometry args={[VIEW_RADIUS, VIEW_RADIUS, viewTop - viewBottom, 96, 1, true]} />
        <meshBasicMaterial map={view} side={BackSide} toneMapped={false} fog={false} />
      </mesh>

      {/* Floor */}
      <mesh rotation-x={-Math.PI / 2} position-y={FLOOR_Y} raycast={noRaycast}>
        <circleGeometry args={[SHOWROOM_RADIUS + 0.5, 96]} />
        <meshStandardMaterial color="#141b29" metalness={0.55} roughness={0.28} />
      </mesh>

      {/* Knee wall along the base of the glass */}
      <mesh position-y={FLOOR_Y + 0.2} raycast={noRaycast}>
        <cylinderGeometry args={[SHOWROOM_RADIUS, SHOWROOM_RADIUS, 0.4, 128, 1, true]} />
        <meshStandardMaterial color="#0b111e" metalness={0.4} roughness={0.5} side={BackSide} />
      </mesh>
      {/* Faint glass sheen */}
      <mesh position-y={FLOOR_Y + wallHeight / 2} raycast={noRaycast}>
        <cylinderGeometry args={[SHOWROOM_RADIUS - 0.02, SHOWROOM_RADIUS - 0.02, wallHeight, 128, 1, true]} />
        <meshPhysicalMaterial
          color="#9fb8e0"
          transparent
          opacity={0.06}
          roughness={0.05}
          metalness={0.2}
          depthWrite={false}
          side={BackSide}
        />
      </mesh>

      {/* Window frames */}
      {mullions.map((angle) => (
        <mesh
          key={angle}
          position={[Math.sin(angle) * SHOWROOM_RADIUS, FLOOR_Y + wallHeight / 2, Math.cos(angle) * SHOWROOM_RADIUS]}
          rotation-y={angle}
          raycast={noRaycast}
        >
          <boxGeometry args={[0.28, wallHeight, 0.35]} />
          <meshStandardMaterial color="#0b111e" metalness={0.5} roughness={0.4} />
        </mesh>
      ))}
      {/* Sill line at the top of the knee wall */}
      <mesh position-y={FLOOR_Y + 0.4} rotation-x={Math.PI / 2} raycast={noRaycast}>
        <torusGeometry args={[SHOWROOM_RADIUS - 0.05, 0.03, 8, 160]} />
        <meshStandardMaterial color="#6f86ad" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Ceiling and ring light */}
      <mesh rotation-x={Math.PI / 2} position-y={CEILING_Y} raycast={noRaycast}>
        <circleGeometry args={[SHOWROOM_RADIUS + 0.5, 96]} />
        <meshStandardMaterial color="#070b14" roughness={0.9} side={DoubleSide} />
      </mesh>
      <mesh position-y={CEILING_Y - 0.25} rotation-x={Math.PI / 2} raycast={noRaycast}>
        <torusGeometry args={[SHOWROOM_RADIUS - 0.9, 0.07, 12, 192]} />
        <meshBasicMaterial color="#e8f4ff" toneMapped={false} />
      </mesh>
      <mesh position-y={CEILING_Y - 0.25} rotation-x={Math.PI / 2} raycast={noRaycast}>
        <torusGeometry args={[SHOWROOM_RADIUS - 0.9, 0.3, 12, 192]} />
        <meshBasicMaterial color="#6fa8ff" transparent opacity={0.18} toneMapped={false} depthWrite={false} />
      </mesh>
    </group>
  );
}
