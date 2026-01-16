import { GLContext } from '../gl/context'
import { VAO } from '../gl/buf'
import { Shader } from '../gl/shd'
import { Texture } from '../gl/tex'
import { ENTITY_STRIDE, entityVertexLayout } from '../shaders/entity'
import { type EntityId, type Vec3, type Transform } from '@engine/common'
import { RndMode, type RndCfg } from '../gl/rnd-mode'

export interface MeshData {
	verts: Float32Array
	indices: Uint16Array
}

export interface EntityMesh {
	id: string
	vao: VAO
	vertCnt: number
	tex: Texture | null
}

export interface EntityRenderInstance {
	entityId: EntityId
	meshId: string
	transform: Transform
	tint: [number, number, number, number]
	visible: boolean
}

export interface BillboardInstance {
	id: EntityId
	pos: Vec3
	size: [number, number]
	tex: Texture | null
	tint: [number, number, number, number]
}

export class EntityRenderer {
	ctx: GLContext
	meshes: Map<string, EntityMesh>
	instances: Map<EntityId, EntityRenderInstance>
	billboards: Map<EntityId, BillboardInstance>
	shader: Shader | null
	billboardShader: Shader | null
	outlineShader: Shader | null
	billboardVao: VAO | null

	constructor(ctx: GLContext) {
		this.ctx = ctx
		this.meshes = new Map()
		this.instances = new Map()
		this.billboards = new Map()
		this.shader = null
		this.billboardShader = null
		this.outlineShader = null
		this.billboardVao = null
		this.iniBillboardVao()
	}

	private iniBillboardVao() {
		const verts = new Float32Array([
			-0.5, -0.5, 0, 0, 0,
			 0.5, -0.5, 0, 1, 0,
			 0.5,  0.5, 0, 1, 1,
			-0.5,  0.5, 0, 0, 1
		])
		const indices = new Uint16Array([0, 1, 2, 0, 2, 3])
		this.billboardVao = new VAO(this.ctx.gl)
		this.billboardVao.setVerts(verts)
		this.billboardVao.setIndices(indices)
		this.billboardVao.setLayout([
			{ name: 'aPos', size: 3, type: this.ctx.gl.FLOAT, normalized: false, offset: 0 },
			{ name: 'aUV', size: 2, type: this.ctx.gl.FLOAT, normalized: false, offset: 12 }
		], 20)
	}

	setShader(shd: Shader) {
		this.shader = shd
	}

	setBillboardShader(shd: Shader) {
		this.billboardShader = shd
		if (this.billboardVao && this.billboardShader) {
			this.billboardVao.setup(name => this.billboardShader!.attr(name))
		}
	}

	setOutlineShader(shd: Shader) {
		this.outlineShader = shd
	}

	loadMesh(id: string, data: MeshData, tex: Texture | null = null) {
		const old = this.meshes.get(id)
		if (old) old.vao.dispose()
		const vao = new VAO(this.ctx.gl)
		vao.setVerts(data.verts)
		vao.setIndices(data.indices)
		vao.setLayout(entityVertexLayout(this.ctx.gl), ENTITY_STRIDE)
		if (this.shader) {
			vao.setup(name => this.shader!.attr(name))
		}
		this.meshes.set(id, { id, vao, vertCnt: data.indices.length, tex })
	}

	unloadMesh(id: string) {
		const mesh = this.meshes.get(id)
		if (mesh) {
			mesh.vao.dispose()
			this.meshes.delete(id)
		}
	}

	hasMesh(id: string): boolean {
		return this.meshes.has(id)
	}

	addInstance(entityId: EntityId, meshId: string, transform: Transform, tint: [number, number, number, number] = [1, 1, 1, 1]) {
		this.instances.set(entityId, {
			entityId,
			meshId,
			transform: { ...transform },
			tint,
			visible: true
		})
	}

	updInstance(entityId: EntityId, transform: Transform) {
		const inst = this.instances.get(entityId)
		if (inst) {
			inst.transform = { ...transform }
		}
	}

	setInstanceTint(entityId: EntityId, tint: [number, number, number, number]) {
		const inst = this.instances.get(entityId)
		if (inst) {
			inst.tint = tint
		}
	}

	setInstanceVisible(entityId: EntityId, visible: boolean) {
		const inst = this.instances.get(entityId)
		if (inst) {
			inst.visible = visible
		}
	}

	removeInstance(entityId: EntityId) {
		this.instances.delete(entityId)
	}

	addBillboard(id: EntityId, pos: Vec3, size: [number, number], tex: Texture | null, tint: [number, number, number, number] = [1, 1, 1, 1]) {
		this.billboards.set(id, {
			id,
			pos: { ...pos },
			size,
			tex,
			tint
		})
	}

	updBillboard(id: EntityId, pos: Vec3) {
		const bb = this.billboards.get(id)
		if (bb) {
			bb.pos = { ...pos }
		}
	}

	removeBillboard(id: EntityId) {
		this.billboards.delete(id)
	}

	private buildMtx(t: Transform): Float32Array {
		const { pos, rot, scl } = t
		const cx = Math.cos(rot.x), sx = Math.sin(rot.x)
		const cy = Math.cos(rot.y), sy = Math.sin(rot.y)
		const cz = Math.cos(rot.z), sz = Math.sin(rot.z)
		return new Float32Array([
			scl.x * (cy * cz), scl.x * (cy * sz), scl.x * (-sy), 0,
			scl.y * (sx * sy * cz - cx * sz), scl.y * (sx * sy * sz + cx * cz), scl.y * (sx * cy), 0,
			scl.z * (cx * sy * cz + sx * sz), scl.z * (cx * sy * sz - sx * cz), scl.z * (cx * cy), 0,
			pos.x, pos.y, pos.z, 1
		])
	}

	render(
		viewProj: Float32Array,
		view: Float32Array,
		ambient: [number, number, number],
		sunDir: [number, number, number],
		sunClr: [number, number, number],
		camPos: [number, number, number],
		rndCfg: RndCfg
	) {
		if (rndCfg.mode === RndMode.ANIME && rndCfg.outlineEntity) {
			this.renderOutline(viewProj, rndCfg)
		}
		this.renderEntities(viewProj, ambient, sunDir, sunClr, camPos, rndCfg)
		this.renderBillboards(viewProj, view)
	}

	private renderOutline(viewProj: Float32Array, rndCfg: RndCfg) {
		if (!this.outlineShader) return
		const { gl } = this.ctx
		gl.cullFace(gl.FRONT)
		this.outlineShader.use()
		this.outlineShader.setMat4('uViewProj', viewProj)
		this.outlineShader.setFloat('uOutlineWidth', rndCfg.outlineWidth)
		this.outlineShader.setVec3('uOutlineClr', rndCfg.outlineClr.x, rndCfg.outlineClr.y, rndCfg.outlineClr.z)
		for (const inst of this.instances.values()) {
			if (!inst.visible) continue
			const mesh = this.meshes.get(inst.meshId)
			if (!mesh) continue
			this.outlineShader.setMat4('uModel', this.buildMtx(inst.transform))
			mesh.vao.bind()
			gl.drawElements(gl.TRIANGLES, mesh.vertCnt, gl.UNSIGNED_SHORT, 0)
			mesh.vao.unbind()
		}
		gl.cullFace(gl.BACK)
	}

	private renderEntities(
		viewProj: Float32Array,
		ambient: [number, number, number],
		sunDir: [number, number, number],
		sunClr: [number, number, number],
		camPos: [number, number, number],
		rndCfg: RndCfg
	) {
		if (!this.shader) return
		const { gl } = this.ctx
		this.shader.use()
		this.shader.setMat4('uViewProj', viewProj)
		this.shader.setVec3('uAmbient', ...ambient)
		this.shader.setVec3('uSunDir', ...sunDir)
		this.shader.setVec3('uSunClr', ...sunClr)
		this.shader.setVec3('uCamPos', ...camPos)
		this.shader.setInt('uRndMode', rndCfg.mode)
		this.shader.setFloat('uSpecPower', rndCfg.specularPower)
		this.shader.setFloat('uRimPower', rndCfg.rimPower)
		this.shader.setFloat('uSmoothness', rndCfg.smoothness)
		this.shader.setFloat('uSteps', rndCfg.steps)
		for (const inst of this.instances.values()) {
			if (!inst.visible) continue
			const mesh = this.meshes.get(inst.meshId)
			if (!mesh) continue
			this.shader.setMat4('uModel', this.buildMtx(inst.transform))
			this.shader.setVec4('uTint', ...inst.tint)
			if (mesh.tex) {
				mesh.tex.bind(0)
				this.shader.setFloat('uUseTex', 1)
				this.shader.setInt('uTex', 0)
			} else {
				this.shader.setFloat('uUseTex', 0)
			}
			mesh.vao.bind()
			gl.drawElements(gl.TRIANGLES, mesh.vertCnt, gl.UNSIGNED_SHORT, 0)
			mesh.vao.unbind()
		}
	}

	private renderBillboards(viewProj: Float32Array, view: Float32Array) {
		if (!this.billboardShader || !this.billboardVao) return
		const { gl } = this.ctx
		this.billboardShader.use()
		this.billboardShader.setMat4('uViewProj', viewProj)
		this.billboardShader.setMat4('uView', view)
		this.billboardVao.bind()
		for (const bb of this.billboards.values()) {
			this.billboardShader.setVec3('uCenter', bb.pos.x, bb.pos.y, bb.pos.z)
			this.billboardShader.setVec2('uSize', bb.size[0], bb.size[1])
			this.billboardShader.setVec4('uTint', ...bb.tint)
			if (bb.tex) {
				bb.tex.bind(0)
				this.billboardShader.setInt('uTex', 0)
			}
			gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0)
		}
		this.billboardVao.unbind()
	}

	genCubeMesh(size: number = 1, clr: [number, number, number] = [1, 1, 1]): MeshData {
		const s = size / 2
		const verts: number[] = []
		const indices: number[] = []
		const faces: { n: [number, number, number]; v: [number, number, number][] }[] = [
			{ n: [0, 0, 1], v: [[-s, -s, s], [s, -s, s], [s, s, s], [-s, s, s]] },
			{ n: [0, 0, -1], v: [[-s, s, -s], [s, s, -s], [s, -s, -s], [-s, -s, -s]] },
			{ n: [1, 0, 0], v: [[s, -s, -s], [s, s, -s], [s, s, s], [s, -s, s]] },
			{ n: [-1, 0, 0], v: [[-s, -s, s], [-s, s, s], [-s, s, -s], [-s, -s, -s]] },
			{ n: [0, 1, 0], v: [[-s, s, s], [s, s, s], [s, s, -s], [-s, s, -s]] },
			{ n: [0, -1, 0], v: [[-s, -s, -s], [s, -s, -s], [s, -s, s], [-s, -s, s]] }
		]
		const uvs: [number, number][] = [[0, 0], [1, 0], [1, 1], [0, 1]]
		let idx = 0
		for (const face of faces) {
			for (let i = 0; i < 4; i++) {
				verts.push(
					face.v[i][0], face.v[i][1], face.v[i][2],
					face.n[0], face.n[1], face.n[2],
					uvs[i][0], uvs[i][1],
					clr[0], clr[1], clr[2]
				)
			}
			indices.push(idx, idx + 1, idx + 2, idx, idx + 2, idx + 3)
			idx += 4
		}
		return { verts: new Float32Array(verts), indices: new Uint16Array(indices) }
	}

	genSphereMesh(radius: number = 0.5, segments: number = 16, rings: number = 12, clr: [number, number, number] = [1, 1, 1]): MeshData {
		const verts: number[] = []
		const indices: number[] = []
		for (let r = 0; r <= rings; r++) {
			const theta = r * Math.PI / rings
			const sinT = Math.sin(theta)
			const cosT = Math.cos(theta)
			for (let s = 0; s <= segments; s++) {
				const phi = s * 2 * Math.PI / segments
				const sinP = Math.sin(phi)
				const cosP = Math.cos(phi)
				const x = cosP * sinT
				const y = sinP * sinT
				const z = cosT
				const u = s / segments
				const v = r / rings
				verts.push(
					x * radius, y * radius, z * radius,
					x, y, z,
					u, v,
					clr[0], clr[1], clr[2]
				)
			}
		}
		for (let r = 0; r < rings; r++) {
			for (let s = 0; s < segments; s++) {
				const cur = r * (segments + 1) + s
				const nxt = cur + segments + 1
				indices.push(cur, nxt, cur + 1)
				indices.push(cur + 1, nxt, nxt + 1)
			}
		}
		return { verts: new Float32Array(verts), indices: new Uint16Array(indices) }
	}

	genCapsuleMesh(radius: number = 0.3, height: number = 1, segments: number = 16, rings: number = 8, clr: [number, number, number] = [1, 1, 1]): MeshData {
		const verts: number[] = []
		const indices: number[] = []
		const halfH = height / 2 - radius
		for (let r = 0; r <= rings / 2; r++) {
			const theta = r * Math.PI / rings
			const sinT = Math.sin(theta)
			const cosT = Math.cos(theta)
			for (let s = 0; s <= segments; s++) {
				const phi = s * 2 * Math.PI / segments
				const x = Math.cos(phi) * sinT
				const y = Math.sin(phi) * sinT
				const z = cosT
				verts.push(
					x * radius, y * radius, z * radius + halfH,
					x, y, z,
					s / segments, r / rings,
					clr[0], clr[1], clr[2]
				)
			}
		}
		const midStart = verts.length / 11
		for (let s = 0; s <= segments; s++) {
			const phi = s * 2 * Math.PI / segments
			const x = Math.cos(phi)
			const y = Math.sin(phi)
			verts.push(
				x * radius, y * radius, halfH,
				x, y, 0,
				s / segments, 0.5,
				clr[0], clr[1], clr[2]
			)
		}
		for (let s = 0; s <= segments; s++) {
			const phi = s * 2 * Math.PI / segments
			const x = Math.cos(phi)
			const y = Math.sin(phi)
			verts.push(
				x * radius, y * radius, -halfH,
				x, y, 0,
				s / segments, 0.5,
				clr[0], clr[1], clr[2]
			)
		}
		const btmStart = verts.length / 11
		for (let r = rings / 2; r <= rings; r++) {
			const theta = r * Math.PI / rings
			const sinT = Math.sin(theta)
			const cosT = Math.cos(theta)
			for (let s = 0; s <= segments; s++) {
				const phi = s * 2 * Math.PI / segments
				const x = Math.cos(phi) * sinT
				const y = Math.sin(phi) * sinT
				const z = cosT
				verts.push(
					x * radius, y * radius, z * radius - halfH,
					x, y, z,
					s / segments, r / rings,
					clr[0], clr[1], clr[2]
				)
			}
		}
		for (let r = 0; r < rings / 2; r++) {
			for (let s = 0; s < segments; s++) {
				const cur = r * (segments + 1) + s
				const nxt = cur + segments + 1
				indices.push(cur, nxt, cur + 1)
				indices.push(cur + 1, nxt, nxt + 1)
			}
		}
		for (let s = 0; s < segments; s++) {
			const top = midStart + s
			const btm = midStart + segments + 1 + s
			indices.push(top, btm, top + 1)
			indices.push(top + 1, btm, btm + 1)
		}
		for (let r = 0; r < rings / 2; r++) {
			for (let s = 0; s < segments; s++) {
				const cur = btmStart + r * (segments + 1) + s
				const nxt = cur + segments + 1
				indices.push(cur, nxt, cur + 1)
				indices.push(cur + 1, nxt, nxt + 1)
			}
		}
		return { verts: new Float32Array(verts), indices: new Uint16Array(indices) }
	}

	dispose() {
		for (const mesh of this.meshes.values()) {
			mesh.vao.dispose()
		}
		this.meshes.clear()
		this.instances.clear()
		this.billboards.clear()
		this.billboardVao?.dispose()
	}
}
