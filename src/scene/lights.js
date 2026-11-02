import * as THREE from 'three';
import { ROOM } from './office.js';

// environment map for glossy props: dark warm box, sunset glow from the window side, pale sky above
export function createEnvironment(renderer, scene) {
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(new THREE.BoxGeometry(20, 20, 20), new THREE.MeshBasicMaterial({ color: 0x120c09, side: THREE.BackSide })));
  const envPanel = (c, x, y, z, ry, w, h) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide })); m.position.set(x, y, z); m.rotation.y = ry; envScene.add(m); };
  envPanel(0xe08a4a, 0, -1, -9.5, 0, 18, 6);
  envPanel(0xf2c49a, 0, 4, -9.5, 0, 18, 4);
  envPanel(0x2a1e18, -9.5, 0, 0, Math.PI / 2, 18, 10);
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
// Positions from PHASE4_PARIS.md. uT: 0 golden hour, 1 blue hour.
export function createOfficeLights(scene) {
  const top = ROOM.DESK_TOP;

  // low sun through the window from the front right; the window grid shadows the props
  const SUN = 2.5;
  const sun = new THREE.DirectionalLight(0xff9e5c, SUN);
  const travel = new THREE.Vector3(-0.42, -0.20, 0.88).normalize();
  sun.target.position.set(0, top, -2.5);
  sun.position.copy(sun.target.position).addScaledVector(travel, -6);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.radius = 2;
  Object.assign(sun.shadow.camera, { left: -1.8, right: 1.8, top: 1.8, bottom: -1.8, near: 0.5, far: 12 });
  sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.01;
  scene.add(sun, sun.target);

  const HEMI = 0.6;
  const skyWarm = new THREE.Color(0xffd2b0), skyBlue = new THREE.Color(0x4a5a8a);
  const hemi = new THREE.HemisphereLight(skyWarm, 0x3a2a24, HEMI);
  scene.add(hemi);

  // lamps are on but soft at golden hour, they carry the room at blue hour
  const DESK = 2.4, FLOOR = 1.6;
  const desk = spot(scene, 0xffad66, DESK, [-0.78, 1.053, -2.82], [-0.53, top, -2.57], 1.0, 0.8);
  desk.castShadow = true; desk.shadow.mapSize.set(1024, 1024); desk.shadow.radius = 4;
  desk.shadow.bias = -0.0004; desk.shadow.normalBias = 0.01; desk.shadow.camera.near = 0.03;
  const floor = spot(scene, 0xffad66, FLOOR, [1.359, 1.458, -2.65], [1.359, 0, -2.65], 0.9, 0.9);

  return {
    update({ uT }) {
      sun.intensity = SUN * (1 - uT);   // fade only: toggling visible would recompile every shader
      scene.environmentIntensity = 1 - 0.8 * uT;   // the warm env map would keep the steel orange at night
      hemi.color.lerpColors(skyWarm, skyBlue, uT);
      const lamps = 0.4 + 0.6 * uT;
      desk.intensity = DESK * lamps; floor.intensity = FLOOR * lamps;
    }
  };
}
