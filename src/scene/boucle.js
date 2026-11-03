// Bouclé fabric bump for the sofa and armchairs. The Blender bump is procedural and does not export,
// and these meshes have no UVs, so a normal map cannot be used: the loops are 3D noise on the object
// space position, turned into a bump with screen-space derivatives (same method as three's bumpMap).
// The bump fades out where the loops get smaller than a pixel, so distant fabric does not shimmer.
const LOOPS_PER_METRE = 180;   // loop size about 5 to 6 mm
const STRENGTH = 0.0016;        // like bumpScale: tilt is about LOOPS_PER_METRE x STRENGTH, so 0.3

const noise = /* glsl */`
  varying vec3 vBouclePos;
  float bHash(vec3 p) { p = fract(p * .3183099 + .1); p *= 17.; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float bNoise(vec3 x) {
    vec3 i = floor(x), f = fract(x); f = f * f * (3. - 2. * f);
    return mix(mix(mix(bHash(i), bHash(i + vec3(1,0,0)), f.x), mix(bHash(i + vec3(0,1,0)), bHash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(bHash(i + vec3(0,0,1)), bHash(i + vec3(1,0,1)), f.x), mix(bHash(i + vec3(0,1,1)), bHash(i + 1.), f.x), f.y), f.z);
  }
  // rounded loops: ridges of the noise, plus a finer second octave
  float bHeight(vec3 p) { float n = 1. - abs(bNoise(p) * 2. - 1.); return n * n + .35 * bNoise(p * 2.7); }
  vec3 bPerturb(vec3 surfPos, vec3 surfNorm, vec2 dHdxy, float faceDirection) {
    vec3 vSigmaX = dFdx(surfPos), vSigmaY = dFdy(surfPos), vN = surfNorm;
    vec3 R1 = cross(vSigmaY, vN), R2 = cross(vN, vSigmaX);
    float fDet = dot(vSigmaX, R1) * faceDirection;
    vec3 vGrad = sign(fDet) * (dHdxy.x * R1 + dHdxy.y * R2);
    return normalize(abs(fDet) * surfNorm - vGrad);
  }
`;

export function applyBoucle(material) {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vBouclePos;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>\nvBouclePos = position * ${LOOPS_PER_METRE.toFixed(1)};`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + noise)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        {
          float h = bHeight(vBouclePos);
          float fade = 1. - smoothstep(.35, .9, length(fwidth(vBouclePos)));
          vec2 dH = vec2(dFdx(h), dFdy(h)) * ${STRENGTH} * fade;
          normal = bPerturb(-vViewPosition, normal, dH, faceDirection);
        }`);
  };
  material.customProgramCacheKey = () => 'boucle';
  material.needsUpdate = true;
}
