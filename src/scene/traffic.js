import * as THREE from 'three';
import { rand, PAL } from './shared.js';

// flying traffic: additive points on lanes along x (cross streets) and z (the avenue)
export function createTraffic(scene, { dot, reduce }) {
  const CARS = 260;
  const cPos = new Float32Array(CARS * 3), cCol = new Float32Array(CARS * 3), cars = [];
  for (let i = 0; i < CARS; i++) {
    const alongZ = rand() < 0.4;
    const c = {
      axis: alongZ ? 2 : 0, dir: rand() < 0.5 ? 1 : -1, speed: 18 + rand() * 40,
      x: alongZ ? (rand() * 2 - 1) * 45 : (rand() * 2 - 1) * 900,
      y: -70 + rand() * 120,
      z: alongZ ? -80 - rand() * 1100 : -70 - rand() * 900
    };
    cars.push(c);
    const head = rand() < 0.5, k = 2 + rand() * 2;
    const col = head ? PAL.lav : (rand() < .5 ? PAL.mag : [1, .2, .3]);
    cCol.set([col[0] * k, col[1] * k, col[2] * k], i * 3);
  }
  const carGeo = new THREE.BufferGeometry();
  carGeo.setAttribute('position', new THREE.BufferAttribute(cPos, 3));
  carGeo.setAttribute('color', new THREE.BufferAttribute(cCol, 3));
  const carPts = new THREE.Points(carGeo, new THREE.PointsMaterial({ size: 3.2, map: dot, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
  carPts.frustumCulled = false; scene.add(carPts);

  return {
    update: ({ t, dt }) => {
      for (let k = 0; k < CARS; k++) {
        const c = cars[k];
        if (!reduce) {
          if (c.axis === 0) { c.x += c.dir * c.speed * dt; if (c.x > 900) c.x = -900; if (c.x < -900) c.x = 900; }
          else { c.z += c.dir * c.speed * dt; if (c.z > -60) c.z = -1200; if (c.z < -1200) c.z = -60; }
        }
        cPos[k * 3] = c.x; cPos[k * 3 + 1] = c.y + Math.sin(t * 0.3 + k) * 0.6; cPos[k * 3 + 2] = c.z;
      }
      carGeo.attributes.position.needsUpdate = true;
    }
  };
}
