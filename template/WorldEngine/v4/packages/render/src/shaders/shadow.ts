export const shadowDepthVS = `#version 300 es
precision highp float;

in vec3 aPos;

uniform mat4 uLitMtx;
uniform mat4 uModel;

void main() {
	gl_Position = uLitMtx * uModel * vec4(aPos, 1.0);
}
`

export const shadowDepthFS = `#version 300 es
precision highp float;

void main() {
}
`

export const SHADOW_VERTEX_SIZE = 3
export const SHADOW_STRIDE = SHADOW_VERTEX_SIZE * 4

export function shadowVertexLayout(gl: WebGL2RenderingContext) {
	return [
		{ name: 'aPos', size: 3, type: gl.FLOAT, normalized: false, offset: 0 }
	]
}

export const shadowCalcGLSL = `
float calShadow(sampler2DShadow shadowMap, vec4 fragPosLit, float bias) {
	vec3 projCoords = fragPosLit.xyz / fragPosLit.w * 0.5 + 0.5;
	if (projCoords.z > 1.0 || projCoords.x < 0.0 || projCoords.x > 1.0 || projCoords.y < 0.0 || projCoords.y > 1.0) {
		return 0.0;
	}
	float shadow = 0.0;
	vec2 texelSize = 1.0 / vec2(textureSize(shadowMap, 0));
	for (int x = -1; x <= 1; ++x) {
		for (int y = -1; y <= 1; ++y) {
			vec3 sampleCoord = vec3(projCoords.xy + vec2(x, y) * texelSize, projCoords.z - bias);
			shadow += texture(shadowMap, sampleCoord);
		}
	}
	return 1.0 - shadow / 9.0;
}
`
