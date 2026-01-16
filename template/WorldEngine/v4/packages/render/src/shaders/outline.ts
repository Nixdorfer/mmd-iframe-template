export const outlineVS = `#version 300 es
precision highp float;

in vec3 aPos;
in vec3 aNom;

uniform mat4 uViewProj;
uniform mat4 uModel;
uniform float uOutlineWidth;

void main() {
	vec3 nom = normalize(mat3(uModel) * aNom);
	vec4 worldPos = uModel * vec4(aPos, 1.0);
	worldPos.xyz += nom * uOutlineWidth;
	gl_Position = uViewProj * worldPos;
}
`

export const outlineFS = `#version 300 es
precision highp float;

uniform vec3 uOutlineClr;

out vec4 fragColor;

void main() {
	fragColor = vec4(uOutlineClr, 1.0);
}
`

export const OUTLINE_VERTEX_SIZE = 6
export const OUTLINE_STRIDE = OUTLINE_VERTEX_SIZE * 4

export function outlineVertexLayout(gl: WebGL2RenderingContext) {
	return [
		{ name: 'aPos', size: 3, type: gl.FLOAT, normalized: false, offset: 0 },
		{ name: 'aNom', size: 3, type: gl.FLOAT, normalized: false, offset: 12 }
	]
}
