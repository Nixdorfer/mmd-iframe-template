import { type Vec3 } from '@engine/common'
import { vecAdd, vecSub, vecMul, vecLen, vecNorm, vecDot, vecCross } from './collider'

export interface Simplex {
	points: Vec3[]
	cnt: number
}

export interface GjkResult {
	colliding: boolean
	simplex: Simplex
}

export interface EpaResult {
	normal: Vec3
	depth: number
	point: Vec3
}

export type SupportFn = (dir: Vec3) => Vec3

const GJK_MAX_ITER = 32
const EPA_MAX_ITER = 64
const EPA_TOLERANCE = 0.0001

export function support(shapeA: SupportFn, shapeB: SupportFn, dir: Vec3): Vec3 {
	const a = shapeA(dir)
	const b = shapeB(vecMul(dir, -1))
	return vecSub(a, b)
}

export function gjk(shapeA: SupportFn, shapeB: SupportFn): GjkResult {
	let dir: Vec3 = { x: 1, y: 0, z: 0 }
	const simplex: Simplex = { points: [], cnt: 0 }
	const a = support(shapeA, shapeB, dir)
	simplex.points.push(a)
	simplex.cnt = 1
	dir = vecMul(a, -1)
	for (let i = 0; i < GJK_MAX_ITER; i++) {
		const p = support(shapeA, shapeB, dir)
		if (vecDot(p, dir) < 0) {
			return { colliding: false, simplex }
		}
		simplex.points.push(p)
		simplex.cnt++
		const result = handleSimplex(simplex, dir)
		dir = result.dir
		if (result.containsOrigin) {
			return { colliding: true, simplex }
		}
	}
	return { colliding: false, simplex }
}

interface SimplexResult {
	containsOrigin: boolean
	dir: Vec3
}

function handleSimplex(simplex: Simplex, dir: Vec3): SimplexResult {
	switch (simplex.cnt) {
		case 2: return handleLine(simplex, dir)
		case 3: return handleTriangle(simplex, dir)
		case 4: return handleTetrahedron(simplex, dir)
		default: return { containsOrigin: false, dir }
	}
}

function handleLine(simplex: Simplex, dir: Vec3): SimplexResult {
	const a = simplex.points[1]
	const b = simplex.points[0]
	const ab = vecSub(b, a)
	const ao = vecMul(a, -1)
	if (vecDot(ab, ao) > 0) {
		const newDir = vecCross(vecCross(ab, ao), ab)
		return { containsOrigin: false, dir: vecLen(newDir) > 0.0001 ? newDir : perpendicular(ab) }
	}
	simplex.points = [a]
	simplex.cnt = 1
	return { containsOrigin: false, dir: ao }
}

function handleTriangle(simplex: Simplex, dir: Vec3): SimplexResult {
	const a = simplex.points[2]
	const b = simplex.points[1]
	const c = simplex.points[0]
	const ab = vecSub(b, a)
	const ac = vecSub(c, a)
	const ao = vecMul(a, -1)
	const abc = vecCross(ab, ac)
	if (vecDot(vecCross(abc, ac), ao) > 0) {
		if (vecDot(ac, ao) > 0) {
			simplex.points = [c, a]
			simplex.cnt = 2
			const newDir = vecCross(vecCross(ac, ao), ac)
			return { containsOrigin: false, dir: vecLen(newDir) > 0.0001 ? newDir : perpendicular(ac) }
		}
		return handleLineCase(simplex, a, b, ab, ao)
	}
	if (vecDot(vecCross(ab, abc), ao) > 0) {
		return handleLineCase(simplex, a, b, ab, ao)
	}
	if (vecDot(abc, ao) > 0) {
		return { containsOrigin: false, dir: abc }
	}
	simplex.points = [b, c, a]
	return { containsOrigin: false, dir: vecMul(abc, -1) }
}

function handleLineCase(simplex: Simplex, a: Vec3, b: Vec3, ab: Vec3, ao: Vec3): SimplexResult {
	if (vecDot(ab, ao) > 0) {
		simplex.points = [b, a]
		simplex.cnt = 2
		const newDir = vecCross(vecCross(ab, ao), ab)
		return { containsOrigin: false, dir: vecLen(newDir) > 0.0001 ? newDir : perpendicular(ab) }
	}
	simplex.points = [a]
	simplex.cnt = 1
	return { containsOrigin: false, dir: ao }
}

function handleTetrahedron(simplex: Simplex, dir: Vec3): SimplexResult {
	const a = simplex.points[3]
	const b = simplex.points[2]
	const c = simplex.points[1]
	const d = simplex.points[0]
	const ab = vecSub(b, a)
	const ac = vecSub(c, a)
	const ad = vecSub(d, a)
	const ao = vecMul(a, -1)
	const abc = vecCross(ab, ac)
	const acd = vecCross(ac, ad)
	const adb = vecCross(ad, ab)
	if (vecDot(abc, ao) > 0) {
		simplex.points = [c, b, a]
		simplex.cnt = 3
		return handleTriangle(simplex, abc)
	}
	if (vecDot(acd, ao) > 0) {
		simplex.points = [d, c, a]
		simplex.cnt = 3
		return handleTriangle(simplex, acd)
	}
	if (vecDot(adb, ao) > 0) {
		simplex.points = [b, d, a]
		simplex.cnt = 3
		return handleTriangle(simplex, adb)
	}
	return { containsOrigin: true, dir }
}

function perpendicular(v: Vec3): Vec3 {
	if (Math.abs(v.x) < Math.abs(v.y) && Math.abs(v.x) < Math.abs(v.z)) {
		return vecCross(v, { x: 1, y: 0, z: 0 })
	} else if (Math.abs(v.y) < Math.abs(v.z)) {
		return vecCross(v, { x: 0, y: 1, z: 0 })
	}
	return vecCross(v, { x: 0, y: 0, z: 1 })
}

interface EpaFace {
	a: number
	b: number
	c: number
	normal: Vec3
	dist: number
}

export function epa(shapeA: SupportFn, shapeB: SupportFn, simplex: Simplex): EpaResult {
	const verts: Vec3[] = [...simplex.points]
	const faces: EpaFace[] = []
	if (simplex.cnt < 4) {
		return { normal: { x: 0, y: 0, z: 1 }, depth: 0, point: { x: 0, y: 0, z: 0 } }
	}
	addFace(faces, verts, 0, 1, 2)
	addFace(faces, verts, 0, 2, 3)
	addFace(faces, verts, 0, 3, 1)
	addFace(faces, verts, 1, 3, 2)
	for (let iter = 0; iter < EPA_MAX_ITER; iter++) {
		let minFaceIdx = 0
		let minDist = Infinity
		for (let i = 0; i < faces.length; i++) {
			if (faces[i].dist < minDist) {
				minDist = faces[i].dist
				minFaceIdx = i
			}
		}
		const face = faces[minFaceIdx]
		const p = support(shapeA, shapeB, face.normal)
		const d = vecDot(p, face.normal)
		if (d - face.dist < EPA_TOLERANCE) {
			const point = vecMul(face.normal, face.dist)
			return { normal: face.normal, depth: face.dist, point }
		}
		const newVertIdx = verts.length
		verts.push(p)
		const edges: [number, number][] = []
		for (let i = faces.length - 1; i >= 0; i--) {
			const f = faces[i]
			const center = vecMul(vecAdd(vecAdd(verts[f.a], verts[f.b]), verts[f.c]), 1 / 3)
			const toP = vecSub(p, center)
			if (vecDot(f.normal, toP) > 0) {
				addEdge(edges, f.a, f.b)
				addEdge(edges, f.b, f.c)
				addEdge(edges, f.c, f.a)
				faces.splice(i, 1)
			}
		}
		for (const [ea, eb] of edges) {
			addFace(faces, verts, ea, eb, newVertIdx)
		}
		if (faces.length === 0) break
	}
	if (faces.length > 0) {
		let minFaceIdx = 0
		let minDist = Infinity
		for (let i = 0; i < faces.length; i++) {
			if (faces[i].dist < minDist) {
				minDist = faces[i].dist
				minFaceIdx = i
			}
		}
		const face = faces[minFaceIdx]
		const point = vecMul(face.normal, face.dist)
		return { normal: face.normal, depth: face.dist, point }
	}
	return { normal: { x: 0, y: 0, z: 1 }, depth: 0, point: { x: 0, y: 0, z: 0 } }
}

function addFace(faces: EpaFace[], verts: Vec3[], a: number, b: number, c: number) {
	const ab = vecSub(verts[b], verts[a])
	const ac = vecSub(verts[c], verts[a])
	let normal = vecCross(ab, ac)
	const len = vecLen(normal)
	if (len < 0.0001) return
	normal = vecMul(normal, 1 / len)
	const dist = vecDot(normal, verts[a])
	if (dist < 0) {
		normal = vecMul(normal, -1)
		faces.push({ a: c, b: b, c: a, normal, dist: -dist })
	} else {
		faces.push({ a, b, c, normal, dist })
	}
}

function addEdge(edges: [number, number][], a: number, b: number) {
	for (let i = edges.length - 1; i >= 0; i--) {
		const [ea, eb] = edges[i]
		if ((ea === b && eb === a)) {
			edges.splice(i, 1)
			return
		}
	}
	edges.push([a, b])
}

export function boxSupport(center: Vec3, halfSize: Vec3, dir: Vec3): Vec3 {
	return {
		x: center.x + (dir.x >= 0 ? halfSize.x : -halfSize.x),
		y: center.y + (dir.y >= 0 ? halfSize.y : -halfSize.y),
		z: center.z + (dir.z >= 0 ? halfSize.z : -halfSize.z)
	}
}

export function sphereSupport(center: Vec3, radius: number, dir: Vec3): Vec3 {
	const n = vecNorm(dir)
	return {
		x: center.x + n.x * radius,
		y: center.y + n.y * radius,
		z: center.z + n.z * radius
	}
}

export function capsuleSupport(p1: Vec3, p2: Vec3, radius: number, dir: Vec3): Vec3 {
	const n = vecNorm(dir)
	const dot1 = vecDot(p1, dir)
	const dot2 = vecDot(p2, dir)
	const base = dot1 > dot2 ? p1 : p2
	return {
		x: base.x + n.x * radius,
		y: base.y + n.y * radius,
		z: base.z + n.z * radius
	}
}

export function convexSupport(verts: Vec3[], dir: Vec3): Vec3 {
	let maxDot = -Infinity
	let maxVert = verts[0]
	for (const v of verts) {
		const d = vecDot(v, dir)
		if (d > maxDot) {
			maxDot = d
			maxVert = v
		}
	}
	return maxVert
}

export function createBoxSupportFn(center: Vec3, halfSize: Vec3): SupportFn {
	return (dir: Vec3) => boxSupport(center, halfSize, dir)
}

export function createSphereSupportFn(center: Vec3, radius: number): SupportFn {
	return (dir: Vec3) => sphereSupport(center, radius, dir)
}

export function createCapsuleSupportFn(p1: Vec3, p2: Vec3, radius: number): SupportFn {
	return (dir: Vec3) => capsuleSupport(p1, p2, radius, dir)
}

export function createConvexSupportFn(verts: Vec3[]): SupportFn {
	return (dir: Vec3) => convexSupport(verts, dir)
}
