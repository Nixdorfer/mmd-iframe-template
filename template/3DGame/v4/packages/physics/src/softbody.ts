import { type Vec3 } from '@engine/common'
import { ParticleSys, type ParticleSysCfg, DEFAULT_PARTICLE_SYS_CFG } from './particle'
import { vecSub, vecAdd, vecMul, vecLen, vecNorm, vecCross, vecDot } from './collider'

export interface SoftBodyCfg {
	stiffness: number
	damping: number
	pressure: number
	shapeMatching: boolean
	shapeStiffness: number
	volumeStiffness: number
}

export const DEFAULT_SOFT_BODY_CFG: SoftBodyCfg = {
	stiffness: 0.8,
	damping: 0.98,
	pressure: 1,
	shapeMatching: true,
	shapeStiffness: 0.5,
	volumeStiffness: 0.5
}

export interface SoftBody {
	cfg: SoftBodyCfg
	sys: ParticleSys
	restShape: Vec3[]
	restCom: Vec3
	restVolume: number
	indices: number[]
}

export function createSoftBodyFromMesh(
	verts: Vec3[],
	indices: number[],
	cfg: Partial<SoftBodyCfg> = {},
	sysCfg: Partial<ParticleSysCfg> = {}
): SoftBody {
	const c: SoftBodyCfg = { ...DEFAULT_SOFT_BODY_CFG, ...cfg }
	const sys = new ParticleSys({ ...DEFAULT_PARTICLE_SYS_CFG, damping: c.damping, ...sysCfg })
	for (const v of verts) {
		sys.addParticle(v, 1, false)
	}
	const edgeSet = new Set<string>()
	for (let i = 0; i < indices.length; i += 3) {
		const a = indices[i]
		const b = indices[i + 1]
		const c = indices[i + 2]
		addEdge(edgeSet, sys, a, b, c)
		addEdge(edgeSet, sys, b, c, c)
		addEdge(edgeSet, sys, c, a, c)
	}
	const restShape = verts.map(v => ({ ...v }))
	const restCom = calCom(restShape)
	const restVolume = calMeshVolume(verts, indices)
	return { cfg: c, sys, restShape, restCom, restVolume, indices }
}

function addEdge(edgeSet: Set<string>, sys: ParticleSys, a: number, b: number, stiffness: number) {
	const key = a < b ? `${a}_${b}` : `${b}_${a}`
	if (edgeSet.has(key)) return
	edgeSet.add(key)
	sys.addLink(a, b, stiffness)
}

export function createSoftSphere(
	center: Vec3,
	radius: number,
	segments: number = 8,
	cfg: Partial<SoftBodyCfg> = {},
	sysCfg: Partial<ParticleSysCfg> = {}
): SoftBody {
	const verts: Vec3[] = []
	const indices: number[] = []
	verts.push({ x: center.x, y: center.y, z: center.z + radius })
	for (let j = 1; j < segments; j++) {
		const phi = Math.PI * j / segments
		const z = center.z + radius * Math.cos(phi)
		const r = radius * Math.sin(phi)
		for (let i = 0; i < segments * 2; i++) {
			const theta = Math.PI * 2 * i / (segments * 2)
			verts.push({
				x: center.x + r * Math.cos(theta),
				y: center.y + r * Math.sin(theta),
				z
			})
		}
	}
	verts.push({ x: center.x, y: center.y, z: center.z - radius })
	for (let i = 0; i < segments * 2; i++) {
		const next = (i + 1) % (segments * 2)
		indices.push(0, 1 + i, 1 + next)
	}
	for (let j = 0; j < segments - 2; j++) {
		const rowStart = 1 + j * segments * 2
		const nextRowStart = rowStart + segments * 2
		for (let i = 0; i < segments * 2; i++) {
			const next = (i + 1) % (segments * 2)
			indices.push(rowStart + i, nextRowStart + i, rowStart + next)
			indices.push(rowStart + next, nextRowStart + i, nextRowStart + next)
		}
	}
	const lastVert = verts.length - 1
	const lastRowStart = 1 + (segments - 2) * segments * 2
	for (let i = 0; i < segments * 2; i++) {
		const next = (i + 1) % (segments * 2)
		indices.push(lastRowStart + i, lastVert, lastRowStart + next)
	}
	return createSoftBodyFromMesh(verts, indices, cfg, sysCfg)
}

export function createSoftCube(
	center: Vec3,
	size: number,
	divisions: number = 2,
	cfg: Partial<SoftBodyCfg> = {},
	sysCfg: Partial<ParticleSysCfg> = {}
): SoftBody {
	const verts: Vec3[] = []
	const indices: number[] = []
	const half = size / 2
	const step = size / divisions
	const vertMap = new Map<string, number>()
	function addVert(x: number, y: number, z: number): number {
		const key = `${x.toFixed(4)}_${y.toFixed(4)}_${z.toFixed(4)}`
		if (vertMap.has(key)) return vertMap.get(key)!
		const idx = verts.length
		verts.push({ x: center.x + x, y: center.y + y, z: center.z + z })
		vertMap.set(key, idx)
		return idx
	}
	function addFace(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number, x3: number, y3: number, z3: number, x4: number, y4: number, z4: number) {
		const a = addVert(x1, y1, z1)
		const b = addVert(x2, y2, z2)
		const c = addVert(x3, y3, z3)
		const d = addVert(x4, y4, z4)
		indices.push(a, b, c)
		indices.push(a, c, d)
	}
	for (let i = 0; i < divisions; i++) {
		for (let j = 0; j < divisions; j++) {
			const x0 = -half + i * step
			const x1 = x0 + step
			const y0 = -half + j * step
			const y1 = y0 + step
			addFace(x0, y0, half, x1, y0, half, x1, y1, half, x0, y1, half)
			addFace(x0, y0, -half, x0, y1, -half, x1, y1, -half, x1, y0, -half)
			addFace(x0, y0, -half + i * step, x0, y0, -half + (i + 1) * step, x0, y1, -half + (i + 1) * step, x0, y1, -half + i * step)
			addFace(half, y0, -half + i * step, half, y1, -half + i * step, half, y1, -half + (i + 1) * step, half, y0, -half + (i + 1) * step)
		}
	}
	for (let i = 0; i < divisions; i++) {
		for (let k = 0; k < divisions; k++) {
			const x0 = -half + i * step
			const x1 = x0 + step
			const z0 = -half + k * step
			const z1 = z0 + step
			addFace(x0, -half, z0, x0, -half, z1, x1, -half, z1, x1, -half, z0)
			addFace(x0, half, z0, x1, half, z0, x1, half, z1, x0, half, z1)
		}
	}
	return createSoftBodyFromMesh(verts, indices, cfg, sysCfg)
}

export function softBodyShapeMatch(body: SoftBody): void {
	if (!body.cfg.shapeMatching) return
	const com = calSoftBodyCom(body)
	const rotation = calOptimalRotation(body, com)
	for (let i = 0; i < body.sys.particles.length; i++) {
		const p = body.sys.particles[i]
		if (p.pinned) continue
		const restLocal = vecSub(body.restShape[i], body.restCom)
		const targetPos = vecAdd(com, rotateVec(restLocal, rotation))
		const diff = vecSub(targetPos, p.pos)
		p.pos = vecAdd(p.pos, vecMul(diff, body.cfg.shapeStiffness))
	}
}

function calOptimalRotation(body: SoftBody, com: Vec3): { xx: number, xy: number, xz: number, yx: number, yy: number, yz: number, zx: number, zy: number, zz: number } {
	let axx = 0, axy = 0, axz = 0
	let ayx = 0, ayy = 0, ayz = 0
	let azx = 0, azy = 0, azz = 0
	for (let i = 0; i < body.sys.particles.length; i++) {
		const p = body.sys.particles[i].pos
		const q = body.restShape[i]
		const pi = vecSub(p, com)
		const qi = vecSub(q, body.restCom)
		axx += pi.x * qi.x; axy += pi.x * qi.y; axz += pi.x * qi.z
		ayx += pi.y * qi.x; ayy += pi.y * qi.y; ayz += pi.y * qi.z
		azx += pi.z * qi.x; azy += pi.z * qi.y; azz += pi.z * qi.z
	}
	const det = axx * (ayy * azz - ayz * azy) - axy * (ayx * azz - ayz * azx) + axz * (ayx * azy - ayy * azx)
	const scale = det > 0 ? 1 / Math.cbrt(Math.abs(det) + 0.0001) : 1
	return {
		xx: axx * scale, xy: axy * scale, xz: axz * scale,
		yx: ayx * scale, yy: ayy * scale, yz: ayz * scale,
		zx: azx * scale, zy: azy * scale, zz: azz * scale
	}
}

function rotateVec(v: Vec3, r: { xx: number, xy: number, xz: number, yx: number, yy: number, yz: number, zx: number, zy: number, zz: number }): Vec3 {
	return {
		x: r.xx * v.x + r.xy * v.y + r.xz * v.z,
		y: r.yx * v.x + r.yy * v.y + r.yz * v.z,
		z: r.zx * v.x + r.zy * v.y + r.zz * v.z
	}
}

export function applySoftBodyPressure(body: SoftBody): void {
	if (body.cfg.pressure === 0 && body.cfg.volumeStiffness === 0) return
	const currentVolume = calMeshVolume(body.sys.getPositions(), body.indices)
	const volumeRatio = body.restVolume / (currentVolume + 0.0001)
	const pressureForce = (volumeRatio - 1) * body.cfg.volumeStiffness
	for (let i = 0; i < body.indices.length; i += 3) {
		const a = body.indices[i]
		const b = body.indices[i + 1]
		const c = body.indices[i + 2]
		const pa = body.sys.particles[a].pos
		const pb = body.sys.particles[b].pos
		const pc = body.sys.particles[c].pos
		const ab = vecSub(pb, pa)
		const ac = vecSub(pc, pa)
		const normal = vecNorm(vecCross(ab, ac))
		const area = vecLen(vecCross(ab, ac)) * 0.5
		const force = vecMul(normal, (body.cfg.pressure + pressureForce) * area / 3)
		body.sys.applyForce(a, force)
		body.sys.applyForce(b, force)
		body.sys.applyForce(c, force)
	}
}

export function calSoftBodyCom(body: SoftBody): Vec3 {
	return calCom(body.sys.getPositions())
}

function calCom(positions: Vec3[]): Vec3 {
	if (positions.length === 0) return { x: 0, y: 0, z: 0 }
	let sum = { x: 0, y: 0, z: 0 }
	for (const p of positions) {
		sum = vecAdd(sum, p)
	}
	return vecMul(sum, 1 / positions.length)
}

function calMeshVolume(verts: Vec3[], indices: number[]): number {
	let volume = 0
	for (let i = 0; i < indices.length; i += 3) {
		const a = verts[indices[i]]
		const b = verts[indices[i + 1]]
		const c = verts[indices[i + 2]]
		volume += vecDot(a, vecCross(b, c)) / 6
	}
	return Math.abs(volume)
}

export function softBodySphereCollision(body: SoftBody, center: Vec3, radius: number): void {
	for (const p of body.sys.particles) {
		if (p.pinned) continue
		const delta = vecSub(p.pos, center)
		const dist = vecLen(delta)
		if (dist < radius && dist > 0.0001) {
			const n = vecMul(delta, 1 / dist)
			const penetration = radius - dist
			p.pos = vecAdd(p.pos, vecMul(n, penetration))
		}
	}
}

export function getSoftBodyVerts(body: SoftBody): Vec3[] {
	return body.sys.getPositions()
}

export function getSoftBodyIndices(body: SoftBody): number[] {
	return body.indices
}
