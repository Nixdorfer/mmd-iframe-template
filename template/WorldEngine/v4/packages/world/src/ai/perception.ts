import type { Vec3, EntityId } from '@engine/common'

export interface PerceptionCfg {
	viewDist: number
	viewAngle: number
	hearDist: number
	smellDist: number
	memDur: number
}

export interface PerceivedEntity {
	entId: EntityId
	lastPos: Vec3
	lastSeen: number
	confidence: number
	source: 'sight' | 'sound' | 'smell' | 'touch'
}

export interface SoundEvent {
	pos: Vec3
	radius: number
	intensity: number
	typ: 'footstep' | 'attack' | 'voice' | 'explosion' | 'ambient'
	srcId: EntityId
	timestamp: number
}

export interface EntityProvider {
	get(id: EntityId): { transform: { pos: Vec3; rot: Vec3 }; alive: boolean } | undefined
	getInRange(pos: Vec3, range: number): { id: EntityId; transform: { pos: Vec3 } }[]
}

export interface LOSChecker {
	checkLOS(from: Vec3, to: Vec3): boolean
}

const DEFAULT_CFG: PerceptionCfg = {
	viewDist: 20,
	viewAngle: 120,
	hearDist: 15,
	smellDist: 10,
	memDur: 30
}

export class PerceptionSys {
	cfgs: Map<string, PerceptionCfg>
	perceived: Map<EntityId, Map<EntityId, PerceivedEntity>>
	soundEvents: SoundEvent[]
	entityProvider: EntityProvider | null
	losChecker: LOSChecker | null
	soundEventTTL: number

	constructor() {
		this.cfgs = new Map()
		this.perceived = new Map()
		this.soundEvents = []
		this.entityProvider = null
		this.losChecker = null
		this.soundEventTTL = 2
	}

	setCfg(cfgId: string, cfg: Partial<PerceptionCfg>): void {
		this.cfgs.set(cfgId, { ...DEFAULT_CFG, ...cfg })
	}

	getCfg(cfgId: string): PerceptionCfg {
		return this.cfgs.get(cfgId) ?? DEFAULT_CFG
	}

	setEntityProvider(provider: EntityProvider): void {
		this.entityProvider = provider
	}

	setLOSChecker(checker: LOSChecker): void {
		this.losChecker = checker
	}

	registerEntity(entId: EntityId): void {
		if (!this.perceived.has(entId)) {
			this.perceived.set(entId, new Map())
		}
	}

	unregisterEntity(entId: EntityId): void {
		this.perceived.delete(entId)
		for (const map of this.perceived.values()) {
			map.delete(entId)
		}
	}

	upd(dt: number): void {
		const now = Date.now() / 1000
		this.soundEvents = this.soundEvents.filter(e => now - e.timestamp < this.soundEventTTL)
		for (const [entId, perceivedMap] of this.perceived) {
			for (const [targetId, perceived] of perceivedMap) {
				perceived.confidence -= dt / 10
				if (perceived.confidence <= 0) {
					perceivedMap.delete(targetId)
				}
			}
		}
	}

	updPerception(entId: EntityId, cfgId: string): void {
		if (!this.entityProvider) return
		const ent = this.entityProvider.get(entId)
		if (!ent || !ent.alive) return
		const cfg = this.getCfg(cfgId)
		const perceivedMap = this.perceived.get(entId)
		if (!perceivedMap) return
		const maxRange = Math.max(cfg.viewDist, cfg.hearDist, cfg.smellDist)
		const nearby = this.entityProvider.getInRange(ent.transform.pos, maxRange)
		const now = Date.now() / 1000
		for (const target of nearby) {
			if (target.id === entId) continue
			const targetEnt = this.entityProvider.get(target.id)
			if (!targetEnt || !targetEnt.alive) continue
			const dist = this.vecDist(ent.transform.pos, targetEnt.transform.pos)
			let detected = false
			let source: 'sight' | 'sound' | 'smell' | 'touch' = 'sight'
			let confidence = 0
			if (dist <= cfg.viewDist) {
				const dir = this.getForwardDir(ent.transform.rot)
				if (this.checkViewCone(ent.transform.pos, dir, targetEnt.transform.pos, cfg.viewDist, cfg.viewAngle)) {
					if (this.checkLOS(ent.transform.pos, targetEnt.transform.pos)) {
						detected = true
						source = 'sight'
						confidence = 1 - dist / cfg.viewDist
					}
				}
			}
			if (!detected && dist <= cfg.hearDist) {
				for (const sound of this.soundEvents) {
					if (sound.srcId === target.id) {
						const soundDist = this.vecDist(ent.transform.pos, sound.pos)
						if (soundDist <= sound.radius) {
							detected = true
							source = 'sound'
							confidence = (1 - soundDist / sound.radius) * sound.intensity
							break
						}
					}
				}
			}
			if (!detected && dist <= cfg.smellDist) {
				detected = true
				source = 'smell'
				confidence = (1 - dist / cfg.smellDist) * 0.5
			}
			if (dist <= 1.5) {
				detected = true
				source = 'touch'
				confidence = 1
			}
			if (detected) {
				const existing = perceivedMap.get(target.id)
				if (!existing || existing.confidence < confidence) {
					perceivedMap.set(target.id, {
						entId: target.id,
						lastPos: { ...targetEnt.transform.pos },
						lastSeen: now,
						confidence,
						source
					})
				} else if (existing) {
					existing.lastPos = { ...targetEnt.transform.pos }
					existing.lastSeen = now
					if (confidence > existing.confidence * 0.8) {
						existing.confidence = Math.min(1, existing.confidence + confidence * 0.1)
					}
				}
			}
		}
	}

	checkViewCone(origin: Vec3, dir: Vec3, target: Vec3, dist: number, angle: number): boolean {
		const toTarget = {
			x: target.x - origin.x,
			y: target.y - origin.y,
			z: target.z - origin.z
		}
		const distSq = toTarget.x * toTarget.x + toTarget.y * toTarget.y + toTarget.z * toTarget.z
		if (distSq > dist * dist) return false
		const len = Math.sqrt(distSq)
		if (len < 0.001) return true
		const toTargetNorm = {
			x: toTarget.x / len,
			y: toTarget.y / len,
			z: toTarget.z / len
		}
		const dot = dir.x * toTargetNorm.x + dir.y * toTargetNorm.y + dir.z * toTargetNorm.z
		const halfAngle = (angle / 2) * Math.PI / 180
		return dot >= Math.cos(halfAngle)
	}

	checkLOS(from: Vec3, to: Vec3): boolean {
		if (this.losChecker) {
			return this.losChecker.checkLOS(from, to)
		}
		return true
	}

	emitSound(evt: Omit<SoundEvent, 'timestamp'>): void {
		this.soundEvents.push({
			...evt,
			timestamp: Date.now() / 1000
		})
	}

	getPerceived(entId: EntityId): PerceivedEntity[] {
		const map = this.perceived.get(entId)
		if (!map) return []
		return Array.from(map.values())
	}

	getPerceivedBySource(entId: EntityId, source: 'sight' | 'sound' | 'smell' | 'touch'): PerceivedEntity[] {
		return this.getPerceived(entId).filter(p => p.source === source)
	}

	getHighestConfidence(entId: EntityId): PerceivedEntity | null {
		const perceived = this.getPerceived(entId)
		if (perceived.length === 0) return null
		return perceived.reduce((a, b) => a.confidence > b.confidence ? a : b)
	}

	getNearest(entId: EntityId): PerceivedEntity | null {
		if (!this.entityProvider) return null
		const ent = this.entityProvider.get(entId)
		if (!ent) return null
		const perceived = this.getPerceived(entId)
		if (perceived.length === 0) return null
		let nearest: PerceivedEntity | null = null
		let minDist = Infinity
		for (const p of perceived) {
			const dist = this.vecDist(ent.transform.pos, p.lastPos)
			if (dist < minDist) {
				minDist = dist
				nearest = p
			}
		}
		return nearest
	}

	forgetEntity(perceiver: EntityId, target: EntityId): void {
		const map = this.perceived.get(perceiver)
		if (map) {
			map.delete(target)
		}
	}

	forgetAll(perceiver: EntityId): void {
		const map = this.perceived.get(perceiver)
		if (map) {
			map.clear()
		}
	}

	isAwareOf(perceiver: EntityId, target: EntityId): boolean {
		const map = this.perceived.get(perceiver)
		return map?.has(target) ?? false
	}

	getAwarenessLevel(perceiver: EntityId, target: EntityId): number {
		const map = this.perceived.get(perceiver)
		const perceived = map?.get(target)
		return perceived?.confidence ?? 0
	}

	private getForwardDir(rot: Vec3): Vec3 {
		const yaw = rot.y * Math.PI / 180
		return {
			x: Math.sin(yaw),
			y: 0,
			z: Math.cos(yaw)
		}
	}

	private vecDist(a: Vec3, b: Vec3): number {
		const dx = b.x - a.x
		const dy = b.y - a.y
		const dz = b.z - a.z
		return Math.sqrt(dx * dx + dy * dy + dz * dz)
	}
}
