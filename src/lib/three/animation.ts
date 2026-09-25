import { MathUtils, type Object3D } from "three";
import type { VehicleFeature } from "@/types/vehicle";
import { normalizeName } from "./model";

const SPEED = 5;
/** Ease-in-out so doors start and stop gently. */
const ease = (t: number) => t * t * (3 - 2 * t);

export interface PartAnimator {
  /** Moves animated parts towards their on/off positions. Returns true while moving. */
  update: (onIds: ReadonlySet<string>, delta: number) => boolean;
  /** Returns every part to its original rotation. */
  reset: () => void;
}

/**
 * Drives `toggle.animate` entries: finds each node by name in the prepared
 * model and rotates it about its own pivot as the feature switches on/off.
 */
export function createPartAnimator(root: Object3D, features: VehicleFeature[]): PartAnimator {
  const byName = new Map<string, Object3D>();
  root.traverse((object) => {
    const key = normalizeName(object.name);
    if (key && !byName.has(key)) byName.set(key, object);
  });

  const entries = features.flatMap((feature) =>
    (feature.toggle?.animate ?? []).flatMap((part) => {
      const object = byName.get(normalizeName(part.node));
      if (!object) {
        if (process.env.NODE_ENV !== "production") {
          console.warn(`[vehicle] feature "${feature.id}": no node named "${part.node}" to animate.`);
        }
        return [];
      }
      return [{ featureId: feature.id, object, axis: part.axis, angle: part.angle, base: object.rotation[part.axis], level: 0 }];
    }),
  );

  const apply = (entry: (typeof entries)[number]) => {
    entry.object.rotation[entry.axis] = entry.base + entry.angle * ease(entry.level);
  };

  return {
    update(onIds, delta) {
      let moving = false;
      const step = SPEED * delta * 0.5;
      for (const entry of entries) {
        const target = onIds.has(entry.featureId) ? 1 : 0;
        if (entry.level === target) continue;
        entry.level = MathUtils.clamp(entry.level + Math.sign(target - entry.level) * step, 0, 1);
        if (entry.level !== target) moving = true;
        apply(entry);
      }
      return moving;
    },
    reset() {
      for (const entry of entries) {
        entry.level = 0;
        apply(entry);
      }
    },
  };
}
