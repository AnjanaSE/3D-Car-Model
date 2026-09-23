import type { Vehicle, VehicleColor, VehicleFeature } from "@/types/vehicle";
import { VEHICLE_DETAILS_ID } from "@/lib/configurator/scroll";
import { VehicleSpecifications } from "@/components/specifications/VehicleSpecifications";
import { FeatureMenu } from "./FeatureMenu";
import type { VehicleInteractionState } from "./useVehicleInteraction";
import styles from "./VehicleDetails.module.scss";

const FINISH_LABEL: Record<VehicleColor["finish"], string> = {
  solid: "Solid",
  metallic: "Metallic",
  pearl: "Pearl",
};

interface VehicleDetailsProps {
  vehicle: Vehicle;
  state: VehicleInteractionState;
  /** Feature chosen from the feature menu (selects and scrolls the details into view). */
  onMenuSelectFeature: (featureId: string) => void;
  onToggleFeature: (featureId: string) => void;
  onSpecificationCategory: () => void;
}

/**
 * Everything below the 3D car. Only rendered once the customer has made a
 * meaningful selection, so the first screen stays the car alone.
 */
export function VehicleDetails({
  vehicle,
  state,
  onMenuSelectFeature,
  onToggleFeature,
  onSpecificationCategory,
}: VehicleDetailsProps) {
  const colour = vehicle.colors.find((c) => c.id === state.selectedColourId) ?? vehicle.colors[0];
  const switchable = vehicle.features.filter((f) => f.toggle);

  return (
    <section id={VEHICLE_DETAILS_ID} className={styles.root} aria-label="Vehicle details">
      <div className={styles.container}>
        <div className={styles.top}>
          <div aria-live="polite">
            <LatestSelection
              vehicle={vehicle}
              state={state}
              colour={colour}
              onToggleFeature={onToggleFeature}
            />
          </div>

          <aside className={styles.summary} aria-labelledby="configuration-summary-heading">
            <h2 id="configuration-summary-heading" className={styles.overline}>
              Your configuration
            </h2>
            <dl className={styles.summaryList}>
              {colour && (
                <div>
                  <dt>Exterior colour</dt>
                  <dd>
                    <span className={styles.swatch} style={{ backgroundColor: colour.hex }} aria-hidden="true" />
                    {colour.name}
                  </dd>
                </div>
              )}
              {switchable.map((feature) => (
                <div key={feature.id}>
                  <dt>{feature.title}</dt>
                  <dd>{statusText(feature, state)}</dd>
                </div>
              ))}
              <div>
                <dt>Starting from</dt>
                <dd>{vehicle.startingPrice}</dd>
              </div>
            </dl>
          </aside>
        </div>

        <FeatureMenu
          features={vehicle.features}
          selectedFeatureId={state.selectedFeatureId}
          onSelect={onMenuSelectFeature}
        />

        <VehicleSpecifications groups={vehicle.specifications} onCategoryChange={onSpecificationCategory} />
      </div>
    </section>
  );
}

function statusText(feature: VehicleFeature, state: VehicleInteractionState) {
  if (!feature.toggle) return null;
  return state.featureOn[feature.id] ? feature.toggle.onLabel : feature.toggle.offLabel;
}

interface LatestSelectionProps {
  vehicle: Vehicle;
  state: VehicleInteractionState;
  colour: VehicleColor | undefined;
  onToggleFeature: (featureId: string) => void;
}

/** Details of the most recent selection: a feature, or the exterior colour. */
function LatestSelection({ vehicle, state, colour, onToggleFeature }: LatestSelectionProps) {
  const selection = state.lastSelection;

  if (selection?.type === "feature") {
    const feature = vehicle.features.find((f) => f.id === selection.id);
    if (feature) {
      const on = Boolean(state.featureOn[feature.id]);
      return (
        <article key={`feature-${feature.id}`} className={styles.selection}>
          <span className={styles.overline}>{feature.category}</span>
          <h2 className={styles.title}>{feature.title}</h2>
          {feature.toggle && (
            <div className={styles.status}>
              <span className={styles.statusLabel}>{feature.toggle.label}</span>
              <span className={styles.statusValue} data-on={on}>
                {on ? feature.toggle.onLabel : feature.toggle.offLabel}
              </span>
              <button
                type="button"
                className={styles.toggle}
                aria-pressed={on}
                onClick={() => onToggleFeature(feature.id)}
              >
                {on ? `Turn ${feature.toggle.offLabel.toLowerCase()}` : `Turn ${feature.toggle.onLabel.toLowerCase()}`}
              </button>
            </div>
          )}
          <p className={styles.description}>{feature.description}</p>
        </article>
      );
    }
  }

  if (colour) {
    return (
      <article key={`colour-${colour.id}`} className={styles.selection}>
        <span className={styles.overline}>Exterior colour</span>
        <h2 className={styles.title}>{colour.name}</h2>
        <p className={styles.description}>
          {FINISH_LABEL[colour.finish]} finish{colour.price ? ` · ${colour.price}` : " · No extra cost"}
        </p>
      </article>
    );
  }

  return null;
}
