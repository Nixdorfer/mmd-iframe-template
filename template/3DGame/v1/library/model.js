const ModelLoader = {
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
	},
	async load(url) {
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
		const texture = new Image()
		await new Promise((resolve, reject) => {
			texture.onload = resolve
			texture.onerror = reject
			texture.src = textureUrl
		})
		return new Model(modelData, texture)
	}
}
class Model {
	constructor(data, texture) {
		this.name = data.name || 'unnamed'
		this.vertices = data.vertices || []
		this.faces = data.faces || []
		this.origin = data.origin || [0, 0, 0]
		this.scale = data.scale || 1
		this.texture = texture
	}
	projectVertex(vx, vy, vz, worldX, worldY, worldZ, rotation) {
		const cos = Math.cos(rotation)
		const sin = Math.sin(rotation)
		const rx = vx * cos - vy * sin
		const ry = vx * sin + vy * cos
		const rz = vz
		const wx = worldX + rx * this.scale
		const wy = worldY + ry * this.scale
		const wz = worldZ + rz * this.scale
		const TILE_W = 64
		const TILE_H = 32
		const screenX = (wx - wy) * (TILE_W / 2)
		const screenY = (wx + wy) * (TILE_H / 2) - wz * TILE_H
		return { x: screenX, y: screenY, depth: wx + wy + wz }
	}
	render(ctx, worldX, worldY, worldZ, rotation = 0, camera = { x: 0, y: 0 }, canvasWidth = 960, canvasHeight = 640) {
		const projectedFaces = []
		for (const face of this.faces) {
			const projectedVerts = []
			let totalDepth = 0
			for (const vi of face.v) {
				const v = this.vertices[vi]
				const ox = v[0] - this.origin[0]
				const oy = v[1] - this.origin[1]
				const oz = v[2] - this.origin[2]
				const proj = this.projectVertex(ox, oy, oz, worldX, worldY, worldZ, rotation)
				proj.x = proj.x - camera.x + canvasWidth / 2
				proj.y = proj.y - camera.y + canvasHeight / 2
				projectedVerts.push(proj)
				totalDepth += proj.depth
			}
			projectedFaces.push({
				verts: projectedVerts,
				depth: totalDepth / face.v.length,
				color: face.color || '#888888',
				uv: face.uv
			})
		}
		projectedFaces.sort((a, b) => a.depth - b.depth)
		for (const pf of projectedFaces) {
			ctx.beginPath()
			ctx.moveTo(pf.verts[0].x, pf.verts[0].y)
			for (let i = 1; i < pf.verts.length; i++) {
				ctx.lineTo(pf.verts[i].x, pf.verts[i].y)
			}
			ctx.closePath()
			if (pf.uv && this.texture) {
				ctx.save()
				ctx.clip()
				this.renderTexturedFace(ctx, pf)
				ctx.restore()
			} else {
				ctx.fillStyle = pf.color
				ctx.fill()
			}
			ctx.strokeStyle = 'rgba(0,0,0,0.3)'
			ctx.lineWidth = 1
			ctx.stroke()
		}
	}
	renderTexturedFace(ctx, pf) {
		if (pf.verts.length < 3 || !pf.uv || pf.uv.length < 3) {
			ctx.fillStyle = pf.color
			ctx.fill()
			return
		}
		const x0 = pf.verts[0].x, y0 = pf.verts[0].y
		const x1 = pf.verts[1].x, y1 = pf.verts[1].y
		const x2 = pf.verts[2].x, y2 = pf.verts[2].y
		const u0 = pf.uv[0][0] * this.texture.width, v0 = pf.uv[0][1] * this.texture.height
		const u1 = pf.uv[1][0] * this.texture.width, v1 = pf.uv[1][1] * this.texture.height
		const u2 = pf.uv[2][0] * this.texture.width, v2 = pf.uv[2][1] * this.texture.height
		const det = (u1 - u0) * (v2 - v0) - (u2 - u0) * (v1 - v0)
		if (Math.abs(det) < 0.001) {
			ctx.fillStyle = pf.color
			ctx.fill()
			return
		}
		const a = ((x1 - x0) * (v2 - v0) - (x2 - x0) * (v1 - v0)) / det
		const b = ((x2 - x0) * (v1 - v0) - (x1 - x0) * (v2 - v0)) / det
		const c = x0 - a * u0 - b * v0
		const d = ((y1 - y0) * (v2 - v0) - (y2 - y0) * (v1 - v0)) / det
		const e = ((y2 - y0) * (v1 - v0) - (y1 - y0) * (v2 - v0)) / det
		const f = y0 - d * u0 - e * v0
		ctx.save()
		ctx.transform(a, d, b, e, c, f)
		ctx.drawImage(this.texture, 0, 0)
		ctx.restore()
	}
	getSortY(worldX, worldY, worldZ) {
		return worldX + worldY + worldZ * 0.5
	}
}
