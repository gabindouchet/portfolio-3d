import './styles.css';
import * as THREE from 'three';
import { renderOverlays } from './content/overlay.js';
import { initCards } from './content/cards.js';
import { createDotTexture } from './scene/shared.js';
import { createEnvironment, createOfficeLights } from './scene/lights.js';
import { createParisView } from './scene/paris.js';
import { createOffice } from './scene/office.js';
import { createDust } from './scene/dust.js';
import { createComposer } from './post/composer.js';
import { createCameraRig } from './camera/scroll.js';
import { KEYS } from './camera/keyframes.js';

renderOverlays();
initCards();

// Light is fixed: 0 golden hour (photo as shot), 1 blue hour. Scroll does not change it.
const TIME_OF_DAY = 0;

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
  scene.background = new THREE.Color(0x1a120d);   // only behind the photo plane, never really seen
  const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.05, 200);

  createEnvironment(renderer, scene);
  const dot = createDotTexture();
  const office = createOffice(scene);   // draws its paper textures now, then loads the glb
  const parts = [
    createParisView(scene, { heroPosition: KEYS[0].p, camera, reduce }),
    office,
    createDust(scene, { dot, reduce }),
    createOfficeLights(scene)
  ];
  const post = createComposer(renderer, scene, camera, DPR);

  const rig = createCameraRig(camera, {
    shots: [...document.querySelectorAll('.shot')],
    railItems: [...document.querySelectorAll('#rail div')],
    reduce
  });

  function fit() {
    const a = innerWidth / innerHeight;
    camera.aspect = a; camera.updateProjectionMatrix();
    rig.setFovScale((a < 0.8 ? 68 : a < 1.2 ? 56 : 45) / 45);
    renderer.setSize(innerWidth, innerHeight); post.setSize(innerWidth, innerHeight);
  }
  addEventListener('resize', fit); fit();

  // keep the veil up until the office is in; the view still shows if the glb fails
  try { await office.ready; } catch (e) { console.error('office.glb failed to load', e); }

  const timer = new THREE.Timer();
  let first = true;
  function frame() {
    requestAnimationFrame(frame);   // first, so an error in one frame cannot stop the loop
    timer.update();
    const ctx = { dt: Math.min(timer.getDelta(), 0.05), t: timer.getElapsed(), camera };
    rig.update(ctx);
    ctx.uT = TIME_OF_DAY;
    for (const p of parts) p.update(ctx);
    post.update(ctx);
    post.render();
    if (first) { first = false; veil.classList.add('gone'); }
  }
  frame();
}

start();
