import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { LegacyBloomPass } from './LegacyBloomPass.js';

// Grade is the output transform: ACES (Narkowicz fit), pow 1/2.2 gamma, then fringe, vignette and
// grain in display space. It writes display-ready values, so there is no OutputPass here: OutputPass
// would apply three's own ACES fit and the piecewise sRGB curve, which lifts the deep blacks.
const GradeShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uExposure: { value: 1.05 }, uRes: { value: new THREE.Vector2(innerWidth, innerHeight) } },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime; uniform float uExposure; uniform vec2 uRes; varying vec2 vUv;
    vec3 aces(vec3 x){ return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.); }
    float hash(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
    void main(){
      vec2 c=vUv-.5; float r=dot(c,c);
      vec2 off=c*.0035;
      vec3 col=vec3(texture2D(tDiffuse,vUv+off).r,texture2D(tDiffuse,vUv).g,texture2D(tDiffuse,vUv-off).b);
      col=aces(col*uExposure);
      col=pow(col,vec3(1./2.2));
      col*=mix(1.,.45,smoothstep(.12,.6,r));
      col+= (hash(vUv*uRes+fract(uTime)*91.)-.5)*.035;
      gl_FragColor=vec4(col,1.); }`
};

export function createComposer(renderer, scene, camera, dpr) {
  const rt = new THREE.WebGLRenderTarget(innerWidth * dpr, innerHeight * dpr, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new LegacyBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.85, 0.55, 0.82);
  composer.addPass(bloom);
  const grade = new ShaderPass(GradeShader);
  composer.addPass(grade);

  return {
    render: () => composer.render(),
    setSize(w, h) {
      composer.setSize(w, h);
      bloom.resolution.set(w / 2, h / 2); grade.uniforms.uRes.value.set(w, h);
    },
    update: ({ t }) => { grade.uniforms.uTime.value = t; }
  };
}
