import * as THREE from 'three';
import { rand, canvasTex } from './shared.js';
import { legacy } from './legacy-lights.js';
import content from '../content/content.json';

// Placeholder office in primitives, replaced by office.glb in phase 3.
// Room: x in [-W, W], window wall at z = D_FRONT, back wall at z = D_BACK.
export const ROOM = { W: 3.2, D_FRONT: -3.6, D_BACK: 3.5, H: 3.0, DESK_TOP: 0.765, DESK_Z: -2.55 };

// concrete noise for walls and floor. Built first: it is the first consumer of the shared rand().
export function createConcrete() {
  const concrete = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#2a2430'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) {
      const v = 30 + rand() * 40 | 0;
      g.fillStyle = `rgba(${v},${v - 6},${v + 8},${0.05 + rand() * 0.12})`;
      const r = rand() * 3; g.fillRect(rand() * w, rand() * h, r, r);
    }
    g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 2;
    g.strokeRect(0, 0, w, h);
  });
  concrete.wrapS = concrete.wrapT = THREE.RepeatWrapping;
  return concrete;
}

function paperTex({ category, period, title, text }, idx) {
  return canvasTex(840, 1188, (g, w, h) => {
    g.fillStyle = '#ece6f0'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(80,60,90,${rand() * 0.04})`; g.fillRect(rand() * w, rand() * h, 2, 2); }
    g.fillStyle = '#c0127a'; g.font = '500 30px "IBM Plex Mono", monospace'; g.fillText(category, 70, 110);
    g.fillStyle = '#6b5a78'; g.textAlign = 'right'; g.fillText(`FILE 0${idx + 1}`, w - 70, 110); g.textAlign = 'left';
    g.fillStyle = '#c0127a'; g.fillRect(70, 140, w - 140, 3);
    g.fillStyle = '#16101c'; g.font = '400 118px "Instrument Serif", serif';
    title.split('\n').forEach((ln, i) => g.fillText(ln, 66, 290 + i * 118));
    g.fillStyle = '#4a3c56'; g.font = '400 34px "Instrument Sans", sans-serif';
    const y0 = 290 + title.split('\n').length * 118 + 30;
    const words = text.split(' '); let line = '', y = y0;
    for (const wd of words) { if (g.measureText(line + wd).width > w - 140) { g.fillText(line, 70, y); line = ''; y += 48; } line += wd + ' '; }
    g.fillText(line, 70, y);
    g.fillStyle = 'rgba(40,30,50,.16)';
    for (let i = 0; i < 9; i++) g.fillRect(70, y + 90 + i * 46, (w - 140) * (0.55 + rand() * 0.45), 14);
    g.fillStyle = '#6b5a78'; g.font = '400 28px "IBM Plex Mono", monospace'; g.fillText(period, 70, h - 80);
  });
}

function diplomaTex({ institution, degree, detail, note }) {
  return canvasTex(1100, 840, (g, w, h) => {
    g.fillStyle = '#efe8e4'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#8a6a7a'; g.lineWidth = 3; g.strokeRect(40, 40, w - 80, h - 80); g.strokeRect(54, 54, w - 108, h - 108);
    g.textAlign = 'center'; g.fillStyle = '#2a1e2c';
    g.font = '400 30px "IBM Plex Mono", monospace'; g.fillText(institution.toUpperCase(), w / 2, 170);
    g.font = 'italic 400 42px "Instrument Serif", serif'; g.fillText('This certifies that', w / 2, 270);
    g.font = '400 92px "Instrument Serif", serif'; g.fillText('Gabin Douchet', w / 2, 380);
    g.font = 'italic 400 40px "Instrument Serif", serif'; g.fillText(degree, w / 2, 470);
    g.font = '400 26px "Instrument Sans", sans-serif'; g.fillStyle = '#5a4a5e'; g.fillText(detail, w / 2, 530);
    if (note) { g.fillStyle = '#c0127a'; g.font = '500 24px "IBM Plex Mono", monospace'; g.fillText(note.toUpperCase(), w / 2, 590); }
    const sx = w - 220, sy = h - 200;
    const grd = g.createRadialGradient(sx, sy, 10, sx, sy, 80); grd.addColorStop(0, '#ff6fcf'); grd.addColorStop(1, '#8a1458');
    g.fillStyle = grd; g.beginPath(); for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2, r = k % 2 ? 72 : 82; g.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r); } g.fill();
    g.strokeStyle = '#2a1e2c'; g.lineWidth = 2; g.beginPath(); g.moveTo(170, h - 170); g.lineTo(470, h - 170); g.stroke();
  });
}

export function createOffice(scene, { concrete, dot, reduce }) {
  const room = new THREE.Group(); scene.add(room);
  const { W, D_FRONT, D_BACK, H, DESK_TOP: deskTop, DESK_Z: DZ } = ROOM;
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x3a3340, map: concrete, roughness: 0.92, metalness: 0 });
  const floorTex = concrete.clone(); floorTex.needsUpdate = true; floorTex.repeat.set(3, 3);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x1c1822, map: floorTex, roughness: 0.28, metalness: 0.35, envMapIntensity: 0.9 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x141118, roughness: 0.45, metalness: 0.8 });
  function box(w, h, d, mat, x, y, z, parent = room) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m; }

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W * 2, D_BACK - D_FRONT), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, (D_BACK + D_FRONT) / 2); floor.receiveShadow = true; room.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W * 2, D_BACK - D_FRONT), wallMat);
  ceil.rotation.x = Math.PI / 2; ceil.position.set(0, H, (D_BACK + D_FRONT) / 2); room.add(ceil);
  const wallL = new THREE.Mesh(new THREE.PlaneGeometry(D_BACK - D_FRONT, H), wallMat);
  wallL.rotation.y = Math.PI / 2; wallL.position.set(-W, H / 2, (D_BACK + D_FRONT) / 2); wallL.receiveShadow = true; room.add(wallL);
  const wallR = wallL.clone(); wallR.rotation.y = -Math.PI / 2; wallR.position.x = W; room.add(wallR);
  const wallB = new THREE.Mesh(new THREE.PlaneGeometry(W * 2, H), wallMat);
  wallB.rotation.y = Math.PI; wallB.position.set(0, H / 2, D_BACK); room.add(wallB);

  // floor-to-ceiling window: mullions + sill neon
  for (let i = 0; i <= 4; i++) box(0.07, H, 0.12, darkMetal, -W + i * (W * 2 / 4), H / 2, D_FRONT);
  box(W * 2, 0.08, 0.14, darkMetal, 0, 0.04, D_FRONT);
  box(W * 2, 0.08, 0.14, darkMetal, 0, H - 0.04, D_FRONT);
  box(W * 2, 0.05, 0.1, darkMetal, 0, 2.35, D_FRONT);
  const neonMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.0, 0.35, 1.9) });
  const sillNeon = new THREE.Mesh(new THREE.BoxGeometry(W * 2 - 0.1, 0.012, 0.012), neonMat);
  sillNeon.position.set(0, 0.09, D_FRONT + 0.08); room.add(sillNeon);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(W * 2, H), new THREE.MeshPhysicalMaterial({ color: 0x220a2a, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.12, envMapIntensity: 1.4, depthWrite: false }));
  glass.position.set(0, H / 2, D_FRONT - 0.02); room.add(glass);
  // thin ceiling light strip near back
  const strip = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.01, 5.4), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 0.6, 2.2) }));
  strip.position.set(W - 0.25, H - 0.02, 0.2); room.add(strip);

  // desk
  const stone = new THREE.MeshStandardMaterial({ color: 0x2b2530, roughness: 0.38, metalness: 0.1, envMapIntensity: 0.7 });
  box(1.8, 0.04, 0.9, stone, 0, deskTop - 0.02, DZ);
  box(0.05, deskTop - 0.04, 0.84, stone, -0.86, (deskTop - 0.04) / 2, DZ);
  box(0.05, deskTop - 0.04, 0.84, stone, 0.86, (deskTop - 0.04) / 2, DZ);
  box(1.7, 0.3, 0.02, stone, 0, deskTop - 0.2, DZ - 0.4);

  // papers: one per project
  const paperSpots = [[-0.42, -2.66, 0.06], [-0.14, -2.63, -0.04], [0.14, -2.67, 0.09], [-0.36, -2.31, -0.08], [-0.07, -2.29, 0.03], [0.22, -2.33, -0.11]];
  const paperGeo = new THREE.PlaneGeometry(0.21, 0.297);
  content.projects.slice(0, paperSpots.length).forEach(({ paper }, i) => {
    const t = paperTex(paper, i);
    const m = new THREE.Mesh(paperGeo, new THREE.MeshStandardMaterial({ map: t, roughness: 0.85, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.06 }));
    m.rotation.x = -Math.PI / 2; m.rotation.z = paperSpots[i][2];
    m.position.set(paperSpots[i][0], deskTop + 0.0015 + i * 0.0006, paperSpots[i][1]);
    m.receiveShadow = true; room.add(m);
  });

  // lamp
  const lampMat = new THREE.MeshStandardMaterial({ color: 0x1a1520, roughness: 0.35, metalness: 0.85 });
  function rod(a, b, r) { const v = new THREE.Vector3().subVectors(b, a); const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, v.length(), 12), lampMat); m.position.copy(a).addScaledVector(v, 0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.clone().normalize()); m.castShadow = true; room.add(m); return m; }
  const lb = new THREE.Vector3(-0.72, deskTop, -2.88), lj = new THREE.Vector3(-0.66, deskTop + 0.42, -2.98), lh = new THREE.Vector3(-0.42, deskTop + 0.5, -2.74);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.025, 32), lampMat); base.position.copy(lb).setY(deskTop + 0.0125); base.castShadow = true; room.add(base);
  rod(lb, lj, 0.008); rod(lj, lh, 0.008);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.13, 32, 1, true), new THREE.MeshStandardMaterial({ color: 0x1a1520, roughness: 0.4, metalness: 0.8, side: THREE.DoubleSide }));
  shade.position.copy(lh); shade.lookAt(new THREE.Vector3(-0.12, deskTop, -2.48)); shade.rotateX(-Math.PI / 2); room.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.026, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 2.6, 3.6) }));
  bulb.position.copy(lh).add(new THREE.Vector3(0.02, -0.04, 0.02)); room.add(bulb);
  const spot = new THREE.SpotLight(0xffd4ee, legacy(5.5), 4, 0.75, 0.65, 1.6);
  spot.position.copy(bulb.position); spot.target.position.set(-0.1, deskTop, -2.48);
  spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); spot.shadow.bias = -0.0004; spot.shadow.camera.near = 0.05;
  room.add(spot, spot.target);

  // laptop
  const lap = new THREE.Group(); lap.position.set(0.58, deskTop, -2.62); lap.rotation.y = -0.38; room.add(lap);
  box(0.33, 0.016, 0.23, darkMetal, 0, 0.008, 0, lap);
  const hinge = new THREE.Group(); hinge.position.set(0, 0.016, -0.115); hinge.rotation.x = -0.28; lap.add(hinge);
  box(0.33, 0.22, 0.008, darkMetal, 0, 0.11, 0, hinge);
  const screenTex = canvasTex(660, 440, (g, w, h) => {
    g.fillStyle = '#0d0614'; g.fillRect(0, 0, w, h);
    g.font = '400 20px "IBM Plex Mono", monospace';
    const cols = ['#ff3fb4', '#9a5cff', '#e9d6ff', '#6b5a78'];
    for (let i = 0; i < 17; i++) { g.fillStyle = cols[(rand() * 4) | 0]; g.fillText(' '.repeat((rand() * 6) | 0) + ['const', 'camera.lerp', 'scroll', 'bloom()', '// floor 88', 'render', 'city.seed'][(rand() * 7) | 0] + ' ' + '▆'.repeat((rand() * 6) | 0), 24, 36 + i * 24); }
  });
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.31, 0.2), new THREE.MeshBasicMaterial({ map: screenTex, color: new THREE.Color(1.6, 1.6, 1.6) }));
  scr.position.set(0, 0.11, 0.0045); hinge.add(scr);
  const screenGlow = new THREE.PointLight(0x9a5cff, legacy(0.5), 1.2); screenGlow.position.set(0.5, deskTop + 0.18, -2.5); room.add(screenGlow);

  // mug
  const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.035, 0.095, 24), new THREE.MeshStandardMaterial({ color: 0x24202a, roughness: 0.3, metalness: 0.1 }));
  mug.position.set(0.66, deskTop + 0.048, -2.26); mug.castShadow = true; room.add(mug);

  // diplomas on the left wall
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x0e0b12, roughness: 0.3, metalness: 0.7 });
  content.education.slice(0, 3).forEach(({ diploma }, i) => {
    const t = diplomaTex(diploma);
    const z = -1.15 + i * 0.85, y = 1.6;
    box(0.035, 0.46, 0.6, frameMat, -W + 0.02, y, z);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.397), new THREE.MeshStandardMaterial({ map: t, roughness: 0.7, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.05 }));
    p.rotation.y = Math.PI / 2; p.position.set(-W + 0.039, y, z); room.add(p);
  });
  const wallWash = new THREE.SpotLight(0xff9ad8, legacy(2.2), 3.2, 0.9, 0.8, 1.5);
  wallWash.position.set(-1.9, H - 0.1, -0.25); wallWash.target.position.set(-W, 1.4, -0.25); room.add(wallWash, wallWash.target);

  // dust in the lamp light
  const DUST = reduce ? 0 : 260;
  const dPos = new Float32Array(DUST * 3);
  for (let i = 0; i < DUST; i++) dPos.set([(rand() * 2 - 1) * 1.1, 0.8 + rand() * 1.4, -3.3 + rand() * 1.8], i * 3);
  const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ size: 0.006, map: dot, color: new THREE.Color(1.6, 1.1, 1.6), transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  room.add(dust);

  return {
    update: ({ t }) => { if (DUST) { dust.rotation.y = t * 0.02; dust.position.y = Math.sin(t * 0.2) * 0.03; } }
  };
}
