export type CompressedFmt = 'etc2-rgb' | 'etc2-rgba' | 'astc-4x4' | 'astc-6x6' | 'astc-8x8'

export interface CompressedTexInfo {
	fmt: CompressedFmt
	w: number
	h: number
	levels: ArrayBufferView[]
}

export interface CompressedSupport {
	etc2: boolean
	astc: boolean
	astcExt: WEBGL_compressed_texture_astc | null
}

export function detectCompressedSupport(gl: WebGL2RenderingContext): CompressedSupport {
	const astcExt = gl.getExtension('WEBGL_compressed_texture_astc')
	return {
		etc2: true,
		astc: !!astcExt,
		astcExt
	}
}

const COMPRESSED_FORMATS: Record<CompressedFmt, { glFmt: number; blkW: number; blkH: number; bpp: number }> = {
	'etc2-rgb': { glFmt: 0x9274, blkW: 4, blkH: 4, bpp: 4 },
	'etc2-rgba': { glFmt: 0x9278, blkW: 4, blkH: 4, bpp: 8 },
	'astc-4x4': { glFmt: 0x93B0, blkW: 4, blkH: 4, bpp: 8 },
	'astc-6x6': { glFmt: 0x93B4, blkW: 6, blkH: 6, bpp: 3.56 },
	'astc-8x8': { glFmt: 0x93B7, blkW: 8, blkH: 8, bpp: 2 }
}

export class Texture {
	gl: WebGL2RenderingContext
	tex: WebGLTexture
	w: number
	h: number
	compressed: boolean

	constructor(gl: WebGL2RenderingContext) {
		this.gl = gl
		this.tex = gl.createTexture()!
		this.w = 0
		this.h = 0
		this.compressed = false
	}

	fromImage(img: HTMLImageElement | ImageBitmap) {
		const { gl, tex } = this
		gl.bindTexture(gl.TEXTURE_2D, tex)
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
		gl.generateMipmap(gl.TEXTURE_2D)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
		this.w = img.width
		this.h = img.height
	}

	fromData(w: number, h: number, data: Uint8Array) {
		const { gl, tex } = this
		gl.bindTexture(gl.TEXTURE_2D, tex)
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, data)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
		this.w = w
		this.h = h
	}

	fromColor(r: number, g: number, b: number, a = 255) {
		this.fromData(1, 1, new Uint8Array([r, g, b, a]))
	}

	fromCompressed(info: CompressedTexInfo) {
		const { gl, tex } = this
		const fmtInfo = COMPRESSED_FORMATS[info.fmt]
		if (!fmtInfo) return
		gl.bindTexture(gl.TEXTURE_2D, tex)
		let w = info.w
		let h = info.h
		for (let i = 0; i < info.levels.length; i++) {
			gl.compressedTexImage2D(gl.TEXTURE_2D, i, fmtInfo.glFmt, w, h, 0, info.levels[i])
			w = Math.max(1, w >> 1)
			h = Math.max(1, h >> 1)
		}
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, info.levels.length > 1 ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
		this.w = info.w
		this.h = info.h
		this.compressed = true
	}

	bind(unit = 0) {
		const { gl, tex } = this
		gl.activeTexture(gl.TEXTURE0 + unit)
		gl.bindTexture(gl.TEXTURE_2D, tex)
	}

	dispose() {
		this.gl.deleteTexture(this.tex)
	}
}

const KTX2_ID = [0xAB, 0x4B, 0x54, 0x58, 0x20, 0x32, 0x30, 0xBB, 0x0D, 0x0A, 0x1A, 0x0A]

const VK_TO_FMT: Record<number, CompressedFmt> = {
	0x93B0: 'astc-4x4',
	0x93B4: 'astc-6x6',
	0x93B7: 'astc-8x8',
	147: 'etc2-rgb',
	148: 'etc2-rgba'
}

function parseKTX2(buf: ArrayBuffer): CompressedTexInfo | null {
	const view = new DataView(buf)
	for (let i = 0; i < 12; i++) {
		if (view.getUint8(i) !== KTX2_ID[i]) return null
	}
	const vkFmt = view.getUint32(12, true)
	const fmt = VK_TO_FMT[vkFmt]
	if (!fmt) return null
	const w = view.getUint32(20, true)
	const h = view.getUint32(24, true)
	const levelCnt = view.getUint32(36, true)
	const levels: ArrayBufferView[] = []
	const levelIdx = 80
	for (let i = 0; i < levelCnt; i++) {
		const off = view.getBigUint64(levelIdx + i * 24, true)
		const len = view.getBigUint64(levelIdx + i * 24 + 8, true)
		levels.push(new Uint8Array(buf, Number(off), Number(len)))
	}
	return { fmt, w, h, levels }
}

export class TextureManager {
	gl: WebGL2RenderingContext
	textures: Map<string, Texture>
	loading: Map<string, Promise<Texture>>
	missing: Texture
	compSupport: CompressedSupport

	constructor(gl: WebGL2RenderingContext) {
		this.gl = gl
		this.textures = new Map()
		this.loading = new Map()
		this.missing = new Texture(gl)
		this.missing.fromColor(255, 0, 255)
		this.compSupport = detectCompressedSupport(gl)
	}

	supportsFormat(fmt: CompressedFmt): boolean {
		if (fmt.startsWith('etc2')) return this.compSupport.etc2
		if (fmt.startsWith('astc')) return this.compSupport.astc
		return false
	}

	async load(name: string, url: string): Promise<Texture> {
		if (this.textures.has(name)) {
			return this.textures.get(name)!
		}
		if (this.loading.has(name)) {
			return this.loading.get(name)!
		}
		const promise = new Promise<Texture>((resolve, reject) => {
			const img = new Image()
			img.crossOrigin = 'anonymous'
			img.onload = () => {
				const tex = new Texture(this.gl)
				tex.fromImage(img)
				this.textures.set(name, tex)
				this.loading.delete(name)
				resolve(tex)
			}
			img.onerror = () => {
				this.loading.delete(name)
				reject(new Error(`Failed to load texture: ${url}`))
			}
			img.src = url
		})
		this.loading.set(name, promise)
		return promise
	}

	loadCompressed(name: string, info: CompressedTexInfo): Texture {
		if (this.textures.has(name)) {
			return this.textures.get(name)!
		}
		const tex = new Texture(this.gl)
		tex.fromCompressed(info)
		this.textures.set(name, tex)
		return tex
	}

	async loadWithFallback(name: string, opts: {
		astc?: string
		etc2?: string
		fallback: string
	}): Promise<Texture> {
		if (this.textures.has(name)) {
			return this.textures.get(name)!
		}
		if (opts.astc && this.compSupport.astc) {
			return this.loadKTX2(name, opts.astc)
		}
		if (opts.etc2 && this.compSupport.etc2) {
			return this.loadKTX2(name, opts.etc2)
		}
		return this.load(name, opts.fallback)
	}

	async loadKTX2(name: string, url: string): Promise<Texture> {
		if (this.textures.has(name)) {
			return this.textures.get(name)!
		}
		const res = await fetch(url)
		const buf = await res.arrayBuffer()
		const info = parseKTX2(buf)
		if (!info) {
			throw new Error(`Failed to parse KTX2: ${url}`)
		}
		return this.loadCompressed(name, info)
	}

	get(name: string): Texture {
		return this.textures.get(name) ?? this.missing
	}

	bind(name: string, unit = 0) {
		this.get(name).bind(unit)
	}

	dispose() {
		for (const tex of this.textures.values()) {
			tex.dispose()
		}
		this.textures.clear()
		this.missing.dispose()
	}
}
