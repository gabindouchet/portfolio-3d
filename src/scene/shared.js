import * as THREE from 'three';

// Seeded generator so the paper grain, laptop screen and dust are the same on every load.
export const rand = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();

export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

// Time of day from the fractional shot index (0 to 4): 0 golden hour at the hero, about 0.35 at the
// desk, 1 blue hour at the contact shot.
const TOD = [0, 0.15, 0.35, 0.6, 1];
export function timeOfDay(shot) {
  const i = Math.min(Math.floor(shot), TOD.length - 2), f = shot - i;
  return TOD[i] + (TOD[i + 1] - TOD[i]) * f;
}

// soft round sprite for the dust (linear, not a color texture)
export function createDotTexture() {
  const dot = canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.25, 'rgba(255,255,255,.6)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
  dot.colorSpace = THREE.NoColorSpace;
  return dot;
}
