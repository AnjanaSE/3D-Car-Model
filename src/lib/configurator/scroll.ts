export const VEHICLE_DETAILS_ID = "vehicle-details";

/**
 * The one place that scrolls to the details section. Called only for explicit
 * requests ("View details", the feature menu) — never after every interaction.
 * Retries on the next frame in case the section is being revealed in the same update.
 */
export function scrollToVehicleDetails(retry = true) {
  const section = document.getElementById(VEHICLE_DETAILS_ID);
  if (!section) {
    if (retry) requestAnimationFrame(() => scrollToVehicleDetails(false));
    return;
  }
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  section.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
}
