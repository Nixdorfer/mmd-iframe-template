import { type EntityId, type Vec3 } from '@engine/common'
import { type EntityInstance, type EntityDef, type BuffInstance } from './entity'

export interface PooledEntity extends EntityInstance {
	pooled: boolean
	defIdOrigin: string
}

export interface EntityPoolCfg {
	maxPoolSize: number
	prealloc: number
	shrinkThreshold: number
	shrinkDelay: number
}

export function defPoolCfg(): EntityPoolCfg {
	return {
		maxPoolSize: 500,
		prealloc: 50,
		shrinkThreshold: 0.3,
		shrinkDelay: 10000
	}
}

export class EntityPool {
	pools: Map<string, PooledEntity[]>
	active: Map<EntityId, PooledEntity>
	defs: Map<string, EntityDef>
	cfg: EntityPoolCfg
	nxtId: number
	lastShrink: number
	stats: PoolStats

	constructor(defs: Map<string, EntityDef>, cfg?: Partial<EntityPoolCfg>) {
		this.pools = new Map()
		this.active = new Map()
		this.defs = defs
		this.cfg = { ...defPoolCfg(), ...cfg }
		this.nxtId = 1
		this.lastShrink = Date.now()
		this.stats = {
			spawns: 0,
			despawns: 0,
			poolHits: 0,
			poolMisses: 0,
			totalPooled: 0,
			totalActive: 0
		}
	}

	prealloc(defId: string, count: number = this.cfg.prealloc) {
		const def = this.defs.get(defId)
		if (!def) return
		let pool = this.pools.get(defId)
		if (!pool) {
			pool = []
			this.pools.set(defId, pool)
		}
		const toCreate = Math.min(count, this.cfg.maxPoolSize - pool.length)
		for (let i = 0; i < toCreate; i++) {
			pool.push(this.createPooled(def, defId))
		}
		this.updStats()
	}

	private createPooled(def: EntityDef, defId: string): PooledEntity {
		return {
			id: 0,
			defId,
			defIdOrigin: defId,
			name: def.name,
			transform: {
				pos: { x: 0, y: 0, z: 0 },
				rot: { x: 0, y: 0, z: 0, w: 1 },
				scl: { x: 1, y: 1, z: 1 }
			},
			hp: def.baseHp,
			maxHp: def.baseHp,
			atk: def.baseAtk,
			def: def.baseDef,
			spd: def.baseSpd,
			level: 1,
			exp: 0,
			alive: false,
			tags: new Set(def.tags),
			buffs: new Map(),
			cooldowns: new Map(),
			curAnim: 'idle',
			animTime: 0,
			pooled: true
		}
	}

	spawn(defId: string, pos: Vec3, name?: string): EntityId {
		const def = this.defs.get(defId)
		if (!def) return 0
		this.stats.spawns++
		let pool = this.pools.get(defId)
		let ent: PooledEntity | undefined
		if (pool && pool.length > 0) {
			ent = pool.pop()
			this.stats.poolHits++
		}
		if (!ent) {
			this.stats.poolMisses++
			ent = this.createPooled(def, defId)
		}
		ent.id = this.nxtId++
		ent.defId = defId
		ent.name = name ?? def.name
		ent.transform.pos = { ...pos }
		ent.transform.rot = { x: 0, y: 0, z: 0, w: 1 }
		ent.transform.scl = { x: 1, y: 1, z: 1 }
		ent.hp = def.baseHp
		ent.maxHp = def.baseHp
		ent.atk = def.baseAtk
		ent.def = def.baseDef
		ent.spd = def.baseSpd
		ent.level = 1
		ent.exp = 0
		ent.alive = true
		ent.tags = new Set(def.tags)
		ent.buffs.clear()
		ent.cooldowns.clear()
		ent.curAnim = 'idle'
		ent.animTime = 0
		ent.pooled = false
		this.active.set(ent.id, ent)
		this.updStats()
		return ent.id
	}

	despawn(id: EntityId) {
		const ent = this.active.get(id)
		if (!ent) return
		this.stats.despawns++
		this.active.delete(id)
		ent.alive = false
		ent.pooled = true
		ent.buffs.clear()
		ent.cooldowns.clear()
		let pool = this.pools.get(ent.defIdOrigin)
		if (!pool) {
			pool = []
			this.pools.set(ent.defIdOrigin, pool)
		}
		if (pool.length < this.cfg.maxPoolSize) {
			pool.push(ent)
		}
		this.updStats()
	}

	get(id: EntityId): PooledEntity | undefined {
		return this.active.get(id)
	}

	shrink() {
		const now = Date.now()
		if (now - this.lastShrink < this.cfg.shrinkDelay) return
		this.lastShrink = now
		for (const [defId, pool] of this.pools) {
			const targetSize = Math.floor(this.cfg.maxPoolSize * this.cfg.shrinkThreshold)
			if (pool.length > targetSize) {
				pool.length = targetSize
			}
		}
		this.updStats()
	}

	private updStats() {
		let totalPooled = 0
		for (const pool of this.pools.values()) {
			totalPooled += pool.length
		}
		this.stats.totalPooled = totalPooled
		this.stats.totalActive = this.active.size
	}

	getStats(): PoolStats {
		return { ...this.stats }
	}

	getPoolSize(defId: string): number {
		return this.pools.get(defId)?.length ?? 0
	}

	getActiveCount(): number {
		return this.active.size
	}

	getAllActive(): PooledEntity[] {
		return Array.from(this.active.values())
	}

	clear() {
		this.active.clear()
		this.pools.clear()
		this.stats = {
			spawns: 0,
			despawns: 0,
			poolHits: 0,
			poolMisses: 0,
			totalPooled: 0,
			totalActive: 0
		}
	}

	dispose() {
		this.clear()
	}
}

export interface PoolStats {
	spawns: number
	despawns: number
	poolHits: number
	poolMisses: number
	totalPooled: number
	totalActive: number
}

export class GenericPool<T> {
	items: T[]
	factory: () => T
	reset: (item: T) => void
	maxSize: number

	constructor(factory: () => T, reset: (item: T) => void, maxSize: number = 100) {
		this.items = []
		this.factory = factory
		this.reset = reset
		this.maxSize = maxSize
	}

	prealloc(count: number) {
		const toCreate = Math.min(count, this.maxSize - this.items.length)
		for (let i = 0; i < toCreate; i++) {
			this.items.push(this.factory())
		}
	}

	acquire(): T {
		if (this.items.length > 0) {
			return this.items.pop()!
		}
		return this.factory()
	}

	release(item: T) {
		this.reset(item)
		if (this.items.length < this.maxSize) {
			this.items.push(item)
		}
	}

	size(): number {
		return this.items.length
	}

	clear() {
		this.items = []
	}
}

export class VecPool {
	pool: { x: number; y: number; z: number }[]
	maxSize: number

	constructor(maxSize: number = 100) {
		this.pool = []
		this.maxSize = maxSize
	}

	acquire(x: number = 0, y: number = 0, z: number = 0): { x: number; y: number; z: number } {
		if (this.pool.length > 0) {
			const v = this.pool.pop()!
			v.x = x
			v.y = y
			v.z = z
			return v
		}
		return { x, y, z }
	}

	release(v: { x: number; y: number; z: number }) {
		if (this.pool.length < this.maxSize) {
			this.pool.push(v)
		}
	}

	clear() {
		this.pool = []
	}
}

export class MatrixPool {
	pool: Float32Array[]
	maxSize: number

	constructor(maxSize: number = 50) {
		this.pool = []
		this.maxSize = maxSize
	}

	acquire(): Float32Array {
		if (this.pool.length > 0) {
			const m = this.pool.pop()!
			m.fill(0)
			m[0] = m[5] = m[10] = m[15] = 1
			return m
		}
		return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])
	}

	release(m: Float32Array) {
		if (this.pool.length < this.maxSize) {
			this.pool.push(m)
		}
	}

	clear() {
		this.pool = []
	}
}
