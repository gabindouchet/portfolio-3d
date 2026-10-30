import * as THREE from 'three';
import { rand, FOG, FOG_LOW, FOG_DENSITY, GROUND } from './shared.js';

// ~1,500 instanced towers with one shader: procedural windows, neon edges and bands, roof rims,
// blinking roof lights, distance fade and exponential + height fog. Plus the glowing street grid.
export function createCity(scene) {
  const bGeo = new THREE.BoxGeometry(1, 1, 1);
  const N = 1500;
  const seeds = new Float32Array(N);
  const cityMat = new THREE.ShaderMaterial({
    uniforms: { uFog: { value: FOG }, uFogLow: { value: FOG_LOW }, uFogD: { value: FOG_DENSITY }, uTime: { value: 0 } },
    vertexShader: `attribute float aSeed; varying vec3 vW; varying vec3 vN; varying vec3 vL; varying float vSeed; varying vec3 vS;
      void main(){ vec4 wp = modelMatrix*instanceMatrix*vec4(position,1.); vW=wp.xyz; vN=normal; vL=position; vSeed=aSeed;
        vS=vec3(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz),length(instanceMatrix[2].xyz));
        gl_Position=projectionMatrix*viewMatrix*wp; }`,
    fragmentShader: `uniform vec3 uFog; uniform vec3 uFogLow; uniform float uFogD; uniform float uTime;
      varying vec3 vW; varying vec3 vN; varying vec3 vL; varying float vSeed; varying vec3 vS;
      float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
      vec3 pal(float t){ return t<.3?vec3(1.,.12,.62):t<.55?vec3(.55,.22,1.):t<.8?vec3(1.,.35,.9):vec3(.95,.85,1.); }
      void main(){
        vec3 col=vec3(.012,.006,.02);
        float d=length(vW-cameraPosition);
        vec3 tint=pal(vSeed);
        if(abs(vN.y)<.5){
          bool sx=abs(vN.x)>.5;
          vec2 uv=sx?vec2(vW.z,vW.y):vec2(vW.x,vW.y);
          vec2 g=uv/vec2(2.4,3.4); vec2 id=floor(g); vec2 f=fract(g);
          float win=smoothstep(.16,.24,f.x)*smoothstep(.84,.76,f.x)*smoothstep(.18,.28,f.y)*smoothstep(.82,.72,f.y);
          float floorOn=step(.28,h21(vec2(id.y,vSeed*13.1)));
          float lit=step(.68,h21(id+vSeed*91.7))*floorOn;
          vec3 wc=mix(pal(h21(id*1.7+vSeed*7.3+3.1)),tint,.5)*(.5+1.5*h21(id+11.));
          vec3 nearC=col+win*lit*wc;
          vec3 avg=col+.07*tint;
          col=mix(nearC,avg,smoothstep(160.,650.,d));
          if(vSeed>.84){ float lx=sx?vL.z:vL.x; float W=sx?vS.z:vS.x; col+=smoothstep(.7,0.,(.5-abs(lx))*W)*tint*3.; }
          if(fract(vSeed*7.)>.78){ float yb=fract(vW.y/26.); col+=smoothstep(.06,0.,abs(yb-.5))*pal(fract(vSeed*3.))*2.4; }
        } else if(vN.y>.5){
          float m=min((.5-abs(vL.x))*vS.x,(.5-abs(vL.z))*vS.z);
          if(vSeed>.6) col+=smoothstep(.9,0.,m)*tint*2.6;
          float blink=step(.92,fract(uTime*.5+vSeed*10.));
          col+=smoothstep(1.2,0.,length(vL.xz*vS.xz))*vec3(1.,.15,.3)*6.*blink;
        }
        float fogF=1.-exp(-d*uFogD);
        float low=smoothstep(40.,-160.,vW.y);
        fogF=clamp(fogF+low*.65*(1.-fogF)*smoothstep(30.,280.,d),0.,1.);
        col=mix(col,mix(uFog,uFogLow,low),fogF);
        gl_FragColor=vec4(col,1.); }`
  });
  const city = new THREE.InstancedMesh(bGeo, cityMat, N);
  const dummy = new THREE.Object3D();
  let n = 0;
  // framing towers close to our window
  const framers = [[-95, -70, 30, 26, 230], [110, -95, 34, 30, 260], [-170, -150, 40, 34, 210], [150, -190, 30, 30, 200], [-60, -260, 28, 28, 170], [70, -330, 36, 30, 240]];
  for (const [x, z, w, dp, h] of framers) {
    dummy.position.set(x, GROUND + h / 2, z); dummy.scale.set(w, h, dp); dummy.updateMatrix();
    city.setMatrixAt(n, dummy.matrix); seeds[n] = 0.5 + rand() * 0.5; n++;
  }
  let guard = 0;
  while (n < N && guard++ < 20000) {
    const x = (rand() * 2 - 1) * 900, z = -40 - rand() * 1500;
    if (z > -420 && Math.abs(x) < 70) continue;   // avenue straight ahead
    if (z > -60 && Math.abs(x) < 200) continue;
    const w = 14 + rand() * 34, dp = 14 + rand() * 34;
    const h = 30 + Math.pow(rand(), 2.0) * 300 * (z < -500 ? 1.15 : 0.85);
    dummy.position.set(x, GROUND + h / 2, z); dummy.scale.set(w, h, dp); dummy.updateMatrix();
    city.setMatrixAt(n, dummy.matrix); seeds[n] = rand(); n++;
  }
  city.count = n;
  bGeo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
  city.frustumCulled = false;
  scene.add(city);

  // ground with glowing street grid
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(5000, 5000), new THREE.ShaderMaterial({
    uniforms: { uFog: { value: FOG }, uFogLow: { value: FOG_LOW } },
    vertexShader: `varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform vec3 uFog; uniform vec3 uFogLow; varying vec3 vW;
      void main(){ vec2 g=abs(fract(vW.xz/62.-.5)-.5)*62.; float l=smoothstep(1.6,0.,min(g.x,g.y));
        vec3 c=vec3(.01,.004,.016)+l*vec3(1.,.15,.65)*2.2;
        float d=length(vW-cameraPosition); float f=1.-exp(-d*.0042);
        gl_FragColor=vec4(mix(c,uFogLow,f),1.); }`
  }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = GROUND;
  scene.add(ground);

  return { update: ({ t }) => { cityMat.uniforms.uTime.value = t; } };
}
