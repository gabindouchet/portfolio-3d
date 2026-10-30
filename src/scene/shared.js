import * as THREE from 'three';

// One seeded generator for the whole scene. Every module draws from the same sequence, so the
// build order in main.js (city, traffic, rain, office, dust) decides the layout. Changing that
// order, or adding rand() calls before the city, reshuffles the skyline.
export const rand = (() => {
  let s = 7;
  // the approved skyline was generated after the prototype's concrete texture took 45,000 draws;
  // that texture is gone with the glb office, so skip ahead to keep the same city
  for (let i = 0; i < 45000; i++) s = (s * 16807) % 2147483647;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
})();

export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

export const PAL = { mag: [1.0, 0.12, 0.62], vio: [0.55, 0.22, 1.0], fuc: [1.0, 0.35, 0.9], lav: [0.95, 0.85, 1.0] };

export const FOG = new THREE.Color().setRGB(0.10, 0.025, 0.14);
export const FOG_LOW = new THREE.Color().setRGB(0.34, 0.05, 0.30);
export const FOG_DENSITY = 0.0030;
export const GROUND = -160;

// soft round sprite for traffic lights and dust (linear, not a color texture)
export function createDotTexture() {
  const dot = canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.25, 'rgba(255,255,255,.6)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
  dot.colorSpace = THREE.NoColorSpace;
  return dot;
}
