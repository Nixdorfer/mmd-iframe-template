import type { Vec3, EntityId } from './types'

export interface SpatialEntity {
	id: EntityId
	pos: Vec3
	radius: number
}

export class SpatialHash<T extends SpatialEntity> {
	cellSize: number
	cells: Map<string, Set<T>>
	entityCells: Map<EntityId, Set<string>>

	constructor(cellSize: number = 32) {
		this.cellSize = cellSize
		this.cells = new Map()
		this.entityCells = new Map()
	}

	private getKey(cx: number, cy: number, cz: number): string {
		return `${cx},${cy},${cz}`
	}

	private posToCell(x: number, y: number, z: number): { cx: number; cy: number; cz: number } {
		return {
			cx: Math.floor(x / this.cellSize),
			cy: Math.floor(y / this.cellSize),
			cz: Math.floor(z / this.cellSize)
		}
	}

	private getCellsForEntity(entity: T): string[] {
		const minCell = this.posToCell(
			entity.pos.x - entity.radius,
			entity.pos.y - entity.radius,
			entity.pos.z - entity.radius
		)
		const maxCell = this.posToCell(
			entity.pos.x + entity.radius,
			entity.pos.y + entity.radius,
			entity.pos.z + entity.radius
		)
		const keys: string[] = []
		for (let cx = minCell.cx; cx <= maxCell.cx; cx++) {
			for (let cy = minCell.cy; cy <= maxCell.cy; cy++) {
				for (let cz = minCell.cz; cz <= maxCell.cz; cz++) {
					keys.push(this.getKey(cx, cy, cz))
				}
			}
		}
		return keys
	}

	add(entity: T): void {
		const keys = this.getCellsForEntity(entity)
		const entCells = new Set<string>()
		for (const key of keys) {
			if (!this.cells.has(key)) {
				this.cells.set(key, new Set())
			}
			this.cells.get(key)!.add(entity)
			entCells.add(key)
		}
		this.entityCells.set(entity.id, entCells)
	}

	remove(entity: T): void {
		const keys = this.entityCells.get(entity.id)
		if (!keys) return
		for (const key of keys) {
			const cell = this.cells.get(key)
			if (cell) {
				cell.delete(entity)
				if (cell.size === 0) {
					this.cells.delete(key)
				}
			}
		}
		this.entityCells.delete(entity.id)
	}

	upd(entity: T): void {
		this.remove(entity)
		this.add(entity)
	}

	queryRadius(x: number, y: number, z: number, radius: number): T[] {
		const minCell = this.posToCell(x - radius, y - radius, z - radius)
		const maxCell = this.posToCell(x + radius, y + radius, z + radius)
		const result: T[] = []
		const seen = new Set<EntityId>()
		for (let cx = minCell.cx; cx <= maxCell.cx; cx++) {
			for (let cy = minCell.cy; cy <= maxCell.cy; cy++) {
				for (let cz = minCell.cz; cz <= maxCell.cz; cz++) {
					const key = this.getKey(cx, cy, cz)
					const cell = this.cells.get(key)
					if (!cell) continue
					for (const ent of cell) {
						if (seen.has(ent.id)) continue
						seen.add(ent.id)
						const dx = ent.pos.x - x
						const dy = ent.pos.y - y
						const dz = ent.pos.z - z
						const distSq = dx * dx + dy * dy + dz * dz
						const maxDist = radius + ent.radius
						if (distSq <= maxDist * maxDist) {
							result.push(ent)
						}
					}
				}
			}
		}
		return result
	}

	queryAABB(minX: number, minY: number, minZ: number, maxX: number, maxY: number, maxZ: number): T[] {
		const minCell = this.posToCell(minX, minY, minZ)
		const maxCell = this.posToCell(maxX, maxY, maxZ)
		const result: T[] = []
		const seen = new Set<EntityId>()
		for (let cx = minCell.cx; cx <= maxCell.cx; cx++) {
			for (let cy = minCell.cy; cy <= maxCell.cy; cy++) {
				for (let cz = minCell.cz; cz <= maxCell.cz; cz++) {
					const key = this.getKey(cx, cy, cz)
					const cell = this.cells.get(key)
					if (!cell) continue
					for (const ent of cell) {
						if (seen.has(ent.id)) continue
						seen.add(ent.id)
						if (ent.pos.x + ent.radius >= minX && ent.pos.x - ent.radius <= maxX &&
							ent.pos.y + ent.radius >= minY && ent.pos.y - ent.radius <= maxY &&
							ent.pos.z + ent.radius >= minZ && ent.pos.z - ent.radius <= maxZ) {
							result.push(ent)
						}
					}
				}
			}
		}
		return result
	}

	queryNearest(x: number, y: number, z: number, maxDist: number): T | null {
		const candidates = this.queryRadius(x, y, z, maxDist)
		if (candidates.length === 0) return null
		let nearest: T | null = null
		let minDistSq = Infinity
		for (const ent of candidates) {
			const dx = ent.pos.x - x
			const dy = ent.pos.y - y
			const dz = ent.pos.z - z
			const distSq = dx * dx + dy * dy + dz * dz
			if (distSq < minDistSq) {
				minDistSq = distSq
				nearest = ent
			}
		}
		return nearest
	}

	clr(): void {
		this.cells.clear()
		this.entityCells.clear()
	}

	getStats(): { cellCount: number; entityCount: number; avgPerCell: number } {
		let entityCount = 0
		for (const cell of this.cells.values()) {
			entityCount += cell.size
		}
		return {
			cellCount: this.cells.size,
			entityCount: this.entityCells.size,
			avgPerCell: this.cells.size > 0 ? entityCount / this.cells.size : 0
		}
	}
}

export class ObjectPool<T> {
	private pool: T[]
	private factory: () => T
	private reset: (obj: T) => void
	private maxSize: number

	constructor(factory: () => T, reset: (obj: T) => void, initialSize: number = 32, maxSize: number = 1024) {
		this.factory = factory
		this.reset = reset
		this.maxSize = maxSize
		this.pool = []
		for (let i = 0; i < initialSize; i++) {
			this.pool.push(this.factory())
		}
	}

	acquire(): T {
		if (this.pool.length > 0) {
			return this.pool.pop()!
		}
		return this.factory()
	}

	release(obj: T): void {
		if (this.pool.length < this.maxSize) {
			this.reset(obj)
			this.pool.push(obj)
		}
	}

	prewarm(count: number): void {
		const toAdd = Math.min(count, this.maxSize - this.pool.length)
		for (let i = 0; i < toAdd; i++) {
			this.pool.push(this.factory())
		}
	}

	shrink(targetSize: number): void {
		while (this.pool.length > targetSize) {
			this.pool.pop()
		}
	}

	getSize(): number {
		return this.pool.length
	}

	clr(): void {
		this.pool = []
	}
}

export class Vec3Pool {
	private pool: ObjectPool<Vec3>

	constructor(initialSize: number = 64) {
		this.pool = new ObjectPool<Vec3>(
			() => ({ x: 0, y: 0, z: 0 }),
			(v) => { v.x = 0; v.y = 0; v.z = 0 },
			initialSize
		)
	}

	acquire(x: number = 0, y: number = 0, z: number = 0): Vec3 {
		const v = this.pool.acquire()
		v.x = x
		v.y = y
		v.z = z
		return v
	}

	release(v: Vec3): void {
		this.pool.release(v)
	}
}

export class RingBuffer<T> {
	private buffer: (T | undefined)[]
	private head: number
	private tail: number
	private size: number
	private capacity: number

	constructor(capacity: number) {
		this.capacity = capacity
		this.buffer = new Array(capacity)
		this.head = 0
		this.tail = 0
		this.size = 0
	}

	push(item: T): T | undefined {
		let evicted: T | undefined
		if (this.size === this.capacity) {
			evicted = this.buffer[this.tail]
			this.tail = (this.tail + 1) % this.capacity
		} else {
			this.size++
		}
		this.buffer[this.head] = item
		this.head = (this.head + 1) % this.capacity
		return evicted
	}

	pop(): T | undefined {
		if (this.size === 0) return undefined
		this.head = (this.head - 1 + this.capacity) % this.capacity
		const item = this.buffer[this.head]
		this.buffer[this.head] = undefined
		this.size--
		return item
	}

	shift(): T | undefined {
		if (this.size === 0) return undefined
		const item = this.buffer[this.tail]
		this.buffer[this.tail] = undefined
		this.tail = (this.tail + 1) % this.capacity
		this.size--
		return item
	}

	peek(): T | undefined {
		if (this.size === 0) return undefined
		return this.buffer[(this.head - 1 + this.capacity) % this.capacity]
	}

	peekFirst(): T | undefined {
		if (this.size === 0) return undefined
		return this.buffer[this.tail]
	}

	get(index: number): T | undefined {
		if (index < 0 || index >= this.size) return undefined
		return this.buffer[(this.tail + index) % this.capacity]
	}

	getSize(): number {
		return this.size
	}

	getCapacity(): number {
		return this.capacity
	}

	isFull(): boolean {
		return this.size === this.capacity
	}

	isEmpty(): boolean {
		return this.size === 0
	}

	clr(): void {
		this.buffer = new Array(this.capacity)
		this.head = 0
		this.tail = 0
		this.size = 0
	}

	toArray(): T[] {
		const result: T[] = []
		for (let i = 0; i < this.size; i++) {
			result.push(this.buffer[(this.tail + i) % this.capacity]!)
		}
		return result
	}
}

export class FrameTimeTracker {
	private times: RingBuffer<number>
	private lastTime: number

	constructor(sampleCount: number = 60) {
		this.times = new RingBuffer(sampleCount)
		this.lastTime = performance.now()
	}

	tick(): number {
		const now = performance.now()
		const dt = now - this.lastTime
		this.lastTime = now
		this.times.push(dt)
		return dt
	}

	getAvgFps(): number {
		if (this.times.getSize() === 0) return 0
		let sum = 0
		const arr = this.times.toArray()
		for (const t of arr) {
			sum += t
		}
		const avgMs = sum / arr.length
		return avgMs > 0 ? 1000 / avgMs : 0
	}

	getMinFps(): number {
		if (this.times.getSize() === 0) return 0
		let maxMs = 0
		const arr = this.times.toArray()
		for (const t of arr) {
			if (t > maxMs) maxMs = t
		}
		return maxMs > 0 ? 1000 / maxMs : 0
	}

	getMaxFps(): number {
		if (this.times.getSize() === 0) return 0
		let minMs = Infinity
		const arr = this.times.toArray()
		for (const t of arr) {
			if (t < minMs) minMs = t
		}
		return minMs > 0 ? 1000 / minMs : 0
	}

	getAvgMs(): number {
		if (this.times.getSize() === 0) return 0
		let sum = 0
		const arr = this.times.toArray()
		for (const t of arr) {
			sum += t
		}
		return sum / arr.length
	}
}

export interface LODLevelCfg {
	level: number
	dist: number
	detail: number
}

export class LODManager {
	levels: LODLevelCfg[]
	defaultLevel: number

	constructor(levels: LODLevelCfg[]) {
		this.levels = levels.sort((a, b) => a.dist - b.dist)
		this.defaultLevel = levels.length > 0 ? levels[levels.length - 1].level : 0
	}

	getLOD(distSq: number): LODLevelCfg {
		for (const level of this.levels) {
			if (distSq <= level.dist * level.dist) {
				return level
			}
		}
		return this.levels[this.levels.length - 1] ?? { level: this.defaultLevel, dist: Infinity, detail: 0 }
	}

	getLODLevelCfg(distSq: number): number {
		return this.getLOD(distSq).level
	}

	shouldUpdate(oldDistSq: number, newDistSq: number): boolean {
		return this.getLODLevelCfg(oldDistSq) !== this.getLODLevelCfg(newDistSq)
	}
}

export class ChunkLODManager {
	viewDist: number
	loadDist: number
	unloadDist: number
	chunkSize: number

	constructor(chunkSize: number, viewDist: number = 8, loadDist: number = 10, unloadDist: number = 12) {
		this.chunkSize = chunkSize
		this.viewDist = viewDist
		this.loadDist = loadDist
		this.unloadDist = unloadDist
	}

	getChunksInView(cx: number, cy: number): { x: number; y: number }[] {
		const result: { x: number; y: number }[] = []
		for (let dx = -this.viewDist; dx <= this.viewDist; dx++) {
			for (let dy = -this.viewDist; dy <= this.viewDist; dy++) {
				if (dx * dx + dy * dy <= this.viewDist * this.viewDist) {
					result.push({ x: cx + dx, y: cy + dy })
				}
			}
		}
		return result.sort((a, b) => {
			const daSq = (a.x - cx) * (a.x - cx) + (a.y - cy) * (a.y - cy)
			const dbSq = (b.x - cx) * (b.x - cx) + (b.y - cy) * (b.y - cy)
			return daSq - dbSq
		})
	}

	getChunksToLoad(cx: number, cy: number, loaded: Set<string>): { x: number; y: number }[] {
		const result: { x: number; y: number }[] = []
		for (let dx = -this.loadDist; dx <= this.loadDist; dx++) {
			for (let dy = -this.loadDist; dy <= this.loadDist; dy++) {
				if (dx * dx + dy * dy <= this.loadDist * this.loadDist) {
					const key = `${cx + dx},${cy + dy}`
					if (!loaded.has(key)) {
						result.push({ x: cx + dx, y: cy + dy })
					}
				}
			}
		}
		return result.sort((a, b) => {
			const daSq = (a.x - cx) * (a.x - cx) + (a.y - cy) * (a.y - cy)
			const dbSq = (b.x - cx) * (b.x - cx) + (b.y - cy) * (b.y - cy)
			return daSq - dbSq
		})
	}

	getChunksToUnload(cx: number, cy: number, loaded: Set<string>): { x: number; y: number }[] {
		const result: { x: number; y: number }[] = []
		for (const key of loaded) {
			const [x, y] = key.split(',').map(Number)
			const dx = x - cx
			const dy = y - cy
			if (dx * dx + dy * dy > this.unloadDist * this.unloadDist) {
				result.push({ x, y })
			}
		}
		return result
	}
}
