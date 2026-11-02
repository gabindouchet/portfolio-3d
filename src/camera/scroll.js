import { Vector3 } from 'three';
import { KEYS, ease } from './keyframes.js';

// Maps scroll position to a fractional shot index (0 to KEYS.length - 1), damps toward it,
// and places the camera between keyframes with a light mouse parallax and idle bob.
// update() returns the damped shot index, which also drives the time of day.
export function createCameraRig(camera, { shots, railItems, reduce }) {
  let target = 0, cur = 0, mx = 0, my = 0, smx = 0, smy = 0;

  function readScroll() {
    const tops = shots.map(s => s.offsetTop);
    const y = scrollY;
    let i = 0; while (i < tops.length - 1 && y >= tops[i + 1]) i++;
    const span = i < tops.length - 1 ? tops[i + 1] - tops[i] : 1;
    target = Math.min(KEYS.length - 1, i + (i < tops.length - 1 ? (y - tops[i]) / span : 0));
  }
  addEventListener('scroll', readScroll, { passive: true });
  addEventListener('pointermove', e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; }, { passive: true });
  readScroll(); cur = target;

  const tmpP = new Vector3(), tmpT = new Vector3();
  return {
    update({ t, dt }) {
      cur += (target - cur) * (reduce ? 1 : 1 - Math.exp(-dt * 4.5));
      smx += (mx - smx) * 0.05; smy += (my - smy) * 0.05;
      const i = Math.min(Math.floor(cur), KEYS.length - 2), f = ease(cur - i);
      tmpP.lerpVectors(KEYS[i].p, KEYS[i + 1].p, f);
      tmpT.lerpVectors(KEYS[i].t, KEYS[i + 1].t, f);
      if (!reduce) { tmpP.x += smx * 0.06; tmpP.y -= smy * 0.04; tmpP.y += Math.sin(t * 0.6) * 0.004; }
      camera.position.copy(tmpP); camera.lookAt(tmpT);
      railItems.forEach((el, k) => el.classList.toggle('on', Math.round(cur) === k));
      return cur;
    }
  };
}
