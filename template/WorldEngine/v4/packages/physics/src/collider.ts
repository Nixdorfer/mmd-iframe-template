import { type Vec3, type EntityId, ColliderType } from '@engine/common'

export interface AABB {
	min: Vec3
	max: Vec3
}

export interface Sphere {
	center: Vec3
	radius: number
}

export interface Capsule {
	p1: Vec3
	p2: Vec3
	radius: number
}

export interface Ray {
	origin: Vec3
	dir: Vec3
	maxDist: number
}

export interface RayHit {
	hit: boolean
	point: Vec3
	normal: Vec3
	dist: number
	entityId: EntityId
}

export interface CollisionPair {
	a: EntityId
	b: EntityId
	point: Vec3
	normal: Vec3
	depth: number
}

export interface Collider {
	entityId: EntityId
	typ: ColliderType
	offset: Vec3
	isTrg: boolean
	enabled: boolean
	layer: number
	mask: number
	matId?: string
}

export interface BoxCollider extends Collider {
	typ: ColliderType.Box
	size: Vec3
}

export interface SphereCollider extends Collider {
	typ: ColliderType.Sphere
	radius: number
}

export interface CapsuleCollider extends Collider {
	typ: ColliderType.Capsule
	radius: number
	height: number
}

export interface MeshCollider extends Collider {
	typ: ColliderType.Mesh
	verts: Vec3[]
	indices: number[]
}

export type AnyCollider = BoxCollider | SphereCollider | CapsuleCollider | MeshCollider

export function createAABB(min: Vec3, max: Vec3): AABB {
	return { min: { ...min }, max: { ...max } }
}

export function aabbFromBox(center: Vec3, size: Vec3): AABB {
	return {
		min: { x: center.x - size.x / 2, y: center.y - size.y / 2, z: center.z - size.z / 2 },
		max: { x: center.x + size.x / 2, y: center.y + size.y / 2, z: center.z + size.z / 2 }
	}
}

export function aabbFromSphere(center: Vec3, radius: number): AABB {
	return {
		min: { x: center.x - radius, y: center.y - radius, z: center.z - radius },
		max: { x: center.x + radius, y: center.y + radius, z: center.z + radius }
	}
}

export function aabbOverlap(a: AABB, b: AABB): boolean {
	return a.min.x <= b.max.x && a.max.x >= b.min.x &&
		a.min.y <= b.max.y && a.max.y >= b.min.y &&
		a.min.z <= b.max.z && a.max.z >= b.min.z
}

export function aabbContains(aabb: AABB, point: Vec3): boolean {
	return point.x >= aabb.min.x && point.x <= aabb.max.x &&
		point.y >= aabb.min.y && point.y <= aabb.max.y &&
		point.z >= aabb.min.z && point.z <= aabb.max.z
}

export function sphereOverlap(a: Sphere, b: Sphere): boolean {
	const dx = b.center.x - a.center.x
	const dy = b.center.y - a.center.y
	const dz = b.center.z - a.center.z
	const distSq = dx * dx + dy * dy + dz * dz
	const radSum = a.radius + b.radius
	return distSq <= radSum * radSum
}

export function sphereAABBOverlap(sphere: Sphere, aabb: AABB): boolean {
	const closestX = Math.max(aabb.min.x, Math.min(sphere.center.x, aabb.max.x))
	const closestY = Math.max(aabb.min.y, Math.min(sphere.center.y, aabb.max.y))
	const closestZ = Math.max(aabb.min.z, Math.min(sphere.center.z, aabb.max.z))
	const dx = closestX - sphere.center.x
	const dy = closestY - sphere.center.y
	const dz = closestZ - sphere.center.z
	return dx * dx + dy * dy + dz * dz <= sphere.radius * sphere.radius
}

export function rayAABB(ray: Ray, aabb: AABB): RayHit {
	const result: RayHit = { hit: false, point: { x: 0, y: 0, z: 0 }, normal: { x: 0, y: 0, z: 0 }, dist: Infinity, entityId: 0 }
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
	if (tMax < 0 || tMin > tMax || tMin > ray.maxDist) return result
	result.hit = true
	result.dist = tMin >= 0 ? tMin : tMax
	result.point = {
		x: ray.origin.x + ray.dir.x * result.dist,
		y: ray.origin.y + ray.dir.y * result.dist,
		z: ray.origin.z + ray.dir.z * result.dist
	}
	const eps = 0.0001
	if (Math.abs(result.point.x - aabb.min.x) < eps) result.normal = { x: -1, y: 0, z: 0 }
	else if (Math.abs(result.point.x - aabb.max.x) < eps) result.normal = { x: 1, y: 0, z: 0 }
	else if (Math.abs(result.point.y - aabb.min.y) < eps) result.normal = { x: 0, y: -1, z: 0 }
	else if (Math.abs(result.point.y - aabb.max.y) < eps) result.normal = { x: 0, y: 1, z: 0 }
	else if (Math.abs(result.point.z - aabb.min.z) < eps) result.normal = { x: 0, y: 0, z: -1 }
	else result.normal = { x: 0, y: 0, z: 1 }
	return result
}

export function raySphere(ray: Ray, sphere: Sphere): RayHit {
	const result: RayHit = { hit: false, point: { x: 0, y: 0, z: 0 }, normal: { x: 0, y: 0, z: 0 }, dist: Infinity, entityId: 0 }
	const ocX = ray.origin.x - sphere.center.x
	const ocY = ray.origin.y - sphere.center.y
	const ocZ = ray.origin.z - sphere.center.z
	const a = ray.dir.x * ray.dir.x + ray.dir.y * ray.dir.y + ray.dir.z * ray.dir.z
	const b = 2 * (ocX * ray.dir.x + ocY * ray.dir.y + ocZ * ray.dir.z)
	const c = ocX * ocX + ocY * ocY + ocZ * ocZ - sphere.radius * sphere.radius
	const discriminant = b * b - 4 * a * c
	if (discriminant < 0) return result
	const sqrtD = Math.sqrt(discriminant)
	let t = (-b - sqrtD) / (2 * a)
	if (t < 0) t = (-b + sqrtD) / (2 * a)
	if (t < 0 || t > ray.maxDist) return result
	result.hit = true
	result.dist = t
	result.point = {
		x: ray.origin.x + ray.dir.x * t,
		y: ray.origin.y + ray.dir.y * t,
		z: ray.origin.z + ray.dir.z * t
	}
	const len = sphere.radius
	result.normal = {
		x: (result.point.x - sphere.center.x) / len,
		y: (result.point.y - sphere.center.y) / len,
		z: (result.point.z - sphere.center.z) / len
	}
	return result
}

export function closestPointOnSegment(p: Vec3, a: Vec3, b: Vec3): Vec3 {
	const abX = b.x - a.x, abY = b.y - a.y, abZ = b.z - a.z
	const apX = p.x - a.x, apY = p.y - a.y, apZ = p.z - a.z
	const ab2 = abX * abX + abY * abY + abZ * abZ
	if (ab2 === 0) return { ...a }
	let t = (apX * abX + apY * abY + apZ * abZ) / ab2
	t = Math.max(0, Math.min(1, t))
	return { x: a.x + abX * t, y: a.y + abY * t, z: a.z + abZ * t }
}

export function distSq(a: Vec3, b: Vec3): number {
	const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z
	return dx * dx + dy * dy + dz * dz
}

export function dist(a: Vec3, b: Vec3): number {
	return Math.sqrt(distSq(a, b))
}

export function vecLen(v: Vec3): number {
	return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z)
}

export function vecNorm(v: Vec3): Vec3 {
	const len = vecLen(v)
	if (len === 0) return { x: 0, y: 0, z: 0 }
	return { x: v.x / len, y: v.y / len, z: v.z / len }
}

export function vecDot(a: Vec3, b: Vec3): number {
	return a.x * b.x + a.y * b.y + a.z * b.z
}

export function vecCross(a: Vec3, b: Vec3): Vec3 {
	return {
		x: a.y * b.z - a.z * b.y,
		y: a.z * b.x - a.x * b.z,
		z: a.x * b.y - a.y * b.x
	}
}

export function vecAdd(a: Vec3, b: Vec3): Vec3 {
	return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }
}

export function vecSub(a: Vec3, b: Vec3): Vec3 {
	return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }
}

export function vecMul(v: Vec3, s: number): Vec3 {
	return { x: v.x * s, y: v.y * s, z: v.z * s }
}
