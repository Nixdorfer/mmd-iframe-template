class ModelLoader {
	constructor(gl, textureManager) {
		this.gl = gl
		this.textureManager = textureManager
		this.models = new Map()
	}
	extractModelData(uint8) {
		let i = 8
		while (i < uint8.length) {
			const length = (uint8[i] << 24) | (uint8[i+1] << 16) | (uint8[i+2] << 8) | uint8[i+3]
			const type = String.fromCharCode(uint8[i+4], uint8[i+5], uint8[i+6], uint8[i+7])
			if (type === 'tEXt') {
				const data = uint8.slice(i + 8, i + 8 + length)
				let nullIndex = 0
				for (let j = 0; j < data.length; j++) {
					if (data[j] === 0) { nullIndex = j; break }
				}
				const key = new TextDecoder().decode(data.slice(0, nullIndex))
				if (key === 'modelData') {
					return new TextDecoder().decode(data.slice(nullIndex + 1))
				}
			}
			i += 12 + length
		}
		return null
	}
	async load(id, url) {
		if (this.models.has(id)) return this.models.get(id)
		const response = await fetch(url)
		const arrayBuffer = await response.arrayBuffer()
		const uint8 = new Uint8Array(arrayBuffer)
		const modelDataStr = this.extractModelData(uint8)
		if (!modelDataStr) {
			throw new Error('No modelData found in PNG')
		}
		const modelData = JSON.parse(modelDataStr)
		const blob = new Blob([uint8], { type: 'image/png' })
		const textureUrl = URL.createObjectURL(blob)
		await this.textureManager.load(id + '_tex', textureUrl)
		const model = new GLModel(this.gl, modelData, id + '_tex')
		this.models.set(id, model)
		return model
	}
	get(id) {
		return this.models.get(id) || null
	}
}
class GLModel {
	constructor(gl, data, textureId) {
		this.gl = gl
		this.name = data.name || 'unnamed'
		this.origin = data.origin || [0, 0, 0]
		this.scale = data.scale || 1
		this.textureId = textureId
		this.vao = null
		this.vbo = null
		this.ibo = null
		this.indexCount = 0
		this.buildBuffers(data.vertices, data.faces)
	}
	buildBuffers(vertices, faces) {
		const gl = this.gl
		const positions = []
		const normals = []
		const uvs = []
		const colors = []
		const indices = []
		let idx = 0
		for (const face of faces) {
			if (face.v.length < 3) continue
			const faceVerts = face.v.map(vi => vertices[vi])
			const v0 = faceVerts[0]
			const v1 = faceVerts[1]
			const v2 = faceVerts[2]
			const e1 = [v1[0]-v0[0], v1[1]-v0[1], v1[2]-v0[2]]
			const e2 = [v2[0]-v0[0], v2[1]-v0[1], v2[2]-v0[2]]
			let nx = e1[1]*e2[2] - e1[2]*e2[1]
			let ny = e1[2]*e2[0] - e1[0]*e2[2]
			let nz = e1[0]*e2[1] - e1[1]*e2[0]
			const len = Math.sqrt(nx*nx + ny*ny + nz*nz)
			if (len > 0) { nx /= len; ny /= len; nz /= len }
			const color = this.hexToRgb(face.color || '#888888')
			for (let i = 0; i < faceVerts.length; i++) {
				const v = faceVerts[i]
				positions.push(
					(v[0] - this.origin[0]) * this.scale,
					(v[1] - this.origin[1]) * this.scale,
					(v[2] - this.origin[2]) * this.scale
				)
				normals.push(nx, ny, nz)
				if (face.uv && face.uv[i]) {
					uvs.push(face.uv[i][0], face.uv[i][1])
				} else {
					uvs.push(0, 0)
				}
				colors.push(color[0], color[1], color[2])
			}
			for (let i = 1; i < faceVerts.length - 1; i++) {
				indices.push(idx, idx + i, idx + i + 1)
			}
			idx += faceVerts.length
		}
		this.indexCount = indices.length
		if (this.indexCount === 0) return
		this.vao = gl.createVertexArray()
		this.vbo = gl.createBuffer()
		this.ibo = gl.createBuffer()
		gl.bindVertexArray(this.vao)
		const stride = 11
		const vertexCount = positions.length / 3
		const vertexData = new Float32Array(vertexCount * stride)
		for (let i = 0; i < vertexCount; i++) {
			const offset = i * stride
			vertexData[offset] = positions[i*3]
			vertexData[offset+1] = positions[i*3+1]
			vertexData[offset+2] = positions[i*3+2]
			vertexData[offset+3] = normals[i*3]
			vertexData[offset+4] = normals[i*3+1]
			vertexData[offset+5] = normals[i*3+2]
			vertexData[offset+6] = uvs[i*2]
			vertexData[offset+7] = uvs[i*2+1]
			vertexData[offset+8] = colors[i*3]
			vertexData[offset+9] = colors[i*3+1]
			vertexData[offset+10] = colors[i*3+2]
		}
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo)
		gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW)
		const byteStride = stride * 4
		gl.enableVertexAttribArray(0)
		gl.vertexAttribPointer(0, 3, gl.FLOAT, false, byteStride, 0)
		gl.enableVertexAttribArray(1)
		gl.vertexAttribPointer(1, 3, gl.FLOAT, false, byteStride, 12)
		gl.enableVertexAttribArray(2)
		gl.vertexAttribPointer(2, 2, gl.FLOAT, false, byteStride, 24)
		gl.enableVertexAttribArray(3)
		gl.vertexAttribPointer(3, 3, gl.FLOAT, false, byteStride, 32)
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo)
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW)
		gl.bindVertexArray(null)
	}
	hexToRgb(hex) {
		const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
		return result ? [
			parseInt(result[1], 16) / 255,
			parseInt(result[2], 16) / 255,
			parseInt(result[3], 16) / 255
		] : [0.5, 0.5, 0.5]
	}
	render(gl, program, textureManager) {
		if (!this.vao || this.indexCount === 0) return
		const hasTexture = textureManager.bind(this.textureId, 0)
		gl.uniform1i(gl.getUniformLocation(program, 'u_useTexture'), hasTexture ? 1 : 0)
		gl.uniform1i(gl.getUniformLocation(program, 'u_texture'), 0)
		gl.bindVertexArray(this.vao)
		gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0)
		gl.bindVertexArray(null)
	}
	dispose() {
		const gl = this.gl
		if (this.vao) gl.deleteVertexArray(this.vao)
		if (this.vbo) gl.deleteBuffer(this.vbo)
		if (this.ibo) gl.deleteBuffer(this.ibo)
	}
}
