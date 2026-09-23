import type { VehicleCameraPreset } from "@/types/vehicle";
import { ConfiguratorButton } from "@/components/ui/ConfiguratorButton";

interface CameraControlsProps {
  presets: VehicleCameraPreset[];
  activePresetId: string | null;
  onSelect: (presetId: string) => void;
  onReset: () => void;
}

/**
 * Button alternative to dragging the 3D view. The default preset is exposed as
 * "Reset view" rather than as a separate button, since both do the same thing.
 */
export function CameraControls({ presets, activePresetId, onSelect, onReset }: CameraControlsProps) {
  return (
    <div className="flex items-center gap-2">
      <div
        role="group"
        aria-label="Camera views"
        className="scrollbar-none -ml-4 flex min-w-0 flex-1 snap-x gap-1 overflow-x-auto pl-4 pr-6 mask-r-from-85% sm:ml-0 sm:pl-0 sm:pr-0 sm:mask-none"
      >
        {presets.map((preset) => (
          <ConfiguratorButton
            key={preset.id}
            className="snap-start"
            active={activePresetId === preset.id}
            onClick={() => onSelect(preset.id)}
          >
            {preset.label}
          </ConfiguratorButton>
        ))}
      </div>
      <ConfiguratorButton variant="quiet" onClick={onReset} aria-label="Reset view">
        <ResetIcon />
        <span className="hidden sm:inline">Reset view</span>
      </ConfiguratorButton>
    </div>
  );
}

function ResetIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M2.5 8a5.5 5.5 0 1 0 1.7-3.98M2.5 2.5v3h3"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
