export class VertexBuffer {
	gl: WebGL2RenderingContext
	buf: WebGLBuffer
	cnt: number

	constructor(gl: WebGL2RenderingContext) {
		this.gl = gl
		this.buf = gl.createBuffer()!
		this.cnt = 0
	}

	setData(data: Float32Array) {
		const { gl, buf } = this
		gl.bindBuffer(gl.ARRAY_BUFFER, buf)
		gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
		this.cnt = data.length
	}

	bind() {
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buf)
	}

	dispose() {
		this.gl.deleteBuffer(this.buf)
	}
}

export class IndexBuffer {
	gl: WebGL2RenderingContext
	buf: WebGLBuffer
	cnt: number

	constructor(gl: WebGL2RenderingContext) {
		this.gl = gl
		this.buf = gl.createBuffer()!
		this.cnt = 0
	}

	setData(data: Uint16Array | Uint32Array) {
		const { gl, buf } = this
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buf)
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, gl.STATIC_DRAW)
		this.cnt = data.length
	}

	bind() {
		this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.buf)
	}

	dispose() {
		this.gl.deleteBuffer(this.buf)
	}
}

export interface VertexAttr {
	name: string
	size: number
	type: number
	normalized: boolean
	offset: number
}

export class VAO {
	gl: WebGL2RenderingContext
	vao: WebGLVertexArrayObject
	vbo: VertexBuffer
	ibo: IndexBuffer | null
	stride: number
	attrs: VertexAttr[]

	constructor(gl: WebGL2RenderingContext) {
		this.gl = gl
		this.vao = gl.createVertexArray()!
		this.vbo = new VertexBuffer(gl)
		this.ibo = null
		this.stride = 0
		this.attrs = []
	}

	setVerts(data: Float32Array) {
		this.vbo.setData(data)
	}

	setIndices(data: Uint16Array | Uint32Array) {
		if (!this.ibo) {
			this.ibo = new IndexBuffer(this.gl)
		}
		this.ibo.setData(data)
	}

	setLayout(attrs: VertexAttr[], stride: number) {
		this.attrs = attrs
		this.stride = stride
	}

	setup(getAttrLoc: (name: string) => number) {
		const { gl, vao, vbo, ibo, attrs, stride } = this
		gl.bindVertexArray(vao)
		vbo.bind()
		for (const attr of attrs) {
			const loc = getAttrLoc(attr.name)
			if (loc >= 0) {
				gl.enableVertexAttribArray(loc)
				gl.vertexAttribPointer(loc, attr.size, attr.type, attr.normalized, stride, attr.offset)
			}
		}
		if (ibo) ibo.bind()
		gl.bindVertexArray(null)
	}

	bind() {
		this.gl.bindVertexArray(this.vao)
	}

	unbind() {
		this.gl.bindVertexArray(null)
	}

	draw(mode: number = this.gl.TRIANGLES) {
		const { gl, ibo, vbo } = this
		this.bind()
		if (ibo && ibo.cnt > 0) {
			gl.drawElements(mode, ibo.cnt, gl.UNSIGNED_SHORT, 0)
		} else if (vbo.cnt > 0) {
			gl.drawArrays(mode, 0, vbo.cnt / (this.stride / 4))
		}
		this.unbind()
	}

	dispose() {
		this.gl.deleteVertexArray(this.vao)
		this.vbo.dispose()
		if (this.ibo) this.ibo.dispose()
	}
}
