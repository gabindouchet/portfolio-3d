import * as THREE from 'three';
import { FOG, FOG_LOW } from './shared.js';

// sky dome: magenta haze at the horizon, near black overhead, faint cloud banding. Follows the camera.
export function createSky(scene) {
  const sky = new THREE.Mesh(new THREE.SphereGeometry(2600, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uLow: { value: FOG_LOW }, uMid: { value: FOG } },
    vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `varying vec3 vD; uniform vec3 uLow; uniform vec3 uMid;
      float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
      float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}
      void main(){ float y=vD.y;
        vec3 top=vec3(.010,.004,.018);
        vec3 c=mix(uLow*1.1,uMid,smoothstep(-.05,.12,y)); c=mix(c,top,smoothstep(.1,.55,y));
        vec2 q=vD.xz/(y+.35)*3.; float cl=n(q)*.6+n(q*2.3)*.4; c+=uMid*cl*.35*smoothstep(.02,.25,y)*(1.-smoothstep(.3,.7,y));
        gl_FragColor=vec4(c,1.); }`
  }));
  sky.renderOrder = -1;
  scene.add(sky);

  return { update: ({ camera }) => sky.position.copy(camera.position) };
}
