import type { EntityId } from '@engine/common'

export interface AggroEntry {
	entId: EntityId
	threat: number
	lastDmg: number
	lastHit: number
	healReceived: number
	firstContact: number
}

export interface AggroCfg {
	baseThreat: number
	dmgMul: number
	healMul: number
	decayRate: number
	decayDelay: number
	forgetThreshold: number
	maxEntries: number
	proximityMul: number
}

const DEFAULT_CFG: AggroCfg = {
	baseThreat: 10,
	dmgMul: 1.5,
	healMul: 0.8,
	decayRate: 2,
	decayDelay: 5,
	forgetThreshold: 1,
	maxEntries: 10,
	proximityMul: 0.5
}

export class AggroMgr {
	tables: Map<EntityId, Map<EntityId, AggroEntry>>
	cfg: AggroCfg
	curTime: number

	constructor(cfg: Partial<AggroCfg> = {}) {
		this.tables = new Map()
		this.cfg = { ...DEFAULT_CFG, ...cfg }
		this.curTime = 0
	}

	setCfg(cfg: Partial<AggroCfg>): void {
		this.cfg = { ...this.cfg, ...cfg }
	}

	registerEntity(entId: EntityId): void {
		if (!this.tables.has(entId)) {
			this.tables.set(entId, new Map())
		}
	}

	unregisterEntity(entId: EntityId): void {
		this.tables.delete(entId)
		for (const table of this.tables.values()) {
			table.delete(entId)
		}
	}

	addThreat(owner: EntityId, target: EntityId, amount: number): void {
		let table = this.tables.get(owner)
		if (!table) {
			table = new Map()
			this.tables.set(owner, table)
		}
		let entry = table.get(target)
		if (!entry) {
			if (table.size >= this.cfg.maxEntries) {
				this.removeLowestThreat(owner)
			}
			entry = {
				entId: target,
				threat: 0,
				lastDmg: 0,
				lastHit: this.curTime,
				healReceived: 0,
				firstContact: this.curTime
			}
			table.set(target, entry)
		}
		entry.threat = Math.max(0, entry.threat + amount)
		entry.lastHit = this.curTime
	}

	addDmgThreat(owner: EntityId, attacker: EntityId, dmg: number): void {
		const threat = this.cfg.baseThreat + dmg * this.cfg.dmgMul
		this.addThreat(owner, attacker, threat)
		const table = this.tables.get(owner)
		const entry = table?.get(attacker)
		if (entry) {
			entry.lastDmg = dmg
		}
	}

	addHealThreat(owner: EntityId, healer: EntityId, heal: number): void {
		const threat = heal * this.cfg.healMul
		this.addThreat(owner, healer, threat)
		const table = this.tables.get(owner)
		const entry = table?.get(healer)
		if (entry) {
			entry.healReceived += heal
		}
	}

	addProximityThreat(owner: EntityId, target: EntityId, dist: number, maxDist: number): void {
		if (dist >= maxDist) return
		const ratio = 1 - dist / maxDist
		const threat = this.cfg.baseThreat * ratio * this.cfg.proximityMul
		this.addThreat(owner, target, threat)
	}

	upd(dt: number): void {
		this.curTime += dt
		for (const [ownerId, table] of this.tables) {
			const toRemove: EntityId[] = []
			for (const [targetId, entry] of table) {
				const timeSinceHit = this.curTime - entry.lastHit
				if (timeSinceHit > this.cfg.decayDelay) {
					entry.threat -= this.cfg.decayRate * dt
				}
				if (entry.threat < this.cfg.forgetThreshold) {
					toRemove.push(targetId)
				}
			}
			for (const id of toRemove) {
				table.delete(id)
			}
		}
	}

	getTopThreat(owner: EntityId, count: number = 1): EntityId[] {
		const table = this.tables.get(owner)
		if (!table || table.size === 0) return []
		const sorted = Array.from(table.values())
			.sort((a, b) => b.threat - a.threat)
			.slice(0, count)
		return sorted.map(e => e.entId)
	}

	getHighestThreat(owner: EntityId): EntityId | null {
		const top = this.getTopThreat(owner, 1)
		return top.length > 0 ? top[0] : null
	}

	getThreat(owner: EntityId, target: EntityId): number {
		const table = this.tables.get(owner)
		return table?.get(target)?.threat ?? 0
	}

	getEntry(owner: EntityId, target: EntityId): AggroEntry | null {
		const table = this.tables.get(owner)
		return table?.get(target) ?? null
	}

	getAllThreats(owner: EntityId): AggroEntry[] {
		const table = this.tables.get(owner)
		if (!table) return []
		return Array.from(table.values())
	}

	getThreatCount(owner: EntityId): number {
		const table = this.tables.get(owner)
		return table?.size ?? 0
	}

	hasThreat(owner: EntityId): boolean {
		const table = this.tables.get(owner)
		return table !== undefined && table.size > 0
	}

	clrThreat(owner: EntityId): void {
		const table = this.tables.get(owner)
		if (table) {
			table.clear()
		}
	}

	removeThreat(owner: EntityId, target: EntityId): void {
		const table = this.tables.get(owner)
		if (table) {
			table.delete(target)
		}
	}

	transferThreat(from: EntityId, to: EntityId, ratio: number = 1): void {
		const fromTable = this.tables.get(from)
		if (!fromTable) return
		let toTable = this.tables.get(to)
		if (!toTable) {
			toTable = new Map()
			this.tables.set(to, toTable)
		}
		for (const [targetId, entry] of fromTable) {
			const transferAmount = entry.threat * ratio
			const existing = toTable.get(targetId)
			if (existing) {
				existing.threat += transferAmount
			} else {
				toTable.set(targetId, {
					...entry,
					threat: transferAmount,
					firstContact: this.curTime
				})
			}
			entry.threat -= transferAmount
		}
	}

	modifyThreat(owner: EntityId, target: EntityId, multiplier: number): void {
		const table = this.tables.get(owner)
		const entry = table?.get(target)
		if (entry) {
			entry.threat *= multiplier
		}
	}

	setThreat(owner: EntityId, target: EntityId, amount: number): void {
		const table = this.tables.get(owner)
		if (!table) return
		let entry = table.get(target)
		if (!entry) {
			entry = {
				entId: target,
				threat: amount,
				lastDmg: 0,
				lastHit: this.curTime,
				healReceived: 0,
				firstContact: this.curTime
			}
			table.set(target, entry)
		} else {
			entry.threat = amount
		}
	}

	private removeLowestThreat(owner: EntityId): void {
		const table = this.tables.get(owner)
		if (!table || table.size === 0) return
		let lowestId: EntityId | null = null
		let lowestThreat = Infinity
		for (const [id, entry] of table) {
			if (entry.threat < lowestThreat) {
				lowestThreat = entry.threat
				lowestId = id
			}
		}
		if (lowestId !== null) {
			table.delete(lowestId)
		}
	}
}
