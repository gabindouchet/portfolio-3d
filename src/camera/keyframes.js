import { Vector3 } from 'three';
import { ROOM } from '../scene/office.js';

const V = (x, y, z) => new Vector3(x, y, z);

// one keyframe per .shot section, in page order: camera position (p) and lookAt target (t)
export const KEYS = [
  { p: V(0.25, 1.48, -3.0), t: V(-10, -2, -80) },              // window: looking out over the city
  { p: V(1.35, 1.7, 2.9), t: V(-0.25, 1.05, -3.6) },           // office: step back, full room
  { p: V(-0.08, 1.52, -1.78), t: V(-0.08, ROOM.DESK_TOP, -2.5) }, // desk: the papers (desk top 0.793 since the carpet)
  { p: V(-0.55, 1.55, -0.25), t: V(-ROOM.W, 1.55, -0.28) },     // wall: diplomas
  { p: V(-1.1, 1.45, -2.85), t: V(-70, -14, -55) }             // night: back toward the sign
];

// easeInOutCubic between neighbouring keys
export const ease = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
