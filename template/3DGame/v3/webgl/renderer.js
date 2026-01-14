class GLRenderer {
	constructor(canvas) {
		this.canvas = canvas
		this.gl = canvas.getContext('webgl2', {
			antialias: true,
			alpha: false,
			depth: true,
			stencil: false,
			premultipliedAlpha: false
		})
		if (!this.gl) throw new Error('WebGL 2.0 not supported')
		this.shaders = new ShaderManager(this.gl)
		this.camera = {
			target: { x: 15, y: 15, z: 0 },
			distance: 30,
			azimuth: 45,
			elevation: -35,
			fov: 60,
			near: 0.1,
			far: 1000
		}
		this.lighting = {
			ambient: { color: [0.25, 0.25, 0.25], intensity: 1.0 },
			directional: { direction: [0.5, 0.5, -0.7], color: [1, 0.98, 0.9], intensity: 0.6 }
		}
		this.fogColor = [0.02, 0.02, 0.02]
		this.projMatrix = mat4.create()
		this.viewMatrix = mat4.create()
		this.terrainVAO = null
		this.terrainVBO = null
		this.terrainIBO = null
		this.terrainIndexCount = 0
		this.gridVAO = null
		this.gridVBO = null
		this.gridVertexCount = 0
		this.axisVAO = null
		this.axisVBO = null
		this.entityVAO = null
		this.entityVBO = null
		this.silhouetteVAO = null
		this.silhouetteVBO = null
		this.silhouetteIBO = null
		this.silhouetteIndexCount = 0
		this.wallVAO = null
		this.wallVBO = null
		this.wallIBO = null
		this.wallIndexCount = 0
		this.visibility = null
		this.playerZ = 0
		this.dirty = true
	}
	init() {
		const gl = this.gl
		this.shaders.initAll()
		gl.enable(gl.DEPTH_TEST)
		gl.depthFunc(gl.LESS)
		gl.enable(gl.CULL_FACE)
		gl.cullFace(gl.BACK)
		gl.clearColor(0.02, 0.02, 0.02, 1.0)
		this.initGridBuffers()
		this.initAxisBuffers()
		this.initEntityBuffers()
	}
	resize(width, height) {
		this.canvas.width = width
		this.canvas.height = height
		this.gl.viewport(0, 0, width, height)
		const aspect = width / height
		mat4.perspective(this.projMatrix, this.camera.fov * Math.PI / 180, aspect, this.camera.near, this.camera.far)
	}
	getCameraPosition() {
		const azRad = this.camera.azimuth * Math.PI / 180
		const elRad = this.camera.elevation * Math.PI / 180
		const cosEl = Math.cos(elRad)
		return {
			x: this.camera.target.x + this.camera.distance * Math.sin(azRad) * cosEl,
			y: this.camera.target.y - this.camera.distance * Math.cos(azRad) * cosEl,
			z: this.camera.target.z - this.camera.distance * Math.sin(elRad)
		}
	}
	updateViewMatrix() {
		const eye = this.getCameraPosition()
		mat4.lookAt(
			this.viewMatrix,
			[eye.x, eye.y, eye.z],
			[this.camera.target.x, this.camera.target.y, this.camera.target.z],
			[0, 0, 1]
		)
	}
	initGridBuffers() {
		const gl = this.gl
		const gridSize = 100
		const vertices = []
		for (let i = -gridSize; i <= gridSize; i++) {
			if (i === 0) continue
			vertices.push(i, -gridSize, 0, i, gridSize, 0)
			vertices.push(-gridSize, i, 0, gridSize, i, 0)
		}
		this.gridVertexCount = vertices.length / 3
		this.gridVAO = gl.createVertexArray()
		this.gridVBO = gl.createBuffer()
		gl.bindVertexArray(this.gridVAO)
		gl.bindBuffer(gl.ARRAY_BUFFER, this.gridVBO)
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW)
		gl.enableVertexAttribArray(0)
		gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0)
		gl.bindVertexArray(null)
	}
	initAxisBuffers() {
		const gl = this.gl
		const len = 500
		const vertices = [
			-len, 0, 0, len, 0, 0,
			0, -len, 0, 0, len, 0,
			0, 0, -len, 0, 0, len
		]
		this.axisVAO = gl.createVertexArray()
		this.axisVBO = gl.createBuffer()
		gl.bindVertexArray(this.axisVAO)
		gl.bindBuffer(gl.ARRAY_BUFFER, this.axisVBO)
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW)
		gl.enableVertexAttribArray(0)
		gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0)
		gl.bindVertexArray(null)
	}
	initEntityBuffers() {
		const gl = this.gl
		const vertices = [
			-0.5, 0, 0, 0, 1,
			0.5, 0, 0, 1, 1,
			0.5, 0, 1, 1, 0,
			-0.5, 0, 1, 0, 0
		]
		const indices = [0, 1, 2, 0, 2, 3]
		this.entityVAO = gl.createVertexArray()
		this.entityVBO = gl.createBuffer()
		this.entityIBO = gl.createBuffer()
		gl.bindVertexArray(this.entityVAO)
		gl.bindBuffer(gl.ARRAY_BUFFER, this.entityVBO)
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW)
		gl.enableVertexAttribArray(0)
		gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 20, 0)
		gl.enableVertexAttribArray(1)
		gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 20, 12)
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.entityIBO)
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW)
		gl.bindVertexArray(null)
	}
	buildTerrainMesh(tileMap, mapBounds, resources) {
		const gl = this.gl
		const positions = []
		const normals = []
		const uvs = []
		const colors = []
		const aos = []
		const indices = []
		let idx = 0
		for (let y = mapBounds.minY; y <= mapBounds.maxY; y++) {
			for (let x = mapBounds.minX; x <= mapBounds.maxX; x++) {
				const key = `${x},${y}`
				const tile = tileMap.get(key)
				if (!tile) continue
				const res = resources.get(tile.terrain)
				if (!res) continue
				const z = tile.z || 0
				const color = this.hexToRgb(res.color)
				const ao = this.calculateAO(tileMap, x, y)
				positions.push(x, y, z, x+1, y, z, x+1, y+1, z, x, y+1, z)
				for (let i = 0; i < 4; i++) {
					normals.push(0, 0, 1)
					colors.push(color[0], color[1], color[2])
					aos.push(ao)
				}
				uvs.push(0, 0, 1, 0, 1, 1, 0, 1)
				indices.push(idx, idx+1, idx+2, idx, idx+2, idx+3)
				idx += 4
				if (z > 0) {
					const sideColor = [color[0]*0.7, color[1]*0.7, color[2]*0.7]
					positions.push(x, y+1, 0, x+1, y+1, 0, x+1, y+1, z, x, y+1, z)
					for (let i = 0; i < 4; i++) {
						normals.push(0, 1, 0)
						colors.push(sideColor[0], sideColor[1], sideColor[2])
						aos.push(ao)
					}
					uvs.push(0, 0, 1, 0, 1, 1, 0, 1)
					indices.push(idx, idx+1, idx+2, idx, idx+2, idx+3)
					idx += 4
					const frontColor = [color[0]*0.5, color[1]*0.5, color[2]*0.5]
					positions.push(x+1, y, 0, x+1, y+1, 0, x+1, y+1, z, x+1, y, z)
					for (let i = 0; i < 4; i++) {
						normals.push(1, 0, 0)
						colors.push(frontColor[0], frontColor[1], frontColor[2])
						aos.push(ao)
					}
					uvs.push(0, 0, 1, 0, 1, 1, 0, 1)
					indices.push(idx, idx+1, idx+2, idx, idx+2, idx+3)
					idx += 4
				}
			}
		}
		if (this.terrainVAO) gl.deleteVertexArray(this.terrainVAO)
		if (this.terrainVBO) gl.deleteBuffer(this.terrainVBO)
		if (this.terrainIBO) gl.deleteBuffer(this.terrainIBO)
		this.terrainVAO = gl.createVertexArray()
		this.terrainVBO = gl.createBuffer()
		this.terrainIBO = gl.createBuffer()
		gl.bindVertexArray(this.terrainVAO)
		const stride = 12
		const vertexData = new Float32Array(positions.length + normals.length + uvs.length + colors.length + aos.length)
		const vertexCount = positions.length / 3
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
			vertexData[offset+11] = aos[i]
		}
		gl.bindBuffer(gl.ARRAY_BUFFER, this.terrainVBO)
		gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.DYNAMIC_DRAW)
		const byteStride = stride * 4
		gl.enableVertexAttribArray(0)
		gl.vertexAttribPointer(0, 3, gl.FLOAT, false, byteStride, 0)
		gl.enableVertexAttribArray(1)
		gl.vertexAttribPointer(1, 3, gl.FLOAT, false, byteStride, 12)
		gl.enableVertexAttribArray(2)
		gl.vertexAttribPointer(2, 2, gl.FLOAT, false, byteStride, 24)
		gl.enableVertexAttribArray(3)
		gl.vertexAttribPointer(3, 3, gl.FLOAT, false, byteStride, 32)
		gl.enableVertexAttribArray(4)
		gl.vertexAttribPointer(4, 1, gl.FLOAT, false, byteStride, 44)
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.terrainIBO)
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(indices), gl.DYNAMIC_DRAW)
		gl.bindVertexArray(null)
		this.terrainIndexCount = indices.length
	}
	calculateAO(tileMap, x, y) {
		let ao = 0
		const neighbors = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]
		for (const [dx, dy] of neighbors) {
			const key = `${x+dx},${y+dy}`
			const tile = tileMap.get(key)
			if (!tile || tile.terrain === 'void') ao += 0.05
			else if ((tile.z || 0) > 0) ao += 0.03
		}
		return Math.min(ao, 0.4)
	}
	hexToRgb(hex) {
		const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
		return result ? [
			parseInt(result[1], 16) / 255,
			parseInt(result[2], 16) / 255,
			parseInt(result[3], 16) / 255
		] : [0.5, 0.5, 0.5]
	}
	render(state) {
		const gl = this.gl
		this.updateViewMatrix()
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
		this.renderTerrain()
		if (state.showGrid) {
			this.renderGrid()
		}
		this.renderAxes()
		this.renderEntities(state.entities, state.resources)
		if (state.selectedTile) {
			this.renderSelection(state.selectedTile.x, state.selectedTile.y, state.selectedTile.z || 0)
		}
	}
	renderTerrain() {
		if (!this.terrainVAO || this.terrainIndexCount === 0) return
		const gl = this.gl
		const program = this.shaders.use('terrain')
		gl.uniformMatrix4fv(gl.getUniformLocation(program, 'u_projection'), false, this.projMatrix)
		gl.uniformMatrix4fv(gl.getUniformLocation(program, 'u_view'), false, this.viewMatrix)
		gl.uniform1i(gl.getUniformLocation(program, 'u_useTexture'), 0)
		gl.uniform3fv(gl.getUniformLocation(program, 'u_ambientColor'), this.lighting.ambient.color)
		gl.uniform1f(gl.getUniformLocation(program, 'u_ambientIntensity'), this.lighting.ambient.intensity)
		gl.uniform3fv(gl.getUniformLocation(program, 'u_lightDir'), this.lighting.directional.direction)
		gl.uniform3fv(gl.getUniformLocation(program, 'u_lightColor'), this.lighting.directional.color)
		gl.uniform1f(gl.getUniformLocation(program, 'u_lightIntensity'), this.lighting.directional.intensity)
		gl.uniform3fv(gl.getUniformLocation(program, 'u_fogColor'), this.fogColor)
		gl.uniform1f(gl.getUniformLocation(program, 'u_fogStart'), this.camera.distance * 0.5)
		gl.uniform1f(gl.getUniformLocation(program, 'u_fogEnd'), this.camera.distance * 2)
		gl.bindVertexArray(this.terrainVAO)
		gl.drawElements(gl.TRIANGLES, this.terrainIndexCount, gl.UNSIGNED_INT, 0)
		gl.bindVertexArray(null)
	}
	renderGrid() {
		if (!this.gridVAO) return
		const gl = this.gl
		gl.depthMask(false)
		gl.enable(gl.BLEND)
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
		const program = this.shaders.use('grid')
		gl.uniformMatrix4fv(gl.getUniformLocation(program, 'u_projection'), false, this.projMatrix)
		gl.uniformMatrix4fv(gl.getUniformLocation(program, 'u_view'), false, this.viewMatrix)
		gl.uniform4f(gl.getUniformLocation(program, 'u_color'), 1, 1, 1, 0.1)
		gl.bindVertexArray(this.gridVAO)
		gl.drawArrays(gl.LINES, 0, this.gridVertexCount)
		gl.bindVertexArray(null)
		gl.depthMask(true)
		gl.disable(gl.BLEND)
	}
	renderAxes() {
		if (!this.axisVAO) return
		const gl = this.gl
		gl.depthMask(false)
		const program = this.shaders.use('grid')
		gl.uniformMatrix4fv(gl.getUniformLocation(program, 'u_projection'), false, this.projMatrix)
		gl.uniformMatrix4fv(gl.getUniformLocation(program, 'u_view'), false, this.viewMatrix)
		gl.bindVertexArray(this.axisVAO)
		gl.uniform4f(gl.getUniformLocation(program, 'u_color'), 1, 0.4, 0.4, 0.8)
		gl.drawArrays(gl.LINES, 0, 2)
		gl.uniform4f(gl.getUniformLocation(program, 'u_color'), 0.4, 1, 0.4, 0.8)
		gl.drawArrays(gl.LINES, 2, 2)
		gl.uniform4f(gl.getUniformLocation(program, 'u_color'), 0.4, 0.6, 1, 0.8)
		gl.drawArrays(gl.LINES, 4, 2)
		gl.bindVertexArray(null)
		gl.depthMask(true)
	}
	renderEntities(entities, resources) {
		if (!entities || !this.entityVAO) return
		const gl = this.gl
		gl.enable(gl.BLEND)
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
		gl.disable(gl.CULL_FACE)
		const program = this.shaders.use('entity')
		gl.uniformMatrix4fv(gl.getUniformLocation(program, 'u_projection'), false, this.projMatrix)
		gl.uniformMatrix4fv(gl.getUniformLocation(program, 'u_view'), false, this.viewMatrix)
		gl.uniform1i(gl.getUniformLocation(program, 'u_useTexture'), 0)
		gl.uniform1i(gl.getUniformLocation(program, 'u_billboard'), 1)
		gl.uniform1f(gl.getUniformLocation(program, 'u_alpha'), 1.0)
		gl.bindVertexArray(this.entityVAO)
		for (const entity of entities) {
			const res = resources.get(entity.type)
			if (!res) continue
			const color = this.hexToRgb(res.color || '#ff0000')
			gl.uniform3fv(gl.getUniformLocation(program, 'u_entityPos'), [entity.x + 0.5, entity.y + 0.5, entity.z || 0])
			gl.uniform1f(gl.getUniformLocation(program, 'u_entityScale'), 1.0)
			gl.uniform3fv(gl.getUniformLocation(program, 'u_color'), color)
			gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0)
		}
		gl.bindVertexArray(null)
		gl.enable(gl.CULL_FACE)
		gl.disable(gl.BLEND)
	}
	renderSelection(x, y, z) {
		const gl = this.gl
		if (!this.selectionVAO) {
			this.selectionVAO = gl.createVertexArray()
			this.selectionVBO = gl.createBuffer()
			gl.bindVertexArray(this.selectionVAO)
			gl.bindBuffer(gl.ARRAY_BUFFER, this.selectionVBO)
			gl.enableVertexAttribArray(0)
			gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0)
			gl.bindVertexArray(null)
		}
		const vertices = [
			x, y, z + 0.01, x+1, y, z + 0.01,
			x+1, y, z + 0.01, x+1, y+1, z + 0.01,
			x+1, y+1, z + 0.01, x, y+1, z + 0.01,
			x, y+1, z + 0.01, x, y, z + 0.01
		]
		gl.bindBuffer(gl.ARRAY_BUFFER, this.selectionVBO)
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW)
		gl.depthMask(false)
		gl.enable(gl.BLEND)
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
		const program = this.shaders.use('grid')
		gl.uniformMatrix4fv(gl.getUniformLocation(program, 'u_projection'), false, this.projMatrix)
		gl.uniformMatrix4fv(gl.getUniformLocation(program, 'u_view'), false, this.viewMatrix)
		gl.uniform4f(gl.getUniformLocation(program, 'u_color'), 1, 1, 0, 0.8)
		gl.bindVertexArray(this.selectionVAO)
		gl.drawArrays(gl.LINES, 0, 8)
		gl.bindVertexArray(null)
		gl.depthMask(true)
		gl.disable(gl.BLEND)
	}
	screenToWorld(sx, sy, z = 0) {
		const invProj = mat4.create()
		const invView = mat4.create()
		mat4.invert(invProj, this.projMatrix)
		mat4.invert(invView, this.viewMatrix)
		const ndcX = (sx / this.canvas.width) * 2 - 1
		const ndcY = 1 - (sy / this.canvas.height) * 2
		const nearPoint = vec3.fromValues(ndcX, ndcY, -1)
		const farPoint = vec3.fromValues(ndcX, ndcY, 1)
		vec3.transformMat4(nearPoint, nearPoint, invProj)
		vec3.transformMat4(farPoint, farPoint, invProj)
		vec3.transformMat4(nearPoint, nearPoint, invView)
		vec3.transformMat4(farPoint, farPoint, invView)
		const dir = vec3.create()
		vec3.subtract(dir, farPoint, nearPoint)
		vec3.normalize(dir, dir)
		if (Math.abs(dir[2]) < 0.0001) return null
		const t = (z - nearPoint[2]) / dir[2]
		if (t < 0) return null
		return {
			x: nearPoint[0] + dir[0] * t,
			y: nearPoint[1] + dir[1] * t,
			z: z
		}
	}
	setVisibility(visibilitySystem) {
		this.visibility = visibilitySystem
	}
	setPlayerZ(z) {
		this.playerZ = z
	}
	buildSilhouetteMesh(occludedTiles, resources) {
		const gl = this.gl
		const positions = []
		const indices = []
		let idx = 0
		for (const tile of occludedTiles) {
			const { x, y, z } = tile
			positions.push(x, y, z, x+1, y, z, x+1, y+1, z, x, y+1, z)
			indices.push(idx, idx+1, idx+2, idx, idx+2, idx+3)
			idx += 4
		}
		if (this.silhouetteVAO) gl.deleteVertexArray(this.silhouetteVAO)
		if (this.silhouetteVBO) gl.deleteBuffer(this.silhouetteVBO)
		if (this.silhouetteIBO) gl.deleteBuffer(this.silhouetteIBO)
		if (positions.length === 0) {
			this.silhouetteIndexCount = 0
			return
		}
		this.silhouetteVAO = gl.createVertexArray()
		this.silhouetteVBO = gl.createBuffer()
		this.silhouetteIBO = gl.createBuffer()
		gl.bindVertexArray(this.silhouetteVAO)
		gl.bindBuffer(gl.ARRAY_BUFFER, this.silhouetteVBO)
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.DYNAMIC_DRAW)
		gl.enableVertexAttribArray(0)
		gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0)
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.silhouetteIBO)
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(indices), gl.DYNAMIC_DRAW)
		gl.bindVertexArray(null)
		this.silhouetteIndexCount = indices.length
	}
	buildWallMesh(tiles, worldGen) {
		const gl = this.gl
		const positions = []
		const normals = []
		const uvs = []
		const indices = []
		let idx = 0
		for (const tile of tiles) {
			const { x, y, z, wallN, wallS, wallE, wallW } = tile
			const wallH = 1.0
			if (wallN) {
				positions.push(x, y+1, z, x+1, y+1, z, x+1, y+1, z+wallH, x, y+1, z+wallH)
				for (let i = 0; i < 4; i++) normals.push(0, 1, 0)
				uvs.push(0, 0, 1, 0, 1, 1, 0, 1)
				indices.push(idx, idx+1, idx+2, idx, idx+2, idx+3)
				idx += 4
			}
			if (wallS) {
				positions.push(x+1, y, z, x, y, z, x, y, z+wallH, x+1, y, z+wallH)
				for (let i = 0; i < 4; i++) normals.push(0, -1, 0)
				uvs.push(0, 0, 1, 0, 1, 1, 0, 1)
				indices.push(idx, idx+1, idx+2, idx, idx+2, idx+3)
				idx += 4
			}
			if (wallE) {
				positions.push(x+1, y, z, x+1, y+1, z, x+1, y+1, z+wallH, x+1, y, z+wallH)
				for (let i = 0; i < 4; i++) normals.push(1, 0, 0)
				uvs.push(0, 0, 1, 0, 1, 1, 0, 1)
				indices.push(idx, idx+1, idx+2, idx, idx+2, idx+3)
				idx += 4
			}
			if (wallW) {
				positions.push(x, y+1, z, x, y, z, x, y, z+wallH, x, y+1, z+wallH)
				for (let i = 0; i < 4; i++) normals.push(-1, 0, 0)
				uvs.push(0, 0, 1, 0, 1, 1, 0, 1)
				indices.push(idx, idx+1, idx+2, idx, idx+2, idx+3)
				idx += 4
			}
		}
		if (this.wallVAO) gl.deleteVertexArray(this.wallVAO)
		if (this.wallVBO) gl.deleteBuffer(this.wallVBO)
		if (this.wallIBO) gl.deleteBuffer(this.wallIBO)
		if (positions.length === 0) {
			this.wallIndexCount = 0
			return
		}
		this.wallVAO = gl.createVertexArray()
		this.wallVBO = gl.createBuffer()
		this.wallIBO = gl.createBuffer()
		gl.bindVertexArray(this.wallVAO)
		const stride = 8
		const vertexData = new Float32Array(positions.length + normals.length + uvs.length)
		const vertexCount = positions.length / 3
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
		}
		gl.bindBuffer(gl.ARRAY_BUFFER, this.wallVBO)
		gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.DYNAMIC_DRAW)
		const byteStride = stride * 4
		gl.enableVertexAttribArray(0)
		gl.vertexAttribPointer(0, 3, gl.FLOAT, false, byteStride, 0)
		gl.enableVertexAttribArray(1)
		gl.vertexAttribPointer(1, 3, gl.FLOAT, false, byteStride, 12)
		gl.enableVertexAttribArray(2)
		gl.vertexAttribPointer(2, 2, gl.FLOAT, false, byteStride, 24)
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.wallIBO)
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(indices), gl.DYNAMIC_DRAW)
		gl.bindVertexArray(null)
		this.wallIndexCount = indices.length
	}
	renderSilhouettes() {
		if (!this.silhouetteVAO || this.silhouetteIndexCount === 0) return
		const gl = this.gl
		gl.enable(gl.BLEND)
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
		const program = this.shaders.use('silhouette')
		gl.uniformMatrix4fv(gl.getUniformLocation(program, 'u_projection'), false, this.projMatrix)
		gl.uniformMatrix4fv(gl.getUniformLocation(program, 'u_view'), false, this.viewMatrix)
		gl.uniform3f(gl.getUniformLocation(program, 'u_silhouetteColor'), 0.25, 0.25, 0.25)
		gl.uniform1f(gl.getUniformLocation(program, 'u_alpha'), 0.6)
		gl.uniform1f(gl.getUniformLocation(program, 'u_fogStart'), this.camera.distance * 0.5)
		gl.uniform1f(gl.getUniformLocation(program, 'u_fogEnd'), this.camera.distance * 2)
		gl.bindVertexArray(this.silhouetteVAO)
		gl.drawElements(gl.TRIANGLES, this.silhouetteIndexCount, gl.UNSIGNED_INT, 0)
		gl.bindVertexArray(null)
		gl.disable(gl.BLEND)
	}
	renderWalls() {
		if (!this.wallVAO || this.wallIndexCount === 0) return
		const gl = this.gl
		const program = this.shaders.use('wall')
		gl.uniformMatrix4fv(gl.getUniformLocation(program, 'u_projection'), false, this.projMatrix)
		gl.uniformMatrix4fv(gl.getUniformLocation(program, 'u_view'), false, this.viewMatrix)
		gl.uniform1i(gl.getUniformLocation(program, 'u_useTexture'), 0)
		gl.uniform3f(gl.getUniformLocation(program, 'u_color'), 0.6, 0.5, 0.4)
		gl.uniform3fv(gl.getUniformLocation(program, 'u_ambientColor'), this.lighting.ambient.color)
		gl.uniform1f(gl.getUniformLocation(program, 'u_ambientIntensity'), this.lighting.ambient.intensity)
		gl.uniform3fv(gl.getUniformLocation(program, 'u_lightDir'), this.lighting.directional.direction)
		gl.uniform3fv(gl.getUniformLocation(program, 'u_lightColor'), this.lighting.directional.color)
		gl.uniform1f(gl.getUniformLocation(program, 'u_lightIntensity'), this.lighting.directional.intensity)
		gl.bindVertexArray(this.wallVAO)
		gl.drawElements(gl.TRIANGLES, this.wallIndexCount, gl.UNSIGNED_INT, 0)
		gl.bindVertexArray(null)
	}
	dispose() {
		const gl = this.gl
		if (this.terrainVAO) gl.deleteVertexArray(this.terrainVAO)
		if (this.terrainVBO) gl.deleteBuffer(this.terrainVBO)
		if (this.terrainIBO) gl.deleteBuffer(this.terrainIBO)
		if (this.gridVAO) gl.deleteVertexArray(this.gridVAO)
		if (this.gridVBO) gl.deleteBuffer(this.gridVBO)
		if (this.axisVAO) gl.deleteVertexArray(this.axisVAO)
		if (this.axisVBO) gl.deleteBuffer(this.axisVBO)
		if (this.entityVAO) gl.deleteVertexArray(this.entityVAO)
		if (this.entityVBO) gl.deleteBuffer(this.entityVBO)
		if (this.silhouetteVAO) gl.deleteVertexArray(this.silhouetteVAO)
		if (this.silhouetteVBO) gl.deleteBuffer(this.silhouetteVBO)
		if (this.silhouetteIBO) gl.deleteBuffer(this.silhouetteIBO)
		if (this.wallVAO) gl.deleteVertexArray(this.wallVAO)
		if (this.wallVBO) gl.deleteBuffer(this.wallVBO)
		if (this.wallIBO) gl.deleteBuffer(this.wallIBO)
	}
}
