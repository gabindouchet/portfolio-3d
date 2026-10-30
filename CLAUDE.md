# Portfolio 3D · project brief

Personal portfolio of Gabin Douchet (goes by Doochitos), rebuilt as a scroll-driven 3D scene.
Built for fun and to impress recruiters (consulting, strategy, operations). Current site stays live at
https://gabindouchet.github.io/Portfolio/ until this one is finished.

## Concept
A desk in a tower office, floor 88, at night, in front of floor-to-ceiling glass over a neon city.
Mood: Blade Runner 2049 haze, Tron grid. Palette: purple, magenta, fuchsia. Realistic, not low-poly.
Scrolling drives the camera through 5 shots:
1. Window: looking out over the city (hero, name + tagline)
2. Office: step back, full room visible (about)
3. Desk: the papers on the desk, one per project (projects)
4. Wall: framed diplomas on the left wall (education)
5. Night: back toward the window and the neon sign (contact)
Scroll only for now, no click interactions. Mobile: decide later.

## Current state
`prototype/night-office.html` is the approved style prototype (single file, three r147 UMD from CDN).
Everything in it is approved: mood, palette, camera path, scroll feel. Keep it as the reference.
- City: ~1,500 instanced boxes, one custom ShaderMaterial (procedural windows, neon edges, roof rims,
  blinking roof lights, distance fade, exponential + height fog toward a magenta low haze).
- Ground plane with glowing street grid, sky dome shader, flying traffic (Points), rain (LineSegments),
  dust motes in the lamp light, three original neon signs (canvas textures, additive).
- Office: primitive geometry placeholders (desk, lamp with shadow-casting SpotLight, laptop, mug,
  6 project papers and 3 diplomas as canvas textures).
- Post: UnrealBloom + custom grade pass (ACES, sRGB gamma, chromatic fringe, vignette, grain).
- Camera: 5 keyframes (position + lookAt), eased interpolation, damped toward scroll, light mouse parallax.

## Stack and structure (target)
- Vite + vanilla JS ES modules + `three` from npm (latest stable) + `gsap` only if needed. No React.
- Suggested layout:
  - `index.html`, `src/main.js`
  - `src/scene/` city.js, sky.js, traffic.js, rain.js, office.js, signs.js, lights.js
  - `src/post/` composer.js (bloom + grade)
  - `src/camera/` keyframes.js, scroll.js
  - `src/content/content.json` (projects, education, contact: text lives here, not in code)
  - `public/models/` glb files, `public/textures/`
- Use the modern three postprocessing API (`three/addons/...`, OutputPass for color space).
- Respect `prefers-reduced-motion`. Keep a "skip to content" path. HTML overlays carry all readable text.

## Next phases
1. Port the prototype to the Vite structure above with no visual change. Verify side by side.
2. Office modeled in Blender (done separately, Claude drives Blender via MCP). Export one `office.glb`:
   baked lighting (lightmaps) for ambient/city glow, only the desk lamp stays real time for shadows.
   Compress with gltf-transform (meshopt or Draco, KTX2/WebP textures). Budget: 5 to 15 MB total.
3. Replace placeholder office primitives with the glb. City stays procedural, never modeled.
4. Performance pass: quality tiers (DPR cap, bloom off, fewer buildings) for weak GPUs and mobile.

## Deploy
GitHub repo `portfolio-3d`, deployed to GitHub Pages with a GitHub Actions workflow (build with Vite,
upload `dist`). Vite `base` must be `/portfolio-3d/`.

## Content (source: current site)
Projects: Capstone, Head of Design CAD (telescopic electric scaffolding lift, MECH 490), F1 Predict
(ridge regression, RMSE 2.35 s, R² 0.946), Job-Search Automation (Notion + scheduled agents),
Anew (iOS habit tracker, Swift), Haulotte R&D Engineer (6-month internship), BOOMER (co-founded
digital services venture, 2022).
Education: ESSEC MiM (2026 to 2028, in progress), Concordia B.Eng. Mechanical (2021 to 2026),
NUS exchange (2024).
Contact: gabin.douchet@essec.edu, linkedin.com/in/gabindouchet

## Working with Gabin
- Direct, concise answers. Critique his ideas honestly; say so when unsure.
- He uses the VS Code Source Control panel for Git, not terminal Git: explain commits that way.
- In visible site copy, avoid long dashes; use commas or periods.
- Typography: Instrument Serif (display), Instrument Sans (body), IBM Plex Mono (labels).
