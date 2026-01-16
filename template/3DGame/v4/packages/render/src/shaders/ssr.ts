export const ssrVS = `#version 300 es
precision highp float;

in vec2 aPos;
out vec2 vUV;

void main() {
	vUV = aPos * 0.5 + 0.5;
	gl_Position = vec4(aPos, 0.0, 1.0);
}
`

export const ssrFS = `#version 300 es
precision highp float;

in vec2 vUV;

uniform sampler2D uColorTex;
uniform sampler2D uNormalTex;
uniform sampler2D uPositionTex;
uniform sampler2D uDepthTex;
uniform sampler2D uMaterialTex;

uniform mat4 uProj;
uniform mat4 uView;
uniform mat4 uInvProj;
uniform vec3 uCamPos;
uniform vec2 uResolution;
uniform float uMaxDist;
uniform float uThickness;
uniform float uStepSize;
uniform int uMaxSteps;
uniform float uFadeStart;
uniform float uFadeEnd;

out vec4 fragColor;

vec3 viewPosFromDepth(vec2 uv, float depth) {
	vec4 clipPos = vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
	vec4 viewPos = uInvProj * clipPos;
	return viewPos.xyz / viewPos.w;
}

float linearDepth(float depth) {
	float near = 0.1;
	float far = 1000.0;
	return (2.0 * near * far) / (far + near - (depth * 2.0 - 1.0) * (far - near));
}

vec2 projectToScreen(vec3 viewPos) {
	vec4 clipPos = uProj * vec4(viewPos, 1.0);
	vec2 ndc = clipPos.xy / clipPos.w;
	return ndc * 0.5 + 0.5;
}

float screenEdgeFade(vec2 uv) {
	vec2 fade = smoothstep(0.0, uFadeStart, uv) * (1.0 - smoothstep(1.0 - uFadeStart, 1.0, uv));
	return fade.x * fade.y;
}

void main() {
	vec4 matSample = texture(uMaterialTex, vUV);
	float roughness = matSample.g;
	float metallic = matSample.r;
	if (roughness > 0.8) {
		fragColor = vec4(0.0, 0.0, 0.0, 0.0);
		return;
	}
	vec3 color = texture(uColorTex, vUV).rgb;
	vec3 normal = normalize(texture(uNormalTex, vUV).rgb * 2.0 - 1.0);
	vec3 worldPos = texture(uPositionTex, vUV).rgb;
	float depth = texture(uDepthTex, vUV).r;
	if (depth >= 1.0) {
		fragColor = vec4(color, 1.0);
		return;
	}
	vec3 viewDir = normalize(worldPos - uCamPos);
	vec3 reflectDir = reflect(viewDir, normal);
	vec3 viewNormal = mat3(uView) * normal;
	vec3 viewReflect = mat3(uView) * reflectDir;
	vec4 viewPos4 = uView * vec4(worldPos, 1.0);
	vec3 viewPos = viewPos4.xyz;
	vec3 rayStart = viewPos;
	vec3 rayEnd = viewPos + viewReflect * uMaxDist;
	vec2 uvStart = projectToScreen(rayStart);
	vec2 uvEnd = projectToScreen(rayEnd);
	vec2 rayDir = uvEnd - uvStart;
	float rayLen = length(rayDir);
	if (rayLen < 0.001) {
		fragColor = vec4(color, 1.0);
		return;
	}
	vec2 rayStep = normalize(rayDir) * uStepSize / uResolution;
	vec2 curUV = uvStart;
	vec3 curViewPos = rayStart;
	float stepLen = uStepSize;
	vec3 reflectedColor = vec3(0.0);
	float reflectStrength = 0.0;
	for (int i = 0; i < uMaxSteps; i++) {
		curUV += rayStep;
		curViewPos += viewReflect * stepLen;
		if (curUV.x < 0.0 || curUV.x > 1.0 || curUV.y < 0.0 || curUV.y > 1.0) {
			break;
		}
		float sampledDepth = texture(uDepthTex, curUV).r;
		vec3 sampledViewPos = viewPosFromDepth(curUV, sampledDepth);
		float depthDiff = curViewPos.z - sampledViewPos.z;
		if (depthDiff > 0.0 && depthDiff < uThickness) {
			vec2 hitUV = curUV;
			for (int j = 0; j < 4; j++) {
				vec2 midUV = (uvStart + hitUV) * 0.5;
				float midDepth = texture(uDepthTex, midUV).r;
				vec3 midViewPos = viewPosFromDepth(midUV, midDepth);
				float t = float(i) / float(uMaxSteps);
				vec3 expectedViewPos = rayStart + viewReflect * uMaxDist * t * 0.5;
				float midDiff = expectedViewPos.z - midViewPos.z;
				if (midDiff > 0.0 && midDiff < uThickness) {
					hitUV = midUV;
				} else {
					uvStart = midUV;
				}
			}
			reflectedColor = texture(uColorTex, hitUV).rgb;
			float edgeFade = screenEdgeFade(hitUV);
			float distFade = 1.0 - smoothstep(0.0, uMaxDist, length(curViewPos - rayStart));
			float roughnessFade = 1.0 - roughness;
			reflectStrength = edgeFade * distFade * roughnessFade * (0.04 + metallic * 0.96);
			break;
		}
	}
	vec3 finalColor = mix(color, reflectedColor, reflectStrength);
	fragColor = vec4(finalColor, 1.0);
}
`

export const ssrBlurFS = `#version 300 es
precision highp float;

in vec2 vUV;

uniform sampler2D uTex;
uniform vec2 uDir;
uniform vec2 uResolution;

out vec4 fragColor;

void main() {
	vec2 texelSize = 1.0 / uResolution;
	vec3 result = vec3(0.0);
	float weights[5] = float[](0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);
	result += texture(uTex, vUV).rgb * weights[0];
	for (int i = 1; i < 5; i++) {
		vec2 offset = uDir * float(i) * texelSize;
		result += texture(uTex, vUV + offset).rgb * weights[i];
		result += texture(uTex, vUV - offset).rgb * weights[i];
	}
	fragColor = vec4(result, 1.0);
}
`

export const ssrComposeFS = `#version 300 es
precision highp float;

in vec2 vUV;

uniform sampler2D uSceneTex;
uniform sampler2D uSSRTex;
uniform float uIntensity;

out vec4 fragColor;

void main() {
	vec3 scene = texture(uSceneTex, vUV).rgb;
	vec3 ssr = texture(uSSRTex, vUV).rgb;
	vec3 finalColor = mix(scene, ssr, uIntensity);
	fragColor = vec4(finalColor, 1.0);
}
`

export interface SSRCfg {
	eab: boolean
	maxDist: number
	thickness: number
	stepSize: number
	maxSteps: number
	fadeStart: number
	fadeEnd: number
	intensity: number
	blur: boolean
}

export function defSSRCfg(): SSRCfg {
	return {
		eab: false,
		maxDist: 50.0,
		thickness: 0.5,
		stepSize: 1.0,
		maxSteps: 64,
		fadeStart: 0.1,
		fadeEnd: 0.9,
		intensity: 0.5,
		blur: true
	}
}
