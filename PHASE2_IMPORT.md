# Phase 2 · importing the Blender office

Source: `~/Documents/Portfolio3D/office.blend` (Blender 5.2). Exports land in `~/Documents/Portfolio3D/export/`.
Copy them into the repo as:
- `public/models/office.glb` (1.7 MB, WebP textures embedded: albedo + normal maps of the baked shell, all props)
- `public/textures/office/lightmaps/*.exr` (7 files, 4.6 MB total, half-float DWAA). Load with `EXRLoader`.
Total about 6.3 MB, inside the 5 to 15 MB budget. Run gltf-transform (meshopt) on the glb later for more savings.

Note on brightness: the lightmaps are Cycles path-traced, so they are brighter and flatter than the EEVEE
preview renders. Start with `lightMapIntensity` around 0.4 and tune until the room matches
`~/Documents/Portfolio3D/renders/review_lighting_v1.png` (dark room, warm lamp pools, city rim light).
Glossy floor reflections are not baked: the floor is meant to be matte.

Mesh names in the glb may carry a `.001` suffix (Blender data names). Find objects by node name
(`Floor`, `Desk`, ...) or by the `baked` extra on the node/material.

## Coordinate system
Blender is Z-up, three.js is Y-up. The glTF exporter converts: Blender (x, y, z) -> three (x, z, -y).
The office was built on the prototype's coordinates, so the city, camera keys and overlays still line up.
Change from the prototype: the carpet is 2.8 cm thick and everything on it was raised by 0.028 m.
Desk top is now at y = 0.793 (was 0.765). Update the desk camera target y accordingly.

## Two kinds of objects in office.glb
1. Baked shell (custom property `baked = true`): Floor, Ceiling, Wall_Left, Wall_Right, Wall_Back, Desk, Carpet.
   - Each has one UV map (TEXCOORD_0) shared by all its textures.
   - Textures: `<Name>_albedo.png` (sRGB), `<Name>_normal.png` (tangent, optional), `<Name>_lightmap.exr` (linear HDR).
   - Render with `MeshBasicMaterial({ map: albedo, lightMap: lightmap, lightMapIntensity: ~1 })`
     (set `lightmap.channel = 0`). Basic material ignores real-time lights, so the baked light is not doubled.
   - Floor: add a faint reflection later if wanted, it is meant to be mostly matte.
2. Dynamic props (real-time PBR): lamps, laptop, speakers, notebook, pen, chair, plants, diploma frames, window frame.
   These are lit by real-time lights recreated in code (below).

## Real-time lights to recreate (three.js coordinates)
- Desk lamp spot: pos (-0.78, 1.053, -2.82), target (-0.53, 0.793, -2.57), warm #ffad66, wide cone, soft shadow.
- Floor lamp spot: pos (1.60, 1.458, -2.65), aimed straight down, warm #ffad66.
- City fill: soft magenta from the window side (z about -4), plus a dim violet. Keep low, the city shader does the rest.
- Diploma wall graze: pos (-2.55, 2.92, -1.95), target (-3.2, 1.15, 1.0), pink #ff6bd9, narrow cone.
Lamp shades, bulbs and stems must not cast shadows (light sits on the stem axis).

## Content textures (from content.json, not from Blender)
- `Paper_1` to `Paper_6`: 0.21 x 0.297 planes, UV 0-1. Apply the canvas project textures from the prototype.
- `Diploma_1_Paper` to `Diploma_3_Paper`: 0.46 x 0.351 planes, UV 0-1. Same idea for the diplomas.
- `Laptop_Screen`: plane, emissive purple screen texture.

## Window
`Window_Glass` and `City_Backdrop` are Blender-only lighting helpers. Do not export them.
On the web the glass is a three.js plane with a rain-on-glass shader, the procedural city behind it.

## Later
- Carpet fluff: shell-fur shader on the carpet (8 to 16 shells) for a real pile look.
- Compress the glb with gltf-transform (meshopt + WebP/KTX2). Budget 5 to 15 MB including textures.
