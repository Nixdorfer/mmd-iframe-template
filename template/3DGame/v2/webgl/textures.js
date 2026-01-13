class TextureManager {
	constructor(gl) {
		this.gl = gl
		this.textures = new Map()
		this.pending = new Map()
	}
	load(id, src) {
		if (this.textures.has(id)) return Promise.resolve(this.textures.get(id))
		if (this.pending.has(id)) return this.pending.get(id)
		const gl = this.gl
		const promise = new Promise((resolve, reject) => {
			const img = new Image()
			img.crossOrigin = 'anonymous'
			img.onload = () => {
				const tex = gl.createTexture()
				gl.bindTexture(gl.TEXTURE_2D, tex)
				gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
				gl.generateMipmap(gl.TEXTURE_2D)
				gl.bindTexture(gl.TEXTURE_2D, null)
				this.textures.set(id, tex)
				this.pending.delete(id)
				resolve(tex)
			}
			img.onerror = () => {
				this.pending.delete(id)
				reject(new Error('Failed to load texture: ' + src))
			}
			img.src = src
		})
		this.pending.set(id, promise)
		return promise
	}
	get(id) {
		return this.textures.get(id) || null
	}
	bind(id, unit = 0) {
		const gl = this.gl
		const tex = this.textures.get(id)
		if (tex) {
			gl.activeTexture(gl.TEXTURE0 + unit)
			gl.bindTexture(gl.TEXTURE_2D, tex)
			return true
		}
		return false
	}
	createFromColor(id, color) {
		const gl = this.gl
		const hex = color.replace('#', '')
		const r = parseInt(hex.substr(0, 2), 16)
		const g = parseInt(hex.substr(2, 2), 16)
		const b = parseInt(hex.substr(4, 2), 16)
		const data = new Uint8Array([r, g, b, 255])
		const tex = gl.createTexture()
		gl.bindTexture(gl.TEXTURE_2D, tex)
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, data)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
		gl.bindTexture(gl.TEXTURE_2D, null)
		this.textures.set(id, tex)
		return tex
	}
	dispose() {
		const gl = this.gl
		for (const tex of this.textures.values()) {
			gl.deleteTexture(tex)
		}
		this.textures.clear()
	}
}
