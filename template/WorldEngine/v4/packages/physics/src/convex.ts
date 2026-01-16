import { type Vec3, type EntityId, ColliderType } from '@engine/common'
import { type Collider, type AABB, vecSub, vecCross, vecDot, vecLen, vecNorm, vecAdd, vecMul } from './collider'

export interface ConvexCollider extends Collider {
	typ: ColliderType.Convex
	verts: Vec3[]
	faces: number[][]
	edges: [number, number][]
	normals: Vec3[]
	localAABB: AABB
}

export function createConvexCollider(
	entityId: EntityId,
	verts: Vec3[],
	offset: Vec3 = { x: 0, y: 0, z: 0 },
	isTrg: boolean = false
): ConvexCollider {
	const hull = quickHull3D(verts)
	const normals = calConvexNormals(hull.verts, hull.faces)
	const edges = calConvexEdges(hull.faces)
	const localAABB = calConvexAABB(hull.verts)
	return {
		entityId,
		typ: ColliderType.Convex,
		offset,
		isTrg,
		enabled: true,
		layer: 1,
		mask: 0xFFFFFFFF,
		verts: hull.verts,
		faces: hull.faces,
		edges,
		normals,
		localAABB
	}
}

interface HullResult {
	verts: Vec3[]
	faces: number[][]
}

export function quickHull3D(points: Vec3[]): HullResult {
	if (points.length < 4) {
		return { verts: [...points], faces: [] }
	}
	const { minX, maxX, minY, maxY, minZ, maxZ } = findExtremes(points)
	const uniqueExtremes = [minX, maxX, minY, maxY, minZ, maxZ].filter((v, i, arr) =>
		arr.findIndex(p => p.x === v.x && p.y === v.y && p.z === v.z) === i
	)
	if (uniqueExtremes.length < 4) {
		return { verts: [...points], faces: [] }
	}
	const [p0, p1] = findFurthestPair(uniqueExtremes)
	const p2 = findFurthestFromLine(points, p0, p1)
	const p3 = findFurthestFromPlane(points, p0, p1, p2)
	const verts: Vec3[] = [p0, p1, p2, p3]
	const faces: number[][] = []
	const normal012 = triNormal(p0, p1, p2)
	const toP3 = vecSub(p3, p0)
	if (vecDot(normal012, toP3) > 0) {
		faces.push([0, 2, 1])
		faces.push([0, 1, 3])
		faces.push([1, 2, 3])
		faces.push([2, 0, 3])
	} else {
		faces.push([0, 1, 2])
		faces.push([0, 3, 1])
		faces.push([1, 3, 2])
		faces.push([2, 3, 0])
	}
	const remainingPoints = points.filter(p =>
		!vecEqual(p, p0) && !vecEqual(p, p1) && !vecEqual(p, p2) && !vecEqual(p, p3)
	)
	for (const p of remainingPoints) {
		const visibleFaces: number[] = []
		for (let i = 0; i < faces.length; i++) {
			const face = faces[i]
			const v0 = verts[face[0]]
			const v1 = verts[face[1]]
			const v2 = verts[face[2]]
			const normal = triNormal(v0, v1, v2)
			const toPoint = vecSub(p, v0)
			if (vecDot(normal, toPoint) > 0.0001) {
				visibleFaces.push(i)
			}
		}
		if (visibleFaces.length === 0) continue
		const horizon: [number, number][] = []
		for (const faceIdx of visibleFaces) {
			const face = faces[faceIdx]
			for (let i = 0; i < 3; i++) {
				const a = face[i]
				const b = face[(i + 1) % 3]
				let isHorizon = true
				for (const otherIdx of visibleFaces) {
					if (otherIdx === faceIdx) continue
					const otherFace = faces[otherIdx]
					if (otherFace.includes(a) && otherFace.includes(b)) {
						isHorizon = false
						break
					}
				}
				if (isHorizon) {
					horizon.push([a, b])
				}
			}
		}
		for (let i = visibleFaces.length - 1; i >= 0; i--) {
			faces.splice(visibleFaces[i], 1)
		}
		const newVertIdx = verts.length
		verts.push(p)
		for (const [a, b] of horizon) {
			faces.push([a, b, newVertIdx])
		}
	}
	return { verts, faces }
}

function findExtremes(points: Vec3[]) {
	let minX = points[0], maxX = points[0]
	let minY = points[0], maxY = points[0]
	let minZ = points[0], maxZ = points[0]
	for (const p of points) {
		if (p.x < minX.x) minX = p
		if (p.x > maxX.x) maxX = p
		if (p.y < minY.y) minY = p
		if (p.y > maxY.y) maxY = p
		if (p.z < minZ.z) minZ = p
		if (p.z > maxZ.z) maxZ = p
	}
	return { minX, maxX, minY, maxY, minZ, maxZ }
}

function findFurthestPair(points: Vec3[]): [Vec3, Vec3] {
	let maxDist = 0
	let p0 = points[0], p1 = points[1]
	for (let i = 0; i < points.length; i++) {
		for (let j = i + 1; j < points.length; j++) {
			const d = vecLen(vecSub(points[j], points[i]))
			if (d > maxDist) {
				maxDist = d
				p0 = points[i]
				p1 = points[j]
			}
		}
	}
	return [p0, p1]
}

function findFurthestFromLine(points: Vec3[], a: Vec3, b: Vec3): Vec3 {
	const ab = vecSub(b, a)
	let maxDist = 0
	let result = points[0]
	for (const p of points) {
		const ap = vecSub(p, a)
		const cross = vecCross(ab, ap)
		const d = vecLen(cross)
		if (d > maxDist) {
			maxDist = d
			result = p
		}
	}
	return result
}

function findFurthestFromPlane(points: Vec3[], a: Vec3, b: Vec3, c: Vec3): Vec3 {
	const normal = triNormal(a, b, c)
	let maxDist = 0
	let result = points[0]
	for (const p of points) {
		const d = Math.abs(vecDot(vecSub(p, a), normal))
		if (d > maxDist) {
			maxDist = d
			result = p
		}
	}
	return result
}

function triNormal(a: Vec3, b: Vec3, c: Vec3): Vec3 {
	const ab = vecSub(b, a)
	const ac = vecSub(c, a)
	return vecNorm(vecCross(ab, ac))
}

function vecEqual(a: Vec3, b: Vec3): boolean {
	return Math.abs(a.x - b.x) < 0.0001 &&
		Math.abs(a.y - b.y) < 0.0001 &&
		Math.abs(a.z - b.z) < 0.0001
}

export function calConvexNormals(verts: Vec3[], faces: number[][]): Vec3[] {
	const normals: Vec3[] = []
	for (const face of faces) {
		const v0 = verts[face[0]]
		const v1 = verts[face[1]]
		const v2 = verts[face[2]]
		normals.push(triNormal(v0, v1, v2))
	}
	return normals
}

export function calConvexEdges(faces: number[][]): [number, number][] {
	const edgeSet = new Set<string>()
	const edges: [number, number][] = []
	for (const face of faces) {
		for (let i = 0; i < face.length; i++) {
			const a = face[i]
			const b = face[(i + 1) % face.length]
			const key = a < b ? `${a}_${b}` : `${b}_${a}`
			if (!edgeSet.has(key)) {
				edgeSet.add(key)
				edges.push([Math.min(a, b), Math.max(a, b)])
			}
		}
	}
	return edges
}

function calConvexAABB(verts: Vec3[]): AABB {
	if (verts.length === 0) {
		return { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } }
	}
	let minX = verts[0].x, maxX = verts[0].x
	let minY = verts[0].y, maxY = verts[0].y
	let minZ = verts[0].z, maxZ = verts[0].z
	for (const v of verts) {
		if (v.x < minX) minX = v.x
		if (v.x > maxX) maxX = v.x
		if (v.y < minY) minY = v.y
		if (v.y > maxY) maxY = v.y
		if (v.z < minZ) minZ = v.z
		if (v.z > maxZ) maxZ = v.z
	}
	return {
		min: { x: minX, y: minY, z: minZ },
		max: { x: maxX, y: maxY, z: maxZ }
	}
}

export function convexWorldAABB(collider: ConvexCollider, worldPos: Vec3): AABB {
	return {
		min: vecAdd(collider.localAABB.min, worldPos),
		max: vecAdd(collider.localAABB.max, worldPos)
	}
}

export function getConvexWorldVerts(collider: ConvexCollider, worldPos: Vec3): Vec3[] {
	return collider.verts.map(v => vecAdd(v, worldPos))
}

export function convexCentroid(verts: Vec3[]): Vec3 {
	if (verts.length === 0) return { x: 0, y: 0, z: 0 }
	let sum = { x: 0, y: 0, z: 0 }
	for (const v of verts) {
		sum = vecAdd(sum, v)
	}
	return vecMul(sum, 1 / verts.length)
}

export function convexVolume(verts: Vec3[], faces: number[][]): number {
	const center = convexCentroid(verts)
	let volume = 0
	for (const face of faces) {
		const v0 = vecSub(verts[face[0]], center)
		const v1 = vecSub(verts[face[1]], center)
		const v2 = vecSub(verts[face[2]], center)
		volume += Math.abs(vecDot(v0, vecCross(v1, v2))) / 6
	}
	return volume
}

export function convexInertia(verts: Vec3[], faces: number[][], mass: number): Vec3 {
	const volume = convexVolume(verts, faces)
	if (volume < 0.0001) {
		return { x: mass, y: mass, z: mass }
	}
	const density = mass / volume
	let ixx = 0, iyy = 0, izz = 0
	const center = convexCentroid(verts)
	for (const face of faces) {
		const v0 = vecSub(verts[face[0]], center)
		const v1 = vecSub(verts[face[1]], center)
		const v2 = vecSub(verts[face[2]], center)
		const tetVol = Math.abs(vecDot(v0, vecCross(v1, v2))) / 6
		const tetMass = tetVol * density
		const cx = (v0.x + v1.x + v2.x) / 4
		const cy = (v0.y + v1.y + v2.y) / 4
		const cz = (v0.z + v1.z + v2.z) / 4
		ixx += tetMass * (cy * cy + cz * cz)
		iyy += tetMass * (cx * cx + cz * cz)
		izz += tetMass * (cx * cx + cy * cy)
	}
	return { x: Math.max(ixx, 0.01), y: Math.max(iyy, 0.01), z: Math.max(izz, 0.01) }
}
