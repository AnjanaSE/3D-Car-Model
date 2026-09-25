"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Full-screen toggle for one element (the 3D stage), tracking the real state. */
export function useFullscreen<T extends HTMLElement>() {
  const stageRef = useRef<T>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleChange = () => setIsFullscreen(document.fullscreenElement === stageRef.current);
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void stageRef.current?.requestFullscreen?.().catch(() => undefined);
  }, []);

  return { stageRef, isFullscreen, toggleFullscreen };
}
