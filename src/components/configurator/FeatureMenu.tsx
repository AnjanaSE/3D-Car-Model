import type { VehicleFeature } from "@/types/vehicle";
import styles from "./FeatureMenu.module.scss";

interface FeatureMenuProps {
  features: VehicleFeature[];
  selectedFeatureId: string | null;
  onSelect: (featureId: string | null) => void;
}

/**
 * Non-3D way to explore the vehicle's features. Uses the same selection state
 * as tapping the car, and shows the selected feature's details outside the
 * canvas for keyboard and screen-reader users.
 */
export function FeatureMenu({ features, selectedFeatureId, onSelect }: FeatureMenuProps) {
  const selected = features.find((feature) => feature.id === selectedFeatureId) ?? null;

  if (features.length === 0) return null;

  return (
    <section className={styles.root} aria-labelledby="vehicle-features-heading">
      <h2 id="vehicle-features-heading" className={styles.heading}>
        Features
      </h2>

      <div className={styles.list} role="group" aria-label="Vehicle features">
        {features.map((feature) => {
          const active = feature.id === selectedFeatureId;
          return (
            <button
              key={feature.id}
              type="button"
              className={styles.item}
              aria-pressed={active}
              onClick={() => onSelect(active ? null : feature.id)}
            >
              {feature.title}
            </button>
          );
        })}
      </div>

      <div className={styles.detail} aria-live="polite">
        {selected ? (
          <div key={selected.id} className={styles.detailBody}>
            <span className={styles.category}>{selected.category}</span>
            <h3 className={styles.title}>{selected.title}</h3>
            <p className={styles.description}>{selected.description}</p>
          </div>
        ) : (
          <p className={styles.placeholder}>Select a feature above, or tap a part of the car.</p>
        )}
      </div>
    </section>
  );
}
