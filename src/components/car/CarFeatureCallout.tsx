"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, Line } from "@react-three/drei";
import { Vector3 } from "three";
import type { VehicleFeature } from "@/types/vehicle";
import styles from "./CarFeatureCallout.module.scss";

/** Drawn over the car so the leader line never disappears behind bodywork. */
const OVERLAY_RENDER_ORDER = 10;
/** Gap between the line end and the card, and minimum margin to the viewer edge (px). */
const CARD_GAP = 10;
const EDGE_MARGIN = 12;

interface CarFeatureCalloutProps {
  feature: VehicleFeature;
  onClose: () => void;
}

/**
 * 3D leader line from the part to a label. The line lives in the scene, so it
 * turns with the car; the label is DOM (drei `Html`) pinned to the line's end.
 */
export function CarFeatureCallout({ feature, onClose }: CarFeatureCalloutProps) {
  const { anchor, elbow, label } = feature.callout;
  const cardRef = useRef<HTMLDivElement>(null);
  const projected = useRef({ anchor: new Vector3(), label: new Vector3() });

  // Place the card beside the line end, on the side facing away from the car,
  // and keep it inside the viewer. Runs only on rendered frames, and writes the
  // DOM directly, so the card follows the camera without React re-renders.
  useFrame(({ camera, size }) => {
    const card = cardRef.current;
    if (!card) return;
    const p = projected.current;
    p.anchor.set(...anchor).project(camera);
    p.label.set(...label).project(camera);

    const x = ((p.label.x + 1) / 2) * size.width;
    const y = ((1 - p.label.y) / 2) * size.height;
    const width = card.offsetWidth;
    const height = card.offsetHeight;
    const side = p.label.x >= p.anchor.x ? "right" : "left";

    const left = side === "right" ? x + CARD_GAP : x - CARD_GAP - width;
    const clampedLeft = Math.min(Math.max(left, EDGE_MARGIN), size.width - width - EDGE_MARGIN);
    const top = Math.min(Math.max(y - height / 2, EDGE_MARGIN), size.height - height - EDGE_MARGIN);

    card.style.transform = `translate(${Math.round(clampedLeft - x)}px, ${Math.round(top - y)}px)`;
  });

  return (
    <group>
      <Line
        points={[anchor, elbow, label]}
        color="#121314"
        lineWidth={1.25}
        transparent
        depthTest={false}
        renderOrder={OVERLAY_RENDER_ORDER}
      />
      <mesh position={anchor} renderOrder={OVERLAY_RENDER_ORDER}>
        <sphereGeometry args={[0.045, 20, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.9} depthTest={false} />
      </mesh>
      <mesh position={anchor} renderOrder={OVERLAY_RENDER_ORDER + 1}>
        <sphereGeometry args={[0.024, 16, 12]} />
        <meshBasicMaterial color="#121314" depthTest={false} />
      </mesh>

      <Html position={label} zIndexRange={[20, 0]} className={styles.anchor}>
        <div ref={cardRef} className={styles.card}>
          <span className={styles.category}>{feature.category}</span>
          <h3 className={styles.title}>{feature.title}</h3>
          <p className={styles.description}>{feature.description}</p>
          <button type="button" className={styles.close} onClick={onClose} aria-label={`Close ${feature.title}`}>
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
              <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </Html>
    </group>
  );
}
