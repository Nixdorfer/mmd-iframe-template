export class Framebuffer {
	gl: WebGL2RenderingContext
	fbo: WebGLFramebuffer
	w: number
	h: number

	constructor(gl: WebGL2RenderingContext) {
		this.gl = gl
		this.fbo = gl.createFramebuffer()!
		this.w = 0
		this.h = 0
	}

	bind() {
		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fbo)
		this.gl.viewport(0, 0, this.w, this.h)
	}

	unbind() {
		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null)
	}

	dispose() {
		this.gl.deleteFramebuffer(this.fbo)
	}
}

export class ShadowMap extends Framebuffer {
	depthTex: WebGLTexture
	litMtx: Float32Array

	constructor(gl: WebGL2RenderingContext, res: number = 2048) {
		super(gl)
		this.w = res
		this.h = res
		this.litMtx = new Float32Array(16)
		this.depthTex = this.createDepthTex()
		this.attach()
	}

	private createDepthTex(): WebGLTexture {
		const { gl, w, h } = this
		const tex = gl.createTexture()!
		gl.bindTexture(gl.TEXTURE_2D, tex)
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, w, h, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL)
		gl.bindTexture(gl.TEXTURE_2D, null)
		return tex
	}

	private attach() {
		const { gl, fbo, depthTex } = this
		gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTex, 0)
		gl.drawBuffers([gl.NONE])
		gl.readBuffer(gl.NONE)
		gl.bindFramebuffer(gl.FRAMEBUFFER, null)
	}

	resize(res: number) {
		if (this.w === res) return
		const { gl } = this
		this.w = res
		this.h = res
		gl.bindTexture(gl.TEXTURE_2D, this.depthTex)
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, res, res, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null)
		gl.bindTexture(gl.TEXTURE_2D, null)
	}

	bindTex(unit: number = 0) {
		const { gl, depthTex } = this
		gl.activeTexture(gl.TEXTURE0 + unit)
		gl.bindTexture(gl.TEXTURE_2D, depthTex)
	}

	setLitMtx(mtx: Float32Array | number[]) {
		for (let i = 0; i < 16; i++) {
			this.litMtx[i] = mtx[i]
		}
	}

	dispose() {
		this.gl.deleteTexture(this.depthTex)
		super.dispose()
	}
}

export class RenderTarget extends Framebuffer {
	colorTex: WebGLTexture
	depthTex: WebGLTexture | null

	constructor(gl: WebGL2RenderingContext, w: number, h: number, withDepth: boolean = true) {
		super(gl)
		this.w = w
		this.h = h
		this.colorTex = this.createColorTex()
		this.depthTex = withDepth ? this.createDepthTex() : null
		this.attach()
	}

	private createColorTex(): WebGLTexture {
		const { gl, w, h } = this
		const tex = gl.createTexture()!
		gl.bindTexture(gl.TEXTURE_2D, tex)
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
		gl.bindTexture(gl.TEXTURE_2D, null)
		return tex
	}

	private createDepthTex(): WebGLTexture {
		const { gl, w, h } = this
		const tex = gl.createTexture()!
		gl.bindTexture(gl.TEXTURE_2D, tex)
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, w, h, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
		gl.bindTexture(gl.TEXTURE_2D, null)
		return tex
	}

	private attach() {
		const { gl, fbo, colorTex, depthTex } = this
		gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, colorTex, 0)
		if (depthTex) {
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTex, 0)
		}
		gl.drawBuffers([gl.COLOR_ATTACHMENT0])
		gl.bindFramebuffer(gl.FRAMEBUFFER, null)
	}

	resize(w: number, h: number) {
		if (this.w === w && this.h === h) return
		const { gl } = this
		this.w = w
		this.h = h
		gl.bindTexture(gl.TEXTURE_2D, this.colorTex)
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null)
		if (this.depthTex) {
			gl.bindTexture(gl.TEXTURE_2D, this.depthTex)
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, w, h, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null)
		}
		gl.bindTexture(gl.TEXTURE_2D, null)
	}

	bindColorTex(unit: number = 0) {
		const { gl, colorTex } = this
		gl.activeTexture(gl.TEXTURE0 + unit)
		gl.bindTexture(gl.TEXTURE_2D, colorTex)
	}

	dispose() {
		this.gl.deleteTexture(this.colorTex)
		if (this.depthTex) this.gl.deleteTexture(this.depthTex)
		super.dispose()
	}
}
