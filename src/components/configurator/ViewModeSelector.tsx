import type { VehicleViewMode, VehicleViewModeId } from "@/types/vehicle";
import styles from "./ViewModeSelector.module.scss";

interface ViewModeSelectorProps {
  modes: VehicleViewMode[];
  activeId: VehicleViewModeId;
  onSelect: (id: VehicleViewModeId) => void;
}

/** Exterior / Interior switch, overlaid at the top of the viewer. */
export function ViewModeSelector({ modes, activeId, onSelect }: ViewModeSelectorProps) {
  const available = modes.filter((mode) => mode.available);
  if (available.length < 2) return null;

  return (
    <div role="radiogroup" aria-label="View" className={styles.root}>
      {available.map((mode) => (
        <button
          key={mode.id}
          type="button"
          role="radio"
          aria-checked={mode.id === activeId}
          className={styles.option}
          onClick={() => onSelect(mode.id)}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}
