export const volumetricVS = `#version 300 es
precision highp float;

in vec2 aPos;
out vec2 vUV;

void main() {
	vUV = aPos * 0.5 + 0.5;
	gl_Position = vec4(aPos, 0.0, 1.0);
}
`

export const volumetricFogFS = `#version 300 es
precision highp float;

in vec2 vUV;

uniform sampler2D uColorTex;
uniform sampler2D uDepthTex;
uniform mat4 uInvViewProj;
uniform vec3 uCamPos;
uniform vec3 uFogClr;
uniform float uFogDensity;
uniform float uFogStart;
uniform float uFogEnd;
uniform float uFogHeight;
uniform float uFogFalloff;
uniform int uFogType;

out vec4 fragColor;

vec3 worldPosFromDepth(vec2 uv, float depth) {
	vec4 clipPos = vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
	vec4 worldPos = uInvViewProj * clipPos;
	return worldPos.xyz / worldPos.w;
}

float calLinearFog(float dist) {
	return clamp((uFogEnd - dist) / (uFogEnd - uFogStart), 0.0, 1.0);
}

float calExpFog(float dist) {
	return exp(-uFogDensity * dist);
}

float calExp2Fog(float dist) {
	float d = uFogDensity * dist;
	return exp(-d * d);
}

float calHeightFog(vec3 worldPos, float dist) {
	float heightFactor = exp(-uFogFalloff * max(worldPos.y - uFogHeight, 0.0));
	float distFog = calExp2Fog(dist);
	return mix(1.0, distFog, heightFactor);
}

void main() {
	vec3 color = texture(uColorTex, vUV).rgb;
	float depth = texture(uDepthTex, vUV).r;
	if (depth >= 1.0) {
		fragColor = vec4(color, 1.0);
		return;
	}
	vec3 worldPos = worldPosFromDepth(vUV, depth);
	float dist = length(worldPos - uCamPos);
	float fogFactor;
	if (uFogType == 0) {
		fogFactor = calLinearFog(dist);
	} else if (uFogType == 1) {
		fogFactor = calExpFog(dist);
	} else if (uFogType == 2) {
		fogFactor = calExp2Fog(dist);
	} else {
		fogFactor = calHeightFog(worldPos, dist);
	}
	vec3 finalClr = mix(uFogClr, color, fogFactor);
	fragColor = vec4(finalClr, 1.0);
}
`

export const volumetricLitFS = `#version 300 es
precision highp float;

in vec2 vUV;

uniform sampler2D uColorTex;
uniform sampler2D uDepthTex;
uniform sampler2DShadow uShadowMap;
uniform mat4 uInvViewProj;
uniform mat4 uLitMtx;
uniform vec3 uCamPos;
uniform vec3 uSunDir;
uniform vec3 uSunClr;
uniform float uDensity;
uniform float uScattering;
uniform int uSteps;

out vec4 fragColor;

const float PI = 3.14159265359;

float phaseHenyeyGreenstein(float cosTheta, float g) {
	float g2 = g * g;
	float denom = 1.0 + g2 - 2.0 * g * cosTheta;
	return (1.0 - g2) / (4.0 * PI * pow(denom, 1.5));
}

vec3 worldPosFromDepth(vec2 uv, float depth) {
	vec4 clipPos = vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
	vec4 worldPos = uInvViewProj * clipPos;
	return worldPos.xyz / worldPos.w;
}

float sampleShadow(vec3 worldPos) {
	vec4 litSpacePos = uLitMtx * vec4(worldPos, 1.0);
	vec3 projCoords = litSpacePos.xyz / litSpacePos.w * 0.5 + 0.5;
	if (projCoords.z > 1.0 || projCoords.x < 0.0 || projCoords.x > 1.0 || projCoords.y < 0.0 || projCoords.y > 1.0) {
		return 1.0;
	}
	return texture(uShadowMap, vec3(projCoords.xy, projCoords.z - 0.001));
}

void main() {
	vec3 color = texture(uColorTex, vUV).rgb;
	float depth = texture(uDepthTex, vUV).r;
	if (depth >= 1.0) {
		fragColor = vec4(color, 1.0);
		return;
	}
	vec3 worldPos = worldPosFromDepth(vUV, depth);
	vec3 rayDir = normalize(worldPos - uCamPos);
	float rayLen = length(worldPos - uCamPos);
	float stepLen = rayLen / float(uSteps);
	vec3 step = rayDir * stepLen;
	vec3 curPos = uCamPos;
	vec3 accumLight = vec3(0.0);
	float transmittance = 1.0;
	float cosTheta = dot(rayDir, normalize(uSunDir));
	float phase = phaseHenyeyGreenstein(cosTheta, uScattering);
	for (int i = 0; i < uSteps; i++) {
		curPos += step;
		float shadow = sampleShadow(curPos);
		vec3 inScatter = uSunClr * phase * shadow;
		float extinction = uDensity * stepLen;
		transmittance *= exp(-extinction);
		accumLight += inScatter * transmittance * stepLen * uDensity;
	}
	vec3 finalClr = color * transmittance + accumLight;
	fragColor = vec4(finalClr, 1.0);
}
`

export enum FogType {
	Linear = 0,
	Exponential = 1,
	ExponentialSquared = 2,
	Height = 3
}

export interface FogCfg {
	eab: boolean
	typ: FogType
	clr: [number, number, number]
	density: number
	start: number
	end: number
	height: number
	falloff: number
}

export function defFogCfg(): FogCfg {
	return {
		eab: false,
		typ: FogType.ExponentialSquared,
		clr: [0.7, 0.8, 0.9],
		density: 0.01,
		start: 10,
		end: 100,
		height: 0,
		falloff: 0.1
	}
}

export interface VolumetricLitCfg {
	eab: boolean
	density: number
	scattering: number
	steps: number
}

export function defVolumetricLitCfg(): VolumetricLitCfg {
	return {
		eab: false,
		density: 0.02,
		scattering: 0.3,
		steps: 32
	}
}
