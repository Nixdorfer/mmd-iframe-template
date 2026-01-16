import { type Vec3 } from '@engine/common'
import { vecAdd, vecSub, vecMul, vecLen, vecNorm } from './collider'

export interface Particle {
	pos: Vec3
	prvPos: Vec3
	vel: Vec3
	mass: number
	invMass: number
	pinned: boolean
}

export interface ParticleLink {
	a: number
	b: number
	restLen: number
	stiffness: number
}

export interface ParticleSysCfg {
	gravity: Vec3
	damping: number
	iterations: number
	groundY: number
	groundEnabled: boolean
	groundBounce: number
	groundFriction: number
}

export const DEFAULT_PARTICLE_SYS_CFG: ParticleSysCfg = {
	gravity: { x: 0, y: 0, z: -9.81 },
	damping: 0.99,
	iterations: 4,
	groundY: 0,
	groundEnabled: true,
	groundBounce: 0.3,
	groundFriction: 0.8
}

export class ParticleSys {
	cfg: ParticleSysCfg
	particles: Particle[]
	links: ParticleLink[]

	constructor(cfg: Partial<ParticleSysCfg> = {}) {
		this.cfg = { ...DEFAULT_PARTICLE_SYS_CFG, ...cfg }
		this.particles = []
		this.links = []
	}

	addParticle(pos: Vec3, mass: number = 1, pinned: boolean = false): number {
		const particle: Particle = {
			pos: { ...pos },
			prvPos: { ...pos },
			vel: { x: 0, y: 0, z: 0 },
			mass,
			invMass: pinned ? 0 : 1 / mass,
			pinned
		}
		this.particles.push(particle)
		return this.particles.length - 1
	}

	addLink(a: number, b: number, stiffness: number = 1, restLen?: number): void {
		const pA = this.particles[a]
		const pB = this.particles[b]
		const len = restLen ?? vecLen(vecSub(pB.pos, pA.pos))
		this.links.push({ a, b, restLen: len, stiffness })
	}

	step(dt: number): void {
		this.applyForces(dt)
		this.verletIntegrate(dt)
		for (let i = 0; i < this.cfg.iterations; i++) {
			this.satisfyLinks()
		}
		if (this.cfg.groundEnabled) {
			this.applyGroundCollision()
		}
		this.updateVelocities(dt)
	}

	private applyForces(dt: number): void {
		for (const p of this.particles) {
			if (p.pinned) continue
			p.vel = vecAdd(p.vel, vecMul(this.cfg.gravity, dt))
		}
	}

	private verletIntegrate(dt: number): void {
		for (const p of this.particles) {
			if (p.pinned) continue
			const newPos = vecAdd(
				vecSub(vecMul(p.pos, 2), p.prvPos),
				vecMul(this.cfg.gravity, dt * dt)
			)
			p.prvPos = { ...p.pos }
			p.pos = vecMul(newPos, this.cfg.damping)
			p.pos = vecAdd(p.pos, vecMul(newPos, 1 - this.cfg.damping))
		}
	}

	private satisfyLinks(): void {
		for (const link of this.links) {
			const pA = this.particles[link.a]
			const pB = this.particles[link.b]
			const delta = vecSub(pB.pos, pA.pos)
			const dist = vecLen(delta)
			if (dist < 0.0001) continue
			const diff = (dist - link.restLen) / dist
			const correction = vecMul(delta, diff * link.stiffness * 0.5)
			const totalInvMass = pA.invMass + pB.invMass
			if (totalInvMass === 0) continue
			if (!pA.pinned) {
				pA.pos = vecAdd(pA.pos, vecMul(correction, pA.invMass / totalInvMass))
			}
			if (!pB.pinned) {
				pB.pos = vecSub(pB.pos, vecMul(correction, pB.invMass / totalInvMass))
			}
		}
	}

	private applyGroundCollision(): void {
		for (const p of this.particles) {
			if (p.pinned) continue
			if (p.pos.z < this.cfg.groundY) {
				p.pos.z = this.cfg.groundY
				const vel = vecSub(p.pos, p.prvPos)
				if (vel.z < 0) {
					p.prvPos.z = p.pos.z + vel.z * this.cfg.groundBounce
				}
				p.prvPos.x = p.pos.x - vel.x * this.cfg.groundFriction
				p.prvPos.y = p.pos.y - vel.y * this.cfg.groundFriction
			}
		}
	}

	private updateVelocities(dt: number): void {
		for (const p of this.particles) {
			if (p.pinned) {
				p.vel = { x: 0, y: 0, z: 0 }
				continue
			}
			p.vel = vecMul(vecSub(p.pos, p.prvPos), 1 / dt)
		}
	}

	applyForce(idx: number, force: Vec3): void {
		const p = this.particles[idx]
		if (!p || p.pinned) return
		p.vel = vecAdd(p.vel, vecMul(force, p.invMass))
	}

	applyImpulse(idx: number, impulse: Vec3): void {
		const p = this.particles[idx]
		if (!p || p.pinned) return
		p.pos = vecAdd(p.pos, vecMul(impulse, p.invMass))
	}

	pin(idx: number): void {
		const p = this.particles[idx]
		if (!p) return
		p.pinned = true
		p.invMass = 0
	}

	unpin(idx: number): void {
		const p = this.particles[idx]
		if (!p) return
		p.pinned = false
		p.invMass = 1 / p.mass
	}

	setPos(idx: number, pos: Vec3): void {
		const p = this.particles[idx]
		if (!p) return
		p.pos = { ...pos }
		if (p.pinned) {
			p.prvPos = { ...pos }
		}
	}

	getPos(idx: number): Vec3 | null {
		const p = this.particles[idx]
		return p ? { ...p.pos } : null
	}

	getVel(idx: number): Vec3 | null {
		const p = this.particles[idx]
		return p ? { ...p.vel } : null
	}

	getPositions(): Vec3[] {
		return this.particles.map(p => ({ ...p.pos }))
	}

	removeLink(a: number, b: number): void {
		const idx = this.links.findIndex(l =>
			(l.a === a && l.b === b) || (l.a === b && l.b === a)
		)
		if (idx !== -1) {
			this.links.splice(idx, 1)
		}
	}

	tearLink(a: number, b: number, maxForce: number): boolean {
		const idx = this.links.findIndex(l =>
			(l.a === a && l.b === b) || (l.a === b && l.b === a)
		)
		if (idx === -1) return false
		const link = this.links[idx]
		const pA = this.particles[link.a]
		const pB = this.particles[link.b]
		const delta = vecSub(pB.pos, pA.pos)
		const dist = vecLen(delta)
		const stretch = Math.abs(dist - link.restLen)
		const force = stretch * link.stiffness
		if (force > maxForce) {
			this.links.splice(idx, 1)
			return true
		}
		return false
	}

	clr(): void {
		this.particles = []
		this.links = []
	}
}

export function createChain(
	sys: ParticleSys,
	start: Vec3,
	end: Vec3,
	segments: number,
	mass: number = 1,
	stiffness: number = 1,
	pinStart: boolean = true,
	pinEnd: boolean = false
): number[] {
	const indices: number[] = []
	for (let i = 0; i <= segments; i++) {
		const t = i / segments
		const pos: Vec3 = {
			x: start.x + (end.x - start.x) * t,
			y: start.y + (end.y - start.y) * t,
			z: start.z + (end.z - start.z) * t
		}
		const pinned = (i === 0 && pinStart) || (i === segments && pinEnd)
		indices.push(sys.addParticle(pos, mass, pinned))
	}
	for (let i = 0; i < segments; i++) {
		sys.addLink(indices[i], indices[i + 1], stiffness)
	}
	return indices
}

export function createGrid(
	sys: ParticleSys,
	origin: Vec3,
	width: number,
	height: number,
	segX: number,
	segY: number,
	mass: number = 1,
	structuralStiffness: number = 1,
	shearStiffness: number = 0.5
): number[][] {
	const grid: number[][] = []
	const dx = width / segX
	const dy = height / segY
	for (let j = 0; j <= segY; j++) {
		const row: number[] = []
		for (let i = 0; i <= segX; i++) {
			const pos: Vec3 = {
				x: origin.x + i * dx,
				y: origin.y + j * dy,
				z: origin.z
			}
			row.push(sys.addParticle(pos, mass, false))
		}
		grid.push(row)
	}
	for (let j = 0; j <= segY; j++) {
		for (let i = 0; i < segX; i++) {
			sys.addLink(grid[j][i], grid[j][i + 1], structuralStiffness)
		}
	}
	for (let j = 0; j < segY; j++) {
		for (let i = 0; i <= segX; i++) {
			sys.addLink(grid[j][i], grid[j + 1][i], structuralStiffness)
		}
	}
	for (let j = 0; j < segY; j++) {
		for (let i = 0; i < segX; i++) {
			sys.addLink(grid[j][i], grid[j + 1][i + 1], shearStiffness)
			sys.addLink(grid[j][i + 1], grid[j + 1][i], shearStiffness)
		}
	}
	return grid
}
