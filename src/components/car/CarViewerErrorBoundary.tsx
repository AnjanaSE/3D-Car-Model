"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

interface CarViewerErrorBoundaryProps {
  fallback: ReactNode;
  onError?: (error: Error) => void;
  children: ReactNode;
}

interface CarViewerErrorBoundaryState {
  hasError: boolean;
}

/**
 * Contains failures inside the 3D viewer (GLB load errors, WebGL context
 * errors) so the rest of the page keeps working. Remount with a new `key` to retry.
 */
export class CarViewerErrorBoundary extends Component<
  CarViewerErrorBoundaryProps,
  CarViewerErrorBoundaryState
> {
  state: CarViewerErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): CarViewerErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[vehicle] 3D viewer failed", error, info.componentStack);
    this.props.onError?.(error);
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
