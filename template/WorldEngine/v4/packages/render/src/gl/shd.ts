export class Shader {
	gl: WebGL2RenderingContext
	prg: WebGLProgram
	uniforms: Map<string, WebGLUniformLocation>
	attrs: Map<string, number>

	constructor(gl: WebGL2RenderingContext, vsSrc: string, fsSrc: string) {
		this.gl = gl
		this.uniforms = new Map()
		this.attrs = new Map()
		const vs = this.compile(gl.VERTEX_SHADER, vsSrc)
		const fs = this.compile(gl.FRAGMENT_SHADER, fsSrc)
		this.prg = this.link(vs, fs)
		gl.deleteShader(vs)
		gl.deleteShader(fs)
		this.cacheUniforms()
		this.cacheAttrs()
	}

	private compile(typ: number, src: string): WebGLShader {
		const { gl } = this
		const shd = gl.createShader(typ)!
		gl.shaderSource(shd, src)
		gl.compileShader(shd)
		if (!gl.getShaderParameter(shd, gl.COMPILE_STATUS)) {
			const info = gl.getShaderInfoLog(shd)
			gl.deleteShader(shd)
			throw new Error(`Shader compile error: ${info}`)
		}
		return shd
	}

	private link(vs: WebGLShader, fs: WebGLShader): WebGLProgram {
		const { gl } = this
		const prg = gl.createProgram()!
		gl.attachShader(prg, vs)
		gl.attachShader(prg, fs)
		gl.linkProgram(prg)
		if (!gl.getProgramParameter(prg, gl.LINK_STATUS)) {
			const info = gl.getProgramInfoLog(prg)
			gl.deleteProgram(prg)
			throw new Error(`Program link error: ${info}`)
		}
		return prg
	}

	private cacheUniforms() {
		const { gl, prg } = this
		const cnt = gl.getProgramParameter(prg, gl.ACTIVE_UNIFORMS)
		for (let i = 0; i < cnt; i++) {
			const info = gl.getActiveUniform(prg, i)
			if (info) {
				const loc = gl.getUniformLocation(prg, info.name)
				if (loc) this.uniforms.set(info.name, loc)
			}
		}
	}

	private cacheAttrs() {
		const { gl, prg } = this
		const cnt = gl.getProgramParameter(prg, gl.ACTIVE_ATTRIBUTES)
		for (let i = 0; i < cnt; i++) {
			const info = gl.getActiveAttrib(prg, i)
			if (info) {
				const loc = gl.getAttribLocation(prg, info.name)
				if (loc >= 0) this.attrs.set(info.name, loc)
			}
		}
	}

	use() {
		this.gl.useProgram(this.prg)
	}

	setMat4(name: string, data: Float32Array | number[]) {
		const loc = this.uniforms.get(name)
		if (loc) this.gl.uniformMatrix4fv(loc, false, data)
	}

	setVec3(name: string, x: number, y: number, z: number) {
		const loc = this.uniforms.get(name)
		if (loc) this.gl.uniform3f(loc, x, y, z)
	}

	setVec4(name: string, x: number, y: number, z: number, w: number) {
		const loc = this.uniforms.get(name)
		if (loc) this.gl.uniform4f(loc, x, y, z, w)
	}

	setFloat(name: string, v: number) {
		const loc = this.uniforms.get(name)
		if (loc) this.gl.uniform1f(loc, v)
	}

	setInt(name: string, v: number) {
		const loc = this.uniforms.get(name)
		if (loc) this.gl.uniform1i(loc, v)
	}

	setVec2(name: string, x: number, y: number) {
		const loc = this.uniforms.get(name)
		if (loc) this.gl.uniform2f(loc, x, y)
	}

	setMat4Arr(name: string, data: Float32Array, cnt: number) {
		const loc = this.uniforms.get(name)
		if (loc) this.gl.uniformMatrix4fv(loc, false, data.subarray(0, cnt * 16))
	}

	setVec3Arr(name: string, data: Float32Array) {
		const loc = this.uniforms.get(name)
		if (loc) this.gl.uniform3fv(loc, data)
	}

	setFloatArr(name: string, data: Float32Array) {
		const loc = this.uniforms.get(name)
		if (loc) this.gl.uniform1fv(loc, data)
	}

	attr(name: string): number {
		return this.attrs.get(name) ?? -1
	}

	dispose() {
		this.gl.deleteProgram(this.prg)
	}
}

export class ShaderManager {
	gl: WebGL2RenderingContext
	shaders: Map<string, Shader>

	constructor(gl: WebGL2RenderingContext) {
		this.gl = gl
		this.shaders = new Map()
	}

	add(name: string, vsSrc: string, fsSrc: string): Shader {
		const shd = new Shader(this.gl, vsSrc, fsSrc)
		this.shaders.set(name, shd)
		return shd
	}

	get(name: string): Shader | undefined {
		return this.shaders.get(name)
	}

	use(name: string): Shader | undefined {
		const shd = this.shaders.get(name)
		if (shd) shd.use()
		return shd
	}

	dispose() {
		for (const shd of this.shaders.values()) {
			shd.dispose()
		}
		this.shaders.clear()
	}
}
