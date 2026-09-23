"use client";

import { useMemo, useReducer } from "react";

/** The most recent meaningful selection, shown first in the details section. */
export type VehicleSelection = { type: "feature"; id: string } | { type: "colour"; id: string };

export interface VehicleInteractionState {
  /**
   * True after the first meaningful configuration action (feature, colour,
   * spec category…). Camera exploration — rotate, zoom, presets — never sets it.
   */
  hasInteracted: boolean;
  selectedFeatureId: string | null;
  selectedColourId: string;
  /** On/off state of switchable features (e.g. headlights), by feature id. */
  featureOn: Readonly<Record<string, boolean>>;
  lastSelection: VehicleSelection | null;
}

type Action =
  | { type: "selectFeature"; id: string }
  | { type: "toggleFeature"; id: string }
  | { type: "clearFeature" }
  | { type: "selectColour"; id: string }
  | { type: "markInteraction" };

function reducer(state: VehicleInteractionState, action: Action): VehicleInteractionState {
  switch (action.type) {
    case "selectFeature":
      return {
        ...state,
        hasInteracted: true,
        selectedFeatureId: action.id,
        lastSelection: { type: "feature", id: action.id },
      };
    case "toggleFeature":
      return {
        ...state,
        hasInteracted: true,
        selectedFeatureId: action.id,
        featureOn: { ...state.featureOn, [action.id]: !state.featureOn[action.id] },
        lastSelection: { type: "feature", id: action.id },
      };
    case "clearFeature":
      // Closing a feature is not a configuration change; details stay as they were.
      return state.selectedFeatureId === null ? state : { ...state, selectedFeatureId: null };
    case "selectColour":
      return {
        ...state,
        hasInteracted: true,
        selectedColourId: action.id,
        lastSelection: { type: "colour", id: action.id },
      };
    case "markInteraction":
      return state.hasInteracted ? state : { ...state, hasInteracted: true };
  }
}

/**
 * Shared configurator interaction state. Every meaningful action goes through
 * here, so there is exactly one `hasInteracted` flag deciding whether the
 * details below the car are shown.
 */
export function useVehicleInteraction(defaultColourId: string) {
  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    hasInteracted: false,
    selectedFeatureId: null,
    selectedColourId: defaultColourId,
    featureOn: {},
    lastSelection: null,
  }));

  const actions = useMemo(
    () => ({
      selectFeature: (id: string) => dispatch({ type: "selectFeature", id }),
      toggleFeature: (id: string) => dispatch({ type: "toggleFeature", id }),
      clearFeature: () => dispatch({ type: "clearFeature" }),
      selectColour: (id: string) => dispatch({ type: "selectColour", id }),
      markVehicleInteraction: () => dispatch({ type: "markInteraction" }),
    }),
    [],
  );

  return [state, actions] as const;
}
