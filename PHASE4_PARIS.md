# Phase 4 · Paris at golden hour

The concept changed from "floor 88 office over a neon city" to "top-floor Paris loft over the rooftops at golden hour".
No more purple, magenta, neon, rain or flying traffic. Realistic, warm, calm. This file replaces the night parts of
PHASE2_IMPORT.md (the import mechanics there still apply).

## Files (put them in the repo)
- `public/models/office.glb` (replace). New: steel atelier window grid (`Atelier_Window`), neon tubes removed,
  chair / laptop / floor lamp / one plant moved by Gabin.
- `public/textures/office/lightmaps/*.exr` (replace all 7). Baked at golden hour: low warm sun from the front right,
  window grid shadows on the floor and the diploma wall, lamps on but soft.
- `public/textures/paris/paris_photo.jpg` (2528 x 1696) and `public/textures/paris/paris_depth.png` (same size).
  Depth PNG channels: R = nearness (0 far, 1 near), G = sky mask, B = mask of lights already lit in the photo.

## Remove
- `src/scene/city.js`, `sky.js`, `traffic.js`, `rain.js`, `signs.js` and their calls in `main.js`.
- Scene fog (or set it very light and warm). The magenta FOG / FOG_LOW / PAL constants in `shared.js`.
- In the grade pass: keep ACES, gamma, vignette, grain; drop the strong chromatic fringe (or halve it).
  Bloom: lower strength (about 0.35) and raise threshold, it is daylight now.

## The window view (2.5D photo with parallax)
A large plane outside the glass, e.g. centred at (0, 1.4, -30) in three coordinates, sized so the photo fills the
whole window from every camera keyframe (about 60 x 40 m). Custom ShaderMaterial, `fog: false`, `depthWrite: true`.
- Parallax: `uOff` = (camera.position - heroPosition).xy scaled, so the hero shot shows the photo as shot and other
  shots shift near layers more than the sky. Keep it subtle; at large offsets the hand-made depth edges stretch.
- Time of day: uniform `uT` from 0 (golden hour, photo as shot) to 1 (blue hour). Drive it from scroll:
  0 at the hero, about 0.35 at the desk, 1 at the contact shot.
- Reference implementation (works, tested in a standalone WebGL page). Adapt the uv math to the plane's uv:
```glsl
  const fs = `precision highp float; varying vec2 vUv;
    uniform sampler2D uImg, uDepth; uniform vec2 uOff; uniform float uT, uTime; uniform vec2 uScale;
    vec3 sat(vec3 c, float s){ float l = dot(c, vec3(.2126,.7152,.0722)); return mix(vec3(l), c, s); }
    void main(){
      vec2 uv = (vUv - .5) * uScale + .5; uv.y = 1. - uv.y;
      // fixed-point depth parallax: find the source pixel whose own depth lands it here
      vec2 s = uv;
      for (int i = 0; i < 5; i++) { float n = texture2D(uDepth, s).r; s = uv - uOff * (n - .1); }
      s = clamp(s, vec2(.001), vec2(.999));
      vec3 c = texture2D(uImg, s).rgb;
      vec3 dm = texture2D(uDepth, s).rgb; float sky = dm.g; float near = dm.r; float lights = dm.b;
      // gentle cloud drift in the sky only
      vec2 cs = clamp(s + vec2(uTime * .0025, 0.), vec2(.001), vec2(.999));
      float sky2 = texture2D(uDepth, cs).g;
      vec3 cd = texture2D(uImg, cs).rgb;
      c = mix(c, cd, sky * sky2 * .6 * (1. - smoothstep(.17, .26, s.y)));
      // time of day: 0 golden hour (photo as shot) -> 1 blue hour
      float t = uT;
      vec3 lin = pow(c, vec3(2.2));
      float lum = dot(lin, vec3(.2126,.7152,.0722));
      float y = s.y;
      vec3 skyBlue = mix(vec3(.10,.16,.34), vec3(.62,.42,.48), smoothstep(.12, .31, y));   // deep blue above, last glow at the horizon
      vec3 skyCol = mix(lin, skyBlue * (.55 + 1.2 * lum), smoothstep(0., .85, t));
      vec3 land = lin * mix(1., .16, t);
      land = mix(land, land * vec3(.62, .78, 1.35), t);
      // warm lights come on: bright, warm pixels below the skyline survive and glow
      float hazeK = (1. - smoothstep(.15, .6, near)) * t;                       // distance turns blue first
      land = mix(land, skyBlue * .22 * (.4 + lum), hazeK * .55);
      // lights come on: the photo's own lit windows and shops, brightened as the sky darkens
      land += vec3(1., .62, .3) * lights * smoothstep(.35, .9, t) * 1.4;
      vec3 col = mix(land, skyCol, sky);
      col = pow(col, vec3(1. / 2.2));
      col = sat(col, mix(1.02, .9, t));
      // window glass: faint reflection near the frame, vignette
      vec2 q = vUv - .5; col *= 1. - .35 * dot(q, q);
      gl_FragColor = vec4(col, 1.);
    }`;

```
- Lights layer: the B channel already marks the photo's lit windows and shops; it brightens as `uT` rises.

## Interior lighting (three coordinates: Blender (x, y, z) -> three (x, z, -y))
- Baked shell (Floor, Ceiling, Walls, Desk, Carpet): `MeshBasicMaterial` + `lightMap`, as before. Start at
  `lightMapIntensity` 0.6 and tune against `~/Documents/Portfolio3D/renders/review_sunset.png` on Gabin's Mac.
- As `uT` goes to 1: multiply the shell colour toward cool and darker (e.g. lerp color from #ffffff to #6f7ea8 and
  intensity to 0.35). The baked sun disappears visually, the lamps then carry the room. Not physically exact, but it reads.
- Real-time lights for the props (glTF PBR materials):
  - Sun: DirectionalLight, colour #ff9e5c, intensity about 2.5, direction of travel (-0.42, -0.20, 0.88) normalised
    (it comes in through the window from the front right). Shadows on, small shadow camera around the desk.
    Fade to 0 as `uT` goes to 1.
  - Sky fill: HemisphereLight sky #ffd2b0 / ground #3a2a24, intensity 0.6, fading to #4a5a8a as `uT` rises.
  - Desk lamp spot: position (-0.78, 1.053, -2.82), target (-0.53, 0.793, -2.57), warm #ffad66, soft shadow.
    Grows from 0.4 to 1.0 of its strength as `uT` rises.
  - Floor lamp spot: position (1.359, 1.458, -2.65), aimed straight down, warm #ffad66, same ramp.
  Lamp shades, bulbs and stems must not cast shadows.

## Camera keyframes
Room positions are unchanged, but the hero now looks out at a horizon, not down at a city 160 m below.
- Shot 1 target: roughly (0, 1.2, -40) so the photo horizon (Eiffel Tower left, sunset right) sits in the upper third.
- Shot 5 ("Night") becomes blue hour: look back toward the window, e.g. target (-6, 1.0, -40).
- Desk top is at y = 0.793.

## Copy and UI
- Accent colour from fuchsia to a warm sunset tone (e.g. #f2a65a); keep Instrument Serif / Sans and IBM Plex Mono.
- Hero eyebrow "Floor 88 · 23:47" -> something like "Paris · 19:42". Shot names on the rail: Window, Loft, Desk, Wall, Blue hour.

## Rights
Confirm the photo's licence before the site goes public (own photo, Unsplash or Pexels licence are fine).
