/** True when the browser can create a WebGL (1 or 2) context. Client-only. */
export function isWebGLAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    const context =
      canvas.getContext("webgl2") ?? canvas.getContext("webgl") ?? canvas.getContext("experimental-webgl");
    return context !== null;
  } catch {
    return false;
  }
}
