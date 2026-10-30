import { ShaderChunk } from 'three';

// The approved prototype ran on three r147 with legacy (non-physical) lights. r155+ only has
// physical lights, which differ in two ways:
//   1. legacy multiplied every light's intensity by PI before it reached the shader
//   2. legacy point/spot falloff was pow(1 - d / distance, decay), physical is inverse square
// legacy() handles 1 at each light, installLegacyLights() restores 2 in the shader chunk.
// Revisit when the baked office lands (phase 3): the lamp can then move to physical units.

export const legacy = (intensity) => intensity * Math.PI;

const LEGACY_FALLOFF = /* glsl */`float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	if ( cutoffDistance > 0.0 && decayExponent > 0.0 ) {
		return pow( saturate( - lightDistance / cutoffDistance + 1.0 ), decayExponent );
	}
	return 1.0;
}
float getDistanceAttenuationPhysical(`;

export function installLegacyLights() {
  const src = ShaderChunk.lights_pars_begin;
  if (src.includes('getDistanceAttenuationPhysical(')) return;
  if (!src.includes('float getDistanceAttenuation(')) {
    console.warn('legacy-lights: getDistanceAttenuation not found, light falloff will be physical');
    return;
  }
  ShaderChunk.lights_pars_begin = src.replace('float getDistanceAttenuation(', LEGACY_FALLOFF);
}
