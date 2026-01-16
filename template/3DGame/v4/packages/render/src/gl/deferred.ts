import { GLContext } from './context'
import { GBuffer } from './gbuffer'
import { RenderTarget, ShadowMap } from './fbo'
import { Shader, ShaderManager } from './shd'
import { VAO } from './buf'
import { type LitManager } from './lit'
import { type RndCfg } from './rnd-mode'
import { gbufferVS, gbufferFS, deferredLitVS, deferredLitFS } from '../shaders/deferred'

export interface DeferredCfg {
	eab: boolean
	ssaoEab: boolean
}

export function defDeferredCfg(): DeferredCfg {
	return {
		eab: false,
		ssaoEab: true
	}
}

export class DeferredRenderer {
	ctx: GLContext
	cfg: DeferredCfg
	gbuffer: GBuffer | null
	litRT: RenderTarget | null
	gbufferShd: Shader | null
	litShd: Shader | null
	quadVAO: VAO | null
	w: number
	h: number

	constructor(ctx: GLContext, cfg?: Partial<DeferredCfg>) {
		this.ctx = ctx
		this.cfg = { ...defDeferredCfg(), ...cfg }
		this.gbuffer = null
		this.litRT = null
		this.gbufferShd = null
		this.litShd = null
		this.quadVAO = null
		this.w = 0
		this.h = 0
	}

	ini(w: number, h: number) {
		this.w = w
		this.h = h
		const { gl } = this.ctx
		this.gbuffer = new GBuffer(gl, w, h)
		this.litRT = new RenderTarget(gl, w, h, false)
		const shdMgr = new ShaderManager(gl)
		this.gbufferShd = shdMgr.add('gbuffer', gbufferVS, gbufferFS)
		this.litShd = shdMgr.add('deferred_lit', deferredLitVS, deferredLitFS)
		this.quadVAO = new VAO(gl)
		const quadVerts = new Float32Array([
			-1, -1,
			 1, -1,
			 1,  1,
			-1,  1
		])
		const quadIndices = new Uint16Array([0, 1, 2, 0, 2, 3])
		this.quadVAO.setVerts(quadVerts)
		this.quadVAO.setIndices(quadIndices)
		this.quadVAO.setLayout([
			{ name: 'aPos', size: 2, type: gl.FLOAT, normalized: false, offset: 0 }
		], 8)
		this.quadVAO.setup(name => this.litShd!.attr(name))
	}

	resize(w: number, h: number) {
		if (this.w === w && this.h === h) return
		this.w = w
		this.h = h
		this.gbuffer?.resize(w, h)
		this.litRT?.resize(w, h)
	}

	beginGBuffer() {
		if (!this.gbuffer) return
		const { gl } = this.ctx
		this.gbuffer.bind()
		gl.clearColor(0, 0, 0, 0)
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
		gl.enable(gl.DEPTH_TEST)
		gl.depthFunc(gl.LESS)
	}

	endGBuffer() {
		this.gbuffer?.unbind()
	}

	getGBufferShader(): Shader | null {
		return this.gbufferShd
	}

	litPass(
		camPos: [number, number, number],
		ambient: [number, number, number],
		sunDir: [number, number, number],
		sunClr: [number, number, number],
		litMgr: LitManager | null,
		shadowMap: ShadowMap | null,
		litMtx: Float32Array | null,
		rndCfg: RndCfg,
		ssaoTex: WebGLTexture | null = null
	) {
		if (!this.gbuffer || !this.litShd || !this.quadVAO || !this.litRT) return
		const { gl } = this.ctx
		this.litRT.bind()
		gl.clearColor(0, 0, 0, 1)
		gl.clear(gl.COLOR_BUFFER_BIT)
		gl.disable(gl.DEPTH_TEST)
		this.litShd.use()
		this.gbuffer.bindTextures(0)
		this.litShd.setInt('uAlbedo', 0)
		this.litShd.setInt('uNormal', 1)
		this.litShd.setInt('uPosition', 2)
		this.litShd.setInt('uMaterial', 3)
		this.litShd.setVec3('uCamPos', ...camPos)
		this.litShd.setVec3('uAmbient', ...ambient)
		this.litShd.setVec3('uSunDir', ...sunDir)
		this.litShd.setVec3('uSunClr', ...sunClr)
		if (rndCfg.shadowEab && shadowMap && litMtx) {
			this.litShd.setInt('uShadowEab', 1)
			shadowMap.bindTex(4)
			this.litShd.setInt('uShadowMap', 4)
			this.litShd.setMat4('uLitMtx', litMtx)
			this.litShd.setFloat('uShadowBias', rndCfg.shadowBias)
			this.litShd.setFloat('uShadowStr', rndCfg.shadowIntensity)
		} else {
			this.litShd.setInt('uShadowEab', 0)
		}
		if (this.cfg.ssaoEab && ssaoTex) {
			this.litShd.setInt('uSsaoEab', 1)
			gl.activeTexture(gl.TEXTURE5)
			gl.bindTexture(gl.TEXTURE_2D, ssaoTex)
			this.litShd.setInt('uSsao', 5)
		} else {
			this.litShd.setInt('uSsaoEab', 0)
		}
		if (litMgr) {
			this.litShd.setInt('uPntLitCnt', litMgr.pntCnt())
			this.litShd.setVec3Arr('uPntLitPos[0]', litMgr.pntPosArr)
			this.litShd.setVec3Arr('uPntLitClr[0]', litMgr.pntClrArr)
			this.litShd.setFloatArr('uPntLitRange[0]', litMgr.pntRangeArr)
			this.litShd.setFloatArr('uPntLitIntensity[0]', litMgr.pntIntensityArr)
			this.litShd.setInt('uSptLitCnt', litMgr.sptCnt())
			this.litShd.setVec3Arr('uSptLitPos[0]', litMgr.sptPosArr)
			this.litShd.setVec3Arr('uSptLitDir[0]', litMgr.sptDirArr)
			this.litShd.setVec3Arr('uSptLitClr[0]', litMgr.sptClrArr)
			this.litShd.setFloatArr('uSptLitRange[0]', litMgr.sptRangeArr)
			this.litShd.setFloatArr('uSptLitAngle[0]', litMgr.sptAngleArr)
			this.litShd.setFloatArr('uSptLitPenumbra[0]', litMgr.sptPenumbraArr)
		} else {
			this.litShd.setInt('uPntLitCnt', 0)
			this.litShd.setInt('uSptLitCnt', 0)
		}
		this.quadVAO.bind()
		gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0)
		this.quadVAO.unbind()
		this.litRT.unbind()
	}

	getLitResult(): WebGLTexture | null {
		return this.litRT?.colorTex ?? null
	}

	getGBuffer(): GBuffer | null {
		return this.gbuffer
	}

	getDepthTex(): WebGLTexture | null {
		return this.gbuffer?.textures.depth ?? null
	}

	dst() {
		this.gbuffer?.dispose()
		this.litRT?.dispose()
		this.quadVAO?.dispose()
		this.gbuffer = null
		this.litRT = null
		this.gbufferShd = null
		this.litShd = null
		this.quadVAO = null
	}
}
