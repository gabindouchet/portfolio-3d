import * as THREE from 'three';
import layers from './paris_layers.json';

// The view out of the window: one photo of Paris on a large plane behind the glass, with
// layered 2.5D parallax and a golden hour (uT = 0, photo as shot) to blue hour (uT = 1) grade.
// paris_depth.png: R = nearness (0 far, 1 near), G = sky mask, B = lights already lit in the photo.
const BASE = import.meta.env.BASE_URL;
const ASPECT = 2528 / 1696;
// 50 m wide at z = -30: from the hero the Eiffel Tower lands in the left pane and the sun in the right
// pane of the atelier grid, while the loft and blue hour shots still see photo out to the window edges
const WIDTH = 50, HEIGHT = WIDTH / ASPECT;
const SCALE = 0.96;          // crop a little so parallax never samples past the photo edge
const HORIZON = 0.29;        // photo horizon, from the top of the image
const DIST = 30;             // plane z = -30, about 26 m beyond the glass
const PARALLAX = 0.025;      // uv shift per metre of camera travel away from the hero position

// Separate layers (from tools/paris_layers.py): 0 sky, 1 distant city, 2 to 9 the hand-painted building
// layers. Each layer moves rigidly by its own nearness, so edges never stretch. Where a layer slides off
// what it covered, its fill tile (its own colours pushed out behind the nearer layers) shows instead.
// The script also writes paris_layers.json (nearness per layer, atlas grid): rerun it after changing
// the photo or the depth map, nothing to edit here.
const LAYER_NEAR = layers.near;
const N = LAYER_NEAR.length, FILL_COLS = layers.cols, FILL_ROWS = layers.rows;

const fragmentShader = /* glsl */`
  varying vec2 vUv;
  uniform sampler2D uImg, uDepth, uLayers, uFill;
  uniform vec2 uOff, uScale;
  uniform float uT, uTime, uExposure;
  uniform float uNear[${N}];
  vec3 sat(vec3 c, float s){ float l = dot(c, vec3(.2126,.7152,.0722)); return mix(vec3(l), c, s); }
  int layerAt(vec2 s){ return int(textureLod(uLayers, s, 0.).r * 255. + .5); }
  vec4 fillAt(int k, vec2 s){
    vec2 tile = vec2(float(k - (k / ${FILL_COLS}) * ${FILL_COLS}), float(k / ${FILL_COLS}));
    return textureLod(uFill, (tile + clamp(s, vec2(.002), vec2(.998))) / vec2(${FILL_COLS}., ${FILL_ROWS}.), 0.);
  }
  void main(){
    vec2 uv = (vUv - .5) * uScale + .5; uv.y = 1. - uv.y;   // image space, y down
    // front to back: the nearest layer that owns this pixel after its own shift wins
    vec3 c = vec3(0.); vec2 s = uv; int hit = 0; bool fromPhoto = false;
    for (int k = ${N - 1}; k >= 0; k--) {
      s = clamp(uv - uOff * (uNear[k] - .1), vec2(.001), vec2(.999));
      int id = layerAt(s);
      if (id == k) { c = textureLod(uImg, s, 0.).rgb; hit = k; fromPhoto = true; break; }   // visible in the photo
      if (id > k) {                                                                        // hidden behind a nearer layer
        vec4 f = fillAt(k, s);
        if (f.a > .5 || k == 0) { c = f.rgb; hit = k; break; }
      }
    }
    float sky = hit == 0 ? 1. : 0., near = uNear[hit];
    float lights = fromPhoto ? textureLod(uDepth, s, 0.).b : 0.;
    // gentle cloud drift in the sky only
    if (hit == 0 && fromPhoto) {
      vec2 cs = clamp(s + vec2(uTime * .0025, 0.), vec2(.001), vec2(.999));
      float sky2 = layerAt(cs) == 0 ? 1. : 0.;
      c = mix(c, textureLod(uImg, cs, 0.).rgb, sky2 * .6 * (1. - smoothstep(.17, .26, s.y)));
    }
    // time of day: 0 golden hour (photo as shot) -> 1 blue hour
    float t = uT;
    float lum = dot(c, vec3(.2126,.7152,.0722));
    vec3 skyBlue = mix(vec3(.10,.16,.34), vec3(.62,.42,.48), smoothstep(.12, .31, s.y)); // deep blue above, last glow at the horizon
    vec3 skyCol = mix(c, skyBlue * (.55 + 1.2 * lum), smoothstep(0., .85, t));
    vec3 land = c * mix(1., .16, t);
    land = mix(land, land * vec3(.62, .78, 1.35), t);
    float hazeK = (1. - smoothstep(.15, .6, near)) * t;                                  // distance turns blue first
    land = mix(land, skyBlue * .22 * (.4 + lum), hazeK * .55);
    land += vec3(1., .62, .3) * lights * smoothstep(.35, .9, t) * 1.4;                  // windows and shops light up
    vec3 col = mix(land, skyCol, sky);
    col = sat(col, mix(1.02, .9, t));
    vec2 q = vUv - .5; col *= 1. - .35 * dot(q, q);
    gl_FragColor = vec4(col * uExposure, 1.);   // linear: the grade pass does tone mapping and gamma
  }`;

function load(url, colorSpace, filter = THREE.LinearFilter) {
  const t = new THREE.TextureLoader().load(url);
  t.colorSpace = colorSpace; t.flipY = false;   // image space, y down, as the shader expects
  t.generateMipmaps = false; t.minFilter = t.magFilter = filter;
  return t;
}

export function createParisView(scene, { heroPosition, camera, reduce }) {
  const uniforms = {
    uImg: { value: load(`${BASE}textures/paris/paris_photo.jpg`, THREE.SRGBColorSpace) },
    uDepth: { value: load(`${BASE}textures/paris/paris_depth.png`, THREE.NoColorSpace) },
    uLayers: { value: load(`${BASE}textures/paris/paris_layers.png`, THREE.NoColorSpace, THREE.NearestFilter) },   // ids: never blend
    uFill: { value: load(`${BASE}textures/paris/paris_fill.webp`, THREE.SRGBColorSpace) },   // decoded like the photo
    uNear: { value: LAYER_NEAR },
    uOff: { value: new THREE.Vector2() },
    uScale: { value: new THREE.Vector2(SCALE, SCALE) },
    uT: { value: 0 }, uTime: { value: 0 }, uExposure: { value: 1.0 }
  };
  const view = new THREE.Mesh(new THREE.PlaneGeometry(WIDTH, HEIGHT), new THREE.ShaderMaterial({
    uniforms, fragmentShader, fog: false, depthWrite: true,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`
  }));
  // place the photo horizon in the upper third of the hero shot: a few degrees above eye level
  const horizonY = heroPosition.y + (DIST + heroPosition.z) * Math.tan(THREE.MathUtils.degToRad(7));
  view.position.set(0, horizonY - (0.5 - HORIZON) * HEIGHT / SCALE, -DIST);
  scene.add(view);

  return {
    update({ t, uT }) {
      // near layers shift more than the sky as the camera leaves the hero position (image y is down)
      uniforms.uOff.value.set(-(camera.position.x - heroPosition.x), camera.position.y - heroPosition.y).multiplyScalar(PARALLAX);
      uniforms.uT.value = uT;
      uniforms.uTime.value = reduce ? 0 : t;
    }
  };
}
