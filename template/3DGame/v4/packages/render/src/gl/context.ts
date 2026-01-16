export interface DynResCfg {
	enabled: boolean
	minScale: number
	maxScale: number
	targetFps: number
	adjustSpeed: number
	sampleFrames: number
}

const DEFAULT_DYN_RES_CFG: DynResCfg = {
	enabled: false,
	minScale: 0.5,
	maxScale: 1.0,
	targetFps: 60,
	adjustSpeed: 0.05,
	sampleFrames: 10
}

export class GLContext {
	gl: WebGL2RenderingContext
	cv: HTMLCanvasElement
	w: number
	h: number
	displayW: number
	displayH: number
	resScale: number
	dynResCfg: DynResCfg
	frameTimes: number[]
	lastFrameTsp: number
	rndFbo: WebGLFramebuffer | null
	rndTex: WebGLTexture | null
	rndDepth: WebGLRenderbuffer | null
	upscaleShd: WebGLProgram | null
	upscaleVao: WebGLVertexArrayObject | null

	constructor(cv: HTMLCanvasElement) {
		this.cv = cv
		const gl = cv.getContext('webgl2', {
			antialias: true,
			alpha: false,
			depth: true,
			stencil: false,
			powerPreference: 'high-performance'
		})
		if (!gl) throw new Error('WebGL2 not supported')
		this.gl = gl
		this.w = cv.width
		this.h = cv.height
		this.displayW = cv.width
		this.displayH = cv.height
		this.resScale = 1.0
		this.dynResCfg = { ...DEFAULT_DYN_RES_CFG }
		this.frameTimes = []
		this.lastFrameTsp = 0
		this.rndFbo = null
		this.rndTex = null
		this.rndDepth = null
		this.upscaleShd = null
		this.upscaleVao = null
		this.ini()
	}

	private ini() {
		const { gl } = this
		gl.enable(gl.DEPTH_TEST)
		gl.depthFunc(gl.LEQUAL)
		gl.enable(gl.CULL_FACE)
		gl.cullFace(gl.BACK)
		gl.frontFace(gl.CCW)
		gl.enable(gl.BLEND)
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
		gl.clearColor(0.1, 0.1, 0.15, 1.0)
	}

	resize(w: number, h: number) {
		this.displayW = w
		this.displayH = h
		this.cv.width = w
		this.cv.height = h
		this.applyScale()
	}

	private applyScale() {
		this.w = Math.max(1, Math.floor(this.displayW * this.resScale))
		this.h = Math.max(1, Math.floor(this.displayH * this.resScale))
		if (this.dynResCfg.enabled) {
			this.setupRndFbo()
		} else {
			this.gl.viewport(0, 0, this.displayW, this.displayH)
			this.w = this.displayW
			this.h = this.displayH
		}
	}

	setDynRes(cfg: Partial<DynResCfg>) {
		Object.assign(this.dynResCfg, cfg)
		if (this.dynResCfg.enabled && !this.rndFbo) {
			this.iniUpscale()
			this.setupRndFbo()
		} else if (!this.dynResCfg.enabled) {
			this.cleanupRndFbo()
		}
	}

	private iniUpscale() {
		const { gl } = this
		const vsrc = `#version 300 es
		in vec2 aPos;
		out vec2 vUv;
		void main() {
			vUv = aPos * 0.5 + 0.5;
			gl_Position = vec4(aPos, 0.0, 1.0);
		}`
		const fsrc = `#version 300 es
		precision highp float;
		in vec2 vUv;
		out vec4 fragClr;
		uniform sampler2D uTex;
		void main() {
			fragClr = texture(uTex, vUv);
		}`
		const vs = gl.createShader(gl.VERTEX_SHADER)!
		gl.shaderSource(vs, vsrc)
		gl.compileShader(vs)
		const fs = gl.createShader(gl.FRAGMENT_SHADER)!
		gl.shaderSource(fs, fsrc)
		gl.compileShader(fs)
		this.upscaleShd = gl.createProgram()!
		gl.attachShader(this.upscaleShd, vs)
		gl.attachShader(this.upscaleShd, fs)
		gl.linkProgram(this.upscaleShd)
		gl.deleteShader(vs)
		gl.deleteShader(fs)
		this.upscaleVao = gl.createVertexArray()
		gl.bindVertexArray(this.upscaleVao)
		const verts = new Float32Array([-1, -1, 3, -1, -1, 3])
		const vbo = gl.createBuffer()
		gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
		gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW)
		const posLoc = gl.getAttribLocation(this.upscaleShd, 'aPos')
		gl.enableVertexAttribArray(posLoc)
		gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)
		gl.bindVertexArray(null)
	}

	private setupRndFbo() {
		const { gl } = this
		this.cleanupRndFbo()
		this.rndFbo = gl.createFramebuffer()
		this.rndTex = gl.createTexture()
		this.rndDepth = gl.createRenderbuffer()
		gl.bindTexture(gl.TEXTURE_2D, this.rndTex)
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, this.w, this.h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
		gl.bindRenderbuffer(gl.RENDERBUFFER, this.rndDepth)
		gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, this.w, this.h)
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.rndFbo)
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.rndTex, 0)
		gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.rndDepth)
		gl.bindFramebuffer(gl.FRAMEBUFFER, null)
	}

	private cleanupRndFbo() {
		const { gl } = this
		if (this.rndFbo) gl.deleteFramebuffer(this.rndFbo)
		if (this.rndTex) gl.deleteTexture(this.rndTex)
		if (this.rndDepth) gl.deleteRenderbuffer(this.rndDepth)
		this.rndFbo = null
		this.rndTex = null
		this.rndDepth = null
	}

	beginFrame() {
		if (this.dynResCfg.enabled && this.rndFbo) {
			this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.rndFbo)
			this.gl.viewport(0, 0, this.w, this.h)
		}
	}

	endFrame() {
		if (!this.dynResCfg.enabled || !this.rndFbo) return
		const { gl } = this
		gl.bindFramebuffer(gl.FRAMEBUFFER, null)
		gl.viewport(0, 0, this.displayW, this.displayH)
		gl.disable(gl.DEPTH_TEST)
		gl.useProgram(this.upscaleShd)
		gl.activeTexture(gl.TEXTURE0)
		gl.bindTexture(gl.TEXTURE_2D, this.rndTex)
		gl.bindVertexArray(this.upscaleVao)
		gl.drawArrays(gl.TRIANGLES, 0, 3)
		gl.bindVertexArray(null)
		gl.enable(gl.DEPTH_TEST)
		this.trackFrame()
	}

	private trackFrame() {
		const now = performance.now()
		if (this.lastFrameTsp > 0) {
			const dt = now - this.lastFrameTsp
			this.frameTimes.push(dt)
			if (this.frameTimes.length > this.dynResCfg.sampleFrames) {
				this.frameTimes.shift()
			}
			if (this.frameTimes.length >= this.dynResCfg.sampleFrames) {
				this.adjustScale()
			}
		}
		this.lastFrameTsp = now
	}

	private adjustScale() {
		const avgTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length
		const curFps = 1000 / avgTime
		const { targetFps, adjustSpeed, minScale, maxScale } = this.dynResCfg
		const prvScale = this.resScale
		if (curFps < targetFps * 0.9) {
			this.resScale = Math.max(minScale, this.resScale - adjustSpeed)
		} else if (curFps > targetFps * 1.05) {
			this.resScale = Math.min(maxScale, this.resScale + adjustSpeed * 0.5)
		}
		if (Math.abs(this.resScale - prvScale) > 0.01) {
			this.applyScale()
		}
	}

	getResScale(): number {
		return this.resScale
	}

	setResScale(scale: number) {
		this.resScale = Math.max(this.dynResCfg.minScale, Math.min(this.dynResCfg.maxScale, scale))
		this.applyScale()
	}

	clr() {
		this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT)
	}

	aspect() {
		return this.w / this.h
	}
}
