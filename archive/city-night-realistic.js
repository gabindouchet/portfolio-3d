import * as THREE from 'three';
import { FOG, FOG_LOW, GROUND } from './shared.js';

// Realistic night city: block grid with real streets, buildings built from podium / tower / setback / crown,
// rooftop plant, antennas, interior-lit windows by building type, street lights and traffic on the ground,
// red aviation beacons, and a few restrained neon accents. One instanced draw call for all buildings.
// Uses its own seeded RNG so it does not shift the shared rand() sequence of other modules.
function buildCity(THREE, scene, opts) {
  const FOG = opts.fog, FOG_LOW = opts.fogLow, GROUND = opts.ground;
  const FOG_D = opts.fogDensity ?? 0.0009;
  const HAZE = new THREE.Color().setRGB(0.55, 0.15, 0.45);

  let s = 1337;
  const rng = () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const R = (a, b) => a + (b - a) * rng();

  // ---------- layout ----------
  const PX = 96, PZ = 84;            // block pitch (x, z); streets sit on multiples, x = 0 is the main avenue
  const STREET = 16, AVENUE = 34;
  const DOWNTOWN = [-60, -650];
  const MAX = 7000;
  const info = new Float32Array(MAX * 4);    // seed, type, lit fraction, neon flags
  const mats = [];
  let n = 0;
  const beacons = [];

  // types: 0 glass office, 1 residential, 2 dark glass, 3 stone / older, 9 rooftop plant (no windows)
  function add(x, y0, z, w, h, d, type, lit, flags = 0, seed = rng()) {
    if (n >= MAX || h <= 0.2) return;
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y0 + h / 2, z), new THREE.Quaternion(), new THREE.Vector3(w, h, d));
    mats.push(m); info.set([seed, type, lit, flags], n * 4); n++;
  }

  function roofPlant(x, top, z, w, d) {
    const k = Math.floor(R(0, 3.99));
    for (let i = 0; i < k; i++) add(x + R(-.3, .3) * w, top, z + R(-.3, .3) * d, R(3, 9), R(1.5, 4.5), R(3, 8), 9, 0);
  }

  function building(cx, cz, lw, ld, h, type, lit) {
    const seed = rng();
    const neonCrown = rng() < 0.1 && h > 70 ? 1 : 0;
    const neonEdge = rng() < 0.035 && h > 90 ? 2 : 0;
    let topX = cx, topZ = cz, topW = lw, topD = ld, top = GROUND + h;
    if (h > 90 && rng() < 0.7) {
      const ph = R(10, 28);
      add(cx, GROUND, cz, lw, ph, ld, type === 2 ? 3 : type, Math.min(1, lit + .15), 0, seed);
      roofPlant(cx + lw * .35, GROUND + ph, cz + ld * .35, lw * .2, ld * .2);
      topW = lw * R(.6, .85); topD = ld * R(.6, .85);
      topX = cx + R(-.5, .5) * (lw - topW); topZ = cz + R(-.5, .5) * (ld - topD);
      if (h > 180 && rng() < 0.6) {
        const hs = h * R(.62, .8);
        add(topX, GROUND + ph, topZ, topW, hs - ph, topD, type, lit, neonEdge, seed);
        topW *= R(.7, .85); topD *= R(.7, .85);
        add(topX, GROUND + hs, topZ, topW, h - hs, topD, type, lit, neonCrown, seed);
      } else {
        add(topX, GROUND + ph, topZ, topW, h - ph, topD, type, lit, neonCrown + neonEdge, seed);
      }
    } else {
      topW = lw * R(.9, 1); topD = ld * R(.9, 1);
      add(cx, GROUND, cz, topW, h, topD, type, lit, neonCrown, seed);
    }
    if (h > 150 && rng() < 0.4) {
      const ch = R(4, 12);
      add(topX, top, topZ, topW * R(.35, .6), ch, topD * R(.35, .6), 9, 0);
      top += ch;
    }
    roofPlant(topX, GROUND + h, topZ, topW, topD);
    if (h > 200 && rng() < 0.5) {
      const ah = R(15, 45);
      add(topX + R(-.2, .2) * topW, top, topZ + R(-.2, .2) * topD, 1.2, ah, 1.2, 9, 0);
      beacons.push(topX, top + ah, topZ);
    }
    if (h > 140) {
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) beacons.push(topX + sx * topW * .48, GROUND + h + 0.5, topZ + sz * topD * .48);
    }
  }

  const forced = { '-2,1': 235, '1,1': 262, '-3,2': 212, '2,3': 205, '-1,3': 175, '3,2': 190 };
  for (let i = -9; i <= 8; i++) {
    for (let j = 1; j <= 16; j++) {
      const bx = (i + 0.5) * PX, bz = -(j - 0.5) * PZ - 6;
      const halfStreetX = (i === 0 || i === -1) ? (AVENUE / 2 + STREET / 2) / 2 : STREET / 2;
      const bw = PX - STREET - (i === 0 || i === -1 ? (AVENUE - STREET) / 2 : 0) - 6;
      const bd = PZ - STREET - 6;
      const bcx = bx + (i === 0 ? (AVENUE - STREET) / 4 : i === -1 ? -(AVENUE - STREET) / 4 : 0);
      const dd = Math.hypot(bx - DOWNTOWN[0], bz - DOWNTOWN[1]);
      const f = Math.exp(-((dd / 420) ** 2));
      const split = rng();
      const lots = split < 0.35 ? [[0, 0, 1, 1]] : split < 0.7 ? [[-.25, 0, .5, 1], [.25, 0, .5, 1]] : [[-.25, -.25, .5, .5], [.25, -.25, .5, .5], [-.25, .25, .5, .5], [.25, .25, .5, .5]];
      for (const [ox, oz, sw, sd] of lots) {
        const lw = bw * sw - 3, ld = bd * sd - 3;
        const cx = bcx + ox * bw, cz = bz + oz * bd;
        let h = 16 + Math.pow(rng(), 1.7) * (50 + 360 * f);
        const key = `${i},${j}`;
        if (forced[key] && lots.length === 1) h = forced[key];
        else if (forced[key]) h = Math.max(h, forced[key] * R(.55, .9));
        if (Math.abs(bcx) < 110 && bz > -320) h = Math.min(h, 125);   // keep the avenue view open
        const r = rng();
        const pOffice = 0.2 + 0.6 * f + (h > 120 ? 0.25 : 0);
        const type = r < pOffice ? 0 : r < pOffice + 0.14 ? 2 : r < pOffice + 0.14 + 0.18 * (1 - f) ? 3 : 1;
        const dark = rng() < 0.22 ? 0.25 : 1;
        const lit = dark * (type === 0 ? R(.18, .45) : type === 1 ? R(.12, .34) : type === 2 ? R(.05, .18) : R(.14, .32));
        building(cx, cz, lw, ld, h, type, lit);
      }
    }
  }

  const geo = new THREE.BoxGeometry(1, 1, 1);
  geo.setAttribute('aInfo', new THREE.InstancedBufferAttribute(info, 4));
  const uniforms = {
    uFog: { value: FOG }, uFogLow: { value: FOG_LOW }, uHaze: { value: HAZE },
    uFogD: { value: FOG_D }, uTime: { value: 0 }, uGround: { value: GROUND }
  };
  const FOG_GLSL = `
    vec3 applyFog(vec3 col, vec3 w, float d){
      float fogF = 1. - exp(-d * uFogD);
      float low = smoothstep(uGround + 200., uGround, w.y);
      fogF = clamp(fogF + low * .3 * (1. - fogF) * smoothstep(60., 600., d), 0., 1.);
      return mix(col, mix(uFog, uFogLow, low) * .8, fogF);
    }`;
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `attribute vec4 aInfo; varying vec3 vW; varying vec3 vN; varying vec3 vL; varying vec3 vS; varying vec4 vInfo;
      void main(){ vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.); vW = wp.xyz; vN = normal; vL = position; vInfo = aInfo;
        vS = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
        gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: `uniform vec3 uFog; uniform vec3 uFogLow; uniform vec3 uHaze; uniform float uFogD; uniform float uTime; uniform float uGround;
      varying vec3 vW; varying vec3 vN; varying vec3 vL; varying vec3 vS; varying vec4 vInfo;
      float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      vec3 neonPal(float t){ return t < .45 ? vec3(1., .12, .62) : t < .8 ? vec3(.55, .22, 1.) : vec3(1., .35, .9); }
      vec3 winCol(float r, float type){
        vec3 warm = vec3(1., .6, .3), neutral = vec3(1., .8, .58), cool = vec3(.78, .88, 1.), tv = vec3(.45, .55, 1.);
        if (type < .5 || (type > 1.5 && type < 2.5)) return r < .55 ? cool : r < .88 ? neutral : warm;
        if (type < 1.5) return r < .68 ? warm : r < .93 ? neutral : tv;
        return r < .7 ? warm : neutral;
      }
      ${FOG_GLSL}
      void main(){
        float seed = vInfo.x, type = vInfo.y, lit = vInfo.z, flags = vInfo.w;
        float d = length(vW - cameraPosition);
        vec3 V = normalize(cameraPosition - vW);
        float hgt = vW.y - uGround;
        vec3 col;
        if (type > 8.5) {
          col = vec3(.016, .014, .019) + uHaze * .015 * max(vN.y, 0.);
        } else if (abs(vN.y) < .5) {
          bool sx = abs(vN.x) > .5;
          float u = sx ? vW.z + seed * 173. : vW.x + seed * 131.;
          vec2 cell = type < .5 ? vec2(1.6, 3.9) : type < 1.5 ? vec2(3., 3.2) : type < 2.5 ? vec2(1.8, 3.8) : vec2(3.4, 3.6);
          vec2 ws = type < .5 ? vec2(.9, .8) : type < 1.5 ? vec2(.5, .52) : type < 2.5 ? vec2(.92, .82) : vec2(.4, .56);
          vec2 g = vec2(u, hgt) / cell; vec2 id = floor(g); vec2 f = fract(g);
          vec2 fw = fwidth(g); float fp = max(fw.x, fw.y);
          vec2 e = max(fw, vec2(.02));
          float mx = smoothstep(.5 - ws.x * .5 - e.x, .5 - ws.x * .5 + e.x, f.x) * smoothstep(.5 + ws.x * .5 + e.x, .5 + ws.x * .5 - e.x, f.x);
          float cy = .56;
          float my = smoothstep(cy - ws.y * .5 - e.y, cy - ws.y * .5 + e.y, f.y) * smoothstep(cy + ws.y * .5 + e.y, cy + ws.y * .5 - e.y, f.y);
          float win = mx * my;
          bool floorWise = type < .5 || (type > 1.5 && type < 2.5);
          float r = h21(id + seed * 57.1);
          float on;
          float pOn;
          if (floorWise) {
            float pf = clamp(lit * (type > 1.5 ? .7 : 1.1), 0., 1.);
            float floorOn = step(h21(vec2(id.y, seed * 91.3)), pf);
            on = floorOn * step(r, .72) + (1. - floorOn) * step(r, .04);
            pOn = pf * .72 + (1. - pf) * .04;
          } else { on = step(r, lit); pOn = lit; }
          float shop = 1. - step(6.5, hgt);
          on = max(on, shop * step(r, .8));
          float rc = h21(id * 1.37 + seed * 3.1);
          vec3 wc = winCol(rc, type) * (.3 + .8 * h21(id + 7.7));
          wc *= mix(.55, 1.15, smoothstep(0., 1., f.y));
          if (type > .5 && type < 1.5 && h21(id + 3.3) > .6) wc *= mix(.55 + .45 * step(.5, fract(f.y * 7.)), .78, smoothstep(.1, .3, fp));
          if (rc > .93 && type > .5 && type < 1.5) wc *= .75 + .25 * sin(uTime * 7. + seed * 40. + id.x);
          vec3 litC = wc * .95 * (1. + shop * .8);
          float fres = pow(1. - max(dot(V, vN), 0.), 4.);
          float glassy = floorWise ? 1. : .35;
          vec3 glass = mix(vec3(.01, .01, .016), uHaze * .16, .1 + .9 * fres) * glassy * (.75 + .5 * h21(id * .73 + seed));
          vec3 wall = type > 2.5 ? vec3(.032, .027, .025) : vec3(.016, .014, .019);
          vec3 nearC = mix(wall, on > .5 ? litC : glass, win);
          float area = ws.x * ws.y;
          vec3 avgLit = (floorWise ? vec3(.86, .87, .88) : vec3(1., .7, .42)) * .7 * .95 * .8;
          vec3 avgGlass = mix(vec3(.01, .01, .016), uHaze * .16, .1 + .9 * fres) * glassy;
          vec3 farC = mix(wall, avgLit * pOn + avgGlass * (1. - pOn), area);
          // mid distance: keep floor-to-floor variation so towers do not flatten into a uniform glow
          if (floorWise) {
            float pf = clamp(lit * (type > 1.5 ? .7 : 1.1), 0., 1.);
            float floorOn = step(h21(vec2(id.y, seed * 91.3)), pf);
            vec3 rowC = mix(wall, avgLit * (floorOn * .72 + (1. - floorOn) * .04) + avgGlass * .3, area);
            farC = mix(rowC, farC, smoothstep(.6, 1.2, fw.y));
          }
          col = mix(nearC, farC, smoothstep(.3, .9, fp));
          col += vec3(1., .5, .2) * .09 * exp(-hgt / 12.);
          col += uFogLow * .035 * exp(-hgt / 120.);
          vec3 neon = neonPal(fract(seed * 7.13));
          float fromTop = (.5 - vL.y) * vS.y;
          if (mod(flags, 2.) > .5) {
            float band = smoothstep(max(.35, fwidth(fromTop)), 0., abs(fromTop - 2.6) - .7);
            col += neon * 2.4 * band;
          }
          if (flags > 1.5) {
            float lx = sx ? vL.z : vL.x; float W = sx ? vS.z : vS.x;
            float edge = (.5 - abs(lx)) * W;
            col += neon * 1.6 * smoothstep(.6, 0., edge) * smoothstep(0., 30., hgt);
          }
        } else if (vN.y > .5) {
          float m = min((.5 - abs(vL.x)) * vS.x, (.5 - abs(vL.z)) * vS.z);
          col = vec3(.013, .012, .016) + vec3(.018) * smoothstep(1., 0., m) + uHaze * .018;
          if (mod(flags, 2.) > .5) col += neonPal(fract(seed * 7.13)) * .05;
        } else col = vec3(0.);
        gl_FragColor = vec4(applyFog(col, vW, d), 1.);
      }`
  });
  const city = new THREE.InstancedMesh(geo, mat, n);
  for (let k = 0; k < n; k++) city.setMatrixAt(k, mats[k]);
  city.instanceMatrix.needsUpdate = true;
  city.frustumCulled = false;
  scene.add(city);

  // ---------- ground: asphalt, sidewalks, sodium street lights, moving traffic ----------
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform vec3 uFog; uniform vec3 uFogLow; uniform vec3 uHaze; uniform float uFogD; uniform float uTime; uniform float uGround; varying vec3 vW;
      float h11(float p){ return fract(sin(p * 127.1) * 43758.5453); }
      ${FOG_GLSL}
      // energy-preserving glow: widens with pixel footprint so it never sparkles at distance
      float glow(float dist, float r, float fp){ float re = max(r, fp * 1.6); return exp(-dist * dist / (re * re)) * (r * r) / (re * re); }
      vec3 traffic(float along, float across, float laneHalf, float idx, float fp, float avenue){
        vec3 c = vec3(0.);
        for (int k = 0; k < 2; k++) {
          float dir = k == 0 ? 1. : -1.;
          float lane = dir * laneHalf * .5;
          float sp = (avenue > .5 ? 13. : 9.) + 3. * h11(idx * 3.1 + float(k));
          float ph = along / 11. + dir * uTime * sp / 11. + h11(idx + float(k) * 7.) * 20.;
          float cid = floor(ph); float fr = fract(ph);
          float present = step(h11(cid * 1.7 + idx * 13. + float(k)), avenue > .5 ? .55 : .3);
          float body = glow((fr - .5) * 11., 1.2, fp) * glow(across - lane, .9, fp);
          vec3 lc = k == 0 ? vec3(1., .92, .8) * 2.6 : vec3(1., .08, .05) * 2.;
          c += lc * body * present;
        }
        return c;
      }
      void main(){
        float PX = ${PX.toFixed(1)}, PZ = ${PZ.toFixed(1)};
        float d = length(vW - cameraPosition);
        vec2 fw = fwidth(vW.xz); float fp = max(fw.x, fw.y);
        float ix = floor(vW.x / PX + .5); float sxC = ix * PX; float ax = vW.x - sxC;
        float iz = floor(vW.z / PZ + .5); float szC = iz * PZ - 6.; float az = vW.z - szC;
        float halfX = abs(ix) < .5 ? ${(AVENUE / 2).toFixed(1)} : ${(STREET / 2).toFixed(1)};
        float halfZ = ${(STREET / 2).toFixed(1)};
        bool onX = abs(ax) < halfX; bool onZ = abs(az) < halfZ;
        vec3 col = vec3(.022, .02, .024);
        if (onX || onZ) col = vec3(.008, .008, .01);
        else if (abs(ax) < halfX + 3. || abs(az) < halfZ + 3.) col = vec3(.03, .028, .03);
        vec3 light = vec3(0.);
        // street lights every 30 m on both kerbs
        float ly = fract(vW.z / 30.) * 30. - 15.;
        light += vec3(1., .52, .2) * 2. * glow(length(vec2(abs(ax) - halfX + .8, ly)), 1., fp);
        light += vec3(1., .52, .2) * .1 * glow(length(vec2(abs(ax) - halfX + .8, ly)), 7., fp);
        float lx = fract(vW.x / 30.) * 30. - 15.;
        light += vec3(1., .52, .2) * 2. * glow(length(vec2(lx, abs(az) - halfZ + .8)), 1., fp);
        light += vec3(1., .52, .2) * .1 * glow(length(vec2(lx, abs(az) - halfZ + .8)), 7., fp);
        if (onX) light += traffic(vW.z, ax, halfX * .9, ix, fp, abs(ix) < .5 ? 1. : 0.);
        if (onZ && !onX) light += traffic(vW.x, az, halfZ * .9, iz + 50., fp, 0.);
        col += light;
        gl_FragColor = vec4(applyFog(col, vW, d), 1.);
      }`
  }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, GROUND, -700);
  scene.add(ground);

  // ---------- aviation beacons ----------
  const bGeo = new THREE.BufferGeometry();
  bGeo.setAttribute('position', new THREE.Float32BufferAttribute(beacons, 3));
  const phase = new Float32Array(beacons.length / 3).map(() => rng());
  bGeo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
  const beaconMat = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute float aPhase; varying float vA; varying float vD; uniform float uTime;
      void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); vD = -mv.z;
        float b = step(.55, fract(uTime * .5 + aPhase * .3));
        vA = .25 + .75 * b;
        gl_PointSize = clamp(5200. / vD, 2., 14.); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uFogD; varying float vA; varying float vD;
      void main(){ vec2 c = gl_PointCoord - .5; float a = exp(-dot(c, c) * 22.);
        float fog = exp(-vD * uFogD * .8);
        gl_FragColor = vec4(vec3(1., .08, .05) * 5. * a * vA * fog, 1.); }`
  });
  const beaconPts = new THREE.Points(bGeo, beaconMat);
  beaconPts.frustumCulled = false;
  scene.add(beaconPts);

  return {
    count: n, beacons: beacons.length / 3,
    update: ({ t }) => { uniforms.uTime.value = t; }
  };
}

// Same signature as before: main.js does not change.
export function createCity(scene) {
  return buildCity(THREE, scene, { fog: FOG, fogLow: FOG_LOW, ground: GROUND });
}
