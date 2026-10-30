import * as THREE from 'three';
import { rand } from './shared.js';

// rain beyond the glass: short slanted line segments, off with reduced motion
export function createRain(scene, { reduce }) {
  const DROPS = reduce ? 0 : 1400;
  const rPos = new Float32Array(DROPS * 6), drops = [];
  for (let i = 0; i < DROPS; i++) drops.push({ x: (rand() * 2 - 1) * 30, y: -20 + rand() * 30, z: -5 - rand() * 40, v: 18 + rand() * 10 });
  const rainGeo = new THREE.BufferGeometry(); rainGeo.setAttribute('position', new THREE.BufferAttribute(rPos, 3));
  const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: new THREE.Color(0.7, 0.55, 1.0), transparent: true, opacity: 0.28, depthWrite: false, blending: THREE.AdditiveBlending }));
  rain.frustumCulled = false; scene.add(rain);

  return {
    update: ({ dt }) => {
      for (let k = 0; k < DROPS; k++) {
        const d = drops[k]; d.y -= d.v * dt; d.x -= 3 * dt;
        if (d.y < -20) { d.y = 10; d.x = (Math.random() * 2 - 1) * 30; }
        rPos.set([d.x, d.y, d.z, d.x + 0.12, d.y + 0.9, d.z], k * 6);
      }
      if (DROPS) rainGeo.attributes.position.needsUpdate = true;
    }
  };
}
