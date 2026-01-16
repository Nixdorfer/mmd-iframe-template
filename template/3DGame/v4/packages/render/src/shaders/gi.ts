export const GI_PROBE_VS = `#version 300 es
precision highp float;

in vec3 aPos;
in vec3 aNorm;
in vec2 aUv;

uniform mat4 uModel;
uniform mat4 uViewProj;

out vec3 vWorldPos;
out vec3 vNorm;
out vec2 vUv;

void main() {
	vec4 worldPos = uModel * vec4(aPos, 1.0);
	vWorldPos = worldPos.xyz;
	vNorm = mat3(uModel) * aNorm;
	vUv = aUv;
	gl_Position = uViewProj * worldPos;
}
`

export const GI_PROBE_FS = `#version 300 es
precision highp float;

in vec3 vWorldPos;
in vec3 vNorm;
in vec2 vUv;

uniform vec3 uAlbedo;
uniform float uMetallic;
uniform float uRoughness;

layout(location = 0) out vec4 fragColor;
layout(location = 1) out vec4 fragNormal;
layout(location = 2) out vec4 fragPosition;

void main() {
	fragColor = vec4(uAlbedo, 1.0);
	fragNormal = vec4(normalize(vNorm) * 0.5 + 0.5, uRoughness);
	fragPosition = vec4(vWorldPos, uMetallic);
}
`

export const GI_LIGHTMAP_VS = `#version 300 es
precision highp float;

in vec3 aPos;
in vec2 aUv;
in vec2 aLightmapUv;

uniform mat4 uModel;
uniform mat4 uViewProj;

out vec2 vUv;
out vec2 vLightmapUv;
out vec3 vWorldPos;

void main() {
	vec4 worldPos = uModel * vec4(aPos, 1.0);
	vWorldPos = worldPos.xyz;
	vUv = aUv;
	vLightmapUv = aLightmapUv;
	gl_Position = uViewProj * worldPos;
}
`

export const GI_LIGHTMAP_FS = `#version 300 es
precision highp float;

in vec2 vUv;
in vec2 vLightmapUv;
in vec3 vWorldPos;

uniform sampler2D uAlbedoTex;
uniform sampler2D uLightmap;
uniform vec3 uAmbient;
uniform float uLightmapIntensity;

out vec4 fragColor;

void main() {
	vec3 albedo = texture(uAlbedoTex, vUv).rgb;
	vec3 lightmap = texture(uLightmap, vLightmapUv).rgb;
	vec3 indirect = lightmap * uLightmapIntensity;
	vec3 color = albedo * (uAmbient + indirect);
	fragColor = vec4(color, 1.0);
}
`

export const GI_IRRADIANCE_VS = `#version 300 es
precision highp float;

in vec3 aPos;
out vec3 vLocalPos;

uniform mat4 uViewProj;

void main() {
	vLocalPos = aPos;
	gl_Position = uViewProj * vec4(aPos, 1.0);
}
`

export const GI_IRRADIANCE_FS = `#version 300 es
precision highp float;

in vec3 vLocalPos;

uniform samplerCube uEnvMap;

out vec4 fragColor;

const float PI = 3.14159265359;

void main() {
	vec3 normal = normalize(vLocalPos);
	vec3 irradiance = vec3(0.0);
	vec3 up = vec3(0.0, 1.0, 0.0);
	vec3 right = normalize(cross(up, normal));
	up = normalize(cross(normal, right));
	float sampleDelta = 0.025;
	float nrSamples = 0.0;
	for(float phi = 0.0; phi < 2.0 * PI; phi += sampleDelta) {
		for(float theta = 0.0; theta < 0.5 * PI; theta += sampleDelta) {
			vec3 tangentSample = vec3(sin(theta) * cos(phi), sin(theta) * sin(phi), cos(theta));
			vec3 sampleVec = tangentSample.x * right + tangentSample.y * up + tangentSample.z * normal;
			irradiance += texture(uEnvMap, sampleVec).rgb * cos(theta) * sin(theta);
			nrSamples++;
		}
	}
	irradiance = PI * irradiance * (1.0 / nrSamples);
	fragColor = vec4(irradiance, 1.0);
}
`

export const GI_PREFILTER_VS = `#version 300 es
precision highp float;

in vec3 aPos;
out vec3 vLocalPos;

uniform mat4 uViewProj;

void main() {
	vLocalPos = aPos;
	gl_Position = uViewProj * vec4(aPos, 1.0);
}
`

export const GI_PREFILTER_FS = `#version 300 es
precision highp float;

in vec3 vLocalPos;

uniform samplerCube uEnvMap;
uniform float uRoughness;
uniform float uResolution;

out vec4 fragColor;

const float PI = 3.14159265359;

float radicalInverseVdC(uint bits) {
	bits = (bits << 16u) | (bits >> 16u);
	bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
	bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
	bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
	bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
	return float(bits) * 2.3283064365386963e-10;
}

vec2 hammersley(uint i, uint N) {
	return vec2(float(i) / float(N), radicalInverseVdC(i));
}

vec3 importanceSampleGGX(vec2 Xi, vec3 N, float roughness) {
	float a = roughness * roughness;
	float phi = 2.0 * PI * Xi.x;
	float cosTheta = sqrt((1.0 - Xi.y) / (1.0 + (a * a - 1.0) * Xi.y));
	float sinTheta = sqrt(1.0 - cosTheta * cosTheta);
	vec3 H;
	H.x = cos(phi) * sinTheta;
	H.y = sin(phi) * sinTheta;
	H.z = cosTheta;
	vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
	vec3 tangent = normalize(cross(up, N));
	vec3 bitangent = cross(N, tangent);
	vec3 sampleVec = tangent * H.x + bitangent * H.y + N * H.z;
	return normalize(sampleVec);
}

void main() {
	vec3 N = normalize(vLocalPos);
	vec3 R = N;
	vec3 V = R;
	const uint SAMPLE_COUNT = 1024u;
	float totalWeight = 0.0;
	vec3 prefilteredColor = vec3(0.0);
	for(uint i = 0u; i < SAMPLE_COUNT; ++i) {
		vec2 Xi = hammersley(i, SAMPLE_COUNT);
		vec3 H = importanceSampleGGX(Xi, N, uRoughness);
		vec3 L = normalize(2.0 * dot(V, H) * H - V);
		float NdotL = max(dot(N, L), 0.0);
		if(NdotL > 0.0) {
			float D = (uRoughness * uRoughness) / (PI * pow(NdotL * NdotL * (uRoughness * uRoughness - 1.0) + 1.0, 2.0));
			float pdf = D * NdotL / (4.0 * max(dot(H, V), 0.001)) + 0.0001;
			float saTexel = 4.0 * PI / (6.0 * uResolution * uResolution);
			float saSample = 1.0 / (float(SAMPLE_COUNT) * pdf + 0.0001);
			float mipLevel = uRoughness == 0.0 ? 0.0 : 0.5 * log2(saSample / saTexel);
			prefilteredColor += textureLod(uEnvMap, L, mipLevel).rgb * NdotL;
			totalWeight += NdotL;
		}
	}
	prefilteredColor = prefilteredColor / totalWeight;
	fragColor = vec4(prefilteredColor, 1.0);
}
`

export const GI_BRDF_VS = `#version 300 es
precision highp float;

in vec3 aPos;
in vec2 aUv;

out vec2 vUv;

void main() {
	vUv = aUv;
	gl_Position = vec4(aPos, 1.0);
}
`

export const GI_BRDF_FS = `#version 300 es
precision highp float;

in vec2 vUv;

out vec2 fragColor;

const float PI = 3.14159265359;

float radicalInverseVdC(uint bits) {
	bits = (bits << 16u) | (bits >> 16u);
	bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
	bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
	bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
	bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
	return float(bits) * 2.3283064365386963e-10;
}

vec2 hammersley(uint i, uint N) {
	return vec2(float(i) / float(N), radicalInverseVdC(i));
}

vec3 importanceSampleGGX(vec2 Xi, vec3 N, float roughness) {
	float a = roughness * roughness;
	float phi = 2.0 * PI * Xi.x;
	float cosTheta = sqrt((1.0 - Xi.y) / (1.0 + (a * a - 1.0) * Xi.y));
	float sinTheta = sqrt(1.0 - cosTheta * cosTheta);
	vec3 H;
	H.x = cos(phi) * sinTheta;
	H.y = sin(phi) * sinTheta;
	H.z = cosTheta;
	vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
	vec3 tangent = normalize(cross(up, N));
	vec3 bitangent = cross(N, tangent);
	vec3 sampleVec = tangent * H.x + bitangent * H.y + N * H.z;
	return normalize(sampleVec);
}

float geometrySchlickGGX(float NdotV, float roughness) {
	float a = roughness;
	float k = (a * a) / 2.0;
	float nom = NdotV;
	float denom = NdotV * (1.0 - k) + k;
	return nom / denom;
}

float geometrySmith(vec3 N, vec3 V, vec3 L, float roughness) {
	float NdotV = max(dot(N, V), 0.0);
	float NdotL = max(dot(N, L), 0.0);
	float ggx2 = geometrySchlickGGX(NdotV, roughness);
	float ggx1 = geometrySchlickGGX(NdotL, roughness);
	return ggx1 * ggx2;
}

vec2 integrateBRDF(float NdotV, float roughness) {
	vec3 V;
	V.x = sqrt(1.0 - NdotV * NdotV);
	V.y = 0.0;
	V.z = NdotV;
	float A = 0.0;
	float B = 0.0;
	vec3 N = vec3(0.0, 0.0, 1.0);
	const uint SAMPLE_COUNT = 1024u;
	for(uint i = 0u; i < SAMPLE_COUNT; ++i) {
		vec2 Xi = hammersley(i, SAMPLE_COUNT);
		vec3 H = importanceSampleGGX(Xi, N, roughness);
		vec3 L = normalize(2.0 * dot(V, H) * H - V);
		float NdotL = max(L.z, 0.0);
		float NdotH = max(H.z, 0.0);
		float VdotH = max(dot(V, H), 0.0);
		if(NdotL > 0.0) {
			float G = geometrySmith(N, V, L, roughness);
			float G_Vis = (G * VdotH) / (NdotH * NdotV);
			float Fc = pow(1.0 - VdotH, 5.0);
			A += (1.0 - Fc) * G_Vis;
			B += Fc * G_Vis;
		}
	}
	A /= float(SAMPLE_COUNT);
	B /= float(SAMPLE_COUNT);
	return vec2(A, B);
}

void main() {
	vec2 integratedBRDF = integrateBRDF(vUv.x, vUv.y);
	fragColor = integratedBRDF;
}
`

export interface GIProbe {
	id: string
	position: { x: number, y: number, z: number }
	radius: number
	irradianceMap: WebGLTexture | null
	prefilterMap: WebGLTexture | null
	resolution: number
}

export interface GICfg {
	probeSpacing: number
	probeResolution: number
	maxProbes: number
	bounces: number
	intensity: number
	lightmapResolution: number
}

export const DEFAULT_GI_CFG: GICfg = {
	probeSpacing: 4.0,
	probeResolution: 32,
	maxProbes: 64,
	bounces: 2,
	intensity: 1.0,
	lightmapResolution: 512
}

export class GISystem {
	gl: WebGL2RenderingContext
	cfg: GICfg
	probes: Map<string, GIProbe>
	brdfLUT: WebGLTexture | null
	lightmaps: Map<string, WebGLTexture>
	nextProbeId: number

	constructor(gl: WebGL2RenderingContext, cfg: Partial<GICfg> = {}) {
		this.gl = gl
		this.cfg = { ...DEFAULT_GI_CFG, ...cfg }
		this.probes = new Map()
		this.brdfLUT = null
		this.lightmaps = new Map()
		this.nextProbeId = 0
	}

	generateBRDFLUT(size: number = 512): WebGLTexture | null {
		const { gl } = this
		const tex = gl.createTexture()
		if (!tex) return null
		gl.bindTexture(gl.TEXTURE_2D, tex)
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG16F, size, size, 0, gl.RG, gl.FLOAT, null)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
		this.brdfLUT = tex
		return tex
	}

	createProbe(position: { x: number, y: number, z: number }, radius: number = 10): GIProbe {
		const id = `probe_${this.nextProbeId++}`
		const probe: GIProbe = {
			id,
			position: { ...position },
			radius,
			irradianceMap: null,
			prefilterMap: null,
			resolution: this.cfg.probeResolution
		}
		this.probes.set(id, probe)
		return probe
	}

	removeProbe(id: string) {
		const probe = this.probes.get(id)
		if (probe) {
			if (probe.irradianceMap) this.gl.deleteTexture(probe.irradianceMap)
			if (probe.prefilterMap) this.gl.deleteTexture(probe.prefilterMap)
			this.probes.delete(id)
		}
	}

	createCubemap(size: number): WebGLTexture | null {
		const { gl } = this
		const tex = gl.createTexture()
		if (!tex) return null
		gl.bindTexture(gl.TEXTURE_CUBE_MAP, tex)
		for (let i = 0; i < 6; i++) {
			gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, gl.RGBA16F, size, size, 0, gl.RGBA, gl.FLOAT, null)
		}
		gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
		gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
		gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE)
		gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
		gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
		return tex
	}

	createLightmap(id: string, width: number, height: number): WebGLTexture | null {
		const { gl } = this
		const tex = gl.createTexture()
		if (!tex) return null
		gl.bindTexture(gl.TEXTURE_2D, tex)
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, width, height, 0, gl.RGBA, gl.FLOAT, null)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
		this.lightmaps.set(id, tex)
		return tex
	}

	getLightmap(id: string): WebGLTexture | null {
		return this.lightmaps.get(id) ?? null
	}

	removeLightmap(id: string) {
		const tex = this.lightmaps.get(id)
		if (tex) {
			this.gl.deleteTexture(tex)
			this.lightmaps.delete(id)
		}
	}

	findNearestProbes(position: { x: number, y: number, z: number }, count: number = 4): GIProbe[] {
		const probes = Array.from(this.probes.values())
		probes.sort((a, b) => {
			const da = this.distSq(position, a.position)
			const db = this.distSq(position, b.position)
			return da - db
		})
		return probes.slice(0, count)
	}

	private distSq(a: { x: number, y: number, z: number }, b: { x: number, y: number, z: number }): number {
		const dx = a.x - b.x
		const dy = a.y - b.y
		const dz = a.z - b.z
		return dx * dx + dy * dy + dz * dz
	}

	calProbeWeights(position: { x: number, y: number, z: number }, probes: GIProbe[]): number[] {
		const weights: number[] = []
		let totalWeight = 0
		for (const probe of probes) {
			const d = Math.sqrt(this.distSq(position, probe.position))
			const w = Math.max(0, 1 - d / probe.radius)
			weights.push(w)
			totalWeight += w
		}
		if (totalWeight > 0) {
			for (let i = 0; i < weights.length; i++) {
				weights[i] /= totalWeight
			}
		}
		return weights
	}

	getProbe(id: string): GIProbe | null {
		return this.probes.get(id) ?? null
	}

	getAllProbes(): GIProbe[] {
		return Array.from(this.probes.values())
	}

	getBRDFLUT(): WebGLTexture | null {
		return this.brdfLUT
	}

	dispose() {
		for (const probe of this.probes.values()) {
			if (probe.irradianceMap) this.gl.deleteTexture(probe.irradianceMap)
			if (probe.prefilterMap) this.gl.deleteTexture(probe.prefilterMap)
		}
		this.probes.clear()
		if (this.brdfLUT) {
			this.gl.deleteTexture(this.brdfLUT)
			this.brdfLUT = null
		}
		for (const tex of this.lightmaps.values()) {
			this.gl.deleteTexture(tex)
		}
		this.lightmaps.clear()
	}
}
