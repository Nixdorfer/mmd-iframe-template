export interface Poolable {
	reset(): void
	active: boolean
}

export class UIPool<T extends Poolable> {
	private pool: T[]
	private active: T[]
	private factory: () => T
	private maxSize: number

	constructor(factory: () => T, initialSize: number = 10, maxSize: number = 100) {
		this.factory = factory
		this.pool = []
		this.active = []
		this.maxSize = maxSize
		for (let i = 0; i < initialSize; i++) {
			this.pool.push(factory())
		}
	}

	spawn(): T {
		let item: T
		if (this.pool.length > 0) {
			item = this.pool.pop()!
		} else {
			item = this.factory()
		}
		item.active = true
		this.active.push(item)
		return item
	}

	despawn(item: T) {
		const idx = this.active.indexOf(item)
		if (idx >= 0) {
			this.active.splice(idx, 1)
			item.active = false
			item.reset()
			if (this.pool.length < this.maxSize) {
				this.pool.push(item)
			}
		}
	}

	despawnAll() {
		for (const item of this.active) {
			item.active = false
			item.reset()
			if (this.pool.length < this.maxSize) {
				this.pool.push(item)
			}
		}
		this.active = []
	}

	upd(dt: number, updFn: (item: T, dt: number) => boolean) {
		for (let i = this.active.length - 1; i >= 0; i--) {
			const item = this.active[i]
			const shouldDespawn = updFn(item, dt)
			if (shouldDespawn) {
				this.despawn(item)
			}
		}
	}

	getActive(): T[] {
		return this.active
	}

	getPoolSize(): number {
		return this.pool.length
	}

	getActiveCount(): number {
		return this.active.length
	}

	clr() {
		this.despawnAll()
		this.pool = []
	}
}
