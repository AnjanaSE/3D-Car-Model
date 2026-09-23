"use client";

import { useId, useState, type KeyboardEvent } from "react";
import type { VehicleSpecificationGroup } from "@/types/vehicle";
import { SpecificationGroup } from "./SpecificationGroup";
import styles from "./VehicleSpecifications.module.scss";

interface VehicleSpecificationsProps {
  groups: VehicleSpecificationGroup[];
  /** Fired when the customer picks a category (a meaningful interaction). */
  onCategoryChange?: (groupId: string) => void;
}

/** Key figures plus tabbed specification groups (Overview, Engine, …). */
export function VehicleSpecifications({ groups, onCategoryChange }: VehicleSpecificationsProps) {
  const [activeId, setActiveId] = useState(groups[0]?.id ?? "");
  const baseId = useId();
  const active = groups.find((g) => g.id === activeId) ?? groups[0];
  const keyFigures = groups.flatMap((g) => g.items.filter((item) => item.highlight));

  if (!active) return null;

  const select = (id: string) => {
    setActiveId(id);
    onCategoryChange?.(id);
  };

  // Arrow keys move between tabs (WAI-ARIA tabs pattern).
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    const index = groups.findIndex((g) => g.id === active.id);
    const next = groups[(index + (event.key === "ArrowRight" ? 1 : -1) + groups.length) % groups.length];
    select(next.id);
    document.getElementById(`${baseId}-tab-${next.id}`)?.focus();
  };

  return (
    <section className={styles.root} aria-labelledby={`${baseId}-heading`}>
      <h2 id={`${baseId}-heading`} className={styles.heading}>
        Specifications
      </h2>

      {keyFigures.length > 0 && (
        <dl className={styles.keyFigures}>
          {keyFigures.map((item) => (
            <div key={item.id} className={styles.figure}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div role="tablist" aria-label="Specification categories" className={styles.tabs} onKeyDown={handleKeyDown}>
        {groups.map((group) => {
          const selected = group.id === active.id;
          return (
            <button
              key={group.id}
              id={`${baseId}-tab-${group.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${baseId}-panel`}
              tabIndex={selected ? 0 : -1}
              className={styles.tab}
              onClick={() => select(group.id)}
            >
              {group.title}
            </button>
          );
        })}
      </div>

      <div id={`${baseId}-panel`} role="tabpanel" aria-labelledby={`${baseId}-tab-${active.id}`}>
        <SpecificationGroup key={active.id} group={active} />
      </div>
    </section>
  );
}
