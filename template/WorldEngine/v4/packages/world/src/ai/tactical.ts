import type { Vec3, EntityId } from '@engine/common'

export enum CoverType {
	None = 0,
	Half = 1,
	Full = 2
}

export interface CoverPoint {
	id: string
	pos: Vec3
	typ: CoverType
	dir: Vec3
	occupied: EntityId | null
	rating: number
}

export interface TacticalNode {
	id: string
	pos: Vec3
	cover: CoverType
	visibility: number
	elevation: number
	neighbors: string[]
	coverPoints: string[]
}

export interface ThreatInfo {
	entityId: EntityId
	pos: Vec3
	dir: Vec3
	threat: number
	lastSeen: number
	accuracy: number
	damage: number
}

export interface TacticalCtx {
	myPos: Vec3
	myTeam: number
	threats: ThreatInfo[]
	allies: { entityId: EntityId, pos: Vec3 }[]
	objective: Vec3 | null
	urgency: number
}

export interface TacticalDecision {
	action: 'move' | 'cover' | 'attack' | 'flank' | 'retreat' | 'support' | 'hold'
	target: Vec3 | EntityId | null
	priority: number
	reason: string
}

export class TacticalMap {
	nodes: Map<string, TacticalNode>
	coverPoints: Map<string, CoverPoint>
	gridSize: number
	bounds: { min: Vec3, max: Vec3 }

	constructor(gridSize: number = 2) {
		this.nodes = new Map()
		this.coverPoints = new Map()
		this.gridSize = gridSize
		this.bounds = {
			min: { x: 0, y: 0, z: 0 },
			max: { x: 100, y: 100, z: 10 }
		}
	}

	addNode(node: TacticalNode) {
		this.nodes.set(node.id, node)
	}

	addCoverPoint(cover: CoverPoint) {
		this.coverPoints.set(cover.id, cover)
	}

	getNodeAt(pos: Vec3): TacticalNode | null {
		const gx = Math.floor(pos.x / this.gridSize)
		const gy = Math.floor(pos.y / this.gridSize)
		const id = `${gx}_${gy}`
		return this.nodes.get(id) ?? null
	}

	findNearestCover(pos: Vec3, maxDist: number = 20): CoverPoint | null {
		let nearest: CoverPoint | null = null
		let minDist = maxDist
		for (const cover of this.coverPoints.values()) {
			if (cover.occupied) continue
			const dist = this.dist(pos, cover.pos)
			if (dist < minDist) {
				minDist = dist
				nearest = cover
			}
		}
		return nearest
	}

	findBestCover(pos: Vec3, threats: ThreatInfo[], maxDist: number = 20): CoverPoint | null {
		let best: CoverPoint | null = null
		let bestScore = -Infinity
		for (const cover of this.coverPoints.values()) {
			if (cover.occupied) continue
			const dist = this.dist(pos, cover.pos)
			if (dist > maxDist) continue
			let score = cover.rating - dist * 0.5
			for (const threat of threats) {
				const threatDist = this.dist(cover.pos, threat.pos)
				const dot = this.dotDir(cover.dir, this.dirTo(cover.pos, threat.pos))
				if (dot < 0) {
					score += cover.typ * 10
				}
				score += threatDist * 0.2
			}
			if (score > bestScore) {
				bestScore = score
				best = cover
			}
		}
		return best
	}

	findFlankingPos(target: Vec3, myPos: Vec3): Vec3 | null {
		const toMe = this.dirTo(target, myPos)
		const perpendicular: Vec3 = { x: -toMe.y, y: toMe.x, z: 0 }
		const flankDist = 15
		const candidates = [
			{ x: target.x + perpendicular.x * flankDist, y: target.y + perpendicular.y * flankDist, z: target.z },
			{ x: target.x - perpendicular.x * flankDist, y: target.y - perpendicular.y * flankDist, z: target.z }
		]
		let best: Vec3 | null = null
		let bestDist = Infinity
		for (const pos of candidates) {
			const dist = this.dist(myPos, pos)
			const node = this.getNodeAt(pos)
			if (node && dist < bestDist) {
				bestDist = dist
				best = pos
			}
		}
		return best
	}

	calVisibility(from: Vec3, to: Vec3): number {
		const dist = this.dist(from, to)
		const maxVis = 50
		let visibility = 1 - Math.min(dist / maxVis, 1)
		return visibility
	}

	occupyCover(coverId: string, entityId: EntityId): boolean {
		const cover = this.coverPoints.get(coverId)
		if (!cover || cover.occupied) return false
		cover.occupied = entityId
		return true
	}

	releaseCover(coverId: string) {
		const cover = this.coverPoints.get(coverId)
		if (cover) cover.occupied = null
	}

	private dist(a: Vec3, b: Vec3): number {
		const dx = b.x - a.x
		const dy = b.y - a.y
		const dz = b.z - a.z
		return Math.sqrt(dx * dx + dy * dy + dz * dz)
	}

	private dirTo(from: Vec3, to: Vec3): Vec3 {
		const dx = to.x - from.x
		const dy = to.y - from.y
		const dz = to.z - from.z
		const len = Math.sqrt(dx * dx + dy * dy + dz * dz)
		if (len < 0.001) return { x: 0, y: 0, z: 0 }
		return { x: dx / len, y: dy / len, z: dz / len }
	}

	private dotDir(a: Vec3, b: Vec3): number {
		return a.x * b.x + a.y * b.y + a.z * b.z
	}
}

export class TacticalAI {
	entityId: EntityId
	map: TacticalMap
	threats: Map<EntityId, ThreatInfo>
	currentCover: string | null
	aggressiveness: number
	caution: number
	teamwork: number

	constructor(entityId: EntityId, map: TacticalMap) {
		this.entityId = entityId
		this.map = map
		this.threats = new Map()
		this.currentCover = null
		this.aggressiveness = 0.5
		this.caution = 0.5
		this.teamwork = 0.5
	}

	addThreat(threat: ThreatInfo) {
		this.threats.set(threat.entityId, threat)
	}

	removeThreat(entityId: EntityId) {
		this.threats.delete(entityId)
	}

	updThreat(entityId: EntityId, pos: Vec3, now: number) {
		const threat = this.threats.get(entityId)
		if (threat) {
			threat.pos = { ...pos }
			threat.lastSeen = now
		}
	}

	evaluate(ctx: TacticalCtx): TacticalDecision {
		const threatLevel = this.calThreatLevel(ctx)
		const hasThreats = ctx.threats.length > 0
		const lowHealth = ctx.urgency > 0.7
		const nearAllies = ctx.allies.filter(a => this.dist(ctx.myPos, a.pos) < 10).length
		if (lowHealth && threatLevel > 0.6) {
			const cover = this.map.findBestCover(ctx.myPos, ctx.threats)
			if (cover) {
				return {
					action: 'cover',
					target: cover.pos,
					priority: 0.9,
					reason: 'low health, seeking cover'
				}
			}
			return {
				action: 'retreat',
				target: this.findRetreatPos(ctx),
				priority: 0.85,
				reason: 'low health, retreating'
			}
		}
		if (hasThreats && this.aggressiveness > 0.7 && threatLevel < 0.4) {
			const target = this.selectTarget(ctx)
			if (target) {
				const flankPos = this.map.findFlankingPos(target.pos, ctx.myPos)
				if (flankPos && this.aggressiveness > 0.8) {
					return {
						action: 'flank',
						target: flankPos,
						priority: 0.7,
						reason: 'flanking target'
					}
				}
				return {
					action: 'attack',
					target: target.entityId,
					priority: 0.75,
					reason: 'engaging target'
				}
			}
		}
		if (hasThreats && this.caution > 0.6) {
			const cover = this.map.findBestCover(ctx.myPos, ctx.threats)
			if (cover) {
				return {
					action: 'cover',
					target: cover.pos,
					priority: 0.65,
					reason: 'taking defensive position'
				}
			}
		}
		if (nearAllies < 2 && this.teamwork > 0.6 && ctx.allies.length > 0) {
			const nearestAlly = this.findNearestAlly(ctx)
			if (nearestAlly) {
				return {
					action: 'support',
					target: nearestAlly.pos,
					priority: 0.5,
					reason: 'moving to support allies'
				}
			}
		}
		if (ctx.objective) {
			return {
				action: 'move',
				target: ctx.objective,
				priority: 0.4,
				reason: 'moving to objective'
			}
		}
		return {
			action: 'hold',
			target: null,
			priority: 0.1,
			reason: 'holding position'
		}
	}

	private calThreatLevel(ctx: TacticalCtx): number {
		if (ctx.threats.length === 0) return 0
		let total = 0
		for (const threat of ctx.threats) {
			const dist = this.dist(ctx.myPos, threat.pos)
			const distFactor = 1 - Math.min(dist / 30, 1)
			total += threat.threat * distFactor
		}
		return Math.min(total / ctx.threats.length, 1)
	}

	private selectTarget(ctx: TacticalCtx): ThreatInfo | null {
		if (ctx.threats.length === 0) return null
		let best: ThreatInfo | null = null
		let bestScore = -Infinity
		for (const threat of ctx.threats) {
			const dist = this.dist(ctx.myPos, threat.pos)
			const score = threat.threat - dist * 0.1
			if (score > bestScore) {
				bestScore = score
				best = threat
			}
		}
		return best
	}

	private findRetreatPos(ctx: TacticalCtx): Vec3 {
		if (ctx.threats.length === 0) return ctx.myPos
		let avgThreatDir: Vec3 = { x: 0, y: 0, z: 0 }
		for (const threat of ctx.threats) {
			avgThreatDir.x += threat.pos.x - ctx.myPos.x
			avgThreatDir.y += threat.pos.y - ctx.myPos.y
		}
		const len = Math.sqrt(avgThreatDir.x ** 2 + avgThreatDir.y ** 2)
		if (len > 0.001) {
			avgThreatDir.x /= len
			avgThreatDir.y /= len
		}
		return {
			x: ctx.myPos.x - avgThreatDir.x * 20,
			y: ctx.myPos.y - avgThreatDir.y * 20,
			z: ctx.myPos.z
		}
	}

	private findNearestAlly(ctx: TacticalCtx): { entityId: EntityId, pos: Vec3 } | null {
		let nearest = null
		let minDist = Infinity
		for (const ally of ctx.allies) {
			const dist = this.dist(ctx.myPos, ally.pos)
			if (dist < minDist) {
				minDist = dist
				nearest = ally
			}
		}
		return nearest
	}

	private dist(a: Vec3, b: Vec3): number {
		const dx = b.x - a.x
		const dy = b.y - a.y
		const dz = b.z - a.z
		return Math.sqrt(dx * dx + dy * dy + dz * dz)
	}

	setCover(coverId: string | null) {
		if (this.currentCover) {
			this.map.releaseCover(this.currentCover)
		}
		this.currentCover = coverId
		if (coverId) {
			this.map.occupyCover(coverId, this.entityId)
		}
	}
}
