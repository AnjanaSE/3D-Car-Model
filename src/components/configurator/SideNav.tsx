import type { ReactNode } from "react";
import styles from "./SideNav.module.scss";

export interface SideNavItem {
  id: string;
  label: string;
}

interface SideNavProps {
  items: SideNavItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

/** Icons by nav id; unknown ids get a neutral dot. */
const ICONS: Record<string, ReactNode> = {
  exterior: (
    <path d="M3 13.5 4.6 9a2 2 0 0 1 1.9-1.4h11a2 2 0 0 1 1.9 1.4L21 13.5M3 13.5V17h2.5v-1.5h13V17H21v-3.5M3 13.5h18M7 11h.01M17 11h.01" />
  ),
  interior: (
    <path d="M8 4a2 2 0 0 1 2 2v7h5a2 2 0 0 1 2 2v5M8 4a2 2 0 0 0-2 2l1 9h8M7 20h10" />
  ),
  performance: (
    <path d="M4.5 16a8 8 0 1 1 15 0M12 12l4-3M12 12h.01M6.5 12H5M19 12h-1.5M12 6.5V5" />
  ),
  technology: (
    <path d="M8 8h8v8H8zM10 4v4M14 4v4M10 16v4M14 16v4M4 10h4M4 14h4M16 10h4M16 14h4" />
  ),
  safety: <path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6l-7-3ZM9 12l2 2 4-4" />,
};

function NavIcon({ id }: { id: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[id] ?? <circle cx="12" cy="12" r="3" />}
    </svg>
  );
}

/**
 * Left-hand showroom navigation. On phones it becomes a horizontal chip row.
 * Exterior/Interior switch the 3D view; spec categories open the side panel.
 */
export function SideNav({ items, activeId, onSelect }: SideNavProps) {
  return (
    <nav aria-label="Explore the vehicle" className={styles.root}>
      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className={styles.item}
              aria-current={item.id === activeId ? "true" : undefined}
              onClick={() => onSelect(item.id)}
            >
              <NavIcon id={item.id} />
              <span>{item.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
