import { type Vec3 } from '@engine/common'
import { type AABB, type Ray, type RayHit, aabbOverlap, vecSub, vecCross, vecDot, vecLen, vecNorm, vecAdd, vecMul } from './collider'

export interface Triangle {
	v0: Vec3
	v1: Vec3
	v2: Vec3
	normal: Vec3
}

export interface BvhNode {
	aabb: AABB
	left: BvhNode | null
	right: BvhNode | null
	triIdx: number[]
}

const MAX_TRIS_PER_LEAF = 4
const MAX_DEPTH = 20

export class Bvh {
	root: BvhNode
	triangles: Triangle[]

	constructor(verts: Vec3[], indices: number[]) {
		this.triangles = []
		for (let i = 0; i < indices.length; i += 3) {
			const v0 = verts[indices[i]]
			const v1 = verts[indices[i + 1]]
			const v2 = verts[indices[i + 2]]
			this.triangles.push({
				v0,
				v1,
				v2,
				normal: triNormal(v0, v1, v2)
			})
		}
		const allIndices = this.triangles.map((_, i) => i)
		this.root = this.build(allIndices, 0)
	}

	build(triIndices: number[], depth: number): BvhNode {
		const aabb = this.calAABB(triIndices)
		if (triIndices.length <= MAX_TRIS_PER_LEAF || depth >= MAX_DEPTH) {
			return { aabb, left: null, right: null, triIdx: triIndices }
		}
		const axis = this.longestAxis(aabb)
		const sorted = [...triIndices].sort((a, b) => {
			const ca = this.triCenter(a)
			const cb = this.triCenter(b)
			return axis === 0 ? ca.x - cb.x : axis === 1 ? ca.y - cb.y : ca.z - cb.z
		})
		const mid = Math.floor(sorted.length / 2)
		const leftIndices = sorted.slice(0, mid)
		const rightIndices = sorted.slice(mid)
		if (leftIndices.length === 0 || rightIndices.length === 0) {
			return { aabb, left: null, right: null, triIdx: triIndices }
		}
		return {
			aabb,
			left: this.build(leftIndices, depth + 1),
			right: this.build(rightIndices, depth + 1),
			triIdx: []
		}
	}

	private calAABB(triIndices: number[]): AABB {
		let minX = Infinity, minY = Infinity, minZ = Infinity
		let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity
		for (const idx of triIndices) {
			const tri = this.triangles[idx]
			for (const v of [tri.v0, tri.v1, tri.v2]) {
				if (v.x < minX) minX = v.x
				if (v.y < minY) minY = v.y
				if (v.z < minZ) minZ = v.z
				if (v.x > maxX) maxX = v.x
				if (v.y > maxY) maxY = v.y
				if (v.z > maxZ) maxZ = v.z
			}
		}
		return {
			min: { x: minX, y: minY, z: minZ },
			max: { x: maxX, y: maxY, z: maxZ }
		}
	}

	private longestAxis(aabb: AABB): number {
		const dx = aabb.max.x - aabb.min.x
		const dy = aabb.max.y - aabb.min.y
		const dz = aabb.max.z - aabb.min.z
		if (dx >= dy && dx >= dz) return 0
		if (dy >= dz) return 1
		return 2
	}

	private triCenter(idx: number): Vec3 {
		const tri = this.triangles[idx]
		return {
			x: (tri.v0.x + tri.v1.x + tri.v2.x) / 3,
			y: (tri.v0.y + tri.v1.y + tri.v2.y) / 3,
			z: (tri.v0.z + tri.v1.z + tri.v2.z) / 3
		}
	}

	query(aabb: AABB): number[] {
		const result: number[] = []
		this.queryNode(this.root, aabb, result)
		return result
	}

	private queryNode(node: BvhNode, aabb: AABB, result: number[]) {
		if (!aabbOverlap(node.aabb, aabb)) return
		if (node.triIdx.length > 0) {
			for (const idx of node.triIdx) {
				const tri = this.triangles[idx]
				const triAABB = triToAABB(tri)
				if (aabbOverlap(triAABB, aabb)) {
					result.push(idx)
				}
			}
			return
		}
		if (node.left) this.queryNode(node.left, aabb, result)
		if (node.right) this.queryNode(node.right, aabb, result)
	}

	raycast(ray: Ray): RayHit {
		let closest: RayHit = { hit: false, point: { x: 0, y: 0, z: 0 }, normal: { x: 0, y: 0, z: 0 }, dist: Infinity, entityId: 0 }
		this.raycastNode(this.root, ray, closest)
		return closest
	}

	private raycastNode(node: BvhNode, ray: Ray, closest: { hit: boolean, point: Vec3, normal: Vec3, dist: number, entityId: number }) {
		if (!rayIntersectsAABB(ray, node.aabb, closest.dist)) return
		if (node.triIdx.length > 0) {
			for (const idx of node.triIdx) {
				const tri = this.triangles[idx]
				const hit = rayTriangle(ray, tri)
				if (hit.hit && hit.dist < closest.dist) {
					closest.hit = true
					closest.point = hit.point
					closest.normal = hit.normal
					closest.dist = hit.dist
				}
			}
			return
		}
		if (node.left) this.raycastNode(node.left, ray, closest)
		if (node.right) this.raycastNode(node.right, ray, closest)
	}

	sphereQuery(center: Vec3, radius: number): number[] {
		const aabb: AABB = {
			min: { x: center.x - radius, y: center.y - radius, z: center.z - radius },
			max: { x: center.x + radius, y: center.y + radius, z: center.z + radius }
		}
		const candidates = this.query(aabb)
		const result: number[] = []
		for (const idx of candidates) {
			const tri = this.triangles[idx]
			if (sphereIntersectsTri(center, radius, tri)) {
				result.push(idx)
			}
		}
		return result
	}
}

export function triNormal(v0: Vec3, v1: Vec3, v2: Vec3): Vec3 {
	const e1 = vecSub(v1, v0)
	const e2 = vecSub(v2, v0)
	return vecNorm(vecCross(e1, e2))
}

export function triToAABB(tri: Triangle): AABB {
	return {
		min: {
			x: Math.min(tri.v0.x, tri.v1.x, tri.v2.x),
			y: Math.min(tri.v0.y, tri.v1.y, tri.v2.y),
			z: Math.min(tri.v0.z, tri.v1.z, tri.v2.z)
		},
		max: {
			x: Math.max(tri.v0.x, tri.v1.x, tri.v2.x),
			y: Math.max(tri.v0.y, tri.v1.y, tri.v2.y),
			z: Math.max(tri.v0.z, tri.v1.z, tri.v2.z)
		}
	}
}

export function rayTriangle(ray: Ray, tri: Triangle): RayHit {
	const result: RayHit = { hit: false, point: { x: 0, y: 0, z: 0 }, normal: { x: 0, y: 0, z: 0 }, dist: Infinity, entityId: 0 }
	const e1 = vecSub(tri.v1, tri.v0)
	const e2 = vecSub(tri.v2, tri.v0)
	const h = vecCross(ray.dir, e2)
	const a = vecDot(e1, h)
	if (Math.abs(a) < 0.0001) return result
	const f = 1 / a
	const s = vecSub(ray.origin, tri.v0)
	const u = f * vecDot(s, h)
	if (u < 0 || u > 1) return result
	const q = vecCross(s, e1)
	const v = f * vecDot(ray.dir, q)
	if (v < 0 || u + v > 1) return result
	const t = f * vecDot(e2, q)
	if (t < 0 || t > ray.maxDist) return result
	result.hit = true
	result.dist = t
	result.point = vecAdd(ray.origin, vecMul(ray.dir, t))
	result.normal = tri.normal
	return result
}

function rayIntersectsAABB(ray: Ray, aabb: AABB, maxDist: number): boolean {
	const invDirX = ray.dir.x !== 0 ? 1 / ray.dir.x : Infinity
	const invDirY = ray.dir.y !== 0 ? 1 / ray.dir.y : Infinity
	const invDirZ = ray.dir.z !== 0 ? 1 / ray.dir.z : Infinity
	const t1 = (aabb.min.x - ray.origin.x) * invDirX
	const t2 = (aabb.max.x - ray.origin.x) * invDirX
	const t3 = (aabb.min.y - ray.origin.y) * invDirY
	const t4 = (aabb.max.y - ray.origin.y) * invDirY
	const t5 = (aabb.min.z - ray.origin.z) * invDirZ
	const t6 = (aabb.max.z - ray.origin.z) * invDirZ
	const tMin = Math.max(Math.min(t1, t2), Math.min(t3, t4), Math.min(t5, t6))
	const tMax = Math.min(Math.max(t1, t2), Math.max(t3, t4), Math.max(t5, t6))
	return tMax >= 0 && tMin <= tMax && tMin <= maxDist
}

export function sphereIntersectsTri(center: Vec3, radius: number, tri: Triangle): boolean {
	const closest = closestPointOnTriangle(center, tri)
	const d = vecSub(center, closest)
	return vecLen(d) <= radius
}

export function closestPointOnTriangle(p: Vec3, tri: Triangle): Vec3 {
	const ab = vecSub(tri.v1, tri.v0)
	const ac = vecSub(tri.v2, tri.v0)
	const ap = vecSub(p, tri.v0)
	const d1 = vecDot(ab, ap)
	const d2 = vecDot(ac, ap)
	if (d1 <= 0 && d2 <= 0) return tri.v0
	const bp = vecSub(p, tri.v1)
	const d3 = vecDot(ab, bp)
	const d4 = vecDot(ac, bp)
	if (d3 >= 0 && d4 <= d3) return tri.v1
	const vc = d1 * d4 - d3 * d2
	if (vc <= 0 && d1 >= 0 && d3 <= 0) {
		const v = d1 / (d1 - d3)
		return vecAdd(tri.v0, vecMul(ab, v))
	}
	const cp = vecSub(p, tri.v2)
	const d5 = vecDot(ab, cp)
	const d6 = vecDot(ac, cp)
	if (d6 >= 0 && d5 <= d6) return tri.v2
	const vb = d5 * d2 - d1 * d6
	if (vb <= 0 && d2 >= 0 && d6 <= 0) {
		const w = d2 / (d2 - d6)
		return vecAdd(tri.v0, vecMul(ac, w))
	}
	const va = d3 * d6 - d5 * d4
	if (va <= 0 && (d4 - d3) >= 0 && (d5 - d6) >= 0) {
		const w = (d4 - d3) / ((d4 - d3) + (d5 - d6))
		return vecAdd(tri.v1, vecMul(vecSub(tri.v2, tri.v1), w))
	}
	const denom = 1 / (va + vb + vc)
	const v = vb * denom
	const w = vc * denom
	return vecAdd(tri.v0, vecAdd(vecMul(ab, v), vecMul(ac, w)))
}

export interface SphereTriHit {
	point: Vec3
	normal: Vec3
	depth: number
}

export function sphereTriangleCollision(center: Vec3, radius: number, tri: Triangle): SphereTriHit | null {
	const closest = closestPointOnTriangle(center, tri)
	const d = vecSub(center, closest)
	const distSq = d.x * d.x + d.y * d.y + d.z * d.z
	if (distSq > radius * radius) return null
	const dist = Math.sqrt(distSq)
	const normal = dist > 0.0001 ? vecMul(d, 1 / dist) : tri.normal
	return {
		point: closest,
		normal,
		depth: radius - dist
	}
}
