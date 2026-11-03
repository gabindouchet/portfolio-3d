import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';
import { rand, canvasTex } from './shared.js';
import content from '../content/content.json';
import { applyBoucle } from './boucle.js';

// The office comes from Blender as office.glb (see PHASE2_IMPORT.md and PHASE4_PARIS.md):
// - baked shell (node extras baked = true): unlit albedo x Cycles lightmap (EXR), no real-time lighting
// - dynamic props: glTF PBR materials, lit by the real-time lights in lights.js
// Room: x in [-W, W], window wall at z = D_FRONT. Carpet raised the desk by 2.8 cm.
export const ROOM = { W: 3.2, D_FRONT: -3.6, H: 3.0, DESK_TOP: 0.793 };

const BASE = import.meta.env.BASE_URL;
// Golden-hour Cycles lightmaps. MeshBasicMaterial divides the lightmap by PI, so values here run
// higher than in Blender. Tuned by eye against renders/review_sunset.png.
const LIGHTMAP_INTENSITY = 1.6;
// at blue hour the baked sun has to disappear: tint the shell cool and dim it (reads, not exact)
const SHELL_BLUE = new THREE.Color(0x6f7ea8), SHELL_BLUE_DIM = 0.35;
const WHITE = new THREE.Color(0xffffff);

function paperTex({ category, period, title, text }, idx) {
  return canvasTex(840, 1188, (g, w, h) => {
    g.fillStyle = '#f1ece4'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(90,70,50,${rand() * 0.04})`; g.fillRect(rand() * w, rand() * h, 2, 2); }
    g.fillStyle = '#b5612a'; g.font = '500 30px "IBM Plex Mono", monospace'; g.fillText(category, 70, 110);
    g.fillStyle = '#6e6458'; g.textAlign = 'right'; g.fillText(`FILE 0${idx + 1}`, w - 70, 110); g.textAlign = 'left';
    g.fillStyle = '#b5612a'; g.fillRect(70, 140, w - 140, 3);
    g.fillStyle = '#1a1612'; g.font = '400 118px "Instrument Serif", serif';
    title.split('\n').forEach((ln, i) => g.fillText(ln, 66, 290 + i * 118));
    g.fillStyle = '#4a423a'; g.font = '400 34px "Instrument Sans", sans-serif';
    const y0 = 290 + title.split('\n').length * 118 + 30;
    const words = text.split(' '); let line = '', y = y0;
    for (const wd of words) { if (g.measureText(line + wd).width > w - 140) { g.fillText(line, 70, y); line = ''; y += 48; } line += wd + ' '; }
    g.fillText(line, 70, y);
    g.fillStyle = 'rgba(50,40,30,.16)';
    for (let i = 0; i < 9; i++) g.fillRect(70, y + 90 + i * 46, (w - 140) * (0.55 + rand() * 0.45), 14);
    g.fillStyle = '#6e6458'; g.font = '400 28px "IBM Plex Mono", monospace'; g.fillText(period, 70, h - 80);
  });
}

function diplomaTex({ institution, degree, detail, note }) {
  return canvasTex(1100, 840, (g, w, h) => {
    g.fillStyle = '#efe8e4'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#8a7a64'; g.lineWidth = 3; g.strokeRect(40, 40, w - 80, h - 80); g.strokeRect(54, 54, w - 108, h - 108);
    g.textAlign = 'center'; g.fillStyle = '#2a221c';
    g.font = '400 30px "IBM Plex Mono", monospace'; g.fillText(institution.toUpperCase(), w / 2, 170);
    g.font = 'italic 400 42px "Instrument Serif", serif'; g.fillText('This certifies that', w / 2, 270);
    g.font = '400 92px "Instrument Serif", serif'; g.fillText('Gabin Douchet', w / 2, 380);
    g.font = 'italic 400 40px "Instrument Serif", serif'; g.fillText(degree, w / 2, 470);
    g.font = '400 26px "Instrument Sans", sans-serif'; g.fillStyle = '#5e5246'; g.fillText(detail, w / 2, 530);
    if (note) { g.fillStyle = '#b5612a'; g.font = '500 24px "IBM Plex Mono", monospace'; g.fillText(note.toUpperCase(), w / 2, 590); }
    const sx = w - 220, sy = h - 200;
    const grd = g.createRadialGradient(sx, sy, 10, sx, sy, 80); grd.addColorStop(0, '#e8b25a'); grd.addColorStop(1, '#9a5a1c');
    g.fillStyle = grd; g.beginPath(); for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2, r = k % 2 ? 72 : 82; g.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r); } g.fill();
    g.strokeStyle = '#2a221c'; g.lineWidth = 2; g.beginPath(); g.moveTo(170, h - 170); g.lineTo(470, h - 170); g.stroke();
  });
}

function screenTex() {
  return canvasTex(660, 440, (g, w, h) => {
    g.fillStyle = '#14110f'; g.fillRect(0, 0, w, h);
    g.font = '400 20px "IBM Plex Mono", monospace';
    const cols = ['#f2a65a', '#e8d9c4', '#9bb0c8', '#7a6e64'];
    for (let i = 0; i < 17; i++) { g.fillStyle = cols[(rand() * 4) | 0]; g.fillText(' '.repeat((rand() * 6) | 0) + ['const', 'camera.lerp', 'scroll', 'golden.hour', '// paris 19:42', 'render', 'parallax()'][(rand() * 7) | 0] + ' ' + '▆'.repeat((rand() * 6) | 0), 24, 36 + i * 24); }
  });
}

// The paper, diploma and screen planes are exported without UVs. Project the 4 vertices onto the
// plane's own axes that best match the wanted world directions for texture right (u) and up (v).
function planarUV(mesh, uWorld, vWorld) {
  const toLocal = new THREE.Matrix3().setFromMatrix4(mesh.matrixWorld).invert();
  const axis = (w) => {
    const d = w.clone().applyMatrix3(toLocal);
    const a = [Math.abs(d.x), Math.abs(d.y), Math.abs(d.z)];
    const i = a.indexOf(Math.max(...a));
    return new THREE.Vector3().setComponent(i, Math.sign(d.getComponent(i)));
  };
  const U = axis(uWorld), V = axis(vWorld);
  const pos = mesh.geometry.attributes.position, p = new THREE.Vector3();
  const us = [], vs = [];
  for (let i = 0; i < pos.count; i++) { p.fromBufferAttribute(pos, i); us.push(p.dot(U)); vs.push(p.dot(V)); }
  const norm = (arr) => { const lo = Math.min(...arr), hi = Math.max(...arr); return arr.map(x => (x - lo) / (hi - lo)); };
  const nu = norm(us), nv = norm(vs);
  mesh.geometry.setAttribute('uv', new THREE.Float32BufferAttribute(nu.flatMap((u, i) => [u, nv[i]]), 2));
}

const RIGHT = new THREE.Vector3(1, 0, 0), UP = new THREE.Vector3(0, 1, 0), AWAY = new THREE.Vector3(0, 0, -1);

// Content textures are drawn up front (fixed rand() order), then the glb and lightmaps load.
// Returns { ready, update }: ready resolves once the office is in the scene.
export function createOffice(scene) {
  const shellMats = [];
  // lit lamp shade, brighter as the daylight goes
  const shadeMat = new THREE.MeshStandardMaterial({ name: 'LampShadeLit', color: 0xfff4ea, roughness: 0.35, emissive: 0xffc890, emissiveIntensity: 0.6 });
  const ready = load(scene, shellMats, shadeMat);
  return {
    ready,
    update({ uT }) {
      for (const m of shellMats) {
        m.color.lerpColors(WHITE, SHELL_BLUE, uT);
        m.lightMapIntensity = LIGHTMAP_INTENSITY * (1 + (SHELL_BLUE_DIM - 1) * uT);
      }
      shadeMat.emissiveIntensity = 0.6 + 1.0 * uT;
    }
  };
}

async function load(scene, shellMats, shadeMat) {
  const papers = content.projects.map(({ paper }, i) => paperTex(paper, i));
  const screen = screenTex();
  const diplomas = content.education.map(({ diploma }) => diplomaTex(diploma));

  const exr = new EXRLoader();
  const office = (await new GLTFLoader().loadAsync(`${BASE}models/office.glb`)).scene;
  office.updateMatrixWorld(true);

  const shell = [], props = [];
  office.traverse((o) => { if (o.isMesh) (o.userData.baked ? shell : props).push(o); });

  await Promise.all(shell.map(async (mesh) => {
    const src = mesh.material;
    const lightMap = await exr.loadAsync(`${BASE}textures/office/lightmaps/${src.userData.lightmap}`);
    lightMap.channel = 0;
    // EXRLoader stores rows bottom-up while glTF UVs read top-down: mirror vertically, or every baked
    // shadow (papers, salon, carpet) lands in the wrong place
    lightMap.repeat.set(1, -1); lightMap.offset.set(0, 1);
    mesh.material = new THREE.MeshBasicMaterial({ name: src.name, map: src.map, lightMap, lightMapIntensity: LIGHTMAP_INTENSITY, side: src.side });
    shellMats.push(mesh.material);
    src.dispose();
  }));

  // The glb's FlutedGlass uses transmission, which costs an extra scene render and came out
  // black here; the glowing frosted shadeMat matches the Cycles look.

  for (const mesh of props) {
    const name = mesh.name;
    const lamp = name.startsWith('Lamp_') || name.startsWith('FloorLamp_');
    mesh.castShadow = !lamp;           // the light sits on the stem axis
    mesh.receiveShadow = true;
    // these meshes have no UVs or tangents, so anisotropy (Brass) has no direction: NaN streaks
    for (const m of [mesh.material].flat()) if (m.anisotropy) m.anisotropy = 0;
    if (mesh.material.name === 'FlutedGlass') mesh.material = shadeMat;
    // sofa and armchairs: bouclé loops in the shader (the Blender bump does not export)
    for (const m of [mesh.material].flat()) if (/^Boucle/.test(m.name) && !m.userData.boucle) { applyBoucle(m); m.userData.boucle = true; }
    // PlantLeaf was exported without its base color (white); dark green as in the Cycles renders
    for (const m of [mesh.material].flat()) if (m.name === 'PlantLeaf') { m.color.setRGB(0.035, 0.075, 0.03); m.sheenColor?.setRGB(0.12, 0.2, 0.1); }

    const paper = name.match(/^Paper_(\d)$/);
    const diploma = name.match(/^Diploma_(\d)_Paper$/);
    if (paper && papers[paper[1] - 1]) {
      planarUV(mesh, RIGHT, AWAY);
      const t = papers[paper[1] - 1];
      mesh.material = new THREE.MeshStandardMaterial({ map: t, roughness: 0.85, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.06 });
    } else if (diploma && diplomas[diploma[1] - 1]) {
      planarUV(mesh, AWAY, UP);
      const t = diplomas[diploma[1] - 1];
      mesh.material = new THREE.MeshStandardMaterial({ map: t, roughness: 0.7, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.05 });
    } else if (name === 'Laptop_Screen') {
      planarUV(mesh, RIGHT, UP);
      mesh.material = new THREE.MeshBasicMaterial({ map: screen, color: new THREE.Color(1.6, 1.6, 1.6) });
      mesh.castShadow = false;
    }
  }
  scene.add(office);

  // window glass: a faint code-side plane inside the atelier frame, the Paris photo behind it
  const { W, D_FRONT, H } = ROOM;
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(W * 2, H), new THREE.MeshPhysicalMaterial({ color: 0x1a1816, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.08, envMapIntensity: 1.4, depthWrite: false }));
  glass.position.set(0, H / 2, D_FRONT - 0.02); scene.add(glass);

  return office;
}
