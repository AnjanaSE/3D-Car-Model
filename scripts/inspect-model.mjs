#!/usr/bin/env node
/**
 * Lists the nodes, meshes, materials and world-space bounds in a .glb so the
 * vehicle's `meshMapping` can be written from real names instead of guesses.
 * Works on Draco-compressed files (it only reads the JSON chunk + accessor bounds).
 *
 *   npm run inspect:model                       # public/models/demo-car.glb
 *   npm run inspect:model -- path/to/model.glb
 */
import { readFileSync } from "node:fs";
import { Box3, Matrix4, Quaternion, Vector3 } from "three";

const file = process.argv[2] ?? "public/models/demo-car.glb";
const buffer = readFileSync(file);

if (buffer.toString("utf8", 0, 4) !== "glTF") {
  console.error(`${file} is not a binary glTF (.glb) file.`);
  process.exit(1);
}

const jsonLength = buffer.readUInt32LE(12);
const gltf = JSON.parse(buffer.toString("utf8", 20, 20 + jsonLength));
const fmt = (v) => v.toArray().map((n) => n.toFixed(2).padStart(6)).join(" ");

console.log(`\n${file}`);
console.log(`extensions: ${(gltf.extensionsUsed ?? []).join(", ") || "none"}`);
console.log(`\nMaterials (${gltf.materials?.length ?? 0}):`);
for (const material of gltf.materials ?? []) {
  const pbr = material.pbrMetallicRoughness ?? {};
  console.log(
    `  ${material.name ?? "(unnamed)"}  metal=${pbr.metallicFactor ?? 1} rough=${pbr.roughnessFactor ?? 1}` +
      `${pbr.baseColorTexture ? " [baseColor texture]" : ""}`,
  );
}

console.log("\nMeshes (world bounds in metres: min x y z | max x y z):");
const total = new Box3();
const rows = [];

function walk(index, parentMatrix, depth) {
  const node = gltf.nodes[index];
  const local = node.matrix
    ? new Matrix4().fromArray(node.matrix)
    : new Matrix4().compose(
        new Vector3(...(node.translation ?? [0, 0, 0])),
        new Quaternion(...(node.rotation ?? [0, 0, 0, 1])),
        new Vector3(...(node.scale ?? [1, 1, 1])),
      );
  const world = parentMatrix.clone().multiply(local);

  if (node.mesh != null) {
    const mesh = gltf.meshes[node.mesh];
    const box = new Box3();
    const materials = new Set();
    for (const primitive of mesh.primitives) {
      const accessor = gltf.accessors[primitive.attributes.POSITION];
      if (accessor.min && accessor.max) {
        box.union(new Box3(new Vector3(...accessor.min), new Vector3(...accessor.max)));
      }
      if (primitive.material != null) materials.add(gltf.materials[primitive.material].name);
    }
    box.applyMatrix4(world);
    total.union(box);
    rows.push({ depth, name: node.name ?? "(unnamed)", materials: [...materials].join(", "), box });
  } else {
    rows.push({ depth, name: `${node.name ?? "(group)"}/`, materials: "", box: null });
  }

  for (const child of node.children ?? []) walk(child, world, depth + 1);
}

const scene = gltf.scenes[gltf.scene ?? 0];
for (const root of scene.nodes) walk(root, new Matrix4(), 0);

for (const row of rows) {
  const label = `${"  ".repeat(row.depth + 1)}${row.name}`.padEnd(34);
  console.log(row.box ? `${label}${fmt(row.box.min)} | ${fmt(row.box.max)}  (${row.materials})` : label);
}

const size = total.getSize(new Vector3());
console.log(`\nOverall size: ${size.x.toFixed(2)} × ${size.y.toFixed(2)} × ${size.z.toFixed(2)} m (x × y × z)`);
console.log(`Overall bounds: ${fmt(total.min)} | ${fmt(total.max)}\n`);
