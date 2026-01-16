const SHADERS = {
	terrain: {
		vertex: `#version 300 es
precision highp float;
layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_normal;
layout(location = 2) in vec2 a_uv;
layout(location = 3) in vec3 a_color;
layout(location = 4) in float a_ao;
uniform mat4 u_projection;
uniform mat4 u_view;
out vec3 v_position;
out vec3 v_normal;
out vec2 v_uv;
out vec3 v_color;
out float v_ao;
out float v_depth;
void main() {
	vec4 worldPos = vec4(a_position, 1.0);
	vec4 viewPos = u_view * worldPos;
	v_position = a_position;
	v_normal = a_normal;
	v_uv = a_uv;
	v_color = a_color;
	v_ao = a_ao;
	v_depth = -viewPos.z;
	gl_Position = u_projection * viewPos;
}`,
		fragment: `#version 300 es
precision highp float;
in vec3 v_position;
in vec3 v_normal;
in vec2 v_uv;
in vec3 v_color;
in float v_ao;
in float v_depth;
uniform sampler2D u_texture;
uniform bool u_useTexture;
uniform vec3 u_ambientColor;
uniform float u_ambientIntensity;
uniform vec3 u_lightDir;
uniform vec3 u_lightColor;
uniform float u_lightIntensity;
uniform vec3 u_fogColor;
uniform float u_fogStart;
uniform float u_fogEnd;
out vec4 fragColor;
void main() {
	vec3 baseColor = u_useTexture ? texture(u_texture, v_uv).rgb : v_color;
	vec3 normal = normalize(v_normal);
	vec3 ambient = baseColor * u_ambientColor * u_ambientIntensity;
	float diff = max(dot(normal, -u_lightDir), 0.0);
	vec3 diffuse = baseColor * u_lightColor * u_lightIntensity * diff;
	vec3 litColor = ambient + diffuse;
	litColor *= (1.0 - v_ao * 0.4);
	float fog = clamp((v_depth - u_fogStart) / (u_fogEnd - u_fogStart), 0.0, 1.0) * 0.5;
	vec3 finalColor = mix(litColor, u_fogColor, fog);
	fragColor = vec4(finalColor, 1.0);
}`
	},
	grid: {
		vertex: `#version 300 es
precision highp float;
layout(location = 0) in vec3 a_position;
uniform mat4 u_projection;
uniform mat4 u_view;
void main() {
	gl_Position = u_projection * u_view * vec4(a_position, 1.0);
}`,
		fragment: `#version 300 es
precision highp float;
uniform vec4 u_color;
out vec4 fragColor;
void main() {
	fragColor = u_color;
}`
	},
	entity: {
		vertex: `#version 300 es
precision highp float;
layout(location = 0) in vec3 a_position;
layout(location = 1) in vec2 a_uv;
uniform mat4 u_projection;
uniform mat4 u_view;
uniform vec3 u_entityPos;
uniform float u_entityScale;
uniform bool u_billboard;
out vec2 v_uv;
out float v_depth;
void main() {
	vec3 pos = a_position * u_entityScale;
	if (u_billboard) {
		vec3 right = vec3(u_view[0][0], u_view[1][0], u_view[2][0]);
		vec3 up = vec3(0.0, 0.0, 1.0);
		pos = right * pos.x + up * pos.z;
	}
	vec4 worldPos = vec4(pos + u_entityPos, 1.0);
	vec4 viewPos = u_view * worldPos;
	v_depth = -viewPos.z;
	v_uv = a_uv;
	gl_Position = u_projection * viewPos;
}`,
		fragment: `#version 300 es
precision highp float;
in vec2 v_uv;
in float v_depth;
uniform sampler2D u_texture;
uniform vec3 u_color;
uniform bool u_useTexture;
uniform float u_alpha;
out vec4 fragColor;
void main() {
	if (u_useTexture) {
		vec4 tex = texture(u_texture, v_uv);
		if (tex.a < 0.1) discard;
		fragColor = vec4(tex.rgb, tex.a * u_alpha);
	} else {
		fragColor = vec4(u_color, u_alpha);
	}
}`
	},
	ui: {
		vertex: `#version 300 es
precision highp float;
layout(location = 0) in vec2 a_position;
layout(location = 1) in vec2 a_uv;
uniform vec2 u_resolution;
out vec2 v_uv;
void main() {
	vec2 pos = (a_position / u_resolution) * 2.0 - 1.0;
	pos.y = -pos.y;
	gl_Position = vec4(pos, 0.0, 1.0);
	v_uv = a_uv;
}`,
		fragment: `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_texture;
out vec4 fragColor;
void main() {
	fragColor = texture(u_texture, v_uv);
}`
	},
	silhouette: {
		vertex: `#version 300 es
precision highp float;
layout(location = 0) in vec3 a_position;
uniform mat4 u_projection;
uniform mat4 u_view;
out float v_depth;
void main() {
	vec4 viewPos = u_view * vec4(a_position, 1.0);
	v_depth = -viewPos.z;
	gl_Position = u_projection * viewPos;
}`,
		fragment: `#version 300 es
precision highp float;
in float v_depth;
uniform vec3 u_silhouetteColor;
uniform float u_alpha;
uniform float u_fogStart;
uniform float u_fogEnd;
out vec4 fragColor;
void main() {
	float fog = clamp((v_depth - u_fogStart) / (u_fogEnd - u_fogStart), 0.0, 1.0) * 0.3;
	float alpha = u_alpha * (1.0 - fog);
	fragColor = vec4(u_silhouetteColor, alpha);
}`
	},
	wall: {
		vertex: `#version 300 es
precision highp float;
layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_normal;
layout(location = 2) in vec2 a_uv;
uniform mat4 u_projection;
uniform mat4 u_view;
out vec3 v_normal;
out vec2 v_uv;
out float v_depth;
void main() {
	vec4 viewPos = u_view * vec4(a_position, 1.0);
	v_normal = a_normal;
	v_uv = a_uv;
	v_depth = -viewPos.z;
	gl_Position = u_projection * viewPos;
}`,
		fragment: `#version 300 es
precision highp float;
in vec3 v_normal;
in vec2 v_uv;
in float v_depth;
uniform sampler2D u_texture;
uniform vec3 u_color;
uniform bool u_useTexture;
uniform vec3 u_lightDir;
uniform vec3 u_lightColor;
uniform float u_lightIntensity;
uniform vec3 u_ambientColor;
uniform float u_ambientIntensity;
out vec4 fragColor;
void main() {
	vec3 baseColor = u_useTexture ? texture(u_texture, v_uv).rgb : u_color;
	vec3 normal = normalize(v_normal);
	vec3 ambient = baseColor * u_ambientColor * u_ambientIntensity;
	float diff = max(dot(normal, -u_lightDir), 0.0);
	vec3 diffuse = baseColor * u_lightColor * u_lightIntensity * diff;
	fragColor = vec4(ambient + diffuse, 1.0);
}`
	}
}
class ShaderManager {
	constructor(gl) {
		this.gl = gl
		this.programs = new Map()
	}
	compile(name, vertSrc, fragSrc) {
		const gl = this.gl
		const vert = gl.createShader(gl.VERTEX_SHADER)
		gl.shaderSource(vert, vertSrc)
		gl.compileShader(vert)
		if (!gl.getShaderParameter(vert, gl.COMPILE_STATUS)) {
			console.error('Vertex shader error:', gl.getShaderInfoLog(vert))
			return null
		}
		const frag = gl.createShader(gl.FRAGMENT_SHADER)
		gl.shaderSource(frag, fragSrc)
		gl.compileShader(frag)
		if (!gl.getShaderParameter(frag, gl.COMPILE_STATUS)) {
			console.error('Fragment shader error:', gl.getShaderInfoLog(frag))
			return null
		}
		const program = gl.createProgram()
		gl.attachShader(program, vert)
		gl.attachShader(program, frag)
		gl.linkProgram(program)
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			console.error('Program link error:', gl.getProgramInfoLog(program))
			return null
		}
		gl.deleteShader(vert)
		gl.deleteShader(frag)
		this.programs.set(name, program)
		return program
	}
	use(name) {
		const program = this.programs.get(name)
		if (program) this.gl.useProgram(program)
		return program
	}
	get(name) {
		return this.programs.get(name)
	}
	getUniformLocation(name, uniform) {
		const program = this.programs.get(name)
		return program ? this.gl.getUniformLocation(program, uniform) : null
	}
	initAll() {
		for (const [name, shader] of Object.entries(SHADERS)) {
			this.compile(name, shader.vertex, shader.fragment)
		}
	}
}
