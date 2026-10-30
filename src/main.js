import './styles.css';
import * as THREE from 'three';
import { renderOverlays } from './content/overlay.js';
import { FOG, FOG_DENSITY, createDotTexture } from './scene/shared.js';
import { createEnvironment, createOfficeLights } from './scene/lights.js';
import { createSky } from './scene/sky.js';
import { createCity } from './scene/city.js';
import { createSigns } from './scene/signs.js';
import { createTraffic } from './scene/traffic.js';
import { createRain } from './scene/rain.js';
import { createOffice } from './scene/office.js';
import { createDust } from './scene/dust.js';
import { createComposer } from './post/composer.js';
import { createCameraRig } from './camera/scroll.js';

renderOverlays();

async function start() {
  const veil = document.getElementById('veil');
  const fail = (msg) => { veil.textContent = msg; setTimeout(() => veil.classList.add('gone'), 900); };
  // canvas textures draw text, so wait for the web fonts (capped at 2.5 s)
  try { await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 2500))]); } catch (e) {}

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.getElementById('stage');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' }); }
  catch (e) { fail('WebGL unavailable'); return; }
  const DPR = Math.min(window.devicePixelRatio || 1, 1.75);
  renderer.setPixelRatio(DPR);
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(FOG, FOG_DENSITY);
  scene.background = FOG.clone();
  const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.05, 3200);

  // build order matters: it fixes the shared rand() sequence (see scene/shared.js)
  createEnvironment(renderer, scene);
  const dot = createDotTexture();
  const parts = [
    createSky(scene),
    createCity(scene),
    createSigns(scene, { reduce }),
    createTraffic(scene, { dot, reduce }),
    createRain(scene, { reduce })
  ];
  const office = createOffice(scene);   // draws its paper textures now, then loads the glb
  parts.push(createDust(scene, { dot, reduce }));
  createOfficeLights(scene);
  const post = createComposer(renderer, scene, camera, DPR);

  const rig = createCameraRig(camera, {
    shots: [...document.querySelectorAll('.shot')],
    railItems: [...document.querySelectorAll('#rail div')],
    reduce
  });

  function fit() {
    const a = innerWidth / innerHeight;
    camera.aspect = a; camera.fov = a < 0.8 ? 68 : a < 1.2 ? 56 : 45; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight); post.setSize(innerWidth, innerHeight);
  }
  addEventListener('resize', fit); fit();

  // keep the veil up until the office is in; the city still shows if the glb fails
  try { await office; } catch (e) { console.error('office.glb failed to load', e); }

  const timer = new THREE.Timer();
  let first = true;
  function frame() {
    timer.update();
    const ctx = { dt: Math.min(timer.getDelta(), 0.05), t: timer.getElapsed(), camera };
    rig.update(ctx);
    for (const p of parts) p.update(ctx);
    post.update(ctx);
    post.render();
    if (first) { first = false; veil.classList.add('gone'); }
    requestAnimationFrame(frame);
  }
  frame();
}

start();
