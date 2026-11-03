# Phase 5 · Salon and the "Let's connect" shot

Read with CLAUDE.md, PHASE2_IMPORT.md and PHASE4_PARIS.md. The time-of-day shift was removed by Gabin:
the light stays at golden hour for the whole scroll. Do not reintroduce it.

## Files (replace in the repo)
- `public/models/office.glb` (3.3 MB). New objects: Sofa, Armchair_1, Armchair_2, CoffeeTable, Rug_Salon
  (node name may show as Carpet.002), Book_1..3 (covers, pages, spines, titles, cover art), Saucer,
  Espresso_Cup, Espresso_Handle, Coffee_Surface, AlpsFrame, AlpsPhoto. All are real-time PBR props:
  cast and receive shadows like the other props. Nothing new is a baked shell.
- `public/textures/office/lightmaps/Floor_lightmap.exr`, `Wall_Right_lightmap.exr`, `Wall_Back_lightmap.exr`
  (re-baked: the salon's shadows on the floor and walls).

## Lightmap orientation (must be in place)
In `src/scene/office.js`, after `lightMap.channel = 0;` the lightmap must be mirrored vertically:
`lightMap.repeat.set(1, -1); lightMap.offset.set(0, 1);` EXRLoader stores rows bottom-up while glTF UVs read
top-down. Without it every baked shadow (papers, salon, carpet) lands in the wrong place.

## Shot 5: "Let's connect" (replaces the old night / blue hour shot)
High-angle view down onto the coffee table, from the armchair side. three.js coordinates:
- position (0.62, 1.85, 0.50)
- target   (1.48, 0.42, 0.52)
- vertical field of view 50°
The middle of the table is left empty on purpose: the contact overlay (heading + email + LinkedIn) should sit
over it. Rename the rail item to "Connect". The camera path from shot 4 (diploma wall) turns right and tilts
down toward the salon; keep the eased interpolation.

## Notes
- The salon sits in the back right of the room. In the "Loft" shot an armchair may now appear lower right;
  that is accepted.
- Bouclé fabric bump is procedural in Blender and does not export: the sofa and armchairs come in as flat
  colour with sheen. Optional later: a small tiling noise normal map on the "Boucle" and "Boucle_Chocolate"
  materials.
- The book titles on the spines are text meshes; the Alps cover title is also text meshes on top of the art.
