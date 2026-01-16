import { type Vec3 } from '@engine/common'
import { vecAdd, vecSub, vecMul, vecLen, vecNorm } from './collider'

export interface FluidCfg {
	particleRadius: number
	restDensity: number
	stiffness: number
	viscosity: number
	surfaceTension: number
	gravity: Vec3
	damping: number
	boundaryStiffness: number
}

export const DEFAULT_FLUID_CFG: FluidCfg = {
	particleRadius: 0.1,
	restDensity: 1000,
	stiffness: 100,
	viscosity: 0.01,
	surfaceTension: 0.001,
	gravity: { x: 0, y: 0, z: -9.81 },
	damping: 0.98,
	boundaryStiffness: 1000
}

export interface FluidParticle {
	pos: Vec3
	vel: Vec3
	density: number
	pressure: number
	force: Vec3
}

export interface FluidBoundary {
	minX: number
	maxX: number
	minY: number
	maxY: number
	minZ: number
	maxZ: number
}

export class FluidSim {
	cfg: FluidCfg
	particles: FluidParticle[]
	grid: Map<string, number[]>
	h: number
	h2: number
	h6: number
	h9: number
	boundary: FluidBoundary | null

	constructor(cfg: Partial<FluidCfg> = {}) {
		this.cfg = { ...DEFAULT_FLUID_CFG, ...cfg }
		this.particles = []
		this.grid = new Map()
		this.h = this.cfg.particleRadius * 4
		this.h2 = this.h * this.h
		this.h6 = this.h2 * this.h2 * this.h2
		this.h9 = this.h6 * this.h2 * this.h
		this.boundary = null
	}

	addParticle(pos: Vec3, vel: Vec3 = { x: 0, y: 0, z: 0 }): number {
		const particle: FluidParticle = {
			pos: { ...pos },
			vel: { ...vel },
			density: 0,
			pressure: 0,
			force: { x: 0, y: 0, z: 0 }
		}
		this.particles.push(particle)
		return this.particles.length - 1
	}

	setBoundary(minX: number, maxX: number, minY: number, maxY: number, minZ: number, maxZ: number): void {
		this.boundary = { minX, maxX, minY, maxY, minZ, maxZ }
	}

	step(dt: number): void {
		this.buildGrid()
		this.calDensity()
		this.calPressure()
		this.calForces()
		this.integrate(dt)
		if (this.boundary) {
			this.enforceBoundary()
		}
	}

	private hashPos(pos: Vec3): string {
		const x = Math.floor(pos.x / this.h)
		const y = Math.floor(pos.y / this.h)
		const z = Math.floor(pos.z / this.h)
		return `${x}_${y}_${z}`
	}

	private buildGrid(): void {
		this.grid.clear()
		for (let i = 0; i < this.particles.length; i++) {
			const hash = this.hashPos(this.particles[i].pos)
			if (!this.grid.has(hash)) {
				this.grid.set(hash, [])
			}
			this.grid.get(hash)!.push(i)
		}
	}

	private getNeighbors(pos: Vec3): number[] {
		const neighbors: number[] = []
		const cx = Math.floor(pos.x / this.h)
		const cy = Math.floor(pos.y / this.h)
		const cz = Math.floor(pos.z / this.h)
		for (let dx = -1; dx <= 1; dx++) {
			for (let dy = -1; dy <= 1; dy++) {
				for (let dz = -1; dz <= 1; dz++) {
					const hash = `${cx + dx}_${cy + dy}_${cz + dz}`
					const cell = this.grid.get(hash)
					if (cell) {
						neighbors.push(...cell)
					}
				}
			}
		}
		return neighbors
	}

	private calDensity(): void {
		const mass = this.cfg.restDensity * (4 / 3) * Math.PI * Math.pow(this.cfg.particleRadius, 3)
		for (let i = 0; i < this.particles.length; i++) {
			const pi = this.particles[i]
			let density = 0
			const neighbors = this.getNeighbors(pi.pos)
			for (const j of neighbors) {
				const pj = this.particles[j]
				const r = vecLen(vecSub(pj.pos, pi.pos))
				if (r < this.h) {
					density += mass * this.kernelPoly6(r)
				}
			}
			pi.density = Math.max(density, this.cfg.restDensity * 0.1)
		}
	}

	private calPressure(): void {
		for (const p of this.particles) {
			p.pressure = this.cfg.stiffness * (p.density - this.cfg.restDensity)
		}
	}

	private calForces(): void {
		const mass = this.cfg.restDensity * (4 / 3) * Math.PI * Math.pow(this.cfg.particleRadius, 3)
		for (let i = 0; i < this.particles.length; i++) {
			const pi = this.particles[i]
			let pressureForce: Vec3 = { x: 0, y: 0, z: 0 }
			let viscosityForce: Vec3 = { x: 0, y: 0, z: 0 }
			let surfaceForce: Vec3 = { x: 0, y: 0, z: 0 }
			const neighbors = this.getNeighbors(pi.pos)
			for (const j of neighbors) {
				if (i === j) continue
				const pj = this.particles[j]
				const rVec = vecSub(pi.pos, pj.pos)
				const r = vecLen(rVec)
				if (r < this.h && r > 0.0001) {
					const rNorm = vecMul(rVec, 1 / r)
					const avgPressure = (pi.pressure + pj.pressure) * 0.5
					const pressureGrad = this.kernelSpikyGrad(r)
					pressureForce = vecAdd(pressureForce, vecMul(rNorm, -mass * avgPressure * pressureGrad / pj.density))
					const velDiff = vecSub(pj.vel, pi.vel)
					const viscLap = this.kernelViscosityLap(r)
					viscosityForce = vecAdd(viscosityForce, vecMul(velDiff, this.cfg.viscosity * mass * viscLap / pj.density))
					const colorGrad = this.kernelPoly6Grad(r)
					surfaceForce = vecAdd(surfaceForce, vecMul(rNorm, -this.cfg.surfaceTension * colorGrad))
				}
			}
			const gravityForce = vecMul(this.cfg.gravity, pi.density)
			pi.force = vecAdd(vecAdd(vecAdd(pressureForce, viscosityForce), surfaceForce), gravityForce)
		}
	}

	private integrate(dt: number): void {
		for (const p of this.particles) {
			const accel = vecMul(p.force, 1 / p.density)
			p.vel = vecMul(vecAdd(p.vel, vecMul(accel, dt)), this.cfg.damping)
			p.pos = vecAdd(p.pos, vecMul(p.vel, dt))
		}
	}

	private enforceBoundary(): void {
		if (!this.boundary) return
		const b = this.boundary
		const eps = this.cfg.particleRadius
		for (const p of this.particles) {
			if (p.pos.x < b.minX + eps) {
				p.pos.x = b.minX + eps
				p.vel.x = Math.abs(p.vel.x) * 0.3
			}
			if (p.pos.x > b.maxX - eps) {
				p.pos.x = b.maxX - eps
				p.vel.x = -Math.abs(p.vel.x) * 0.3
			}
			if (p.pos.y < b.minY + eps) {
				p.pos.y = b.minY + eps
				p.vel.y = Math.abs(p.vel.y) * 0.3
			}
			if (p.pos.y > b.maxY - eps) {
				p.pos.y = b.maxY - eps
				p.vel.y = -Math.abs(p.vel.y) * 0.3
			}
			if (p.pos.z < b.minZ + eps) {
				p.pos.z = b.minZ + eps
				p.vel.z = Math.abs(p.vel.z) * 0.3
			}
			if (p.pos.z > b.maxZ - eps) {
				p.pos.z = b.maxZ - eps
				p.vel.z = -Math.abs(p.vel.z) * 0.3
			}
		}
	}

	private kernelPoly6(r: number): number {
		if (r >= this.h) return 0
		const diff = this.h2 - r * r
		return 315 / (64 * Math.PI * this.h9) * diff * diff * diff
	}

	private kernelPoly6Grad(r: number): number {
		if (r >= this.h) return 0
		const diff = this.h2 - r * r
		return -945 / (32 * Math.PI * this.h9) * diff * diff * r
	}

	private kernelSpikyGrad(r: number): number {
		if (r >= this.h) return 0
		const diff = this.h - r
		return -45 / (Math.PI * this.h6) * diff * diff
	}

	private kernelViscosityLap(r: number): number {
		if (r >= this.h) return 0
		return 45 / (Math.PI * this.h6) * (this.h - r)
	}

	getPositions(): Vec3[] {
		return this.particles.map(p => ({ ...p.pos }))
	}

	getVelocities(): Vec3[] {
		return this.particles.map(p => ({ ...p.vel }))
	}

	getDensities(): number[] {
		return this.particles.map(p => p.density)
	}

	clr(): void {
		this.particles = []
		this.grid.clear()
	}
}

export function createFluidBlock(
	sim: FluidSim,
	minPos: Vec3,
	maxPos: Vec3,
	spacing: number
): number[] {
	const indices: number[] = []
	for (let x = minPos.x; x <= maxPos.x; x += spacing) {
		for (let y = minPos.y; y <= maxPos.y; y += spacing) {
			for (let z = minPos.z; z <= maxPos.z; z += spacing) {
				indices.push(sim.addParticle({ x, y, z }))
			}
		}
	}
	return indices
}

export function createFluidSphere(
	sim: FluidSim,
	center: Vec3,
	radius: number,
	spacing: number
): number[] {
	const indices: number[] = []
	for (let x = center.x - radius; x <= center.x + radius; x += spacing) {
		for (let y = center.y - radius; y <= center.y + radius; y += spacing) {
			for (let z = center.z - radius; z <= center.z + radius; z += spacing) {
				const dx = x - center.x
				const dy = y - center.y
				const dz = z - center.z
				if (dx * dx + dy * dy + dz * dz <= radius * radius) {
					indices.push(sim.addParticle({ x, y, z }))
				}
			}
		}
	}
	return indices
}
