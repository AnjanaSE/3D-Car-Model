import type { VehicleFeature, VehicleSpecificationGroup } from "@/types/vehicle";
import styles from "./InfoPanel.module.scss";

export type InfoPanelContent =
  | { kind: "feature"; feature: VehicleFeature; on: boolean }
  | { kind: "specs"; group: VehicleSpecificationGroup };

interface InfoPanelProps {
  content: InfoPanelContent;
  onClose: () => void;
  onToggle: (featureId: string) => void;
  /** "Explore details" — scrolls to the details section. */
  onExplore: () => void;
}

function ArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Right-hand panel on the 3D stage: the selected feature (title, description,
 * key points, on/off status) or a specification category. On phones it's a
 * bottom sheet. Lives in the DOM, so it's fully accessible outside the canvas.
 */
export function InfoPanel({ content, onClose, onToggle, onExplore }: InfoPanelProps) {
  const key = content.kind === "feature" ? `f-${content.feature.id}` : `s-${content.group.id}`;
  const title = content.kind === "feature" ? content.feature.title : content.group.title;

  return (
    <aside key={key} className={styles.root} aria-label={title} aria-live="polite">
      <button type="button" className={styles.close} onClick={onClose} aria-label={`Close ${title}`}>
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M1 1l10 10M11 1 1 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </button>

      {content.kind === "feature" ? (
        <FeatureBody content={content} onToggle={onToggle} />
      ) : (
        <>
          <span className={styles.overline}>Specifications</span>
          <h2 className={styles.title}>{content.group.title}</h2>
          <dl className={styles.specs}>
            {content.group.items.map((item) => (
              <div key={item.id}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        </>
      )}

      <button type="button" className={styles.explore} onClick={onExplore}>
        {content.kind === "feature" ? "Explore details" : "View full specifications"}
        <ArrowIcon />
      </button>
    </aside>
  );
}

function FeatureBody({
  content,
  onToggle,
}: {
  content: Extract<InfoPanelContent, { kind: "feature" }>;
  onToggle: (featureId: string) => void;
}) {
  const { feature, on } = content;
  return (
    <>
      <span className={styles.overline}>{feature.category}</span>
      <h2 className={styles.title}>{feature.title}</h2>
      <p className={styles.description}>{feature.description}</p>

      {feature.toggle && (
        <div className={styles.status}>
          <span>{feature.toggle.label}</span>
          <button
            type="button"
            role="switch"
            aria-checked={on}
            className={styles.switch}
            onClick={() => onToggle(feature.id)}
          >
            <span className={styles.switchLabel}>{on ? feature.toggle.onLabel : feature.toggle.offLabel}</span>
          </button>
        </div>
      )}

      {feature.highlights && feature.highlights.length > 0 && (
        <ul className={styles.highlights}>
          {feature.highlights.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      )}
    </>
  );
}
