"use client";

import { useProgress } from "@react-three/drei";

interface CarLoaderProps {
  /** 0–100, or undefined when progress isn't known yet. */
  progress?: number;
  visible?: boolean;
}

/** Presentational loading state. Has no 3D dependencies so it can show while the viewer chunk downloads. */
export function CarLoader({ progress, visible = true }: CarLoaderProps) {
  const percent = progress === undefined ? undefined : Math.round(progress);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-hidden={!visible}
      className={`pointer-events-none absolute inset-0 grid place-items-center transition-opacity duration-700 ease-(--ease-premium) ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="flex w-44 flex-col items-center gap-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-ink-muted">
          Loading vehicle
        </p>
        <p className="text-3xl font-light tabular-nums text-ink" aria-hidden={percent === undefined}>
          {percent === undefined ? " " : `${percent}%`}
        </p>
        <div className="h-px w-full overflow-hidden bg-line">
          <div
            className="h-full origin-left bg-ink transition-transform duration-300"
            style={{ transform: `scaleX(${(percent ?? 0) / 100})` }}
          />
        </div>
      </div>
    </div>
  );
}

/** Loader bound to the three.js loading manager via Drei's `useProgress`. */
export function CarLoaderWithProgress({ visible }: { visible: boolean }) {
  const progress = useProgress((state) => state.progress);
  return <CarLoader progress={progress} visible={visible} />;
}
