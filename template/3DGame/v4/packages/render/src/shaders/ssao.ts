export const ssaoFS = `#version 300 es
precision highp float;

in vec2 vUV;

uniform sampler2D uDepthTex;
uniform sampler2D uNoiseTex;
uniform mat4 uProj;
uniform mat4 uInvProj;
uniform vec3 uSamples[64];
uniform float uRadius;
uniform float uBias;
uniform float uIntensity;
uniform vec2 uNoiseScale;

out vec4 fragColor;

vec3 reconstructPos(vec2 uv, float depth) {
	vec4 clipPos = vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
	vec4 viewPos = uInvProj * clipPos;
	return viewPos.xyz / viewPos.w;
}

vec3 reconstructNormal(vec3 pos) {
	vec3 dx = dFdx(pos);
	vec3 dy = dFdy(pos);
	return normalize(cross(dy, dx));
}

void main() {
	float depth = texture(uDepthTex, vUV).r;
	if (depth >= 1.0) {
		fragColor = vec4(1.0);
		return;
	}
	vec3 fragPos = reconstructPos(vUV, depth);
	vec3 normal = reconstructNormal(fragPos);
	vec3 randomVec = normalize(texture(uNoiseTex, vUV * uNoiseScale).xyz * 2.0 - 1.0);
	vec3 tangent = normalize(randomVec - normal * dot(randomVec, normal));
	vec3 bitangent = cross(normal, tangent);
	mat3 TBN = mat3(tangent, bitangent, normal);
	float occlusion = 0.0;
	for (int i = 0; i < 64; i++) {
		vec3 samplePos = TBN * uSamples[i];
		samplePos = fragPos + samplePos * uRadius;
		vec4 offset = uProj * vec4(samplePos, 1.0);
		offset.xyz /= offset.w;
		offset.xyz = offset.xyz * 0.5 + 0.5;
		float sampleDepth = texture(uDepthTex, offset.xy).r;
		vec3 sampleViewPos = reconstructPos(offset.xy, sampleDepth);
		float rangeCheck = smoothstep(0.0, 1.0, uRadius / abs(fragPos.z - sampleViewPos.z));
		occlusion += (sampleViewPos.z >= samplePos.z + uBias ? 1.0 : 0.0) * rangeCheck;
	}
	occlusion = 1.0 - (occlusion / 64.0) * uIntensity;
	fragColor = vec4(vec3(occlusion), 1.0);
}
`

export const ssaoBlurFS = `#version 300 es
precision highp float;

in vec2 vUV;

uniform sampler2D uSsaoTex;
uniform vec2 uTexelSize;

out vec4 fragColor;

void main() {
	float result = 0.0;
	for (int x = -2; x <= 2; x++) {
		for (int y = -2; y <= 2; y++) {
			vec2 offset = vec2(float(x), float(y)) * uTexelSize;
			result += texture(uSsaoTex, vUV + offset).r;
		}
	}
	fragColor = vec4(vec3(result / 25.0), 1.0);
}
`

export const ssaoApplyFS = `#version 300 es
precision highp float;

in vec2 vUV;

uniform sampler2D uSrcTex;
uniform sampler2D uSsaoTex;

out vec4 fragColor;

void main() {
	vec3 color = texture(uSrcTex, vUV).rgb;
	float ao = texture(uSsaoTex, vUV).r;
	fragColor = vec4(color * ao, 1.0);
}
`

export function genSsaoKernel(): Float32Array {
	const kernel = new Float32Array(64 * 3)
	for (let i = 0; i < 64; i++) {
		let x = Math.random() * 2.0 - 1.0
		let y = Math.random() * 2.0 - 1.0
		let z = Math.random()
		const len = Math.sqrt(x * x + y * y + z * z)
		x /= len
		y /= len
		z /= len
		let scale = i / 64.0
		scale = 0.1 + scale * scale * 0.9
		kernel[i * 3] = x * scale
		kernel[i * 3 + 1] = y * scale
		kernel[i * 3 + 2] = z * scale
	}
	return kernel
}

export function genSsaoNoise(): Uint8Array {
	const noise = new Uint8Array(16 * 16 * 3)
	for (let i = 0; i < 16 * 16; i++) {
		noise[i * 3] = Math.floor((Math.random() * 2.0 - 1.0) * 127 + 128)
		noise[i * 3 + 1] = Math.floor((Math.random() * 2.0 - 1.0) * 127 + 128)
		noise[i * 3 + 2] = 0
	}
	return noise
}
