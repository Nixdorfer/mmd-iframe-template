export const pbrVS = `#version 300 es
precision highp float;

in vec3 aPos;
in vec3 aNom;
in vec2 aUV;
in vec4 aTan;

uniform mat4 uViewProj;
uniform mat4 uModel;
uniform mat4 uLitMtx;

out vec3 vPos;
out vec3 vNom;
out vec2 vUV;
out vec3 vWorldPos;
out vec4 vPosLit;
out mat3 vTBN;

void main() {
	vec4 worldPos = uModel * vec4(aPos, 1.0);
	vWorldPos = worldPos.xyz;
	vPos = worldPos.xyz;
	vec3 N = normalize(mat3(uModel) * aNom);
	vec3 T = normalize(mat3(uModel) * aTan.xyz);
	T = normalize(T - dot(T, N) * N);
	vec3 B = cross(N, T) * aTan.w;
	vTBN = mat3(T, B, N);
	vNom = N;
	vUV = aUV;
	vPosLit = uLitMtx * worldPos;
	gl_Position = uViewProj * worldPos;
}
`

export const pbrFS = `#version 300 es
precision highp float;

in vec3 vPos;
in vec3 vNom;
in vec2 vUV;
in vec3 vWorldPos;
in vec4 vPosLit;
in mat3 vTBN;

uniform vec3 uCamPos;
uniform vec3 uSunDir;
uniform vec3 uSunClr;
uniform vec3 uAmbient;
uniform sampler2D uAlbedoTex;
uniform sampler2D uNomTex;
uniform sampler2D uMetRoughTex;
uniform sampler2D uAoTex;
uniform sampler2D uEmissiveTex;
uniform float uUseAlbedoTex;
uniform float uUseNomTex;
uniform float uUseMetRoughTex;
uniform float uUseAoTex;
uniform float uUseEmissiveTex;
uniform vec3 uAlbedo;
uniform float uMetallic;
uniform float uRoughness;
uniform float uAo;
uniform vec3 uEmissive;
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

const float PI = 3.14159265359;

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

float distGGX(vec3 N, vec3 H, float roughness) {
	float a = roughness * roughness;
	float a2 = a * a;
	float NdotH = max(dot(N, H), 0.0);
	float NdotH2 = NdotH * NdotH;
	float nom = a2;
	float denom = (NdotH2 * (a2 - 1.0) + 1.0);
	denom = PI * denom * denom;
	return nom / denom;
}

float geoSchlickGGX(float NdotV, float roughness) {
	float r = roughness + 1.0;
	float k = (r * r) / 8.0;
	float nom = NdotV;
	float denom = NdotV * (1.0 - k) + k;
	return nom / denom;
}

float geoSmith(vec3 N, vec3 V, vec3 L, float roughness) {
	float NdotV = max(dot(N, V), 0.0);
	float NdotL = max(dot(N, L), 0.0);
	float ggx2 = geoSchlickGGX(NdotV, roughness);
	float ggx1 = geoSchlickGGX(NdotL, roughness);
	return ggx1 * ggx2;
}

vec3 fresnelSchlick(float cosTheta, vec3 F0) {
	return F0 + (1.0 - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}

vec3 fresnelSchlickRough(float cosTheta, vec3 F0, float roughness) {
	return F0 + (max(vec3(1.0 - roughness), F0) - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}

float calAttn(float dist, float range) {
	float att = clamp(1.0 - dist / range, 0.0, 1.0);
	return att * att;
}

vec3 calPbrLit(vec3 L, vec3 V, vec3 N, vec3 H, vec3 radiance, vec3 albedo, float metallic, float roughness, vec3 F0) {
	float NDF = distGGX(N, H, roughness);
	float G = geoSmith(N, V, L, roughness);
	vec3 F = fresnelSchlick(max(dot(H, V), 0.0), F0);
	vec3 kS = F;
	vec3 kD = vec3(1.0) - kS;
	kD *= 1.0 - metallic;
	vec3 numerator = NDF * G * F;
	float denominator = 4.0 * max(dot(N, V), 0.0) * max(dot(N, L), 0.0) + 0.0001;
	vec3 specular = numerator / denominator;
	float NdotL = max(dot(N, L), 0.0);
	return (kD * albedo / PI + specular) * radiance * NdotL;
}

void main() {
	vec3 albedo = uUseAlbedoTex > 0.5 ? pow(texture(uAlbedoTex, vUV).rgb, vec3(2.2)) : uAlbedo;
	vec3 nom;
	if (uUseNomTex > 0.5) {
		vec3 nomSample = texture(uNomTex, vUV).rgb * 2.0 - 1.0;
		nom = normalize(vTBN * nomSample);
	} else {
		nom = normalize(vNom);
	}
	float metallic = uUseMetRoughTex > 0.5 ? texture(uMetRoughTex, vUV).b : uMetallic;
	float roughness = uUseMetRoughTex > 0.5 ? texture(uMetRoughTex, vUV).g : uRoughness;
	float ao = uUseAoTex > 0.5 ? texture(uAoTex, vUV).r : uAo;
	vec3 emissive = uUseEmissiveTex > 0.5 ? texture(uEmissiveTex, vUV).rgb : uEmissive;
	vec3 V = normalize(uCamPos - vWorldPos);
	vec3 F0 = vec3(0.04);
	F0 = mix(F0, albedo, metallic);
	vec3 Lo = vec3(0.0);
	float shadow = calShadow();
	vec3 L = normalize(uSunDir);
	vec3 H = normalize(V + L);
	vec3 radiance = uSunClr * (1.0 - shadow);
	Lo += calPbrLit(L, V, nom, H, radiance, albedo, metallic, roughness, F0);
	for (int i = 0; i < 8; i++) {
		if (i >= uPntLitCnt) break;
		vec3 litDir = uPntLitPos[i] - vWorldPos;
		float dist = length(litDir);
		L = normalize(litDir);
		H = normalize(V + L);
		float attn = calAttn(dist, uPntLitRange[i]);
		radiance = uPntLitClr[i] * uPntLitIntensity[i] * attn;
		Lo += calPbrLit(L, V, nom, H, radiance, albedo, metallic, roughness, F0);
	}
	for (int i = 0; i < 4; i++) {
		if (i >= uSptLitCnt) break;
		vec3 litDir = uSptLitPos[i] - vWorldPos;
		float dist = length(litDir);
		L = normalize(litDir);
		float theta = dot(L, normalize(-uSptLitDir[i]));
		float epsilon = uSptLitAngle[i] - uSptLitPenumbra[i];
		float intensity = clamp((theta - uSptLitPenumbra[i]) / epsilon, 0.0, 1.0);
		H = normalize(V + L);
		float attn = calAttn(dist, uSptLitRange[i]) * intensity;
		radiance = uSptLitClr[i] * attn;
		Lo += calPbrLit(L, V, nom, H, radiance, albedo, metallic, roughness, F0);
	}
	vec3 F = fresnelSchlickRough(max(dot(nom, V), 0.0), F0, roughness);
	vec3 kS = F;
	vec3 kD = 1.0 - kS;
	kD *= 1.0 - metallic;
	vec3 ambient = uAmbient * albedo * ao;
	vec3 color = ambient + Lo + emissive;
	color = color / (color + vec3(1.0));
	color = pow(color, vec3(1.0 / 2.2));
	fragColor = vec4(color, 1.0);
}
`

export interface PBRMaterial {
	albedo: [number, number, number]
	metallic: number
	roughness: number
	ao: number
	emissive: [number, number, number]
	albedoTex: string | null
	normalTex: string | null
	metRoughTex: string | null
	aoTex: string | null
	emissiveTex: string | null
}

export function defPBRMaterial(): PBRMaterial {
	return {
		albedo: [1, 1, 1],
		metallic: 0,
		roughness: 0.5,
		ao: 1,
		emissive: [0, 0, 0],
		albedoTex: null,
		normalTex: null,
		metRoughTex: null,
		aoTex: null,
		emissiveTex: null
	}
}

export const PBR_PRESETS: Record<string, Partial<PBRMaterial>> = {
	gold: { albedo: [1.0, 0.766, 0.336], metallic: 1.0, roughness: 0.3 },
	silver: { albedo: [0.972, 0.960, 0.915], metallic: 1.0, roughness: 0.2 },
	copper: { albedo: [0.955, 0.637, 0.538], metallic: 1.0, roughness: 0.4 },
	iron: { albedo: [0.560, 0.570, 0.580], metallic: 1.0, roughness: 0.5 },
	plastic: { albedo: [0.8, 0.2, 0.2], metallic: 0.0, roughness: 0.4 },
	rubber: { albedo: [0.1, 0.1, 0.1], metallic: 0.0, roughness: 0.9 },
	wood: { albedo: [0.6, 0.4, 0.2], metallic: 0.0, roughness: 0.7 },
	marble: { albedo: [0.95, 0.95, 0.95], metallic: 0.0, roughness: 0.2 },
	concrete: { albedo: [0.5, 0.5, 0.5], metallic: 0.0, roughness: 0.8 },
	glass: { albedo: [1.0, 1.0, 1.0], metallic: 0.0, roughness: 0.05 }
}
