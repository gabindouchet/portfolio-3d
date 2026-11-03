import { Vector3 } from 'three';
import { KEYS, ease } from './keyframes.js';

const BASE_FOV = 45;
// view direction of a key as yaw (0 toward -z, +90 deg toward +x), pitch and look distance
const angles = KEYS.map(({ p, t }) => {
  const d = t.clone().sub(p);
  return { yaw: Math.atan2(d.x, -d.z), pitch: Math.atan2(d.y, Math.hypot(d.x, d.z)), dist: d.length() };
});

// Maps scroll position to a fractional shot index (0 to KEYS.length - 1), damps toward it,
// and places the camera between keyframes with a light mouse parallax and idle bob.
// update() returns the damped shot index.
export function createCameraRig(camera, { shots, railItems, reduce }) {
  let target = 0, cur = 0, mx = 0, my = 0, smx = 0, smy = 0, fovScale = 1;

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
    // narrow screens widen every shot's field of view by the same factor
    setFovScale(s) { fovScale = s; },
    update({ t, dt }) {
      cur += (target - cur) * (reduce ? 1 : 1 - Math.exp(-dt * 4.5));
      smx += (mx - smx) * 0.05; smy += (my - smy) * 0.05;
      const i = Math.min(Math.floor(cur), KEYS.length - 2), f = ease(cur - i);
      tmpP.lerpVectors(KEYS[i].p, KEYS[i + 1].p, f);
      if (KEYS[i + 1].turn) {
        const a = angles[i], b = angles[i + 1];
        let dYaw = b.yaw - a.yaw;
        if (KEYS[i + 1].turn === 'right' && dYaw < 0) dYaw += 2 * Math.PI;
        if (KEYS[i + 1].turn === 'left' && dYaw > 0) dYaw -= 2 * Math.PI;
        const yaw = a.yaw + dYaw * f, pitch = a.pitch + (b.pitch - a.pitch) * f, dist = a.dist + (b.dist - a.dist) * f;
        tmpT.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(dist).add(tmpP);
      } else {
        tmpT.lerpVectors(KEYS[i].t, KEYS[i + 1].t, f);
      }
      const fov = (KEYS[i].fov ?? BASE_FOV) + ((KEYS[i + 1].fov ?? BASE_FOV) - (KEYS[i].fov ?? BASE_FOV)) * f;
      if (camera.fov !== fov * fovScale) { camera.fov = fov * fovScale; camera.updateProjectionMatrix(); }
      if (!reduce) { tmpP.x += smx * 0.06; tmpP.y -= smy * 0.04; tmpP.y += Math.sin(t * 0.6) * 0.004; }
      camera.position.copy(tmpP); camera.lookAt(tmpT);
      railItems.forEach((el, k) => el.classList.toggle('on', Math.round(cur) === k));
      return cur;
    }
  };
}
