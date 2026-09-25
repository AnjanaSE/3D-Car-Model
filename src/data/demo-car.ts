import type { Vehicle } from "@/types/vehicle";

/**
 * Local demo data. Replace with an API/CMS source later — components only
 * depend on the `Vehicle` type, not on this file.
 *
 * World space: metres, ground at y = 0, vehicle nose towards +Z,
 * vehicle's left side towards +X.
 */
export const demoVehicle: Vehicle = {
  id: "demo-car",
  name: "Demo Performance GT",
  subtitle: "Mid-engine Performance Spider",
  tags: ["Spider", "Performance", "Luxury"],
  startingPrice: "$65,000",

  model: {
    url: "/models/demo-car.glb",
    dracoDecoderPath: "/draco/",
    transform: {
      position: [0, 0, 0],
      // The source GLB faces −Z; turn it so the nose faces the default camera.
      rotation: [0, Math.PI, 0],
      scale: 1,
      normalize: true,
    },
    /*
     * Mapping derived from inspecting demo-car.glb (`npm run inspect:model`).
     * Note the misleading source names: "trim" is red interior leather,
     * "brakes" is the rear light bar and "interior_dark" includes the exterior
     * wheel-arch liners, so they are mapped by location, not name.
     * Roles are checked in order; the first match wins.
     */
    meshMapping: {
      body: { meshes: ["body"], materials: ["Body_Color"] },
      glass: { meshes: ["glass"] },
      tyres: { meshes: ["tire"] },
      wheels: { meshes: ["rim_*", "wheel", "centre", "nuts"] },
      brakes: { meshes: ["brake"] },
      headlights: { meshes: ["lights", "leds"] },
      taillights: { meshes: ["lights_red", "brakes"] },
      // Badge accents ("yellow_trim", the steering-wheel centre) are neutralised to chrome for the demo.
      chrome: { meshes: ["chrome", "metal", "yellow_trim", "steering_centre"] },
      // The GLB's "Carbon_Fiber" and "Carpet" materials are untextured 80% grey,
      // which reads as white in the cabin; render them satin black instead.
      trim: {
        meshes: ["plastic_gray", "grills", "wipers", "interior_dark"],
        materials: ["Carbon_Fiber", "Carpet"],
      },
      interior: {
        meshes: [
          "trim",
          "leather",
          "interior_*",
          "carpet",
          "carbon_fibre*",
          "blue",
          "steering_*",
        ],
      },
    },
    orbit: {
      fov: 32,
      minDistance: 4.2,
      maxDistance: 11,
      // ~45° from vertical: enough to see the roofline without a top-down plan view.
      minPolarAngle: 0.8,
      // Stops just above the horizon so the camera never dips below the floor.
      maxPolarAngle: 1.48,
    },
  },

  colors: [
    { id: "grey", name: "Mineral Grey", hex: "#4a5260", finish: "metallic" },
    { id: "white", name: "Pearl White", hex: "#e9e8e4", finish: "pearl" },
    { id: "black", name: "Midnight Black", hex: "#0c0c0d", finish: "metallic" },
    { id: "silver", name: "Metallic Silver", hex: "#a7abb0", finish: "metallic" },
    { id: "red", name: "Performance Red", hex: "#8e0d12", finish: "solid", price: "+$1,200" },
    { id: "blue", name: "Ocean Blue", hex: "#12325a", finish: "metallic", price: "+$1,200" },
  ],
  defaultColorId: "grey",

  // Shown in the showroom side navigation, below Exterior / Interior.
  navSpecGroupIds: ["performance", "technology", "safety"],

  specifications: [
    {
      id: "overview",
      title: "Overview",
      items: [
        { id: "body", label: "Body Style", value: "2-Door Spider" },
        { id: "roof", label: "Roof", value: "Retractable hardtop" },
        { id: "seats", label: "Seats", value: "2" },
        { id: "fuel", label: "Fuel", value: "Petrol" },
        { id: "drive", label: "Drive", value: "RWD", highlight: true },
      ],
    },
    {
      id: "engine",
      title: "Engine",
      items: [
        { id: "engine-type", label: "Engine Type", value: "3.9L Twin-Turbo V8", highlight: true },
        { id: "power", label: "Maximum Power", value: "570 hp", highlight: true },
        { id: "torque", label: "Maximum Torque", value: "560 Nm" },
        { id: "layout", label: "Layout", value: "Mid-mounted, longitudinal" },
      ],
    },
    {
      id: "performance",
      title: "Performance",
      items: [
        { id: "acceleration", label: "0–100 km/h", value: "3.4 seconds", highlight: true },
        { id: "top-speed", label: "Top Speed", value: "320 km/h" },
        { id: "power-to-weight", label: "Power-to-Weight", value: "395 hp / tonne" },
      ],
    },
    {
      id: "transmission",
      title: "Transmission",
      items: [
        { id: "gearbox", label: "Transmission", value: "7-Speed Dual-Clutch" },
        { id: "drive-type", label: "Drive", value: "Rear-Wheel Drive" },
        { id: "differential", label: "Differential", value: "Electronic LSD" },
      ],
    },
    {
      id: "dimensions",
      title: "Dimensions",
      items: [
        { id: "length", label: "Length", value: "4,527 mm" },
        { id: "width", label: "Width", value: "1,937 mm" },
        { id: "height", label: "Height", value: "1,213 mm" },
        { id: "wheelbase", label: "Wheelbase", value: "2,650 mm" },
        { id: "weight", label: "Kerb Weight", value: "1,445 kg" },
      ],
    },
    {
      id: "safety",
      title: "Safety",
      items: [
        { id: "airbags", label: "Airbags", value: "Front and side" },
        { id: "brakes", label: "Brakes", value: "Carbon-ceramic discs" },
        { id: "stability", label: "Stability Control", value: "Multi-mode ESC" },
        { id: "camera", label: "Parking Aid", value: "360° surround camera" },
      ],
    },
    {
      id: "interior",
      title: "Interior",
      items: [
        { id: "seats", label: "Seats", value: "2 × electrically adjustable sport seats" },
        { id: "upholstery", label: "Upholstery", value: "Full-grain leather, contrast stitching" },
        { id: "steering", label: "Steering Wheel", value: "Carbon fibre with LED shift lights" },
        { id: "trim", label: "Trim", value: "Carbon fibre and brushed aluminium" },
      ],
    },
    {
      id: "technology",
      title: "Technology",
      items: [
        { id: "display", label: "Driver Display", value: "12.3\" digital cluster" },
        { id: "connectivity", label: "Connectivity", value: "Wireless Apple CarPlay & Android Auto" },
        { id: "audio", label: "Audio", value: "12-speaker premium system" },
        { id: "lighting", label: "Lighting", value: "Adaptive matrix LED" },
      ],
    },
  ],

  /*
   * Clickable features. From the GLB inspection:
   *   - headlights, wheels and rear lights are separate meshes → `meshNames` (direct click)
   *   - the headlight and round tail-light lenses are part of the "glass" mesh
   *     (shared with the windscreen), so those features also get hit areas
   *     over the lenses
   *   - mirrors and doors are part of the single "body" mesh, and "grills" merges
   *     the front and rear openings → invisible `hitAreas` instead.
   * Coordinates were measured with debug mode (`?debug=vehicle`), which logs
   * the world position of every click on the model.
   */
  features: [
    {
      id: "headlights",
      shortTitle: "Headlights",
      highlights: ["Matrix LED technology", "Adaptive light control", "Automatic on/off"],
      title: "Adaptive LED Headlights",
      category: "Exterior",
      description:
        "Matrix LED units shape the beam around oncoming traffic, improving visibility at night without dazzling other drivers.",
      meshNames: ["lights", "leds"],
      hitAreas: [
        { type: "box", position: [0.68, 0.68, 1.72], size: [0.34, 0.16, 0.42] },
        { type: "box", position: [-0.68, 0.68, 1.72], size: [0.34, 0.16, 0.42] },
      ],
      camera: { position: [2.6, 1.15, 4.3], target: [0.45, 0.55, 1.55] },
      callout: { anchor: [0.66, 0.66, 1.87], elbow: [1.05, 1.15, 2.2], label: [1.6, 1.15, 2.2] },
      toggle: {
        label: "Status",
        onLabel: "On",
        offLabel: "Off",
        emissive: { color: "#fff4e0", intensity: 6 },
      },
    },
    {
      id: "grille",
      shortTitle: "Front Intakes",
      highlights: ["Active cooling shutters", "Lower aerodynamic drag", "Dedicated brake cooling"],
      title: "Active Front Intakes",
      category: "Exterior",
      description:
        "Shutters in the front intakes open only when the brakes and radiators need cooling, then close to cut drag.",
      hitAreas: [{ type: "box", position: [0, 0.36, 2.15], size: [1.3, 0.3, 0.3] }],
      camera: { position: [-1.4, 0.95, 5.2], target: [0, 0.45, 1.6] },
      callout: { anchor: [0, 0.34, 2.22], elbow: [0.3, 0.3, 2.75], label: [0.6, 0.3, 3.05] },
    },
    {
      id: "wheels",
      shortTitle: "Wheel",
      highlights: ["20\" forged alloy", "Carbon-ceramic brakes", "Performance tyres"],
      title: "20\" Forged Alloy Wheels",
      category: "Exterior",
      description:
        "Lightweight forged alloys reduce unsprung mass for sharper steering response, paired with carbon-ceramic brakes.",
      meshNames: ["rim_*", "tire", "wheel", "centre", "nuts", "brake"],
      camera: { position: [4.3, 0.95, 2.7], target: [0.8, 0.42, 1.0] },
      callout: { anchor: [0.99, 0.36, 1.16], elbow: [1.5, 0.95, 1.55], label: [2.0, 0.95, 1.55] },
    },
    {
      id: "mirrors",
      shortTitle: "Side Mirror",
      highlights: ["Power folding", "Heated and auto-dimming", "Integrated 360° cameras"],
      title: "Power-Folding Mirrors",
      category: "Technology",
      description:
        "Heated, auto-dimming mirrors fold at the touch of a button and house two of the four 360° surround-view cameras.",
      hitAreas: [
        { type: "sphere", position: [1.06, 0.87, 0.43], radius: 0.13 },
        { type: "sphere", position: [-1.06, 0.87, 0.43], radius: 0.13 },
      ],
      camera: { position: [3.6, 1.6, 2.6], target: [0.8, 0.85, 0.4] },
      callout: { anchor: [1.12, 0.88, 0.42], elbow: [1.5, 1.35, 0.75], label: [2.0, 1.35, 0.75] },
    },
    {
      id: "doors",
      shortTitle: "Door",
      highlights: ["Aluminium construction", "Soft-close latches", "Frameless glass"],
      title: "Lightweight Aluminium Doors",
      category: "Design",
      description:
        "Frameless aluminium doors with soft-close latches save weight, and their scalloped sides feed air to the engine.",
      hitAreas: [
        { type: "box", position: [0.96, 0.58, -0.02], size: [0.14, 0.44, 1.06] },
        { type: "box", position: [-0.96, 0.58, -0.02], size: [0.14, 0.44, 1.06] },
      ],
      camera: { position: [5.4, 1.1, 0.8], target: [0.4, 0.55, 0] },
      callout: { anchor: [0.97, 0.6, -0.02], elbow: [1.5, 1.2, 0.25], label: [2.0, 1.2, 0.25] },
    },
    {
      id: "rear-lights",
      shortTitle: "Rear Light",
      highlights: ["Round LED signature", "Instant-on brake lights", "Dynamic indicators"],
      title: "Signature LED Tail Lights",
      category: "Exterior",
      description:
        "Twin round LED tail lights light up instantly, giving following drivers more time to react when you brake.",
      meshNames: ["lights_red", "brakes"],
      hitAreas: [
        { type: "sphere", position: [0.77, 0.87, -2.02], radius: 0.12 },
        { type: "sphere", position: [-0.77, 0.87, -2.02], radius: 0.12 },
      ],
      camera: { position: [-2.4, 1.3, -4.6], target: [-0.3, 0.7, -1.7] },
      callout: { anchor: [-0.77, 0.87, -2.07], elbow: [-1.25, 1.35, -2.4], label: [-1.75, 1.35, -2.4] },
    },
    {
      id: "hardtop",
      shortTitle: "Roof",
      highlights: ["Opens in 14 seconds", "Two-piece aluminium", "Stows behind the seats"],
      title: "Retractable Hardtop",
      category: "Design",
      description:
        "A two-piece aluminium hardtop folds away behind the seats in 14 seconds, turning a quiet coupé into an open-air spider.",
      hitAreas: [{ type: "box", position: [0, 1.02, -0.75], size: [1.3, 0.2, 0.7] }],
      camera: { position: [3.2, 3.2, -3.6], target: [0, 0.9, -0.6] },
      callout: { anchor: [0, 1.05, -0.75], elbow: [0.5, 1.6, -1.0], label: [1.0, 1.6, -1.0] },
    },
    {
      id: "steering-wheel",
      shortTitle: "Steering Wheel",
      highlights: ["Carbon-fibre rim", "LED shift lights", "Drive-mode switch"],
      title: "Carbon Steering Wheel",
      category: "Interior",
      description:
        "A flat-bottomed carbon-fibre wheel with LED shift lights, so the essential controls stay at your fingertips.",
      meshNames: ["steering_*"],
      viewMode: "interior",
      camera: { position: [0.45, 1.45, -0.6], target: [0.35, 0.82, 0.38] },
      callout: { anchor: [0.35, 0.96, 0.36], elbow: [0.55, 1.05, 0.42], label: [0.8, 1.05, 0.42] },
    },
    {
      id: "seats",
      shortTitle: "Seats",
      highlights: ["Full-grain leather", "Electric adjustment", "Contrast stitching"],
      title: "Full-Grain Leather Sport Seats",
      category: "Interior",
      description:
        "Electrically adjustable sport seats in full-grain leather with contrast stitching, shaped to hold you through fast corners.",
      meshNames: ["leather", "trim"],
      viewMode: "interior",
      // Over the passenger door, so the windscreen frame doesn't block the seats.
      camera: { position: [-1.3, 1.9, -0.2], target: [0, 0.85, -0.35] },
      callout: { anchor: [-0.3, 1.08, -0.32], elbow: [-0.55, 1.4, -0.55], label: [-0.7, 1.45, -0.85] },
    },
    {
      id: "driver-display",
      shortTitle: "Driver Display",
      highlights: ["Configurable layouts", "Navigation in view", "Performance telemetry"],
      title: "Digital Driver Display",
      category: "Interior",
      description:
        "A configurable digital instrument cluster puts speed, navigation and performance data directly in your line of sight.",
      // The cluster is mostly part of a generic interior mesh, so it also gets a hit box.
      meshNames: ["carbon_fibre"],
      hitAreas: [{ type: "box", position: [0.35, 0.85, 0.55], size: [0.36, 0.14, 0.2] }],
      viewMode: "interior",
      camera: { position: [0.4, 1.4, -0.35], target: [0.33, 0.85, 0.55] },
      callout: { anchor: [0.33, 0.87, 0.55], elbow: [0.12, 0.98, 0.58], label: [-0.15, 0.98, 0.58] },
    },
  ],

  cameraPresets: [
    { id: "default", label: "Default", position: [4.3, 1.6, 5.1], target: [0, 0.5, 0] },
    { id: "front", label: "Front", position: [0, 1.1, 6.0], target: [0, 0.5, 0] },
    { id: "rear", label: "Rear", position: [0, 1.1, -6.0], target: [0, 0.5, 0] },
    { id: "left", label: "Left", position: [6.3, 1.0, 0], target: [0, 0.5, 0] },
    { id: "right", label: "Right", position: [-6.3, 1.0, 0], target: [0, 0.5, 0] },
    { id: "three-quarter", label: "Three Quarter", position: [-3.7, 1.15, 4.1], target: [0, 0.45, 0.1] },
  ],
  defaultCameraPresetId: "default",

  viewModes: [
    { id: "exterior", label: "Exterior", available: true },
    {
      id: "interior",
      label: "Interior",
      available: true,
      // Over the driver's shoulder (left-hand drive: the driver sits on the +X side).
      camera: { position: [0.3, 1.95, -1.45], target: [0.05, 0.72, 0.2] },
      orbit: { minDistance: 0.9, maxDistance: 2.6, minPolarAngle: 0.25, maxPolarAngle: 1.15 },
      hint: "Drag to look around the cabin",
    },
  ],

  modelCredit: {
    text: "3D model by vicent091036, via the three.js examples",
    href: "https://sketchfab.com/models/57bf6cc56931426e87494f554df1dab6",
  },
};
