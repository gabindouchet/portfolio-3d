import * as THREE from 'three';
import { legacy } from './legacy-lights.js';

// environment map for glossy surfaces: dark box with magenta, violet and plum panels
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

// city light spilling into the room
export function createCityLights(scene) {
  scene.add(new THREE.AmbientLight(new THREE.Color(0.32, 0.12, 0.42), legacy(0.55)));
  const cityKey = new THREE.DirectionalLight(new THREE.Color(0.9, 0.25, 0.8), legacy(0.9)); cityKey.position.set(0.5, 1.5, -8); scene.add(cityKey);
  const windowFill = new THREE.PointLight(new THREE.Color(1, 0.2, 0.75), legacy(2.2), 9, 1.4); windowFill.position.set(0, 1.0, -4.6); scene.add(windowFill);
  const violetFill = new THREE.PointLight(new THREE.Color(0.45, 0.25, 1), legacy(1.4), 9, 1.4); violetFill.position.set(2.6, 2.6, -4.2); scene.add(violetFill);
}
