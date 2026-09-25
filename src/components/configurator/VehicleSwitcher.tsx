import type { Vehicle } from "@/types/vehicle";
import styles from "./VehicleSwitcher.module.scss";

interface VehicleSwitcherProps {
  vehicles: Pick<Vehicle, "id" | "name">[];
  activeId: string;
  onSelect: (vehicleId: string) => void;
}

/** Model picker. A native select: compact, keyboard- and screen-reader-friendly on every device. */
export function VehicleSwitcher({ vehicles, activeId, onSelect }: VehicleSwitcherProps) {
  if (vehicles.length < 2) return null;

  return (
    <label className={styles.root}>
      <span className={styles.label}>Model</span>
      <select className={styles.select} value={activeId} onChange={(event) => onSelect(event.target.value)}>
        {vehicles.map((vehicle) => (
          <option key={vehicle.id} value={vehicle.id}>
            {vehicle.name}
          </option>
        ))}
      </select>
      <svg className={styles.chevron} width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path d="M3 4.5 6 7.5 9 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </label>
  );
}
