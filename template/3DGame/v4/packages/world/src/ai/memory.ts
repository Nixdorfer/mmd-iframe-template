import type { Vec3, EntityId } from '@engine/common'

export enum MemoryType {
	Location = 'location',
	Entity = 'entity',
	Event = 'event',
	Path = 'path',
	Danger = 'danger',
	Resource = 'resource',
	Ally = 'ally',
	Enemy = 'enemy'
}

export interface MemoryEntry {
	id: string
	typ: MemoryType
	data: any
	timestamp: number
	importance: number
	decay: number
	tags: string[]
}

export interface PatrolPath {
	id: string
	points: Vec3[]
	curIdx: number
	loop: boolean
	reverse: boolean
	waitTime: number
	curWait: number
}

export interface LocationMemory {
	pos: Vec3
	label: string
	visits: number
	lastVisit: number
}

export interface EntityMemory {
	entId: EntityId
	lastPos: Vec3
	lastSeen: number
	interactions: number
	disposition: 'friendly' | 'neutral' | 'hostile'
}

export interface DangerMemory {
	pos: Vec3
	radius: number
	typ: string
	severity: number
}

export class MemorySys {
	memories: Map<EntityId, MemoryEntry[]>
	patrols: Map<EntityId, PatrolPath>
	maxMemories: number
	nxtMemId: number
	curTime: number

	constructor(maxMemories: number = 50) {
		this.memories = new Map()
		this.patrols = new Map()
		this.maxMemories = maxMemories
		this.nxtMemId = 1
		this.curTime = 0
	}

	registerEntity(entId: EntityId): void {
		if (!this.memories.has(entId)) {
			this.memories.set(entId, [])
		}
	}

	unregisterEntity(entId: EntityId): void {
		this.memories.delete(entId)
		this.patrols.delete(entId)
	}

	addMemory(entId: EntityId, typ: MemoryType, data: any, importance: number = 1, decay: number = 0.01, tags: string[] = []): string {
		let mems = this.memories.get(entId)
		if (!mems) {
			mems = []
			this.memories.set(entId, mems)
		}
		const id = `mem_${this.nxtMemId++}`
		const entry: MemoryEntry = {
			id,
			typ,
			data,
			timestamp: this.curTime,
			importance,
			decay,
			tags
		}
		mems.push(entry)
		if (mems.length > this.maxMemories) {
			this.pruneMemories(entId)
		}
		return id
	}

	getMemories(entId: EntityId, typ?: MemoryType): MemoryEntry[] {
		const mems = this.memories.get(entId)
		if (!mems) return []
		if (typ === undefined) return [...mems]
		return mems.filter(m => m.typ === typ)
	}

	getMemoryById(entId: EntityId, memId: string): MemoryEntry | null {
		const mems = this.memories.get(entId)
		return mems?.find(m => m.id === memId) ?? null
	}

	getMemoriesByTag(entId: EntityId, tag: string): MemoryEntry[] {
		const mems = this.memories.get(entId)
		if (!mems) return []
		return mems.filter(m => m.tags.includes(tag))
	}

	getRecentMemories(entId: EntityId, count: number, typ?: MemoryType): MemoryEntry[] {
		const mems = this.getMemories(entId, typ)
		return mems
			.sort((a, b) => b.timestamp - a.timestamp)
			.slice(0, count)
	}

	getImportantMemories(entId: EntityId, threshold: number = 0.5): MemoryEntry[] {
		const mems = this.memories.get(entId)
		if (!mems) return []
		return mems.filter(m => m.importance >= threshold)
	}

	removeMemory(entId: EntityId, memId: string): boolean {
		const mems = this.memories.get(entId)
		if (!mems) return false
		const idx = mems.findIndex(m => m.id === memId)
		if (idx >= 0) {
			mems.splice(idx, 1)
			return true
		}
		return false
	}

	forgetOld(entId: EntityId, maxAge: number): number {
		const mems = this.memories.get(entId)
		if (!mems) return 0
		const threshold = this.curTime - maxAge
		const before = mems.length
		const filtered = mems.filter(m => m.timestamp >= threshold || m.importance > 0.8)
		this.memories.set(entId, filtered)
		return before - filtered.length
	}

	forgetByType(entId: EntityId, typ: MemoryType): number {
		const mems = this.memories.get(entId)
		if (!mems) return 0
		const before = mems.length
		const filtered = mems.filter(m => m.typ !== typ)
		this.memories.set(entId, filtered)
		return before - filtered.length
	}

	forgetAll(entId: EntityId): void {
		const mems = this.memories.get(entId)
		if (mems) {
			mems.length = 0
		}
	}

	rememberLocation(entId: EntityId, pos: Vec3, label: string, importance: number = 0.5): string {
		const data: LocationMemory = {
			pos: { ...pos },
			label,
			visits: 1,
			lastVisit: this.curTime
		}
		const existing = this.findLocationMemory(entId, pos, 2)
		if (existing) {
			const locData = existing.data as LocationMemory
			locData.visits++
			locData.lastVisit = this.curTime
			existing.importance = Math.min(1, existing.importance + 0.1)
			return existing.id
		}
		return this.addMemory(entId, MemoryType.Location, data, importance, 0.005, [label])
	}

	rememberEntity(entId: EntityId, targetId: EntityId, pos: Vec3, disposition: 'friendly' | 'neutral' | 'hostile'): string {
		const data: EntityMemory = {
			entId: targetId,
			lastPos: { ...pos },
			lastSeen: this.curTime,
			interactions: 1,
			disposition
		}
		const existing = this.findEntityMemory(entId, targetId)
		if (existing) {
			const entData = existing.data as EntityMemory
			entData.lastPos = { ...pos }
			entData.lastSeen = this.curTime
			entData.interactions++
			entData.disposition = disposition
			return existing.id
		}
		const importance = disposition === 'hostile' ? 0.9 : disposition === 'friendly' ? 0.6 : 0.3
		return this.addMemory(entId, MemoryType.Entity, data, importance, 0.01, [disposition])
	}

	rememberDanger(entId: EntityId, pos: Vec3, radius: number, typ: string, severity: number): string {
		const data: DangerMemory = {
			pos: { ...pos },
			radius,
			typ,
			severity
		}
		return this.addMemory(entId, MemoryType.Danger, data, severity, 0.02, ['danger', typ])
	}

	findLocationMemory(entId: EntityId, pos: Vec3, maxDist: number): MemoryEntry | null {
		const mems = this.getMemories(entId, MemoryType.Location)
		for (const m of mems) {
			const loc = m.data as LocationMemory
			const dx = loc.pos.x - pos.x
			const dy = loc.pos.y - pos.y
			const dz = loc.pos.z - pos.z
			if (dx * dx + dy * dy + dz * dz <= maxDist * maxDist) {
				return m
			}
		}
		return null
	}

	findEntityMemory(entId: EntityId, targetId: EntityId): MemoryEntry | null {
		const mems = this.getMemories(entId, MemoryType.Entity)
		for (const m of mems) {
			const entMem = m.data as EntityMemory
			if (entMem.entId === targetId) {
				return m
			}
		}
		return null
	}

	getDangerZones(entId: EntityId): DangerMemory[] {
		const mems = this.getMemories(entId, MemoryType.Danger)
		return mems.map(m => m.data as DangerMemory)
	}

	isInDangerZone(entId: EntityId, pos: Vec3): DangerMemory | null {
		const dangers = this.getDangerZones(entId)
		for (const d of dangers) {
			const dx = d.pos.x - pos.x
			const dy = d.pos.y - pos.y
			const dz = d.pos.z - pos.z
			if (dx * dx + dy * dy + dz * dz <= d.radius * d.radius) {
				return d
			}
		}
		return null
	}

	setPatrol(entId: EntityId, points: Vec3[], loop: boolean = true, waitTime: number = 2): void {
		this.patrols.set(entId, {
			id: `patrol_${entId}`,
			points: points.map(p => ({ ...p })),
			curIdx: 0,
			loop,
			reverse: false,
			waitTime,
			curWait: 0
		})
	}

	getPatrol(entId: EntityId): PatrolPath | null {
		return this.patrols.get(entId) ?? null
	}

	clearPatrol(entId: EntityId): void {
		this.patrols.delete(entId)
	}

	getCurPatrolPoint(entId: EntityId): Vec3 | null {
		const patrol = this.patrols.get(entId)
		if (!patrol || patrol.points.length === 0) return null
		return patrol.points[patrol.curIdx]
	}

	advancePatrol(entId: EntityId): Vec3 | null {
		const patrol = this.patrols.get(entId)
		if (!patrol || patrol.points.length === 0) return null
		if (patrol.curWait < patrol.waitTime) {
			return patrol.points[patrol.curIdx]
		}
		patrol.curWait = 0
		if (patrol.reverse) {
			patrol.curIdx--
			if (patrol.curIdx < 0) {
				if (patrol.loop) {
					patrol.curIdx = 1
					patrol.reverse = false
				} else {
					patrol.curIdx = 0
				}
			}
		} else {
			patrol.curIdx++
			if (patrol.curIdx >= patrol.points.length) {
				if (patrol.loop) {
					patrol.curIdx = patrol.points.length - 2
					patrol.reverse = true
					if (patrol.curIdx < 0) patrol.curIdx = 0
				} else {
					patrol.curIdx = patrol.points.length - 1
				}
			}
		}
		return patrol.points[patrol.curIdx]
	}

	updPatrolWait(entId: EntityId, dt: number): void {
		const patrol = this.patrols.get(entId)
		if (patrol) {
			patrol.curWait += dt
		}
	}

	resetPatrol(entId: EntityId): void {
		const patrol = this.patrols.get(entId)
		if (patrol) {
			patrol.curIdx = 0
			patrol.reverse = false
			patrol.curWait = 0
		}
	}

	upd(dt: number): void {
		this.curTime += dt
		for (const [entId, mems] of this.memories) {
			for (const mem of mems) {
				mem.importance = Math.max(0, mem.importance - mem.decay * dt)
			}
			const filtered = mems.filter(m => m.importance > 0.01)
			if (filtered.length < mems.length) {
				this.memories.set(entId, filtered)
			}
		}
	}

	private pruneMemories(entId: EntityId): void {
		const mems = this.memories.get(entId)
		if (!mems || mems.length <= this.maxMemories) return
		mems.sort((a, b) => {
			const scoreA = a.importance * 0.7 + (1 - (this.curTime - a.timestamp) / 1000) * 0.3
			const scoreB = b.importance * 0.7 + (1 - (this.curTime - b.timestamp) / 1000) * 0.3
			return scoreB - scoreA
		})
		mems.length = this.maxMemories
	}
}
