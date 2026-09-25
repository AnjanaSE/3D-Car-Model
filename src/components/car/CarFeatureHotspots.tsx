"use client";

import { useCallback, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html, Line } from "@react-three/drei";
import { Raycaster, Vector3, type Group, type Mesh, type Object3D } from "three";
import type { VehicleFeature } from "@/types/vehicle";
import { VEHICLE_ROOT_NAME } from "@/lib/three/model";
import styles from "./CarFeatureHotspots.module.scss";

/** Drawn over the car so leader lines never disappear behind bodywork. */
const OVERLAY_RENDER_ORDER = 10;
/** Anchor dot radius as a fraction of camera distance: constant size on screen. */
const DOT_SCALE = 0.006;
/** An anchor is hidden when something opaque is this far (m) in front of it. */
const OCCLUSION_MARGIN = 0.08;
/** Labels within this distance (px) of the viewer's side edges extend inwards. */
const EDGE_FLIP_PX = 180;

const raycaster = new Raycaster();
const scratch = { anchor: new Vector3(), label: new Vector3(), dir: new Vector3() };

type HotspotState = { show: boolean; side: "left" | "right" };

function applyToButton(button: HTMLButtonElement, { show, side }: HotspotState) {
  button.dataset.hidden = String(!show);
  button.dataset.side = side;
  button.tabIndex = show ? 0 : -1;
}

function isOpaque(object: Object3D) {
  const material = (object as Mesh).material;
  return !Array.isArray(material) && !material?.transparent;
}

interface HotspotProps {
  feature: VehicleFeature;
  selected: boolean;
  onSelect: (featureId: string) => void;
}

/**
 * One on-car marker: leader line from the part (anchor) to a "+" button with
 * its label. Hidden while the anchor is behind the car. Per-frame work writes
 * straight to three.js objects and the DOM, so no React re-renders.
 */
function Hotspot({ feature, selected, onSelect }: HotspotProps) {
  const { anchor, elbow, label } = feature.callout;
  const groupRef = useRef<Group>(null);
  const dotRef = useRef<Group>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  // Latest per-frame result, applied to the button whenever it exists.
  const state = useRef<HotspotState>({ show: true, side: "right" });
  const invalidate = useThree((s) => s.invalidate);

  // drei mounts Html content in its own React root, after the scene's first
  // frames: apply the latest result as soon as the button exists, then
  // request a frame so it's recomputed for the current camera.
  const setButtonRef = useCallback(
    (button: HTMLButtonElement | null) => {
      buttonRef.current = button;
      if (!button) return;
      applyToButton(button, state.current);
      invalidate();
    },
    [invalidate],
  );

  useFrame(({ camera, scene, size }) => {
    const anchorPoint = scratch.anchor.set(...anchor);
    const distance = camera.position.distanceTo(anchorPoint);
    dotRef.current?.scale.setScalar(distance * DOT_SCALE);

    // Occlusion: is any opaque part of the car between the camera and the anchor?
    let occluded = false;
    const car = scene.getObjectByName(VEHICLE_ROOT_NAME);
    if (car) {
      raycaster.set(camera.position, scratch.dir.copy(anchorPoint).sub(camera.position).normalize());
      raycaster.far = Math.max(distance - OCCLUSION_MARGIN, 0);
      occluded = raycaster.intersectObject(car, true).some((hit) => isOpaque(hit.object));
    }
    const show = !occluded || selected;
    if (groupRef.current) groupRef.current.visible = show;

    // Label on the side facing away from the part, flipped near the viewer edges.
    const a = anchorPoint.project(camera);
    const l = scratch.label.set(...label).project(camera);
    const labelX = ((l.x + 1) / 2) * size.width;
    let side: "left" | "right" = l.x >= a.x ? "right" : "left";
    if (labelX < EDGE_FLIP_PX) side = "right";
    else if (labelX > size.width - EDGE_FLIP_PX) side = "left";

    const previous = state.current;
    state.current = { show, side };
    const button = buttonRef.current;
    if (button && (previous.show !== show || previous.side !== side || button.dataset.hidden === undefined)) {
      applyToButton(button, state.current);
    }
  });

  return (
    <>
      <group ref={groupRef}>
        <Line
          points={[anchor, elbow, label]}
          color={selected ? "#8fc0ff" : "#ffffff"}
          lineWidth={selected ? 1.5 : 1}
          transparent
          opacity={selected ? 0.95 : 0.55}
          depthTest={false}
          renderOrder={OVERLAY_RENDER_ORDER}
        />
        <group ref={dotRef} position={anchor} scale={0.04}>
          <mesh renderOrder={OVERLAY_RENDER_ORDER}>
            <sphereGeometry args={[1, 16, 12]} />
            <meshBasicMaterial color="#3b8bff" transparent opacity={0.35} depthTest={false} />
          </mesh>
          <mesh renderOrder={OVERLAY_RENDER_ORDER + 1}>
            <sphereGeometry args={[0.45, 16, 12]} />
            <meshBasicMaterial color="#ffffff" depthTest={false} />
          </mesh>
        </group>
      </group>
      <Html position={label} zIndexRange={[20, 0]} className={styles.anchor}>
        <button
          ref={setButtonRef}
          type="button"
          className={styles.hotspot}
          data-side="right"
          aria-pressed={selected}
          aria-label={feature.title}
          onClick={(event) => {
            event.stopPropagation();
            onSelect(feature.id);
          }}
        >
          <span className={styles.plus} aria-hidden="true" />
          <span className={styles.label}>{feature.shortTitle ?? feature.title}</span>
        </button>
      </Html>
    </>
  );
}

interface CarFeatureHotspotsProps {
  features: VehicleFeature[];
  selectedFeatureId: string | null;
  onSelect: (featureId: string) => void;
}

/** Always-visible "+" markers for the current view's features. */
export function CarFeatureHotspots({ features, selectedFeatureId, onSelect }: CarFeatureHotspotsProps) {
  return (
    <>
      {features.map((feature) => (
        <Hotspot
          key={feature.id}
          feature={feature}
          selected={feature.id === selectedFeatureId}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}
