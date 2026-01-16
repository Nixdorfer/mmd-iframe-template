import { RenderTarget } from './fbo'
import { Shader, ShaderManager } from './shd'
import { VAO } from './buf'
import { type RndCfg } from './rnd-mode'
import { quadVS, copyFS, bloomExtractFS, bloomBlurFS, bloomCompositeFS, tonemapFS } from '../shaders/pp-common'
import { ssaoFS, ssaoBlurFS, ssaoApplyFS, genSsaoKernel, genSsaoNoise } from '../shaders/ssao'

export interface PostEffect {
	name: string
	shader: Shader
	eab: boolean
}

export class PostProcessor {
	gl: WebGL2RenderingContext
	srcRT: RenderTarget
	pingRT: RenderTarget
	pongRT: RenderTarget
	bloomRT: RenderTarget
	ssaoRT: RenderTarget
	ssaoBlurRT: RenderTarget
	quadVao: VAO
	shaders: ShaderManager
	copyShd: Shader
	bloomExtractShd: Shader
	bloomBlurShd: Shader
	bloomCompositeShd: Shader
	tonemapShd: Shader
	ssaoShd: Shader
	ssaoBlurShd: Shader
	ssaoApplyShd: Shader
	ssaoKernel: Float32Array
	ssaoNoiseTex: WebGLTexture
	projMtx: Float32Array
	invProjMtx: Float32Array
	w: number
	h: number

	constructor(gl: WebGL2RenderingContext, w: number, h: number) {
		this.gl = gl
		this.w = w
		this.h = h
		this.srcRT = new RenderTarget(gl, w, h, true)
		this.pingRT = new RenderTarget(gl, w / 2, h / 2, false)
		this.pongRT = new RenderTarget(gl, w / 2, h / 2, false)
		this.bloomRT = new RenderTarget(gl, w / 4, h / 4, false)
		this.ssaoRT = new RenderTarget(gl, w / 2, h / 2, false)
		this.ssaoBlurRT = new RenderTarget(gl, w / 2, h / 2, false)
		this.shaders = new ShaderManager(gl)
		this.quadVao = this.createQuadVao()
		this.copyShd = this.shaders.add('copy', quadVS, copyFS)
		this.bloomExtractShd = this.shaders.add('bloomExtract', quadVS, bloomExtractFS)
		this.bloomBlurShd = this.shaders.add('bloomBlur', quadVS, bloomBlurFS)
		this.bloomCompositeShd = this.shaders.add('bloomComposite', quadVS, bloomCompositeFS)
		this.tonemapShd = this.shaders.add('tonemap', quadVS, tonemapFS)
		this.ssaoShd = this.shaders.add('ssao', quadVS, ssaoFS)
		this.ssaoBlurShd = this.shaders.add('ssaoBlur', quadVS, ssaoBlurFS)
		this.ssaoApplyShd = this.shaders.add('ssaoApply', quadVS, ssaoApplyFS)
		this.ssaoKernel = genSsaoKernel()
		this.ssaoNoiseTex = this.createNoiseTex()
		this.projMtx = new Float32Array(16)
		this.invProjMtx = new Float32Array(16)
		this.setupQuadVao()
	}

	private createNoiseTex(): WebGLTexture {
		const { gl } = this
		const noiseData = genSsaoNoise()
		const tex = gl.createTexture()!
		gl.bindTexture(gl.TEXTURE_2D, tex)
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB8, 16, 16, 0, gl.RGB, gl.UNSIGNED_BYTE, noiseData)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
		gl.bindTexture(gl.TEXTURE_2D, null)
		return tex
	}

	setProjection(proj: Float32Array, invProj: Float32Array) {
		for (let i = 0; i < 16; i++) {
			this.projMtx[i] = proj[i]
			this.invProjMtx[i] = invProj[i]
		}
	}

	private createQuadVao(): VAO {
		const verts = new Float32Array([
			-1, -1, 0, 0,
			 1, -1, 1, 0,
			 1,  1, 1, 1,
			-1,  1, 0, 1
		])
		const indices = new Uint16Array([0, 1, 2, 0, 2, 3])
		const vao = new VAO(this.gl)
		vao.setVerts(verts)
		vao.setIndices(indices)
		vao.setLayout([
			{ name: 'aPos', size: 2, type: this.gl.FLOAT, normalized: false, offset: 0 },
			{ name: 'aUV', size: 2, type: this.gl.FLOAT, normalized: false, offset: 8 }
		], 16)
		return vao
	}

	private setupQuadVao() {
		this.quadVao.setup(name => this.copyShd.attr(name))
	}

	resize(w: number, h: number) {
		if (this.w === w && this.h === h) return
		this.w = w
		this.h = h
		this.srcRT.resize(w, h)
		this.pingRT.resize(w / 2, h / 2)
		this.pongRT.resize(w / 2, h / 2)
		this.bloomRT.resize(w / 4, h / 4)
		this.ssaoRT.resize(w / 2, h / 2)
		this.ssaoBlurRT.resize(w / 2, h / 2)
	}

	beginScene() {
		this.srcRT.bind()
		this.gl.viewport(0, 0, this.w, this.h)
		this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT)
	}

	endScene() {
		this.srcRT.unbind()
	}

	process(cfg: RndCfg) {
		const { gl } = this
		gl.disable(gl.DEPTH_TEST)
		if (cfg.ppEab && cfg.ssaoEab) {
			this.doSsao(cfg)
		}
		if (cfg.ppEab && cfg.bloomEab) {
			this.doBloom(cfg)
		}
		if (cfg.ppEab && cfg.tonemapEab) {
			this.doTonemap(cfg)
		} else {
			this.doCopy()
		}
		gl.enable(gl.DEPTH_TEST)
	}

	private doSsao(cfg: RndCfg) {
		const { gl } = this
		this.ssaoRT.bind()
		gl.viewport(0, 0, this.ssaoRT.w, this.ssaoRT.h)
		this.ssaoShd.use()
		gl.activeTexture(gl.TEXTURE0)
		gl.bindTexture(gl.TEXTURE_2D, this.srcRT.depthTex!)
		this.ssaoShd.setInt('uDepthTex', 0)
		gl.activeTexture(gl.TEXTURE1)
		gl.bindTexture(gl.TEXTURE_2D, this.ssaoNoiseTex)
		this.ssaoShd.setInt('uNoiseTex', 1)
		this.ssaoShd.setMat4('uProj', this.projMtx)
		this.ssaoShd.setMat4('uInvProj', this.invProjMtx)
		this.ssaoShd.setVec3Arr('uSamples[0]', this.ssaoKernel)
		this.ssaoShd.setFloat('uRadius', cfg.ssaoRadius)
		this.ssaoShd.setFloat('uBias', cfg.ssaoBias)
		this.ssaoShd.setFloat('uIntensity', cfg.ssaoIntensity)
		this.ssaoShd.setVec2('uNoiseScale', this.ssaoRT.w / 16, this.ssaoRT.h / 16)
		this.drawQuad()
		this.ssaoRT.unbind()
		this.ssaoBlurRT.bind()
		gl.viewport(0, 0, this.ssaoBlurRT.w, this.ssaoBlurRT.h)
		this.ssaoBlurShd.use()
		this.ssaoRT.bindColorTex(0)
		this.ssaoBlurShd.setInt('uSsaoTex', 0)
		this.ssaoBlurShd.setVec2('uTexelSize', 1.0 / this.ssaoRT.w, 1.0 / this.ssaoRT.h)
		this.drawQuad()
		this.ssaoBlurRT.unbind()
		this.pongRT.bind()
		gl.viewport(0, 0, this.w, this.h)
		this.ssaoApplyShd.use()
		this.srcRT.bindColorTex(0)
		this.ssaoApplyShd.setInt('uSrcTex', 0)
		this.ssaoBlurRT.bindColorTex(1)
		this.ssaoApplyShd.setInt('uSsaoTex', 1)
		this.drawQuad()
		this.pongRT.unbind()
		const tmp = this.srcRT
		this.srcRT = this.pongRT
		this.pongRT = tmp
	}

	private doBloom(cfg: RndCfg) {
		const { gl } = this
		this.pingRT.bind()
		gl.viewport(0, 0, this.pingRT.w, this.pingRT.h)
		this.bloomExtractShd.use()
		this.srcRT.bindColorTex(0)
		this.bloomExtractShd.setInt('uSrcTex', 0)
		this.bloomExtractShd.setFloat('uThreshold', cfg.bloomThreshold)
		this.drawQuad()
		this.pingRT.unbind()
		for (let i = 0; i < 4; i++) {
			this.pongRT.bind()
			gl.viewport(0, 0, this.pongRT.w, this.pongRT.h)
			this.bloomBlurShd.use()
			this.pingRT.bindColorTex(0)
			this.bloomBlurShd.setInt('uSrcTex', 0)
			this.bloomBlurShd.setVec2('uDir', 1.0 / this.pingRT.w, 0)
			this.drawQuad()
			this.pongRT.unbind()
			this.pingRT.bind()
			gl.viewport(0, 0, this.pingRT.w, this.pingRT.h)
			this.bloomBlurShd.use()
			this.pongRT.bindColorTex(0)
			this.bloomBlurShd.setInt('uSrcTex', 0)
			this.bloomBlurShd.setVec2('uDir', 0, 1.0 / this.pongRT.h)
			this.drawQuad()
			this.pingRT.unbind()
		}
		this.pongRT.bind()
		gl.viewport(0, 0, this.w, this.h)
		this.bloomCompositeShd.use()
		this.srcRT.bindColorTex(0)
		this.bloomCompositeShd.setInt('uSrcTex', 0)
		this.pingRT.bindColorTex(1)
		this.bloomCompositeShd.setInt('uBloomTex', 1)
		this.bloomCompositeShd.setFloat('uBloomIntensity', cfg.bloomIntensity)
		this.drawQuad()
		this.pongRT.unbind()
		const tmp = this.srcRT
		this.srcRT = this.pongRT
		this.pongRT = tmp
	}

	private doTonemap(cfg: RndCfg) {
		const { gl } = this
		gl.bindFramebuffer(gl.FRAMEBUFFER, null)
		gl.viewport(0, 0, this.w, this.h)
		this.tonemapShd.use()
		this.srcRT.bindColorTex(0)
		this.tonemapShd.setInt('uSrcTex', 0)
		this.tonemapShd.setFloat('uExposure', cfg.tonemapExposure)
		this.tonemapShd.setFloat('uGamma', cfg.tonemapGamma)
		this.drawQuad()
	}

	private doCopy() {
		const { gl } = this
		gl.bindFramebuffer(gl.FRAMEBUFFER, null)
		gl.viewport(0, 0, this.w, this.h)
		this.copyShd.use()
		this.srcRT.bindColorTex(0)
		this.copyShd.setInt('uSrcTex', 0)
		this.drawQuad()
	}

	private drawQuad() {
		this.quadVao.bind()
		this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_SHORT, 0)
		this.quadVao.unbind()
	}

	dispose() {
		this.srcRT.dispose()
		this.pingRT.dispose()
		this.pongRT.dispose()
		this.bloomRT.dispose()
		this.ssaoRT.dispose()
		this.ssaoBlurRT.dispose()
		this.gl.deleteTexture(this.ssaoNoiseTex)
		this.quadVao.dispose()
		this.shaders.dispose()
	}
}
