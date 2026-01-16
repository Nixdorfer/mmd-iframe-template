import { Framebuffer } from './fbo'

export interface GBufferTextures {
	albedo: WebGLTexture
	normal: WebGLTexture
	position: WebGLTexture
	material: WebGLTexture
	depth: WebGLTexture
}

export class GBuffer extends Framebuffer {
	textures: GBufferTextures

	constructor(gl: WebGL2RenderingContext, w: number, h: number) {
		super(gl)
		this.w = w
		this.h = h
		this.textures = this.createTextures()
		this.attach()
	}

	private createTextures(): GBufferTextures {
		const { gl, w, h } = this
		const createTex = (internalFormat: number, format: number, type: number): WebGLTexture => {
			const tex = gl.createTexture()!
			gl.bindTexture(gl.TEXTURE_2D, tex)
			gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null)
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
			return tex
		}
		const albedo = createTex(gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT)
		const normal = createTex(gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT)
		const position = createTex(gl.RGBA32F, gl.RGBA, gl.FLOAT)
		const material = createTex(gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE)
		const depth = gl.createTexture()!
		gl.bindTexture(gl.TEXTURE_2D, depth)
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, w, h, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
		gl.bindTexture(gl.TEXTURE_2D, null)
		return { albedo, normal, position, material, depth }
	}

	private attach() {
		const { gl, fbo, textures } = this
		gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, textures.albedo, 0)
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, textures.normal, 0)
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT2, gl.TEXTURE_2D, textures.position, 0)
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT3, gl.TEXTURE_2D, textures.material, 0)
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, textures.depth, 0)
		gl.drawBuffers([
			gl.COLOR_ATTACHMENT0,
			gl.COLOR_ATTACHMENT1,
			gl.COLOR_ATTACHMENT2,
			gl.COLOR_ATTACHMENT3
		])
		const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER)
		if (status !== gl.FRAMEBUFFER_COMPLETE) {
			console.error('GBuffer framebuffer incomplete:', status)
		}
		gl.bindFramebuffer(gl.FRAMEBUFFER, null)
	}

	resize(w: number, h: number) {
		if (this.w === w && this.h === h) return
		const { gl, textures } = this
		this.w = w
		this.h = h
		gl.bindTexture(gl.TEXTURE_2D, textures.albedo)
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null)
		gl.bindTexture(gl.TEXTURE_2D, textures.normal)
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null)
		gl.bindTexture(gl.TEXTURE_2D, textures.position)
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, w, h, 0, gl.RGBA, gl.FLOAT, null)
		gl.bindTexture(gl.TEXTURE_2D, textures.material)
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
		gl.bindTexture(gl.TEXTURE_2D, textures.depth)
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, w, h, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null)
		gl.bindTexture(gl.TEXTURE_2D, null)
	}

	bindTextures(startUnit: number = 0) {
		const { gl, textures } = this
		gl.activeTexture(gl.TEXTURE0 + startUnit)
		gl.bindTexture(gl.TEXTURE_2D, textures.albedo)
		gl.activeTexture(gl.TEXTURE0 + startUnit + 1)
		gl.bindTexture(gl.TEXTURE_2D, textures.normal)
		gl.activeTexture(gl.TEXTURE0 + startUnit + 2)
		gl.bindTexture(gl.TEXTURE_2D, textures.position)
		gl.activeTexture(gl.TEXTURE0 + startUnit + 3)
		gl.bindTexture(gl.TEXTURE_2D, textures.material)
	}

	bindDepthTex(unit: number) {
		const { gl, textures } = this
		gl.activeTexture(gl.TEXTURE0 + unit)
		gl.bindTexture(gl.TEXTURE_2D, textures.depth)
	}

	dispose() {
		const { gl, textures } = this
		gl.deleteTexture(textures.albedo)
		gl.deleteTexture(textures.normal)
		gl.deleteTexture(textures.position)
		gl.deleteTexture(textures.material)
		gl.deleteTexture(textures.depth)
		super.dispose()
	}
}
