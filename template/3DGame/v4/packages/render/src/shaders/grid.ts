export const gridVS = `#version 300 es
precision highp float;

in vec3 aPos;

uniform mat4 uViewProj;

out vec3 vPos;

void main() {
	vPos = aPos;
	gl_Position = uViewProj * vec4(aPos, 1.0);
}
`

export const gridFS = `#version 300 es
precision highp float;

in vec3 vPos;

uniform vec4 uColor;
uniform float uFadeStart;
uniform float uFadeEnd;

out vec4 fragColor;

void main() {
	float dist = length(vPos.xy);
	float fade = 1.0 - smoothstep(uFadeStart, uFadeEnd, dist);
	fragColor = vec4(uColor.rgb, uColor.a * fade);
}
`

export const axisVS = `#version 300 es
precision highp float;

in vec3 aPos;
in vec3 aClr;

uniform mat4 uViewProj;

out vec3 vClr;

void main() {
	vClr = aClr;
	gl_Position = uViewProj * vec4(aPos, 1.0);
}
`

export const axisFS = `#version 300 es
precision highp float;

in vec3 vClr;

out vec4 fragColor;

void main() {
	fragColor = vec4(vClr, 1.0);
}
`

export function buildGridVerts(size: number, step: number): Float32Array {
	const lines: number[] = []
	const half = size / 2
	for (let i = -half; i <= half; i += step) {
		lines.push(i, -half, 0, i, half, 0)
		lines.push(-half, i, 0, half, i, 0)
	}
	return new Float32Array(lines)
}

export function buildAxisVerts(len: number): Float32Array {
	return new Float32Array([
		0, 0, 0, 1, 0, 0,
		len, 0, 0, 1, 0, 0,
		0, 0, 0, 0, 1, 0,
		0, len, 0, 0, 1, 0,
		0, 0, 0, 0, 0, 1,
		0, 0, len, 0, 0, 1
	])
}
