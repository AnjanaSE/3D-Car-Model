import type { VehicleFeature } from "@/types/vehicle";
import styles from "./FeatureMenu.module.scss";

interface FeatureMenuProps {
  features: VehicleFeature[];
  selectedFeatureId: string | null;
  onSelect: (featureId: string) => void;
}

/**
 * Non-3D way to explore the vehicle's features, using the same selection
 * state as tapping the car.
 */
export function FeatureMenu({ features, selectedFeatureId, onSelect }: FeatureMenuProps) {
  if (features.length === 0) return null;

  return (
    <section className={styles.root} aria-labelledby="vehicle-features-heading">
      <h2 id="vehicle-features-heading" className={styles.heading}>
        Explore features
      </h2>
      <div className={styles.list} role="group" aria-label="Vehicle features">
        {features.map((feature) => (
          <button
            key={feature.id}
            type="button"
            className={styles.item}
            aria-pressed={feature.id === selectedFeatureId}
            onClick={() => onSelect(feature.id)}
          >
            {feature.title}
          </button>
        ))}
      </div>
    </section>
  );
}
