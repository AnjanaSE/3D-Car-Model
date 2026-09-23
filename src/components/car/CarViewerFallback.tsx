import Image from "next/image";
import type { VehicleImage } from "@/types/vehicle";

interface CarViewerFallbackProps {
  reason: "webgl" | "error";
  image?: VehicleImage;
  onRetry?: () => void;
}

const MESSAGES = {
  webgl: "Your browser or device doesn't support 3D graphics.",
  error: "The 3D model couldn't be loaded.",
} as const;

/** Shown instead of the canvas when WebGL is missing or the model fails to load. */
export function CarViewerFallback({ reason, image, onRetry }: CarViewerFallbackProps) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-6 text-center">
      {image && (
        <Image
          src={image.src}
          alt={image.alt}
          width={image.width}
          height={image.height}
          className="h-auto max-h-[60%] w-auto max-w-full object-contain"
          priority
        />
      )}
      <div className="space-y-2">
        <p className="text-base font-medium text-ink">3D vehicle unavailable.</p>
        <p className="text-sm text-ink-soft">
          {MESSAGES[reason]} Specifications are still available below.
        </p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="h-11 rounded-full border border-ink/20 px-6 text-sm text-ink transition-colors hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          Try again
        </button>
      )}
    </div>
  );
}
