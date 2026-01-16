import type { Vec3, EntityId } from '@engine/common'

export interface RopeNode {
	pos: Vec3
	prevPos: Vec3
	vel: Vec3
	mass: number
	fixed: boolean
}

export interface RopeConstraint {
	nodeA: number
	nodeB: number
	restLength: number
	stiffness: number
}

export interface RopeCfg {
	segments: number
	length: number
	mass: number
	stiffness: number
	damping: number
	gravity: Vec3
	iterations: number
	maxStretch: number
	collisionRadius: number
}

export const DEFAULT_ROPE_CFG: RopeCfg = {
	segments: 20,
	length: 5.0,
	mass: 1.0,
	stiffness: 0.9,
	damping: 0.98,
	gravity: { x: 0, y: 0, z: -9.81 },
	iterations: 4,
	maxStretch: 1.5,
	collisionRadius: 0.05
}

export class Rope {
	id: string
	cfg: RopeCfg
	nodes: RopeNode[]
	constraints: RopeConstraint[]
	attachStart: { entityId: EntityId, offset: Vec3 } | null
	attachEnd: { entityId: EntityId, offset: Vec3 } | null

	constructor(id: string, start: Vec3, end: Vec3, cfg: Partial<RopeCfg> = {}) {
		this.id = id
		this.cfg = { ...DEFAULT_ROPE_CFG, ...cfg }
		this.nodes = []
		this.constraints = []
		this.attachStart = null
		this.attachEnd = null
		this.ini(start, end)
	}

	private ini(start: Vec3, end: Vec3) {
		const { segments, mass, stiffness } = this.cfg
		const dx = (end.x - start.x) / segments
		const dy = (end.y - start.y) / segments
		const dz = (end.z - start.z) / segments
		const segmentLength = Math.sqrt(dx * dx + dy * dy + dz * dz)
		const nodeMass = mass / (segments + 1)
		for (let i = 0; i <= segments; i++) {
			const pos: Vec3 = {
				x: start.x + dx * i,
				y: start.y + dy * i,
				z: start.z + dz * i
			}
			this.nodes.push({
				pos: { ...pos },
				prevPos: { ...pos },
				vel: { x: 0, y: 0, z: 0 },
				mass: nodeMass,
				fixed: i === 0
			})
		}
		for (let i = 0; i < segments; i++) {
			this.constraints.push({
				nodeA: i,
				nodeB: i + 1,
				restLength: segmentLength,
				stiffness
			})
		}
	}

	upd(dt: number) {
		this.applyForces(dt)
		this.integrate(dt)
		this.solveConstraints()
		this.updVelocities(dt)
	}

	private applyForces(dt: number) {
		const { gravity, damping } = this.cfg
		for (const node of this.nodes) {
			if (node.fixed) continue
			node.vel.x += gravity.x * dt
			node.vel.y += gravity.y * dt
			node.vel.z += gravity.z * dt
			node.vel.x *= damping
			node.vel.y *= damping
			node.vel.z *= damping
		}
	}

	private integrate(dt: number) {
		for (const node of this.nodes) {
			if (node.fixed) continue
			node.prevPos = { ...node.pos }
			node.pos.x += node.vel.x * dt
			node.pos.y += node.vel.y * dt
			node.pos.z += node.vel.z * dt
		}
	}

	private solveConstraints() {
		const { iterations, maxStretch } = this.cfg
		for (let iter = 0; iter < iterations; iter++) {
			for (const c of this.constraints) {
				const nodeA = this.nodes[c.nodeA]
				const nodeB = this.nodes[c.nodeB]
				const dx = nodeB.pos.x - nodeA.pos.x
				const dy = nodeB.pos.y - nodeA.pos.y
				const dz = nodeB.pos.z - nodeA.pos.z
				const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
				if (dist < 0.0001) continue
				const maxLen = c.restLength * maxStretch
				const targetDist = Math.min(dist, maxLen)
				const diff = (targetDist - c.restLength) / dist
				const correction = diff * c.stiffness * 0.5
				const cx = dx * correction
				const cy = dy * correction
				const cz = dz * correction
				if (!nodeA.fixed) {
					const massRatioA = nodeB.fixed ? 1 : nodeB.mass / (nodeA.mass + nodeB.mass)
					nodeA.pos.x += cx * massRatioA
					nodeA.pos.y += cy * massRatioA
					nodeA.pos.z += cz * massRatioA
				}
				if (!nodeB.fixed) {
					const massRatioB = nodeA.fixed ? 1 : nodeA.mass / (nodeA.mass + nodeB.mass)
					nodeB.pos.x -= cx * massRatioB
					nodeB.pos.y -= cy * massRatioB
					nodeB.pos.z -= cz * massRatioB
				}
			}
		}
	}

	private updVelocities(dt: number) {
		if (dt < 0.0001) return
		for (const node of this.nodes) {
			if (node.fixed) continue
			node.vel.x = (node.pos.x - node.prevPos.x) / dt
			node.vel.y = (node.pos.y - node.prevPos.y) / dt
			node.vel.z = (node.pos.z - node.prevPos.z) / dt
		}
	}

	setStartFixed(fixed: boolean) {
		if (this.nodes.length > 0) {
			this.nodes[0].fixed = fixed
		}
	}

	setEndFixed(fixed: boolean) {
		if (this.nodes.length > 0) {
			this.nodes[this.nodes.length - 1].fixed = fixed
		}
	}

	setNodePos(index: number, pos: Vec3) {
		if (index >= 0 && index < this.nodes.length) {
			this.nodes[index].pos = { ...pos }
			this.nodes[index].prevPos = { ...pos }
		}
	}

	setStartPos(pos: Vec3) {
		this.setNodePos(0, pos)
	}

	setEndPos(pos: Vec3) {
		this.setNodePos(this.nodes.length - 1, pos)
	}

	applyForce(force: Vec3, nodeIndex?: number) {
		if (nodeIndex !== undefined) {
			if (nodeIndex >= 0 && nodeIndex < this.nodes.length) {
				const node = this.nodes[nodeIndex]
				if (!node.fixed) {
					node.vel.x += force.x / node.mass
					node.vel.y += force.y / node.mass
					node.vel.z += force.z / node.mass
				}
			}
		} else {
			for (const node of this.nodes) {
				if (!node.fixed) {
					node.vel.x += force.x / node.mass
					node.vel.y += force.y / node.mass
					node.vel.z += force.z / node.mass
				}
			}
		}
	}

	applyImpulse(impulse: Vec3, nodeIndex: number) {
		if (nodeIndex >= 0 && nodeIndex < this.nodes.length) {
			const node = this.nodes[nodeIndex]
			if (!node.fixed) {
				node.vel.x += impulse.x / node.mass
				node.vel.y += impulse.y / node.mass
				node.vel.z += impulse.z / node.mass
			}
		}
	}

	getLength(): number {
		let len = 0
		for (let i = 0; i < this.nodes.length - 1; i++) {
			const a = this.nodes[i].pos
			const b = this.nodes[i + 1].pos
			const dx = b.x - a.x
			const dy = b.y - a.y
			const dz = b.z - a.z
			len += Math.sqrt(dx * dx + dy * dy + dz * dz)
		}
		return len
	}

	getTension(): number {
		let maxTension = 0
		for (const c of this.constraints) {
			const nodeA = this.nodes[c.nodeA]
			const nodeB = this.nodes[c.nodeB]
			const dx = nodeB.pos.x - nodeA.pos.x
			const dy = nodeB.pos.y - nodeA.pos.y
			const dz = nodeB.pos.z - nodeA.pos.z
			const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
			const stretch = dist / c.restLength
			maxTension = Math.max(maxTension, stretch)
		}
		return maxTension
	}

	getPositions(): Vec3[] {
		return this.nodes.map(n => ({ ...n.pos }))
	}

	attachToEntity(entityId: EntityId, offset: Vec3, isStart: boolean) {
		if (isStart) {
			this.attachStart = { entityId, offset }
			this.nodes[0].fixed = true
		} else {
			this.attachEnd = { entityId, offset }
			this.nodes[this.nodes.length - 1].fixed = true
		}
	}

	detach(isStart: boolean) {
		if (isStart) {
			this.attachStart = null
			this.nodes[0].fixed = false
		} else {
			this.attachEnd = null
			this.nodes[this.nodes.length - 1].fixed = false
		}
	}

	reset(start: Vec3, end: Vec3) {
		this.nodes = []
		this.constraints = []
		this.ini(start, end)
	}
}

export interface RopeCollider {
	type: 'sphere' | 'plane'
	pos: Vec3
	radius?: number
	normal?: Vec3
}

export class RopeManager {
	ropes: Map<string, Rope>
	colliders: RopeCollider[]

	constructor() {
		this.ropes = new Map()
		this.colliders = []
	}

	create(id: string, start: Vec3, end: Vec3, cfg?: Partial<RopeCfg>): Rope {
		const rope = new Rope(id, start, end, cfg)
		this.ropes.set(id, rope)
		return rope
	}

	remove(id: string) {
		this.ropes.delete(id)
	}

	get(id: string): Rope | null {
		return this.ropes.get(id) ?? null
	}

	addCollider(collider: RopeCollider) {
		this.colliders.push(collider)
	}

	removeCollider(index: number) {
		this.colliders.splice(index, 1)
	}

	clrColliders() {
		this.colliders = []
	}

	upd(dt: number) {
		for (const rope of this.ropes.values()) {
			rope.upd(dt)
			this.handleCollisions(rope)
		}
	}

	private handleCollisions(rope: Rope) {
		const radius = rope.cfg.collisionRadius
		for (const node of rope.nodes) {
			if (node.fixed) continue
			for (const col of this.colliders) {
				if (col.type === 'sphere' && col.radius !== undefined) {
					const dx = node.pos.x - col.pos.x
					const dy = node.pos.y - col.pos.y
					const dz = node.pos.z - col.pos.z
					const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
					const minDist = col.radius + radius
					if (dist < minDist && dist > 0.0001) {
						const penetration = minDist - dist
						const nx = dx / dist
						const ny = dy / dist
						const nz = dz / dist
						node.pos.x += nx * penetration
						node.pos.y += ny * penetration
						node.pos.z += nz * penetration
						const velDotN = node.vel.x * nx + node.vel.y * ny + node.vel.z * nz
						if (velDotN < 0) {
							node.vel.x -= nx * velDotN * 1.5
							node.vel.y -= ny * velDotN * 1.5
							node.vel.z -= nz * velDotN * 1.5
						}
					}
				} else if (col.type === 'plane' && col.normal) {
					const d = (node.pos.x - col.pos.x) * col.normal.x +
						(node.pos.y - col.pos.y) * col.normal.y +
						(node.pos.z - col.pos.z) * col.normal.z
					if (d < radius) {
						const penetration = radius - d
						node.pos.x += col.normal.x * penetration
						node.pos.y += col.normal.y * penetration
						node.pos.z += col.normal.z * penetration
						const velDotN = node.vel.x * col.normal.x +
							node.vel.y * col.normal.y +
							node.vel.z * col.normal.z
						if (velDotN < 0) {
							node.vel.x -= col.normal.x * velDotN * 1.5
							node.vel.y -= col.normal.y * velDotN * 1.5
							node.vel.z -= col.normal.z * velDotN * 1.5
						}
					}
				}
			}
		}
	}

	getAllRopes(): Rope[] {
		return Array.from(this.ropes.values())
	}

	clr() {
		this.ropes.clear()
	}
}

export const globalRopeManager = new RopeManager()
