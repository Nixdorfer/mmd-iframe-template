import type { Vec3, EntityId } from '@engine/common'

export interface Obstacle {
	id: string
	pos: Vec3
	radius: number
	vel: Vec3
	static: boolean
	layer: number
}

export interface AvoidCfg {
	predTime: number
	avoidRadius: number
	maxForce: number
	weight: number
	layerMask: number
}

export function defAvoidCfg(): AvoidCfg {
	return {
		predTime: 1.0,
		avoidRadius: 1.5,
		maxForce: 10,
		weight: 1.5,
		layerMask: 0xFFFFFFFF
	}
}

export class ObstacleMgr {
	obstacles: Map<string, Obstacle>
	entObstacles: Map<EntityId, string>
	grid: Map<string, Set<string>>
	cellSize: number

	constructor(cellSize: number = 4) {
		this.obstacles = new Map()
		this.entObstacles = new Map()
		this.grid = new Map()
		this.cellSize = cellSize
	}

	private cellKey(x: number, y: number): string {
		const cx = Math.floor(x / this.cellSize)
		const cy = Math.floor(y / this.cellSize)
		return `${cx},${cy}`
	}

	private getCellsInRange(pos: Vec3, range: number): string[] {
		const cells: string[] = []
		const minCx = Math.floor((pos.x - range) / this.cellSize)
		const maxCx = Math.floor((pos.x + range) / this.cellSize)
		const minCy = Math.floor((pos.y - range) / this.cellSize)
		const maxCy = Math.floor((pos.y + range) / this.cellSize)
		for (let cx = minCx; cx <= maxCx; cx++) {
			for (let cy = minCy; cy <= maxCy; cy++) {
				cells.push(`${cx},${cy}`)
			}
		}
		return cells
	}

	addObstacle(obs: Obstacle) {
		this.obstacles.set(obs.id, obs)
		const key = this.cellKey(obs.pos.x, obs.pos.y)
		let cell = this.grid.get(key)
		if (!cell) {
			cell = new Set()
			this.grid.set(key, cell)
		}
		cell.add(obs.id)
	}

	addEntObstacle(entId: EntityId, pos: Vec3, radius: number, vel: Vec3 = { x: 0, y: 0, z: 0 }, layer: number = 1) {
		const id = `ent_${entId}`
		this.removeEntObstacle(entId)
		this.addObstacle({
			id,
			pos: { ...pos },
			radius,
			vel: { ...vel },
			static: false,
			layer
		})
		this.entObstacles.set(entId, id)
	}

	removeObstacle(id: string) {
		const obs = this.obstacles.get(id)
		if (obs) {
			const key = this.cellKey(obs.pos.x, obs.pos.y)
			const cell = this.grid.get(key)
			if (cell) {
				cell.delete(id)
				if (cell.size === 0) this.grid.delete(key)
			}
			this.obstacles.delete(id)
		}
	}

	removeEntObstacle(entId: EntityId) {
		const id = this.entObstacles.get(entId)
		if (id) {
			this.removeObstacle(id)
			this.entObstacles.delete(entId)
		}
	}

	updObstacle(id: string, pos: Vec3, vel?: Vec3) {
		const obs = this.obstacles.get(id)
		if (!obs) return
		const oldKey = this.cellKey(obs.pos.x, obs.pos.y)
		const newKey = this.cellKey(pos.x, pos.y)
		obs.pos = { ...pos }
		if (vel) obs.vel = { ...vel }
		if (oldKey !== newKey) {
			const oldCell = this.grid.get(oldKey)
			if (oldCell) {
				oldCell.delete(id)
				if (oldCell.size === 0) this.grid.delete(oldKey)
			}
			let newCell = this.grid.get(newKey)
			if (!newCell) {
				newCell = new Set()
				this.grid.set(newKey, newCell)
			}
			newCell.add(id)
		}
	}

	updEntObstacle(entId: EntityId, pos: Vec3, vel?: Vec3) {
		const id = this.entObstacles.get(entId)
		if (id) {
			this.updObstacle(id, pos, vel)
		}
	}

	getNearby(pos: Vec3, range: number, layerMask: number = 0xFFFFFFFF): Obstacle[] {
		const result: Obstacle[] = []
		const cells = this.getCellsInRange(pos, range)
		const seen = new Set<string>()
		for (const cellKey of cells) {
			const cell = this.grid.get(cellKey)
			if (!cell) continue
			for (const obsId of cell) {
				if (seen.has(obsId)) continue
				seen.add(obsId)
				const obs = this.obstacles.get(obsId)
				if (!obs) continue
				if ((obs.layer & layerMask) === 0) continue
				const dx = obs.pos.x - pos.x
				const dy = obs.pos.y - pos.y
				const dz = obs.pos.z - pos.z
				const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
				if (dist <= range + obs.radius) {
					result.push(obs)
				}
			}
		}
		return result
	}

	createCostMod(pos: Vec3, range: number, baseCost: number = 10): (x: number, y: number, z: number) => number {
		return (x: number, y: number, z: number) => {
			const obstacles = this.getNearby({ x, y, z }, range)
			let cost = 1
			for (const obs of obstacles) {
				const dx = obs.pos.x - x
				const dy = obs.pos.y - y
				const dz = obs.pos.z - z
				const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
				if (dist < obs.radius) {
					cost += baseCost
				} else if (dist < obs.radius * 2) {
					const factor = 1 - (dist - obs.radius) / obs.radius
					cost += baseCost * factor
				}
			}
			return cost
		}
	}

	clear() {
		this.obstacles.clear()
		this.entObstacles.clear()
		this.grid.clear()
	}
}

export class LocalAvoid {
	obsMgr: ObstacleMgr
	cfg: AvoidCfg

	constructor(obsMgr: ObstacleMgr, cfg?: Partial<AvoidCfg>) {
		this.obsMgr = obsMgr
		this.cfg = { ...defAvoidCfg(), ...cfg }
	}

	calAvoidForce(pos: Vec3, vel: Vec3, radius: number, exclude?: string): Vec3 {
		const force: Vec3 = { x: 0, y: 0, z: 0 }
		const range = this.cfg.avoidRadius + this.cfg.predTime * Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z)
		const obstacles = this.obsMgr.getNearby(pos, range, this.cfg.layerMask)
		for (const obs of obstacles) {
			if (exclude && obs.id === exclude) continue
			const avoidF = this.calSingleAvoid(pos, vel, radius, obs)
			force.x += avoidF.x
			force.y += avoidF.y
			force.z += avoidF.z
		}
		const mag = Math.sqrt(force.x * force.x + force.y * force.y + force.z * force.z)
		if (mag > this.cfg.maxForce) {
			const scale = this.cfg.maxForce / mag
			force.x *= scale
			force.y *= scale
			force.z *= scale
		}
		return force
	}

	private calSingleAvoid(pos: Vec3, vel: Vec3, radius: number, obs: Obstacle): Vec3 {
		const relPos: Vec3 = {
			x: obs.pos.x - pos.x,
			y: obs.pos.y - pos.y,
			z: obs.pos.z - pos.z
		}
		const relVel: Vec3 = {
			x: vel.x - obs.vel.x,
			y: vel.y - obs.vel.y,
			z: vel.z - obs.vel.z
		}
		const combRadius = radius + obs.radius + this.cfg.avoidRadius
		const dist = Math.sqrt(relPos.x * relPos.x + relPos.y * relPos.y + relPos.z * relPos.z)
		if (dist > combRadius + this.cfg.predTime * 10) {
			return { x: 0, y: 0, z: 0 }
		}
		const speed = Math.sqrt(relVel.x * relVel.x + relVel.y * relVel.y + relVel.z * relVel.z)
		if (speed < 0.001) {
			if (dist < combRadius) {
				const pushDir: Vec3 = {
					x: dist > 0.001 ? -relPos.x / dist : 1,
					y: dist > 0.001 ? -relPos.y / dist : 0,
					z: dist > 0.001 ? -relPos.z / dist : 0
				}
				const strength = (combRadius - dist) / combRadius * this.cfg.maxForce * this.cfg.weight
				return {
					x: pushDir.x * strength,
					y: pushDir.y * strength,
					z: pushDir.z * strength
				}
			}
			return { x: 0, y: 0, z: 0 }
		}
		const dot = relPos.x * relVel.x + relPos.y * relVel.y + relPos.z * relVel.z
		const tClosest = -dot / (speed * speed)
		if (tClosest < 0 || tClosest > this.cfg.predTime) {
			return { x: 0, y: 0, z: 0 }
		}
		const closest: Vec3 = {
			x: relPos.x + relVel.x * tClosest,
			y: relPos.y + relVel.y * tClosest,
			z: relPos.z + relVel.z * tClosest
		}
		const closestDist = Math.sqrt(closest.x * closest.x + closest.y * closest.y + closest.z * closest.z)
		if (closestDist >= combRadius) {
			return { x: 0, y: 0, z: 0 }
		}
		const avoidDir: Vec3 = {
			x: closestDist > 0.001 ? -closest.x / closestDist : 1,
			y: closestDist > 0.001 ? -closest.y / closestDist : 0,
			z: closestDist > 0.001 ? -closest.z / closestDist : 0
		}
		const urgency = 1 - tClosest / this.cfg.predTime
		const penetration = (combRadius - closestDist) / combRadius
		const strength = urgency * penetration * this.cfg.maxForce * this.cfg.weight
		return {
			x: avoidDir.x * strength,
			y: avoidDir.y * strength,
			z: avoidDir.z * strength
		}
	}

	predictCollision(pos: Vec3, vel: Vec3, radius: number, exclude?: string): { time: number; obstacle: Obstacle } | null {
		const range = this.cfg.predTime * Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z) + radius + this.cfg.avoidRadius
		const obstacles = this.obsMgr.getNearby(pos, range, this.cfg.layerMask)
		let earliest: { time: number; obstacle: Obstacle } | null = null
		for (const obs of obstacles) {
			if (exclude && obs.id === exclude) continue
			const time = this.calCollisionTime(pos, vel, radius, obs)
			if (time !== null && time >= 0 && time <= this.cfg.predTime) {
				if (!earliest || time < earliest.time) {
					earliest = { time, obstacle: obs }
				}
			}
		}
		return earliest
	}

	private calCollisionTime(pos: Vec3, vel: Vec3, radius: number, obs: Obstacle): number | null {
		const relPos: Vec3 = {
			x: obs.pos.x - pos.x,
			y: obs.pos.y - pos.y,
			z: obs.pos.z - pos.z
		}
		const relVel: Vec3 = {
			x: vel.x - obs.vel.x,
			y: vel.y - obs.vel.y,
			z: vel.z - obs.vel.z
		}
		const combRadius = radius + obs.radius
		const a = relVel.x * relVel.x + relVel.y * relVel.y + relVel.z * relVel.z
		const b = 2 * (relPos.x * relVel.x + relPos.y * relVel.y + relPos.z * relVel.z)
		const c = relPos.x * relPos.x + relPos.y * relPos.y + relPos.z * relPos.z - combRadius * combRadius
		const disc = b * b - 4 * a * c
		if (disc < 0 || a < 0.0001) return null
		const sqrtDisc = Math.sqrt(disc)
		const t1 = (-b - sqrtDisc) / (2 * a)
		const t2 = (-b + sqrtDisc) / (2 * a)
		if (t1 >= 0) return t1
		if (t2 >= 0) return t2
		return null
	}
}

export function applyAvoidance(
	pos: Vec3,
	vel: Vec3,
	desiredVel: Vec3,
	avoidForce: Vec3,
	maxSpeed: number,
	dt: number
): Vec3 {
	const newVel: Vec3 = {
		x: desiredVel.x + avoidForce.x * dt,
		y: desiredVel.y + avoidForce.y * dt,
		z: desiredVel.z + avoidForce.z * dt
	}
	const speed = Math.sqrt(newVel.x * newVel.x + newVel.y * newVel.y + newVel.z * newVel.z)
	if (speed > maxSpeed) {
		const scale = maxSpeed / speed
		newVel.x *= scale
		newVel.y *= scale
		newVel.z *= scale
	}
	return newVel
}

export interface RVOAgent {
	id: EntityId
	pos: Vec3
	vel: Vec3
	prefVel: Vec3
	radius: number
	maxSpeed: number
	neighborDist: number
}

export class RVOSimulator {
	agents: Map<EntityId, RVOAgent>
	obsMgr: ObstacleMgr
	timeHorizon: number
	timeStep: number

	constructor(obsMgr: ObstacleMgr, timeHorizon: number = 2.0) {
		this.agents = new Map()
		this.obsMgr = obsMgr
		this.timeHorizon = timeHorizon
		this.timeStep = 1 / 60
	}

	addAgent(agent: RVOAgent) {
		this.agents.set(agent.id, agent)
	}

	removeAgent(id: EntityId) {
		this.agents.delete(id)
	}

	updAgent(id: EntityId, pos: Vec3, prefVel: Vec3) {
		const agent = this.agents.get(id)
		if (agent) {
			agent.pos = { ...pos }
			agent.prefVel = { ...prefVel }
		}
	}

	step(): Map<EntityId, Vec3> {
		const newVels = new Map<EntityId, Vec3>()
		for (const [id, agent] of this.agents) {
			const newVel = this.calNewVel(agent)
			newVels.set(id, newVel)
		}
		for (const [id, vel] of newVels) {
			const agent = this.agents.get(id)
			if (agent) {
				agent.vel = vel
			}
		}
		return newVels
	}

	private calNewVel(agent: RVOAgent): Vec3 {
		const orcaLines: ORCALine[] = []
		for (const [otherId, other] of this.agents) {
			if (otherId === agent.id) continue
			const dx = other.pos.x - agent.pos.x
			const dy = other.pos.y - agent.pos.y
			const distSq = dx * dx + dy * dy
			if (distSq > agent.neighborDist * agent.neighborDist) continue
			const line = this.calORCALine(agent, other)
			if (line) orcaLines.push(line)
		}
		const obstacles = this.obsMgr.getNearby(agent.pos, agent.neighborDist)
		for (const obs of obstacles) {
			const line = this.calObstacleLine(agent, obs)
			if (line) orcaLines.push(line)
		}
		return this.linearProgram(orcaLines, agent.prefVel, agent.maxSpeed)
	}

	private calORCALine(agent: RVOAgent, other: RVOAgent): ORCALine | null {
		const relPos: Vec3 = {
			x: other.pos.x - agent.pos.x,
			y: other.pos.y - agent.pos.y,
			z: 0
		}
		const relVel: Vec3 = {
			x: agent.vel.x - other.vel.x,
			y: agent.vel.y - other.vel.y,
			z: 0
		}
		const distSq = relPos.x * relPos.x + relPos.y * relPos.y
		const combRadius = agent.radius + other.radius
		const combRadiusSq = combRadius * combRadius
		const dist = Math.sqrt(distSq)
		if (dist < 0.001) return null
		const invTimeHorizon = 1.0 / this.timeHorizon
		const w: Vec3 = {
			x: relVel.x - invTimeHorizon * relPos.x,
			y: relVel.y - invTimeHorizon * relPos.y,
			z: 0
		}
		const wLenSq = w.x * w.x + w.y * w.y
		const dotProduct1 = w.x * relPos.x + w.y * relPos.y
		if (dotProduct1 < 0 && dotProduct1 * dotProduct1 > combRadiusSq * wLenSq) {
			const wLen = Math.sqrt(wLenSq)
			const unitW: Vec3 = { x: w.x / wLen, y: w.y / wLen, z: 0 }
			return {
				dir: { x: unitW.y, y: -unitW.x, z: 0 },
				point: {
					x: (agent.vel.x + other.vel.x) / 2 + combRadius * invTimeHorizon * unitW.x,
					y: (agent.vel.y + other.vel.y) / 2 + combRadius * invTimeHorizon * unitW.y,
					z: 0
				}
			}
		}
		const leg = Math.sqrt(distSq - combRadiusSq)
		if (relPos.x * w.y - relPos.y * w.x > 0) {
			return {
				dir: {
					x: (relPos.x * leg - relPos.y * combRadius) / distSq,
					y: (relPos.x * combRadius + relPos.y * leg) / distSq,
					z: 0
				},
				point: {
					x: (agent.vel.x + other.vel.x) / 2,
					y: (agent.vel.y + other.vel.y) / 2,
					z: 0
				}
			}
		}
		return {
			dir: {
				x: (relPos.x * leg + relPos.y * combRadius) / distSq,
				y: (-relPos.x * combRadius + relPos.y * leg) / distSq,
				z: 0
			},
			point: {
				x: (agent.vel.x + other.vel.x) / 2,
				y: (agent.vel.y + other.vel.y) / 2,
				z: 0
			}
		}
	}

	private calObstacleLine(agent: RVOAgent, obs: Obstacle): ORCALine | null {
		const relPos: Vec3 = {
			x: obs.pos.x - agent.pos.x,
			y: obs.pos.y - agent.pos.y,
			z: 0
		}
		const dist = Math.sqrt(relPos.x * relPos.x + relPos.y * relPos.y)
		if (dist < 0.001) return null
		const combRadius = agent.radius + obs.radius
		if (dist < combRadius) {
			const unitDir: Vec3 = { x: -relPos.x / dist, y: -relPos.y / dist, z: 0 }
			return {
				dir: { x: -unitDir.y, y: unitDir.x, z: 0 },
				point: { x: unitDir.x * agent.maxSpeed, y: unitDir.y * agent.maxSpeed, z: 0 }
			}
		}
		const invTimeHorizon = 1.0 / this.timeHorizon
		const w: Vec3 = {
			x: agent.vel.x - invTimeHorizon * relPos.x,
			y: agent.vel.y - invTimeHorizon * relPos.y,
			z: 0
		}
		const wLen = Math.sqrt(w.x * w.x + w.y * w.y)
		if (wLen < 0.001) return null
		const unitW: Vec3 = { x: w.x / wLen, y: w.y / wLen, z: 0 }
		return {
			dir: { x: unitW.y, y: -unitW.x, z: 0 },
			point: {
				x: combRadius * invTimeHorizon * unitW.x,
				y: combRadius * invTimeHorizon * unitW.y,
				z: 0
			}
		}
	}

	private linearProgram(lines: ORCALine[], prefVel: Vec3, maxSpeed: number): Vec3 {
		let result: Vec3 = { ...prefVel }
		for (let i = 0; i < lines.length; i++) {
			if (this.det(lines[i].dir, { x: lines[i].point.x - result.x, y: lines[i].point.y - result.y, z: 0 }) > 0) {
				result = this.linearProgram1(lines, i, prefVel, maxSpeed)
			}
		}
		const speed = Math.sqrt(result.x * result.x + result.y * result.y)
		if (speed > maxSpeed) {
			result.x *= maxSpeed / speed
			result.y *= maxSpeed / speed
		}
		return result
	}

	private linearProgram1(lines: ORCALine[], lineNo: number, prefVel: Vec3, maxSpeed: number): Vec3 {
		const line = lines[lineNo]
		const dotProduct = line.point.x * line.dir.x + line.point.y * line.dir.y
		const discriminant = dotProduct * dotProduct + maxSpeed * maxSpeed -
			(line.point.x * line.point.x + line.point.y * line.point.y)
		if (discriminant < 0) {
			return { x: line.point.x, y: line.point.y, z: 0 }
		}
		const sqrtDisc = Math.sqrt(discriminant)
		let tLeft = -dotProduct - sqrtDisc
		let tRight = -dotProduct + sqrtDisc
		for (let i = 0; i < lineNo; i++) {
			const denom = this.det(line.dir, lines[i].dir)
			const numer = this.det(lines[i].dir, {
				x: line.point.x - lines[i].point.x,
				y: line.point.y - lines[i].point.y,
				z: 0
			})
			if (Math.abs(denom) < 0.00001) {
				if (numer < 0) return { x: line.point.x, y: line.point.y, z: 0 }
				continue
			}
			const t = numer / denom
			if (denom > 0) {
				tRight = Math.min(tRight, t)
			} else {
				tLeft = Math.max(tLeft, t)
			}
			if (tLeft > tRight) {
				return { x: line.point.x, y: line.point.y, z: 0 }
			}
		}
		const tOpt = line.dir.x * (prefVel.x - line.point.x) + line.dir.y * (prefVel.y - line.point.y)
		const t = Math.max(tLeft, Math.min(tRight, tOpt))
		return {
			x: line.point.x + t * line.dir.x,
			y: line.point.y + t * line.dir.y,
			z: prefVel.z
		}
	}

	private det(v1: Vec3, v2: Vec3): number {
		return v1.x * v2.y - v1.y * v2.x
	}
}

interface ORCALine {
	dir: Vec3
	point: Vec3
}
