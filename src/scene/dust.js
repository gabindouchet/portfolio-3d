import * as THREE from 'three';
import { rand } from './shared.js';

// dust motes drifting in the sun and lamp light, off with reduced motion
export function createDust(scene, { dot, reduce }) {
  const DUST = reduce ? 0 : 260;
  const dPos = new Float32Array(DUST * 3);
  for (let i = 0; i < DUST; i++) dPos.set([(rand() * 2 - 1) * 1.1, 0.8 + rand() * 1.4, -3.3 + rand() * 1.8], i * 3);
  const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ size: 0.006, map: dot, color: new THREE.Color(1.6, 1.25, 0.9), transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  scene.add(dust);

  return {
    update: ({ t }) => { if (DUST) { dust.rotation.y = t * 0.02; dust.position.y = Math.sin(t * 0.2) * 0.03; } }
  };
}
