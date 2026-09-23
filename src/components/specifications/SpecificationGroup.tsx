import type { VehicleSpecificationGroup } from "@/types/vehicle";
import styles from "./VehicleSpecifications.module.scss";

export function SpecificationGroup({ group }: { group: VehicleSpecificationGroup }) {
  return (
    <dl className={styles.list}>
      {group.items.map((item) => (
        <div key={item.id} className={styles.row}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
