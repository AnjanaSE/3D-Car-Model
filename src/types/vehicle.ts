/**
 * Vehicle domain types.
 *
 * Every UI and 3D component consumes a `Vehicle` object and never imports the
 * data source directly. Today the object comes from `src/data/demo-car.ts`;
 * later it can come from a CMS/API as long as it matches these types.
 * All fields are plain serialisable data (no functions, no class instances) so a
 * `Vehicle` can be passed from a Server Component to Client Components as-is.
 */

/** [x, y, z] in metres, in the vehicle's world space (ground at y = 0, nose towards +Z). */
export type Vec3 = [number, number, number];

/* -------------------------------------------------------------------------- */
/* Paint                                                                       */
/* -------------------------------------------------------------------------- */

export type PaintFinish = "solid" | "metallic" | "pearl";

/** Optional physical overrides for a paint. Defaults come from the finish. */
export interface PaintMaterialSettings {
  metalness?: number;
  roughness?: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
}

export interface VehicleColor {
  id: string;
  name: string;
  /** CSS hex colour, e.g. "#101010". */
  hex: string;
  finish: PaintFinish;
  material?: PaintMaterialSettings;
  /** Optional price delta shown next to the colour, e.g. "+$1,200". */
  price?: string;
}

/* -------------------------------------------------------------------------- */
/* Specifications                                                              */
/* -------------------------------------------------------------------------- */

export interface VehicleSpecification {
  id: string;
  label: string;
  value: string;
  /** Promote to the quick "key figures" row. */
  highlight?: boolean;
}

export interface VehicleSpecificationGroup {
  id: string;
  title: string;
  items: VehicleSpecification[];
}

/* -------------------------------------------------------------------------- */
/* Camera                                                                      */
/* -------------------------------------------------------------------------- */

/** A camera placement: where the camera sits and what it looks at. */
export interface CameraView {
  position: Vec3;
  target: Vec3;
}

export interface VehicleCameraPreset extends CameraView {
  id: string;
  label: string;
}

/* -------------------------------------------------------------------------- */
/* Features (clickable parts of the vehicle)                                   */
/* -------------------------------------------------------------------------- */

/**
 * Invisible proxy shape placed over a part of the car. Used when the part is
 * not its own mesh in the GLB (e.g. mirrors merged into the body mesh).
 */
export type VehicleFeatureHitArea =
  | { type: "sphere"; position: Vec3; radius: number }
  | { type: "box"; position: Vec3; size: Vec3; rotation?: Vec3 };

/** 3D leader line: anchor on the car → elbow → label. */
export interface VehicleFeatureCallout {
  anchor: Vec3;
  elbow: Vec3;
  label: Vec3;
}

/**
 * Optional on/off state for a feature, e.g. headlights. Tapping the part on the
 * car toggles it; the state is shown as "Status" in the details panel.
 * Only give a feature a toggle if the model can show it.
 */
export interface VehicleFeatureToggle {
  /** Status label, e.g. "Status". */
  label: string;
  onLabel: string;
  offLabel: string;
  /** Glow added to the feature's own meshes while on. */
  emissive?: { color: string; intensity: number };
  /** Parts that rotate while on, e.g. doors swinging open on their hinges. */
  animate?: VehiclePartAnimation[];
}

/**
 * Rotates a node of the GLB (matched by name, like `meshNames`) about its own
 * pivot. Pivots come from the model, so a door must be exported with its origin
 * on the hinge.
 */
export interface VehiclePartAnimation {
  node: string;
  axis: "x" | "y" | "z";
  /** Radians when fully on (sign sets the direction). */
  angle: number;
}

export interface VehicleFeature {
  id: string;
  title: string;
  /** Short label for the on-car hotspot, e.g. "Headlights". Defaults to `title`. */
  shortTitle?: string;
  /** Key points listed in the feature panel. */
  highlights?: string[];
  /** Small overline, e.g. "Exterior". */
  category: string;
  description: string;
  /**
   * Method A: GLB meshes that select this feature when clicked/tapped, using the
   * same patterns as `MeshMatcher` (wildcards; GLTFLoader suffixes ignored).
   * Only list meshes that really are this part — check with `npm run inspect:model`.
   */
  meshNames?: string[];
  /** Method B: invisible hit areas for parts merged into other meshes. */
  hitAreas?: VehicleFeatureHitArea[];
  /** Camera placement used when the feature is selected. */
  camera?: CameraView;
  callout: VehicleFeatureCallout;
  toggle?: VehicleFeatureToggle;
  /** View the feature belongs to; selecting it switches to that view. Default "exterior". */
  viewMode?: VehicleViewModeId;
}

/* -------------------------------------------------------------------------- */
/* View modes                                                                  */
/* -------------------------------------------------------------------------- */

export type VehicleViewModeId = "exterior" | "interior";

export interface VehicleViewMode {
  id: VehicleViewModeId;
  label: string;
  available: boolean;
  /** Where the camera goes when this mode is chosen. Defaults to the default camera preset. */
  camera?: CameraView;
  /** Orbit limits in this mode, merged over `model.orbit` (e.g. a tighter range inside the cabin). */
  orbit?: Partial<VehicleOrbitLimits>;
  /** Short usage hint shown under the viewer in this mode. */
  hint?: string;
}

/* -------------------------------------------------------------------------- */
/* 3D configuration                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Material roles the renderer knows how to present. Each role gets its own
 * material treatment (paint, glass, rubber, chrome, …).
 */
export type VehicleMaterialRole =
  | "body"
  | "glass"
  | "tyres"
  | "wheels"
  | "brakes"
  | "headlights"
  | "taillights"
  | "chrome"
  | "trim"
  | "interior";

/**
 * Selects meshes for a role. Patterns are matched case-insensitively against
 * the mesh name and/or the material name found in the GLB. `*` is a wildcard.
 * GLTFLoader de-duplicates repeated node names with a numeric suffix
 * ("tire", "tire_1", …) and replaces spaces with "_"; the matcher ignores both.
 *
 * Run `npm run inspect:model` to list the names in a GLB before editing this.
 */
export interface MeshMatcher {
  meshes?: string[];
  materials?: string[];
}

export type VehicleMeshMapping = Partial<Record<VehicleMaterialRole, MeshMatcher>>;

export interface VehicleModelTransform {
  position: Vec3;
  /** Euler rotation in radians. */
  rotation: Vec3;
  scale: number;
  /** Centre the model on X/Z and place its lowest point on the ground. */
  normalize: boolean;
}

export interface VehicleOrbitLimits {
  /** Field of view in degrees. */
  fov: number;
  minDistance: number;
  maxDistance: number;
  /** Radians from the top (0 = straight down, π/2 = horizon). */
  minPolarAngle: number;
  maxPolarAngle: number;
  /**
   * Optional horizontal limits (radians, 0 = camera on +Z, π = camera on −Z).
   * If min > max the allowed range wraps through ±π (e.g. looking forward from behind).
   */
  minAzimuthAngle?: number;
  maxAzimuthAngle?: number;
}

export interface Vehicle3DConfig {
  /** Public URL of the .glb file. */
  url: string;
  /** Directory containing the Draco decoder, or null if the model isn't Draco-compressed. */
  dracoDecoderPath: string | null;
  transform: VehicleModelTransform;
  meshMapping: VehicleMeshMapping;
  orbit: VehicleOrbitLimits;
}

/* -------------------------------------------------------------------------- */
/* Vehicle                                                                     */
/* -------------------------------------------------------------------------- */

export interface VehicleImage {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export interface VehicleCredit {
  text: string;
  href?: string;
}

export interface Vehicle {
  id: string;
  name: string;
  subtitle: string;
  /** Brand logo shown above the name in the showroom header (transparent image for a dark background). */
  brandLogo?: VehicleImage;
  /** Short descriptors shown under the name, e.g. ["Spider", "Performance", "Luxury"]. */
  tags?: string[];
  /** Pre-formatted display price, e.g. "$65,000". */
  startingPrice: string;
  model: Vehicle3DConfig;
  colors: VehicleColor[];
  defaultColorId: string;
  specifications: VehicleSpecificationGroup[];
  /** Specification groups offered in the showroom side navigation (by group id). */
  navSpecGroupIds?: string[];
  features: VehicleFeature[];
  cameraPresets: VehicleCameraPreset[];
  defaultCameraPresetId: string;
  viewModes: VehicleViewMode[];
  /** Static image shown when WebGL is unavailable. */
  fallbackImage?: VehicleImage;
  /** Attribution for the 3D asset, if its licence requires it. */
  modelCredit?: VehicleCredit;
}
