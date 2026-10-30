import * as THREE from 'three';
import { ROOM } from './office.js';

// environment map for glossy props: dark box with magenta, violet and plum panels
export function createEnvironment(renderer, scene) {
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(new THREE.BoxGeometry(20, 20, 20), new THREE.MeshBasicMaterial({ color: 0x0a0410, side: THREE.BackSide })));
  const envPanel = (c, x, y, z, ry, w, h) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide })); m.position.set(x, y, z); m.rotation.y = ry; envScene.add(m); };
  envPanel(0xa0207a, 0, -1, -9.5, 0, 18, 6);
  envPanel(0x4a1f9a, 0, 4, -9.5, 0, 18, 4);
  envPanel(0x2a0a30, -9.5, 0, 0, Math.PI / 2, 18, 10);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(envScene, 0.04).texture;
}

function spot(scene, color, intensity, pos, target, angle, penumbra) {
  const l = new THREE.SpotLight(color, intensity, 0, angle, penumbra, 2);
  l.position.set(...pos); l.target.position.set(...target);
  scene.add(l, l.target);
  return l;
}

// Real-time lights for the dynamic props only. The baked shell (walls, floor, desk, carpet) is
// MeshBasicMaterial and ignores them, so nothing is lit twice. Physical units (candela, decay 2).
// Positions from PHASE2_IMPORT.md.
export function createOfficeLights(scene) {
  const top = ROOM.DESK_TOP;

  // desk lamp: warm pool on the papers, the only shadow caster
  const desk = spot(scene, 0xffad66, 2.4, [-0.78, 1.053, -2.82], [-0.53, top, -2.57], 1.0, 0.8);
  desk.castShadow = true; desk.shadow.mapSize.set(1024, 1024); desk.shadow.radius = 4;
  desk.shadow.bias = -0.0004; desk.shadow.normalBias = 0.01; desk.shadow.camera.near = 0.03;

  // floor lamp, straight down
  spot(scene, 0xffad66, 1.6, [1.60, 1.458, -2.65], [1.60, 0, -2.65], 0.9, 0.9);

  // diploma wall graze, narrow pink cone
  spot(scene, 0xff6bd9, 7, [-2.55, 2.92, -1.95], [-3.2, 1.15, 1.0], 0.38, 0.6);

  // city glow through the window: low magenta + violet, the city shader does the rest
  scene.add(new THREE.AmbientLight(new THREE.Color(0.32, 0.12, 0.42), 0.6));
  const cityKey = new THREE.DirectionalLight(new THREE.Color(0.9, 0.25, 0.8), 0.6); cityKey.position.set(0.5, 1.5, -8); scene.add(cityKey);
  const windowFill = new THREE.PointLight(new THREE.Color(1, 0.2, 0.75), 1.2, 0, 2); windowFill.position.set(0, 1.0, -4.2); scene.add(windowFill);
  const violetFill = new THREE.PointLight(new THREE.Color(0.45, 0.25, 1), 0.6, 0, 2); violetFill.position.set(2.6, 2.6, -4.2); scene.add(violetFill);
}
