import { type Vec3 } from '@engine/common'
import { ParticleSys, type ParticleSysCfg, DEFAULT_PARTICLE_SYS_CFG } from './particle'
import { vecSub, vecCross, vecNorm, vecAdd, vecMul } from './collider'

export interface ClothCfg {
	width: number
	height: number
	segX: number
	segY: number
	mass: number
	structural: number
	shear: number
	bend: number
	damping: number
}

export const DEFAULT_CLOTH_CFG: ClothCfg = {
	width: 2,
	height: 2,
	segX: 10,
	segY: 10,
	mass: 1,
	structural: 1,
	shear: 0.5,
	bend: 0.3,
	damping: 0.98
}

export interface Cloth {
	cfg: ClothCfg
	sys: ParticleSys
	grid: number[][]
	pins: number[]
}

export function createCloth(cfg: Partial<ClothCfg>, origin: Vec3, sysCfg: Partial<ParticleSysCfg> = {}): Cloth {
	const c: ClothCfg = { ...DEFAULT_CLOTH_CFG, ...cfg }
	const sys = new ParticleSys({ ...DEFAULT_PARTICLE_SYS_CFG, damping: c.damping, ...sysCfg })
	const grid: number[][] = []
	const dx = c.width / c.segX
	const dy = c.height / c.segY
	const particleMass = c.mass / ((c.segX + 1) * (c.segY + 1))
	for (let j = 0; j <= c.segY; j++) {
		const row: number[] = []
		for (let i = 0; i <= c.segX; i++) {
			const pos: Vec3 = {
				x: origin.x + i * dx,
				y: origin.y + j * dy,
				z: origin.z
			}
			row.push(sys.addParticle(pos, particleMass, false))
		}
		grid.push(row)
	}
	for (let j = 0; j <= c.segY; j++) {
		for (let i = 0; i < c.segX; i++) {
			sys.addLink(grid[j][i], grid[j][i + 1], c.structural)
		}
	}
	for (let j = 0; j < c.segY; j++) {
		for (let i = 0; i <= c.segX; i++) {
			sys.addLink(grid[j][i], grid[j + 1][i], c.structural)
		}
	}
	for (let j = 0; j < c.segY; j++) {
		for (let i = 0; i < c.segX; i++) {
			sys.addLink(grid[j][i], grid[j + 1][i + 1], c.shear)
			sys.addLink(grid[j][i + 1], grid[j + 1][i], c.shear)
		}
	}
	for (let j = 0; j <= c.segY; j++) {
		for (let i = 0; i < c.segX - 1; i++) {
			sys.addLink(grid[j][i], grid[j][i + 2], c.bend)
		}
	}
	for (let j = 0; j < c.segY - 1; j++) {
		for (let i = 0; i <= c.segX; i++) {
			sys.addLink(grid[j][i], grid[j + 2][i], c.bend)
		}
	}
	return { cfg: c, sys, grid, pins: [] }
}

export function pinClothCorner(cloth: Cloth, corner: 'tpLe' | 'tpRi' | 'btLe' | 'btRi'): void {
	const { grid, sys, cfg, pins } = cloth
	let idx: number
	switch (corner) {
		case 'tpLe': idx = grid[cfg.segY][0]; break
		case 'tpRi': idx = grid[cfg.segY][cfg.segX]; break
		case 'btLe': idx = grid[0][0]; break
		case 'btRi': idx = grid[0][cfg.segX]; break
	}
	sys.pin(idx)
	if (!pins.includes(idx)) pins.push(idx)
}

export function pinClothEdge(cloth: Cloth, edge: 'tp' | 'bt' | 'le' | 'ri'): void {
	const { grid, sys, cfg, pins } = cloth
	let indices: number[] = []
	switch (edge) {
		case 'tp':
			indices = grid[cfg.segY]
			break
		case 'bt':
			indices = grid[0]
			break
		case 'le':
			indices = grid.map(row => row[0])
			break
		case 'ri':
			indices = grid.map(row => row[cfg.segX])
			break
	}
	for (const idx of indices) {
		sys.pin(idx)
		if (!pins.includes(idx)) pins.push(idx)
	}
}

export function unpinCloth(cloth: Cloth): void {
	for (const idx of cloth.pins) {
		cloth.sys.unpin(idx)
	}
	cloth.pins = []
}

export function getClothVerts(cloth: Cloth): Vec3[] {
	return cloth.sys.getPositions()
}

export function getClothNormals(cloth: Cloth): Vec3[] {
	const { grid, sys, cfg } = cloth
	const normals: Vec3[] = new Array(sys.particles.length).fill(null).map(() => ({ x: 0, y: 0, z: 0 }))
	for (let j = 0; j < cfg.segY; j++) {
		for (let i = 0; i < cfg.segX; i++) {
			const i00 = grid[j][i]
			const i10 = grid[j][i + 1]
			const i01 = grid[j + 1][i]
			const i11 = grid[j + 1][i + 1]
			const p00 = sys.particles[i00].pos
			const p10 = sys.particles[i10].pos
			const p01 = sys.particles[i01].pos
			const p11 = sys.particles[i11].pos
			const n1 = triNormal(p00, p10, p01)
			const n2 = triNormal(p10, p11, p01)
			normals[i00] = vecAdd(normals[i00], n1)
			normals[i10] = vecAdd(normals[i10], n1)
			normals[i01] = vecAdd(normals[i01], n1)
			normals[i10] = vecAdd(normals[i10], n2)
			normals[i11] = vecAdd(normals[i11], n2)
			normals[i01] = vecAdd(normals[i01], n2)
		}
	}
	return normals.map(n => vecNorm(n))
}

function triNormal(a: Vec3, b: Vec3, c: Vec3): Vec3 {
	const ab = vecSub(b, a)
	const ac = vecSub(c, a)
	return vecCross(ab, ac)
}

export function getClothIndices(cloth: Cloth): number[] {
	const { grid, cfg } = cloth
	const indices: number[] = []
	for (let j = 0; j < cfg.segY; j++) {
		for (let i = 0; i < cfg.segX; i++) {
			const i00 = grid[j][i]
			const i10 = grid[j][i + 1]
			const i01 = grid[j + 1][i]
			const i11 = grid[j + 1][i + 1]
			indices.push(i00, i10, i01)
			indices.push(i10, i11, i01)
		}
	}
	return indices
}

export function getClothUVs(cloth: Cloth): number[] {
	const { cfg } = cloth
	const uvs: number[] = []
	for (let j = 0; j <= cfg.segY; j++) {
		for (let i = 0; i <= cfg.segX; i++) {
			uvs.push(i / cfg.segX, j / cfg.segY)
		}
	}
	return uvs
}

export function applyClothWind(cloth: Cloth, windDir: Vec3, strength: number): void {
	const normals = getClothNormals(cloth)
	for (let i = 0; i < cloth.sys.particles.length; i++) {
		const n = normals[i]
		const dot = n.x * windDir.x + n.y * windDir.y + n.z * windDir.z
		const force = vecMul(windDir, Math.abs(dot) * strength)
		cloth.sys.applyForce(i, force)
	}
}

export function clothSphereCollision(cloth: Cloth, center: Vec3, radius: number): void {
	for (const p of cloth.sys.particles) {
		if (p.pinned) continue
		const delta = vecSub(p.pos, center)
		const dist = Math.sqrt(delta.x * delta.x + delta.y * delta.y + delta.z * delta.z)
		if (dist < radius && dist > 0.0001) {
			const n = vecMul(delta, 1 / dist)
			const penetration = radius - dist
			p.pos = vecAdd(p.pos, vecMul(n, penetration))
		}
	}
}

export function clothBoxCollision(cloth: Cloth, boxCenter: Vec3, boxSize: Vec3): void {
	const halfSize = vecMul(boxSize, 0.5)
	for (const p of cloth.sys.particles) {
		if (p.pinned) continue
		const local = vecSub(p.pos, boxCenter)
		const clamped: Vec3 = {
			x: Math.max(-halfSize.x, Math.min(halfSize.x, local.x)),
			y: Math.max(-halfSize.y, Math.min(halfSize.y, local.y)),
			z: Math.max(-halfSize.z, Math.min(halfSize.z, local.z))
		}
		const inside =
			Math.abs(local.x) <= halfSize.x &&
			Math.abs(local.y) <= halfSize.y &&
			Math.abs(local.z) <= halfSize.z
		if (inside) {
			const dx = halfSize.x - Math.abs(local.x)
			const dy = halfSize.y - Math.abs(local.y)
			const dz = halfSize.z - Math.abs(local.z)
			if (dx <= dy && dx <= dz) {
				p.pos.x = boxCenter.x + (local.x > 0 ? halfSize.x : -halfSize.x)
			} else if (dy <= dz) {
				p.pos.y = boxCenter.y + (local.y > 0 ? halfSize.y : -halfSize.y)
			} else {
				p.pos.z = boxCenter.z + (local.z > 0 ? halfSize.z : -halfSize.z)
			}
		}
	}
}

export function tearCloth(cloth: Cloth, maxForce: number): number {
	let torn = 0
	for (let i = cloth.sys.links.length - 1; i >= 0; i--) {
		const link = cloth.sys.links[i]
		if (cloth.sys.tearLink(link.a, link.b, maxForce)) {
			torn++
		}
	}
	return torn
}
