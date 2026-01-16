import { EntityId } from './types'

export type ComponentId = number

export class ComponentStore<T> {
	data: T[]
	entToIdx: Map<EntityId, number>
	idxToEnt: EntityId[]

	constructor() {
		this.data = []
		this.entToIdx = new Map()
		this.idxToEnt = []
	}

	add(entId: EntityId, comp: T) {
		const idx = this.data.length
		this.data.push(comp)
		this.entToIdx.set(entId, idx)
		this.idxToEnt.push(entId)
	}

	get(entId: EntityId): T | undefined {
		const idx = this.entToIdx.get(entId)
		return idx !== undefined ? this.data[idx] : undefined
	}

	del(entId: EntityId) {
		const idx = this.entToIdx.get(entId)
		if (idx === undefined) return
		const lastIdx = this.data.length - 1
		if (idx !== lastIdx) {
			this.data[idx] = this.data[lastIdx]
			const movedId = this.idxToEnt[lastIdx]
			this.idxToEnt[idx] = movedId
			this.entToIdx.set(movedId, idx)
		}
		this.data.pop()
		this.idxToEnt.pop()
		this.entToIdx.delete(entId)
	}

	forEach(cb: (comp: T, entId: EntityId) => void) {
		for (let i = 0; i < this.data.length; i++) {
			cb(this.data[i], this.idxToEnt[i])
		}
	}

	len(): number {
		return this.data.length
	}
}

export interface ECSSystem {
	query: ComponentId[]
	run: (world: ECSWorld, dt: number) => void
}

export class ECSWorld {
	nxtId: EntityId
	stores: Map<ComponentId, ComponentStore<any>>
	archetypes: Map<EntityId, Set<ComponentId>>
	systems: ECSSystem[]

	constructor() {
		this.nxtId = 1
		this.stores = new Map()
		this.archetypes = new Map()
		this.systems = []
	}

	createEnt(): EntityId {
		const id = this.nxtId++
		this.archetypes.set(id, new Set())
		return id
	}

	delEnt(entId: EntityId) {
		const arch = this.archetypes.get(entId)
		if (!arch) return
		for (const compId of arch) {
			this.stores.get(compId)?.del(entId)
		}
		this.archetypes.delete(entId)
	}

	addComp<T>(entId: EntityId, compId: ComponentId, comp: T) {
		if (!this.stores.has(compId)) {
			this.stores.set(compId, new ComponentStore<T>())
		}
		this.stores.get(compId)!.add(entId, comp)
		this.archetypes.get(entId)?.add(compId)
	}

	getComp<T>(entId: EntityId, compId: ComponentId): T | undefined {
		return this.stores.get(compId)?.get(entId)
	}

	hasComp(entId: EntityId, compId: ComponentId): boolean {
		return this.archetypes.get(entId)?.has(compId) ?? false
	}

	delComp(entId: EntityId, compId: ComponentId) {
		this.stores.get(compId)?.del(entId)
		this.archetypes.get(entId)?.delete(compId)
	}

	query(...compIds: ComponentId[]): EntityId[] {
		const res: EntityId[] = []
		for (const [entId, arch] of this.archetypes) {
			if (compIds.every(id => arch.has(id))) res.push(entId)
		}
		return res
	}

	addSystem(sys: ECSSystem) {
		this.systems.push(sys)
	}

	upd(dt: number) {
		for (const sys of this.systems) sys.run(this, dt)
	}

	entCnt(): number {
		return this.archetypes.size
	}
}
