export const entityVS = `#version 300 es
precision highp float;

in vec3 aPos;
in vec3 aNom;
in vec2 aUV;
in vec3 aClr;
in vec4 aTan;

uniform mat4 uViewProj;
uniform mat4 uModel;
uniform mat4 uLitMtx;

out vec3 vPos;
out vec3 vNom;
out vec2 vUV;
out vec3 vClr;
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
	vClr = aClr;
	vPosLit = uLitMtx * worldPos;
	gl_Position = uViewProj * worldPos;
}
`

export const entityFS = `#version 300 es
precision highp float;

in vec3 vPos;
in vec3 vNom;
in vec2 vUV;
in vec3 vClr;
in vec3 vWorldPos;
in vec4 vPosLit;
in mat3 vTBN;

uniform vec3 uAmbient;
uniform vec3 uSunDir;
uniform vec3 uSunClr;
uniform sampler2D uTex;
uniform sampler2D uNomTex;
uniform float uUseTex;
uniform float uUseNomTex;
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
	vec3 nom;
	if (uUseNomTex > 0.5) {
		vec3 nomSample = texture(uNomTex, vUV).rgb * 2.0 - 1.0;
		nom = normalize(vTBN * nomSample);
	} else {
		nom = normalize(vNom);
	}
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

export const billboardVS = `#version 300 es
precision highp float;

in vec3 aPos;
in vec2 aUV;

uniform mat4 uViewProj;
uniform vec3 uCenter;
uniform vec2 uSize;
uniform mat4 uView;

out vec2 vUV;

void main() {
	vec3 camRight = vec3(uView[0][0], uView[1][0], uView[2][0]);
	vec3 camUp = vec3(uView[0][1], uView[1][1], uView[2][1]);
	vec3 pos = uCenter + camRight * aPos.x * uSize.x + camUp * aPos.y * uSize.y;
	vUV = aUV;
	gl_Position = uViewProj * vec4(pos, 1.0);
}
`

export const billboardFS = `#version 300 es
precision highp float;

in vec2 vUV;

uniform sampler2D uTex;
uniform vec4 uTint;

out vec4 fragColor;

void main() {
	vec4 texClr = texture(uTex, vUV);
	vec4 clr = texClr * uTint;
	if (clr.a < 0.1) discard;
	fragColor = clr;
}
`

export const ENTITY_VERTEX_SIZE = 11
export const ENTITY_STRIDE = ENTITY_VERTEX_SIZE * 4
export const ENTITY_VERTEX_SIZE_NOM = 15
export const ENTITY_STRIDE_NOM = ENTITY_VERTEX_SIZE_NOM * 4

export function entityVertexLayout(gl: WebGL2RenderingContext) {
	return [
		{ name: 'aPos', size: 3, type: gl.FLOAT, normalized: false, offset: 0 },
		{ name: 'aNom', size: 3, type: gl.FLOAT, normalized: false, offset: 12 },
		{ name: 'aUV', size: 2, type: gl.FLOAT, normalized: false, offset: 24 },
		{ name: 'aClr', size: 3, type: gl.FLOAT, normalized: false, offset: 32 }
	]
}

export function entityVertexLayoutNomMap(gl: WebGL2RenderingContext) {
	return [
		{ name: 'aPos', size: 3, type: gl.FLOAT, normalized: false, offset: 0 },
		{ name: 'aNom', size: 3, type: gl.FLOAT, normalized: false, offset: 12 },
		{ name: 'aUV', size: 2, type: gl.FLOAT, normalized: false, offset: 24 },
		{ name: 'aClr', size: 3, type: gl.FLOAT, normalized: false, offset: 32 },
		{ name: 'aTan', size: 4, type: gl.FLOAT, normalized: false, offset: 44 }
	]
}

export function calTangents(
	positions: Float32Array,
	normals: Float32Array,
	uvs: Float32Array,
	indices: Uint16Array
): Float32Array {
	const vertCount = positions.length / 3
	const tangents = new Float32Array(vertCount * 4)
	const tan1 = new Float32Array(vertCount * 3)
	const tan2 = new Float32Array(vertCount * 3)
	for (let i = 0; i < indices.length; i += 3) {
		const i0 = indices[i]
		const i1 = indices[i + 1]
		const i2 = indices[i + 2]
		const p0x = positions[i0 * 3], p0y = positions[i0 * 3 + 1], p0z = positions[i0 * 3 + 2]
		const p1x = positions[i1 * 3], p1y = positions[i1 * 3 + 1], p1z = positions[i1 * 3 + 2]
		const p2x = positions[i2 * 3], p2y = positions[i2 * 3 + 1], p2z = positions[i2 * 3 + 2]
		const u0 = uvs[i0 * 2], v0 = uvs[i0 * 2 + 1]
		const u1 = uvs[i1 * 2], v1 = uvs[i1 * 2 + 1]
		const u2 = uvs[i2 * 2], v2 = uvs[i2 * 2 + 1]
		const x1 = p1x - p0x, y1 = p1y - p0y, z1 = p1z - p0z
		const x2 = p2x - p0x, y2 = p2y - p0y, z2 = p2z - p0z
		const s1 = u1 - u0, t1 = v1 - v0
		const s2 = u2 - u0, t2 = v2 - v0
		const r = 1.0 / (s1 * t2 - s2 * t1 + 0.0001)
		const sdirX = (t2 * x1 - t1 * x2) * r
		const sdirY = (t2 * y1 - t1 * y2) * r
		const sdirZ = (t2 * z1 - t1 * z2) * r
		const tdirX = (s1 * x2 - s2 * x1) * r
		const tdirY = (s1 * y2 - s2 * y1) * r
		const tdirZ = (s1 * z2 - s2 * z1) * r
		for (const idx of [i0, i1, i2]) {
			tan1[idx * 3] += sdirX
			tan1[idx * 3 + 1] += sdirY
			tan1[idx * 3 + 2] += sdirZ
			tan2[idx * 3] += tdirX
			tan2[idx * 3 + 1] += tdirY
			tan2[idx * 3 + 2] += tdirZ
		}
	}
	for (let i = 0; i < vertCount; i++) {
		const nx = normals[i * 3], ny = normals[i * 3 + 1], nz = normals[i * 3 + 2]
		const tx = tan1[i * 3], ty = tan1[i * 3 + 1], tz = tan1[i * 3 + 2]
		const dot = nx * tx + ny * ty + nz * tz
		let ox = tx - nx * dot
		let oy = ty - ny * dot
		let oz = tz - nz * dot
		const len = Math.sqrt(ox * ox + oy * oy + oz * oz)
		if (len > 0.0001) {
			ox /= len
			oy /= len
			oz /= len
		}
		const cx = ny * tz - nz * ty
		const cy = nz * tx - nx * tz
		const cz = nx * ty - ny * tx
		const w = (cx * tan2[i * 3] + cy * tan2[i * 3 + 1] + cz * tan2[i * 3 + 2]) < 0 ? -1 : 1
		tangents[i * 4] = ox
		tangents[i * 4 + 1] = oy
		tangents[i * 4 + 2] = oz
		tangents[i * 4 + 3] = w
	}
	return tangents
}
