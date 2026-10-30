import * as THREE from 'three';
import { canvasTex } from './shared.js';

// three original neon signs: canvas textures on additive planes
function sign(text, w, h, cssW, cssH, color, vertical) {
  const tex = canvasTex(cssW, cssH, (g, W, H) => {
    g.fillStyle = 'rgba(0,0,0,0)'; g.clearRect(0, 0, W, H);
    g.strokeStyle = color; g.lineWidth = 10; g.shadowColor = color; g.shadowBlur = 30;
    g.strokeRect(14, 14, W - 28, H - 28);
    g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (vertical) {
      const L = text.split(''); const step = (H - 80) / L.length;
      g.font = `400 ${step * 0.82}px "Instrument Serif", serif`;
      L.forEach((ch, i) => g.fillText(ch, W / 2, 40 + step * (i + 0.5)));
    } else {
      const lines = text.split('\n');
      g.font = `500 ${H / (lines.length + 1.6)}px "IBM Plex Mono", monospace`;
      lines.forEach((ln, i) => g.fillText(ln, W / 2, H / 2 + (i - (lines.length - 1) / 2) * H / (lines.length + 0.6)));
    }
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, color: new THREE.Color(2.2, 2.2, 2.2), side: THREE.DoubleSide }));
}

export function createSigns(scene, { reduce }) {
  const signA = sign('DOUCHET', 16, 92, 256, 1472, '#ff3fb4', true);
  signA.position.set(-84, -12, -54); signA.rotation.y = 0.5; scene.add(signA);
  const signB = sign('PRECISION BUILT\nSTRATEGICALLY DRIVEN', 74, 26, 1280, 450, '#b98cff', false);
  signB.position.set(92, 30, -176); signB.rotation.y = -0.45; scene.add(signB);
  const signC = sign('FLOOR 88', 30, 9, 768, 230, '#ff5fd0', false);
  signC.position.set(-30, -60, -330); scene.add(signC);

  return {
    update: ({ t }) => {
      const flick = reduce ? 1 : (Math.sin(t * 23) > 0.96 ? 0.35 : 1);
      signB.material.opacity = flick;
      signA.material.opacity = 0.85 + 0.15 * Math.sin(t * 2.0);
    }
  };
}
