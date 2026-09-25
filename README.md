# 3D Vehicle Configurator — Demo

A standalone Next.js demo of an interactive 3D vehicle viewer and configurator.
It has no backend, CMS or database: vehicle data is local TypeScript.

```bash
npm install
npm run dev          # http://localhost:3000 → redirects to /car/demo
```

| Script | Purpose |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run inspect:model [file.glb]` | List nodes, meshes, materials and bounds in a GLB |

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Three.js · @react-three/fiber · @react-three/drei · Tailwind CSS 4 · SCSS modules (feature UI)

## Structure

```
src/
  app/car/demo/page.tsx         Server page: loads a Vehicle and renders the configurator
  components/
    car/                        3D viewer (client-only, lazy-loaded)
      CarViewer.tsx             Canvas, WebGL detection, loading + error handling
      CarScene.tsx              Studio lighting, contact shadow, orbit controls
      CarModel.tsx              GLB loading, material roles, paint transitions
      CarCameraController.tsx   Smooth camera moves to presets
      CarLoader.tsx             Loading progress
      CarViewerErrorBoundary.tsx / CarViewerFallback.tsx
    configurator/               UI shell and controls
    ui/                         Shared buttons
  data/demo-car.ts              The demo Vehicle object
  types/vehicle.ts              Vehicle, VehicleColor, VehicleHotspot, Vehicle3DConfig, …
  lib/three/                    Framework-free helpers: model prep, materials, camera maths
public/
  models/demo-car.glb           Draco-compressed vehicle model
  draco/                        Self-hosted Draco decoder (no CDN at runtime)
```

## Data flow

Components only consume a `Vehicle` object. They never import the data file directly:

```
today:   data/demo-car.ts ─┐
later:   CMS / REST API ───┴─→ Vehicle ─→ <CarConfigurator vehicle={…} />
```

To switch sources, fetch and map the API response to `Vehicle` in `page.tsx`.

## Using a different GLB

1. Put the file in `public/models/` and run `npm run inspect:model public/models/your-car.glb`.
2. In the vehicle data, set `model.url`, `model.dracoDecoderPath` (`null` if not Draco-compressed), and
   `model.transform.rotation` so the nose faces +Z.
3. Write `model.meshMapping` from the names the inspector prints. Patterns match mesh or material
   names, `*` is a wildcard, roles are checked in order, and the first match wins. Only `body` meshes
   are recoloured by the paint selector.
4. In development the browser console prints a table of every mesh and the role it got, with a
   warning if no `body` mesh matched.

Camera presets are authored in metres around the grounded, centred model. On narrow screens the
camera pulls back automatically, using the model's real bounds, so the whole car stays in frame.

## Clickable features

Tapping or clicking a part of the car selects it. The part is highlighted, a 3D leader line with a
label appears, the camera eases towards the part, and the details show in the Features panel below
the viewer. The Features menu uses the same `selectFeature()` state.

Each entry in `vehicle.features` can use either method, or both:

- **`meshNames`**: GLB meshes that select the feature directly. Use this only when the part really is
  its own mesh.
- **`hitAreas`**: invisible spheres or boxes, for parts merged into another mesh. For example, the
  mirrors and doors here are part of `body`, and the headlight lenses are part of `glass`.

A click counts as a tap only if the pointer moves 5 px or less. Anything more is left to
OrbitControls as a rotate.

### Debug mode (development only)

Open `/car/demo?debug=vehicle`, or set `NEXT_PUBLIC_VEHICLE_DEBUG=true` in `.env.local`. Hit areas are
drawn as wireframes, and each click logs the mesh, material, feature, and world/local position of
the hit. When a hit area is in front, the car surface behind it is logged too. Paste those
coordinates into `hitAreas` / `callout`.

## Model credit

The demo model is by vicent091036 on Sketchfab, as distributed with the three.js examples. It is a
stand-in: confirm its licence, or replace it with a licensed asset, before any production use.

## Showroom backdrop credit

The showroom is 3D (`src/components/car/CarShowroom.tsx`): a round glass wall centred on the turntable, so it
follows the stage's curve, with a city panorama outside. The view is "Signal Hill Dawn" by Greg Zaal, from
[Poly Haven](https://polyhaven.com/a/signal_hill_dawn) (CC0 – public domain), cropped and graded to evening in
`public/textures/showroom/city-view.webp`. To use a different view, replace that file.
