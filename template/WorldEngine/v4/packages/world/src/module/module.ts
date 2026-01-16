import { WorldviewType, type EntityId } from '@engine/common'

export enum ModuleCategory {
	Core = 'core',
	Advanced = 'advanced',
	Worldview = 'worldview'
}

export interface ModuleDef {
	id: string
	name: string
	category: ModuleCategory
	worldview?: WorldviewType
	deps: string[]
	enabled: boolean
}

export interface ModuleInstance {
	def: ModuleDef
	state: any
	entities: Set<EntityId>
}

export class ModuleLayer {
	defs: Map<string, ModuleDef>
	instances: Map<string, ModuleInstance>
	activeWorldviews: Set<WorldviewType>

	constructor() {
		this.defs = new Map()
		this.instances = new Map()
		this.activeWorldviews = new Set()
		this.iniModules()
	}

	private iniModules() {
		const coreMods: ModuleDef[] = [
			{ id: 'physics', name: '物理', category: ModuleCategory.Core, deps: [], enabled: true },
			{ id: 'animation', name: '动画', category: ModuleCategory.Core, deps: [], enabled: true },
			{ id: 'behavior', name: '行为', category: ModuleCategory.Core, deps: [], enabled: true },
			{ id: 'combat', name: '战斗', category: ModuleCategory.Core, deps: ['physics'], enabled: true },
			{ id: 'ability', name: '能力', category: ModuleCategory.Core, deps: [], enabled: true },
			{ id: 'interaction', name: '交互', category: ModuleCategory.Core, deps: [], enabled: true },
			{ id: 'equipment', name: '装备', category: ModuleCategory.Core, deps: [], enabled: true },
			{ id: 'social', name: '社交', category: ModuleCategory.Core, deps: [], enabled: true },
			{ id: 'render', name: '渲染', category: ModuleCategory.Core, deps: [], enabled: true },
			{ id: 'audio', name: '音频', category: ModuleCategory.Core, deps: [], enabled: true },
			{ id: 'lifecycle', name: '生命周期', category: ModuleCategory.Core, deps: [], enabled: true },
			{ id: 'network', name: '网络', category: ModuleCategory.Core, deps: [], enabled: true }
		]
		const advMods: ModuleDef[] = [
			{ id: 'transformation', name: '变身', category: ModuleCategory.Advanced, deps: ['animation'], enabled: true },
			{ id: 'dimension', name: '维度', category: ModuleCategory.Advanced, deps: [], enabled: true },
			{ id: 'contract', name: '契约', category: ModuleCategory.Advanced, deps: ['social'], enabled: true },
			{ id: 'soul', name: '灵魂', category: ModuleCategory.Advanced, deps: [], enabled: true },
			{ id: 'fate', name: '命运', category: ModuleCategory.Advanced, deps: [], enabled: true },
			{ id: 'progression', name: '成长', category: ModuleCategory.Advanced, deps: [], enabled: true },
			{ id: 'crafting', name: '制作', category: ModuleCategory.Advanced, deps: ['equipment'], enabled: true },
			{ id: 'territory', name: '领地', category: ModuleCategory.Advanced, deps: [], enabled: true }
		]
		const wvMods: ModuleDef[] = [
			{ id: 'hacking', name: '骇入', category: ModuleCategory.Worldview, worldview: WorldviewType.Cyberpunk, deps: [], enabled: true },
			{ id: 'magic', name: '魔法', category: ModuleCategory.Worldview, worldview: WorldviewType.HarryPotter, deps: ['ability'], enabled: true },
			{ id: 'qi', name: '气', category: ModuleCategory.Worldview, worldview: WorldviewType.Xianxia, deps: ['ability'], enabled: true },
			{ id: 'martial', name: '武学', category: ModuleCategory.Worldview, worldview: WorldviewType.Wuxia, deps: ['combat'], enabled: true },
			{ id: 'ninjutsu', name: '忍术', category: ModuleCategory.Worldview, worldview: WorldviewType.Naruto, deps: ['ability'], enabled: true },
			{ id: 'haki', name: '霸气', category: ModuleCategory.Worldview, worldview: WorldviewType.OnePiece, deps: ['ability'], enabled: true },
			{ id: 'jujutsu', name: '咒术', category: ModuleCategory.Worldview, worldview: WorldviewType.JujutsuKaisen, deps: ['ability', 'dimension'], enabled: true },
			{ id: 'force', name: '原力', category: ModuleCategory.Worldview, worldview: WorldviewType.StarWars, deps: ['ability'], enabled: true },
			{ id: 'breath', name: '呼吸法', category: ModuleCategory.Worldview, worldview: WorldviewType.DemonSlayer, deps: ['combat'], enabled: true },
			{ id: 'magecraft', name: '魔术', category: ModuleCategory.Worldview, worldview: WorldviewType.Fate, deps: ['ability'], enabled: true },
			{ id: 'servant', name: '从者', category: ModuleCategory.Worldview, worldview: WorldviewType.Fate, deps: ['contract', 'soul'], enabled: true },
			{ id: 'esper', name: '超能力', category: ModuleCategory.Worldview, worldview: WorldviewType.Toaru, deps: ['ability'], enabled: true },
			{ id: 'stand', name: '替身', category: ModuleCategory.Worldview, worldview: WorldviewType.Jojo, deps: ['ability', 'soul'], enabled: true },
			{ id: 'companion', name: '伙伴', category: ModuleCategory.Worldview, worldview: WorldviewType.Pokemon, deps: ['contract'], enabled: true },
			{ id: 'nen', name: '念', category: ModuleCategory.Worldview, worldview: WorldviewType.HunterXHunter, deps: ['ability'], enabled: true }
		]
		for (const mod of [...coreMods, ...advMods, ...wvMods]) {
			this.defs.set(mod.id, mod)
		}
	}

	getDef(id: string): ModuleDef | undefined {
		return this.defs.get(id)
	}

	enable(id: string): boolean {
		const def = this.defs.get(id)
		if (!def) return false
		for (const dep of def.deps) {
			if (!this.isEnabled(dep)) {
				this.enable(dep)
			}
		}
		def.enabled = true
		if (!this.instances.has(id)) {
			this.instances.set(id, {
				def,
				state: {},
				entities: new Set()
			})
		}
		if (def.worldview) {
			this.activeWorldviews.add(def.worldview)
		}
		return true
	}

	disable(id: string) {
		const def = this.defs.get(id)
		if (!def) return
		def.enabled = false
		this.instances.delete(id)
		if (def.worldview) {
			let hasOther = false
			for (const [, d] of this.defs) {
				if (d.worldview === def.worldview && d.enabled && d.id !== id) {
					hasOther = true
					break
				}
			}
			if (!hasOther) {
				this.activeWorldviews.delete(def.worldview)
			}
		}
	}

	isEnabled(id: string): boolean {
		return this.defs.get(id)?.enabled ?? false
	}

	getInstance(id: string): ModuleInstance | undefined {
		return this.instances.get(id)
	}

	setModuleState(id: string, state: any) {
		const inst = this.instances.get(id)
		if (inst) inst.state = state
	}

	getModuleState<T>(id: string): T | undefined {
		return this.instances.get(id)?.state as T
	}

	registerEntity(modId: string, entId: EntityId) {
		const inst = this.instances.get(modId)
		if (inst) inst.entities.add(entId)
	}

	unregisterEntity(modId: string, entId: EntityId) {
		const inst = this.instances.get(modId)
		if (inst) inst.entities.delete(entId)
	}

	getModuleEntities(modId: string): EntityId[] {
		const inst = this.instances.get(modId)
		return inst ? Array.from(inst.entities) : []
	}

	enableWorldview(wv: WorldviewType) {
		for (const [id, def] of this.defs) {
			if (def.worldview === wv) {
				this.enable(id)
			}
		}
	}

	disableWorldview(wv: WorldviewType) {
		for (const [id, def] of this.defs) {
			if (def.worldview === wv) {
				this.disable(id)
			}
		}
	}

	isWorldviewActive(wv: WorldviewType): boolean {
		return this.activeWorldviews.has(wv)
	}

	getActiveWorldviews(): WorldviewType[] {
		return Array.from(this.activeWorldviews)
	}

	getModulesByCategory(cat: ModuleCategory): ModuleDef[] {
		const result: ModuleDef[] = []
		for (const def of this.defs.values()) {
			if (def.category === cat) {
				result.push(def)
			}
		}
		return result
	}

	getEnabledModules(): ModuleDef[] {
		const result: ModuleDef[] = []
		for (const def of this.defs.values()) {
			if (def.enabled) {
				result.push(def)
			}
		}
		return result
	}
}
