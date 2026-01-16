import type { Vec3, EntityId } from '@engine/common'

export interface AABB {
	min: Vec3
	max: Vec3
}

export interface OcclusionObj {
	id: EntityId
	bounds: AABB
	visible: boolean
	lastVisible: number
}

export interface FrustumPlane {
	normal: Vec3
	dist: number
}

export interface Frustum {
	planes: FrustumPlane[]
}

export class OcclusionCuller {
	objects: Map<EntityId, OcclusionObj>
	visibleSet: Set<EntityId>
	queryPool: WebGLQuery[]
	pendingQueries: Map<EntityId, WebGLQuery>
	gl: WebGL2RenderingContext | null
	enabled: boolean
	frustumCulling: boolean
	occlusionQuery: boolean
	frameCount: number
	queryInterval: number

	constructor() {
		this.objects = new Map()
		this.visibleSet = new Set()
		this.queryPool = []
		this.pendingQueries = new Map()
		this.gl = null
		this.enabled = true
		this.frustumCulling = true
		this.occlusionQuery = true
		this.frameCount = 0
		this.queryInterval = 3
	}

	setGL(gl: WebGL2RenderingContext) {
		this.gl = gl
	}

	add(id: EntityId, bounds: AABB) {
		this.objects.set(id, {
			id,
			bounds,
			visible: true,
			lastVisible: 0
		})
		this.visibleSet.add(id)
	}

	remove(id: EntityId) {
		this.objects.delete(id)
		this.visibleSet.delete(id)
		const query = this.pendingQueries.get(id)
		if (query) {
			this.queryPool.push(query)
			this.pendingQueries.delete(id)
		}
	}

	updBounds(id: EntityId, bounds: AABB) {
		const obj = this.objects.get(id)
		if (obj) {
			obj.bounds = bounds
		}
	}

	extractFrustum(viewProj: Float32Array): Frustum {
		const m = viewProj
		const planes: FrustumPlane[] = []
		planes.push(this.normPlane(m[3] + m[0], m[7] + m[4], m[11] + m[8], m[15] + m[12]))
		planes.push(this.normPlane(m[3] - m[0], m[7] - m[4], m[11] - m[8], m[15] - m[12]))
		planes.push(this.normPlane(m[3] + m[1], m[7] + m[5], m[11] + m[9], m[15] + m[13]))
		planes.push(this.normPlane(m[3] - m[1], m[7] - m[5], m[11] - m[9], m[15] - m[13]))
		planes.push(this.normPlane(m[3] + m[2], m[7] + m[6], m[11] + m[10], m[15] + m[14]))
		planes.push(this.normPlane(m[3] - m[2], m[7] - m[6], m[11] - m[10], m[15] - m[14]))
		return { planes }
	}

	private normPlane(a: number, b: number, c: number, d: number): FrustumPlane {
		const len = Math.sqrt(a * a + b * b + c * c)
		return {
			normal: { x: a / len, y: b / len, z: c / len },
			dist: d / len
		}
	}

	testAABBFrustum(bounds: AABB, frustum: Frustum): boolean {
		for (const plane of frustum.planes) {
			const px = plane.normal.x > 0 ? bounds.max.x : bounds.min.x
			const py = plane.normal.y > 0 ? bounds.max.y : bounds.min.y
			const pz = plane.normal.z > 0 ? bounds.max.z : bounds.min.z
			const dist = plane.normal.x * px + plane.normal.y * py + plane.normal.z * pz + plane.dist
			if (dist < 0) return false
		}
		return true
	}

	cull(viewProj: Float32Array): Set<EntityId> {
		if (!this.enabled) {
			return new Set(this.objects.keys())
		}
		this.frameCount++
		const frustum = this.extractFrustum(viewProj)
		this.visibleSet.clear()
		for (const [id, obj] of this.objects) {
			let visible = true
			if (this.frustumCulling) {
				visible = this.testAABBFrustum(obj.bounds, frustum)
			}
			if (visible && this.occlusionQuery && this.gl) {
				visible = this.checkOcclusionQuery(id, obj)
			}
			obj.visible = visible
			if (visible) {
				obj.lastVisible = this.frameCount
				this.visibleSet.add(id)
			}
		}
		return this.visibleSet
	}

	private checkOcclusionQuery(id: EntityId, obj: OcclusionObj): boolean {
		if (!this.gl) return true
		const pending = this.pendingQueries.get(id)
		if (pending) {
			const available = this.gl.getQueryParameter(pending, this.gl.QUERY_RESULT_AVAILABLE)
			if (available) {
				const result = this.gl.getQueryParameter(pending, this.gl.QUERY_RESULT)
				this.queryPool.push(pending)
				this.pendingQueries.delete(id)
				return result > 0
			}
			return obj.visible
		}
		if ((this.frameCount - obj.lastVisible) % this.queryInterval === 0) {
			this.startOcclusionQuery(id)
		}
		return obj.visible
	}

	private startOcclusionQuery(id: EntityId) {
		if (!this.gl) return
		let query = this.queryPool.pop()
		if (!query) {
			query = this.gl.createQuery()!
		}
		this.gl.beginQuery(this.gl.ANY_SAMPLES_PASSED_CONSERVATIVE, query)
		this.pendingQueries.set(id, query)
	}

	endOcclusionQuery() {
		if (!this.gl) return
		if (this.pendingQueries.size > 0) {
			this.gl.endQuery(this.gl.ANY_SAMPLES_PASSED_CONSERVATIVE)
		}
	}

	isVisible(id: EntityId): boolean {
		return this.visibleSet.has(id)
	}

	getVisibleCnt(): number {
		return this.visibleSet.size
	}

	getTotalCnt(): number {
		return this.objects.size
	}

	getCulledCnt(): number {
		return this.objects.size - this.visibleSet.size
	}

	setEnabled(enabled: boolean) {
		this.enabled = enabled
	}

	setFrustumCulling(enabled: boolean) {
		this.frustumCulling = enabled
	}

	setOcclusionQuery(enabled: boolean) {
		this.occlusionQuery = enabled
	}

	clr() {
		this.objects.clear()
		this.visibleSet.clear()
		for (const query of this.pendingQueries.values()) {
			this.queryPool.push(query)
		}
		this.pendingQueries.clear()
	}

	dispose() {
		if (!this.gl) return
		for (const query of this.queryPool) {
			this.gl.deleteQuery(query)
		}
		for (const query of this.pendingQueries.values()) {
			this.gl.deleteQuery(query)
		}
		this.queryPool = []
		this.pendingQueries.clear()
	}
}

export function calAABBFromVerts(verts: Float32Array, stride: number): AABB {
	const min: Vec3 = { x: Infinity, y: Infinity, z: Infinity }
	const max: Vec3 = { x: -Infinity, y: -Infinity, z: -Infinity }
	for (let i = 0; i < verts.length; i += stride) {
		min.x = Math.min(min.x, verts[i])
		min.y = Math.min(min.y, verts[i + 1])
		min.z = Math.min(min.z, verts[i + 2])
		max.x = Math.max(max.x, verts[i])
		max.y = Math.max(max.y, verts[i + 1])
		max.z = Math.max(max.z, verts[i + 2])
	}
	return { min, max }
}

export function transformAABB(bounds: AABB, modelMtx: Float32Array): AABB {
	const corners: Vec3[] = [
		{ x: bounds.min.x, y: bounds.min.y, z: bounds.min.z },
		{ x: bounds.max.x, y: bounds.min.y, z: bounds.min.z },
		{ x: bounds.min.x, y: bounds.max.y, z: bounds.min.z },
		{ x: bounds.max.x, y: bounds.max.y, z: bounds.min.z },
		{ x: bounds.min.x, y: bounds.min.y, z: bounds.max.z },
		{ x: bounds.max.x, y: bounds.min.y, z: bounds.max.z },
		{ x: bounds.min.x, y: bounds.max.y, z: bounds.max.z },
		{ x: bounds.max.x, y: bounds.max.y, z: bounds.max.z }
	]
	const min: Vec3 = { x: Infinity, y: Infinity, z: Infinity }
	const max: Vec3 = { x: -Infinity, y: -Infinity, z: -Infinity }
	for (const c of corners) {
		const tx = modelMtx[0] * c.x + modelMtx[4] * c.y + modelMtx[8] * c.z + modelMtx[12]
		const ty = modelMtx[1] * c.x + modelMtx[5] * c.y + modelMtx[9] * c.z + modelMtx[13]
		const tz = modelMtx[2] * c.x + modelMtx[6] * c.y + modelMtx[10] * c.z + modelMtx[14]
		min.x = Math.min(min.x, tx)
		min.y = Math.min(min.y, ty)
		min.z = Math.min(min.z, tz)
		max.x = Math.max(max.x, tx)
		max.y = Math.max(max.y, ty)
		max.z = Math.max(max.z, tz)
	}
	return { min, max }
}
