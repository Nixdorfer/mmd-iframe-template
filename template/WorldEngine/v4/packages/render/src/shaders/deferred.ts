export const gbufferVS = `#version 300 es
precision highp float;

in vec3 aPos;
in vec3 aNom;
in vec2 aUV;
in vec3 aClr;
in vec4 aTan;

uniform mat4 uViewProj;
uniform mat4 uModel;
uniform mat4 uView;

out vec3 vPos;
out vec3 vNom;
out vec2 vUV;
out vec3 vClr;
out vec3 vViewPos;
out mat3 vTBN;

void main() {
	vec4 worldPos = uModel * vec4(aPos, 1.0);
	vec4 viewPos = uView * worldPos;
	vPos = worldPos.xyz;
	vViewPos = viewPos.xyz;
	vec3 N = normalize(mat3(uModel) * aNom);
	vec3 T = normalize(mat3(uModel) * aTan.xyz);
	T = normalize(T - dot(T, N) * N);
	vec3 B = cross(N, T) * aTan.w;
	vTBN = mat3(T, B, N);
	vNom = N;
	vUV = aUV;
	vClr = aClr;
	gl_Position = uViewProj * worldPos;
}
`

export const gbufferFS = `#version 300 es
precision highp float;

in vec3 vPos;
in vec3 vNom;
in vec2 vUV;
in vec3 vClr;
in vec3 vViewPos;
in mat3 vTBN;

uniform sampler2D uTex;
uniform sampler2D uNomTex;
uniform float uUseTex;
uniform float uUseNomTex;
uniform vec4 uTint;
uniform float uMetallic;
uniform float uRoughness;

layout(location = 0) out vec4 gAlbedo;
layout(location = 1) out vec4 gNormal;
layout(location = 2) out vec4 gPosition;
layout(location = 3) out vec4 gMaterial;

vec2 encodeNormal(vec3 n) {
	return n.xy * 0.5 + 0.5;
}

void main() {
	vec4 albedo = uUseTex > 0.5 ? texture(uTex, vUV) : vec4(vClr, 1.0);
	albedo *= uTint;
	if (albedo.a < 0.1) discard;
	vec3 nom;
	if (uUseNomTex > 0.5) {
		vec3 nomSample = texture(uNomTex, vUV).rgb * 2.0 - 1.0;
		nom = normalize(vTBN * nomSample);
	} else {
		nom = normalize(vNom);
	}
	gAlbedo = vec4(albedo.rgb, 1.0);
	gNormal = vec4(nom * 0.5 + 0.5, 1.0);
	gPosition = vec4(vPos, 1.0);
	gMaterial = vec4(uMetallic, uRoughness, 0.0, 1.0);
}
`

export const deferredLitVS = `#version 300 es
precision highp float;

in vec2 aPos;
out vec2 vUV;

void main() {
	vUV = aPos * 0.5 + 0.5;
	gl_Position = vec4(aPos, 0.0, 1.0);
}
`

export const deferredLitFS = `#version 300 es
precision highp float;

in vec2 vUV;

uniform sampler2D uAlbedo;
uniform sampler2D uNormal;
uniform sampler2D uPosition;
uniform sampler2D uMaterial;
uniform sampler2D uShadowMap;
uniform sampler2D uSsao;

uniform vec3 uCamPos;
uniform vec3 uAmbient;
uniform vec3 uSunDir;
uniform vec3 uSunClr;
uniform mat4 uLitMtx;
uniform float uShadowBias;
uniform float uShadowStr;
uniform int uShadowEab;
uniform int uSsaoEab;

const int MAX_PNT_LITS = 8;
const int MAX_SPT_LITS = 4;

uniform int uPntLitCnt;
uniform vec3 uPntLitPos[MAX_PNT_LITS];
uniform vec3 uPntLitClr[MAX_PNT_LITS];
uniform float uPntLitRange[MAX_PNT_LITS];
uniform float uPntLitIntensity[MAX_PNT_LITS];

uniform int uSptLitCnt;
uniform vec3 uSptLitPos[MAX_SPT_LITS];
uniform vec3 uSptLitDir[MAX_SPT_LITS];
uniform vec3 uSptLitClr[MAX_SPT_LITS];
uniform float uSptLitRange[MAX_SPT_LITS];
uniform float uSptLitAngle[MAX_SPT_LITS];
uniform float uSptLitPenumbra[MAX_SPT_LITS];

out vec4 fragColor;

float calShadow(vec3 worldPos) {
	if (uShadowEab == 0) return 0.0;
	vec4 posLit = uLitMtx * vec4(worldPos, 1.0);
	vec3 projCoords = posLit.xyz / posLit.w;
	projCoords = projCoords * 0.5 + 0.5;
	if (projCoords.z > 1.0 || projCoords.x < 0.0 || projCoords.x > 1.0 || projCoords.y < 0.0 || projCoords.y > 1.0) {
		return 0.0;
	}
	float curDepth = projCoords.z;
	float shadow = 0.0;
	vec2 texelSize = 1.0 / vec2(textureSize(uShadowMap, 0));
	for (int x = -1; x <= 1; x++) {
		for (int y = -1; y <= 1; y++) {
			float pcfDepth = texture(uShadowMap, projCoords.xy + vec2(x, y) * texelSize).r;
			shadow += curDepth - uShadowBias > pcfDepth ? 1.0 : 0.0;
		}
	}
	return shadow / 9.0 * uShadowStr;
}

float calAttn(float dist, float range) {
	float att = clamp(1.0 - dist / range, 0.0, 1.0);
	return att * att;
}

vec3 calPointLit(vec3 worldPos, vec3 nom, vec3 viewDir, vec3 albedo, float metallic, float roughness) {
	vec3 result = vec3(0.0);
	for (int i = 0; i < uPntLitCnt; i++) {
		vec3 litDir = uPntLitPos[i] - worldPos;
		float dist = length(litDir);
		if (dist > uPntLitRange[i]) continue;
		litDir = normalize(litDir);
		float attn = calAttn(dist, uPntLitRange[i]) * uPntLitIntensity[i];
		float diff = max(dot(nom, litDir), 0.0);
		vec3 halfDir = normalize(litDir + viewDir);
		float spec = pow(max(dot(nom, halfDir), 0.0), 32.0 * (1.0 - roughness + 0.1));
		vec3 diffuse = diff * albedo * uPntLitClr[i];
		vec3 specular = spec * mix(vec3(0.04), albedo, metallic) * uPntLitClr[i];
		result += (diffuse + specular) * attn;
	}
	return result;
}

vec3 calSpotLit(vec3 worldPos, vec3 nom, vec3 viewDir, vec3 albedo, float metallic, float roughness) {
	vec3 result = vec3(0.0);
	for (int i = 0; i < uSptLitCnt; i++) {
		vec3 litDir = uSptLitPos[i] - worldPos;
		float dist = length(litDir);
		if (dist > uSptLitRange[i]) continue;
		litDir = normalize(litDir);
		float theta = dot(litDir, normalize(-uSptLitDir[i]));
		float epsilon = uSptLitAngle[i] - uSptLitPenumbra[i];
		float intensity = clamp((theta - uSptLitPenumbra[i]) / epsilon, 0.0, 1.0);
		if (intensity <= 0.0) continue;
		float attn = calAttn(dist, uSptLitRange[i]) * intensity;
		float diff = max(dot(nom, litDir), 0.0);
		vec3 halfDir = normalize(litDir + viewDir);
		float spec = pow(max(dot(nom, halfDir), 0.0), 32.0 * (1.0 - roughness + 0.1));
		vec3 diffuse = diff * albedo * uSptLitClr[i];
		vec3 specular = spec * mix(vec3(0.04), albedo, metallic) * uSptLitClr[i];
		result += (diffuse + specular) * attn;
	}
	return result;
}

void main() {
	vec4 albedoSample = texture(uAlbedo, vUV);
	if (albedoSample.a < 0.01) discard;
	vec3 albedo = albedoSample.rgb;
	vec3 nom = texture(uNormal, vUV).rgb * 2.0 - 1.0;
	vec3 worldPos = texture(uPosition, vUV).rgb;
	vec4 matSample = texture(uMaterial, vUV);
	float metallic = matSample.r;
	float roughness = matSample.g;
	vec3 viewDir = normalize(uCamPos - worldPos);
	vec3 sunDir = normalize(uSunDir);
	float diff = max(dot(nom, sunDir), 0.0);
	float shadow = calShadow(worldPos);
	vec3 halfDir = normalize(sunDir + viewDir);
	float spec = pow(max(dot(nom, halfDir), 0.0), 32.0 * (1.0 - roughness + 0.1));
	vec3 F0 = mix(vec3(0.04), albedo, metallic);
	vec3 diffuse = diff * albedo * uSunClr * (1.0 - shadow);
	vec3 specular = spec * F0 * uSunClr * (1.0 - shadow);
	vec3 ambient = uAmbient * albedo;
	if (uSsaoEab == 1) {
		float ao = texture(uSsao, vUV).r;
		ambient *= ao;
	}
	vec3 pointLit = calPointLit(worldPos, nom, viewDir, albedo, metallic, roughness);
	vec3 spotLit = calSpotLit(worldPos, nom, viewDir, albedo, metallic, roughness);
	vec3 finalColor = ambient + diffuse + specular + pointLit + spotLit;
	fragColor = vec4(finalColor, 1.0);
}
`

export const GBUFFER_ALBEDO = 0
export const GBUFFER_NORMAL = 1
export const GBUFFER_POSITION = 2
export const GBUFFER_MATERIAL = 3
