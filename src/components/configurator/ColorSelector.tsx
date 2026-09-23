import type { VehicleColor } from "@/types/vehicle";
import styles from "./ColorSelector.module.scss";

interface ColorSelectorProps {
  colors: VehicleColor[];
  selectedId: string;
  onSelect: (colorId: string) => void;
}

const FINISH_LABEL: Record<VehicleColor["finish"], string> = {
  solid: "Solid",
  metallic: "Metallic",
  pearl: "Pearl",
};

/** Paint swatches. Each has its name as accessible text; the selected name is also shown. */
export function ColorSelector({ colors, selectedId, onSelect }: ColorSelectorProps) {
  const selected = colors.find((c) => c.id === selectedId) ?? colors[0];

  return (
    <div className={styles.root}>
      <div role="radiogroup" aria-label="Exterior colour" className={styles.swatches}>
        {colors.map((color) => {
          const active = color.id === selected?.id;
          return (
            <button
              key={color.id}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={`${color.name}, ${FINISH_LABEL[color.finish]}${color.price ? `, ${color.price}` : ""}`}
              title={color.name}
              className={styles.swatch}
              onClick={() => onSelect(color.id)}
            >
              <span className={styles.chip} style={{ backgroundColor: color.hex }} />
            </button>
          );
        })}
      </div>
      {selected && (
        <p className={styles.label} aria-hidden="true">
          <span className={styles.name}>{selected.name}</span>
          <span className={styles.meta}>
            {FINISH_LABEL[selected.finish]}
            {selected.price ? ` · ${selected.price}` : ""}
          </span>
        </p>
      )}
    </div>
  );
}
