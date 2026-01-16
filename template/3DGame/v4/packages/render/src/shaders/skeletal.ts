export const MAX_BONES = 64

export const skeletalVS = `#version 300 es
precision highp float;

in vec3 aPos;
in vec3 aNom;
in vec2 aUV;
in vec3 aClr;
in vec4 aBoneIdx;
in vec4 aBoneWgt;

uniform mat4 uViewProj;
uniform mat4 uModel;
uniform mat4 uLitMtx;
uniform mat4 uBoneMtx[64];

out vec3 vPos;
out vec3 vNom;
out vec2 vUV;
out vec3 vClr;
out vec3 vWorldPos;
out vec4 vPosLit;

void main() {
	mat4 skinMtx =
		uBoneMtx[int(aBoneIdx.x)] * aBoneWgt.x +
		uBoneMtx[int(aBoneIdx.y)] * aBoneWgt.y +
		uBoneMtx[int(aBoneIdx.z)] * aBoneWgt.z +
		uBoneMtx[int(aBoneIdx.w)] * aBoneWgt.w;
	vec4 skinnedPos = skinMtx * vec4(aPos, 1.0);
	vec3 skinnedNom = mat3(skinMtx) * aNom;
	vec4 worldPos = uModel * skinnedPos;
	vWorldPos = worldPos.xyz;
	vPos = worldPos.xyz;
	vNom = mat3(uModel) * skinnedNom;
	vUV = aUV;
	vClr = aClr;
	vPosLit = uLitMtx * worldPos;
	gl_Position = uViewProj * worldPos;
}
`

export const skeletalFS = `#version 300 es
precision highp float;

in vec3 vPos;
in vec3 vNom;
in vec2 vUV;
in vec3 vClr;
in vec3 vWorldPos;
in vec4 vPosLit;

uniform vec3 uAmbient;
uniform vec3 uSunDir;
uniform vec3 uSunClr;
uniform sampler2D uTex;
uniform float uUseTex;
uniform vec4 uTint;
uniform vec3 uCamPos;
uniform int uRndMode;
uniform float uSpecPower;
uniform float uRimPower;
uniform float uSmoothness;
uniform float uSteps;
uniform int uShadowEab;
uniform sampler2DShadow uShadowMap;
uniform float uShadowBias;
uniform float uShadowStr;
uniform int uPntLitCnt;
uniform vec3 uPntLitPos[8];
uniform vec3 uPntLitClr[8];
uniform float uPntLitRange[8];
uniform float uPntLitIntensity[8];
uniform int uSptLitCnt;
uniform vec3 uSptLitPos[4];
uniform vec3 uSptLitDir[4];
uniform vec3 uSptLitClr[4];
uniform float uSptLitRange[4];
uniform float uSptLitAngle[4];
uniform float uSptLitPenumbra[4];

out vec4 fragColor;

float calShadow() {
	if (uShadowEab == 0) return 0.0;
	vec3 projCoords = vPosLit.xyz / vPosLit.w * 0.5 + 0.5;
	if (projCoords.z > 1.0 || projCoords.x < 0.0 || projCoords.x > 1.0 || projCoords.y < 0.0 || projCoords.y > 1.0) {
		return 0.0;
	}
	float shadow = 0.0;
	vec2 texelSize = 1.0 / vec2(textureSize(uShadowMap, 0));
	for (int x = -1; x <= 1; ++x) {
		for (int y = -1; y <= 1; ++y) {
			vec3 sampleCoord = vec3(projCoords.xy + vec2(x, y) * texelSize, projCoords.z - uShadowBias);
			shadow += texture(uShadowMap, sampleCoord);
		}
	}
	return (1.0 - shadow / 9.0) * uShadowStr;
}

float calAttn(float dist, float range) {
	float att = clamp(1.0 - dist / range, 0.0, 1.0);
	return att * att;
}

vec3 calPntLits(vec3 nom, vec3 viewDir) {
	vec3 total = vec3(0.0);
	for (int i = 0; i < 8; i++) {
		if (i >= uPntLitCnt) break;
		vec3 litDir = uPntLitPos[i] - vWorldPos;
		float dist = length(litDir);
		litDir = normalize(litDir);
		float diff = max(dot(nom, litDir), 0.0);
		float attn = calAttn(dist, uPntLitRange[i]);
		vec3 halfDir = normalize(litDir + viewDir);
		float spec = pow(max(dot(nom, halfDir), 0.0), uSpecPower);
		total += uPntLitClr[i] * uPntLitIntensity[i] * attn * (diff + spec * 0.3);
	}
	return total;
}

vec3 calSptLits(vec3 nom, vec3 viewDir) {
	vec3 total = vec3(0.0);
	for (int i = 0; i < 4; i++) {
		if (i >= uSptLitCnt) break;
		vec3 litDir = uSptLitPos[i] - vWorldPos;
		float dist = length(litDir);
		litDir = normalize(litDir);
		float diff = max(dot(nom, litDir), 0.0);
		float attn = calAttn(dist, uSptLitRange[i]);
		float theta = dot(litDir, normalize(-uSptLitDir[i]));
		float epsilon = uSptLitAngle[i] - uSptLitPenumbra[i];
		float intensity = clamp((theta - uSptLitPenumbra[i]) / epsilon, 0.0, 1.0);
		vec3 halfDir = normalize(litDir + viewDir);
		float spec = pow(max(dot(nom, halfDir), 0.0), uSpecPower);
		total += uSptLitClr[i] * intensity * attn * (diff + spec * 0.3);
	}
	return total;
}

vec3 calRealistic(vec3 nom, vec3 viewDir, vec3 sunDir, float diff, float shadow) {
	vec3 halfDir = normalize(sunDir + viewDir);
	float spec = pow(max(dot(nom, halfDir), 0.0), uSpecPower);
	vec3 sunLight = uSunClr * (diff + spec * 0.3) * (1.0 - shadow);
	vec3 pntLight = calPntLits(nom, viewDir);
	vec3 sptLight = calSptLits(nom, viewDir);
	return uAmbient + sunLight + pntLight + sptLight;
}

vec3 calAcrylic(vec3 nom, vec3 viewDir, float diff, float shadow) {
	float wrap = (diff + 1.0) * 0.5;
	float rim = pow(1.0 - max(dot(viewDir, nom), 0.0), uRimPower);
	vec3 light = mix(uAmbient, uSunClr, smoothstep(0.2 - uSmoothness * 0.15, 0.8 + uSmoothness * 0.15, wrap));
	light *= (1.0 - shadow);
	light += rim * uSunClr * 0.35;
	vec3 pntLight = calPntLits(nom, viewDir);
	vec3 sptLight = calSptLits(nom, viewDir);
	return light + pntLight + sptLight;
}

vec3 calAnime(float diff, float shadow) {
	float steps = max(uSteps, 2.0);
	float toon = floor(diff * steps + 0.5) / steps;
	return mix(uAmbient, uSunClr * (1.0 - shadow), toon);
}

void main() {
	vec3 nom = normalize(vNom);
	vec3 sunDir = normalize(uSunDir);
	vec3 viewDir = normalize(uCamPos - vWorldPos);
	float diff = max(dot(nom, sunDir), 0.0);
	float shadow = calShadow();
	vec3 light;
	if (uRndMode == 0) {
		light = calRealistic(nom, viewDir, sunDir, diff, shadow);
	} else if (uRndMode == 1) {
		light = calAcrylic(nom, viewDir, diff, shadow);
	} else {
		light = calAnime(diff, shadow);
	}
	vec4 texClr = uUseTex > 0.5 ? texture(uTex, vUV) : vec4(1.0);
	vec3 clr = vClr * texClr.rgb * light * uTint.rgb;
	float alpha = texClr.a * uTint.a;
	if (alpha < 0.1) discard;
	fragColor = vec4(clr, alpha);
}
`

export const SKELETAL_VERTEX_SIZE = 15
export const SKELETAL_STRIDE = SKELETAL_VERTEX_SIZE * 4

export function skeletalVertexLayout(gl: WebGL2RenderingContext) {
	return [
		{ name: 'aPos', size: 3, type: gl.FLOAT, normalized: false, offset: 0 },
		{ name: 'aNom', size: 3, type: gl.FLOAT, normalized: false, offset: 12 },
		{ name: 'aUV', size: 2, type: gl.FLOAT, normalized: false, offset: 24 },
		{ name: 'aClr', size: 3, type: gl.FLOAT, normalized: false, offset: 32 },
		{ name: 'aBoneIdx', size: 4, type: gl.FLOAT, normalized: false, offset: 44 },
		{ name: 'aBoneWgt', size: 4, type: gl.FLOAT, normalized: false, offset: 60 }
	]
}
