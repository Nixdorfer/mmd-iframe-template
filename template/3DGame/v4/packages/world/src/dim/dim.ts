import { DimensionType, type DimensionDef, type EntityId, type Vec3 } from '@engine/common'
import { RuleOverride, RulesLayer } from '../rules/rules'

export interface FilterConfig {
	id: string
	shader: string
	params: Record<string, number | number[]>
}

export interface PostProcessConfig {
	id: string
	effects: {
		blur?: { strength: number }
		bloom?: { threshold: number; intensity: number }
		colorGrade?: { hue: number; saturation: number; brightness: number }
		chromatic?: { offset: number }
		vignette?: { intensity: number; softness: number }
	}
}

export interface BoundaryConfig {
	id: string
	shape: 'sphere' | 'cube' | 'cylinder'
	color: [number, number, number, number]
	thickness: number
	animated: boolean
	animSpeed: number
	distortStrength: number
}

export interface RenderEffectState {
	filter: FilterConfig | null
	postProcess: PostProcessConfig | null
	boundary: BoundaryConfig | null
	transition: number
	transitionDir: 'in' | 'out' | null
}

export class RenderEffectManager {
	filters: Map<string, FilterConfig>
	postProcesses: Map<string, PostProcessConfig>
	boundaries: Map<string, BoundaryConfig>
	activeEffects: Map<string, RenderEffectState>

	constructor() {
		this.filters = new Map()
		this.postProcesses = new Map()
		this.boundaries = new Map()
		this.activeEffects = new Map()
		this.iniDefEffects()
	}

	private iniDefEffects() {
		this.filters.set('domain_dark', {
			id: 'domain_dark',
			shader: 'dimension_filter',
			params: { darkness: 0.7, saturation: 0.3, tint: [0.2, 0.0, 0.3] }
		})
		this.filters.set('reality_marble', {
			id: 'reality_marble',
			shader: 'dimension_filter',
			params: { darkness: 0.2, saturation: 1.2, tint: [0.9, 0.5, 0.3] }
		})
		this.filters.set('territory_tint', {
			id: 'territory_tint',
			shader: 'dimension_filter',
			params: { darkness: 0.0, saturation: 1.0, tint: [0.3, 0.5, 0.8] }
		})
		this.postProcesses.set('color_grade_warm', {
			id: 'color_grade_warm',
			effects: {
				colorGrade: { hue: 15, saturation: 1.2, brightness: 1.1 },
				bloom: { threshold: 0.8, intensity: 0.3 }
			}
		})
		this.postProcesses.set('color_grade_cold', {
			id: 'color_grade_cold',
			effects: {
				colorGrade: { hue: -20, saturation: 0.9, brightness: 0.95 },
				vignette: { intensity: 0.3, softness: 0.5 }
			}
		})
		this.boundaries.set('sphere_distort', {
			id: 'sphere_distort',
			shape: 'sphere',
			color: [0.5, 0.0, 0.8, 0.6],
			thickness: 2.0,
			animated: true,
			animSpeed: 1.0,
			distortStrength: 0.3
		})
		this.boundaries.set('reality_crack', {
			id: 'reality_crack',
			shape: 'sphere',
			color: [1.0, 0.3, 0.0, 0.8],
			thickness: 5.0,
			animated: true,
			animSpeed: 0.5,
			distortStrength: 0.5
		})
		this.boundaries.set('barrier_shield', {
			id: 'barrier_shield',
			shape: 'sphere',
			color: [0.2, 0.6, 1.0, 0.4],
			thickness: 1.0,
			animated: true,
			animSpeed: 2.0,
			distortStrength: 0.1
		})
		this.boundaries.set('bounded_field', {
			id: 'bounded_field',
			shape: 'sphere',
			color: [0.8, 0.2, 0.2, 0.3],
			thickness: 0.5,
			animated: false,
			animSpeed: 0.0,
			distortStrength: 0.0
		})
	}

	startEffect(dimId: string, filterName?: string, postName?: string, boundaryName?: string) {
		const state: RenderEffectState = {
			filter: filterName ? this.filters.get(filterName) ?? null : null,
			postProcess: postName ? this.postProcesses.get(postName) ?? null : null,
			boundary: boundaryName ? this.boundaries.get(boundaryName) ?? null : null,
			transition: 0,
			transitionDir: 'in'
		}
		this.activeEffects.set(dimId, state)
	}

	stopEffect(dimId: string) {
		const state = this.activeEffects.get(dimId)
		if (state) {
			state.transitionDir = 'out'
		}
	}

	upd(dt: number) {
		for (const [dimId, state] of this.activeEffects) {
			if (state.transitionDir === 'in') {
				state.transition = Math.min(1.0, state.transition + dt * 2)
				if (state.transition >= 1.0) state.transitionDir = null
			} else if (state.transitionDir === 'out') {
				state.transition = Math.max(0.0, state.transition - dt * 2)
				if (state.transition <= 0.0) {
					this.activeEffects.delete(dimId)
				}
			}
		}
	}

	getEffect(dimId: string): RenderEffectState | undefined {
		return this.activeEffects.get(dimId)
	}

	getActiveFilters(): { dimId: string; filter: FilterConfig; blend: number }[] {
		const result: { dimId: string; filter: FilterConfig; blend: number }[] = []
		for (const [dimId, state] of this.activeEffects) {
			if (state.filter && state.transition > 0) {
				result.push({ dimId, filter: state.filter, blend: state.transition })
			}
		}
		return result
	}

	getActiveBoundaries(): { dimId: string; boundary: BoundaryConfig; blend: number }[] {
		const result: { dimId: string; boundary: BoundaryConfig; blend: number }[] = []
		for (const [dimId, state] of this.activeEffects) {
			if (state.boundary && state.transition > 0) {
				result.push({ dimId, boundary: state.boundary, blend: state.transition })
			}
		}
		return result
	}
}

export interface DimensionInstance {
	id: string
	def: DimensionDef
	owner: EntityId
	pos: Vec3
	radius: number
	startTime: number
	endTime: number
	active: boolean
	entities: Set<EntityId>
	ruleOverride: RuleOverride
}

export interface DimensionCollision {
	dim1: string
	dim2: string
	winner: string | null
	overlap: number
}

export class DimensionLayer {
	defs: Map<string, DimensionDef>
	instances: Map<string, DimensionInstance>
	baseRules: RulesLayer
	nxtId: number

	constructor(baseRules: RulesLayer) {
		this.defs = new Map()
		this.instances = new Map()
		this.baseRules = baseRules
		this.nxtId = 1
		this.iniDefDims()
	}

	private iniDefDims() {
		this.addDef({
			typ: DimensionType.Domain,
			radius: 200,
			duration: 180,
			rules: {
				mustHit: true,
				cantEscape: true
			},
			effects: {
				filter: 'domain_dark',
				boundary: 'sphere_distort'
			},
			winCond: {
				type: 'kill_owner',
				params: {}
			}
		})
		this.addDef({
			typ: DimensionType.RealityMarble,
			radius: 500,
			duration: 60,
			rules: {
				weaponDmgMul: 2.0,
				unlimitedBlades: true
			},
			effects: {
				filter: 'reality_marble',
				postProcess: 'color_grade_warm',
				boundary: 'reality_crack'
			}
		})
		this.addDef({
			typ: DimensionType.Pocket,
			radius: 1000,
			duration: -1,
			rules: {
				timeFlow: 0.1,
				gravity: 0.5
			},
			effects: {}
		})
		this.addDef({
			typ: DimensionType.Barrier,
			radius: 50,
			duration: 30,
			rules: {
				blockProjectiles: true,
				blockEntities: true
			},
			effects: {
				boundary: 'barrier_shield'
			}
		})
		this.addDef({
			typ: DimensionType.Territory,
			radius: 100,
			duration: -1,
			rules: {
				ownerBuffs: ['regen', 'power'],
				intruderDebuffs: ['slow', 'weak']
			},
			effects: {
				filter: 'territory_tint'
			}
		})
		this.addDef({
			typ: DimensionType.BoundedField,
			radius: 300,
			duration: 3600,
			rules: {
				hideFromOutside: true,
				trapEntities: true
			},
			effects: {
				boundary: 'bounded_field'
			}
		})
	}

	addDef(def: DimensionDef) {
		this.defs.set(def.typ, def)
	}

	getDef(typ: DimensionType): DimensionDef | undefined {
		return this.defs.get(typ)
	}

	expand(owner: EntityId, typ: DimensionType, pos: Vec3): string | null {
		const def = this.getDef(typ)
		if (!def) return null
		const id = `dim_${this.nxtId++}`
		const now = Date.now()
		const inst: DimensionInstance = {
			id,
			def,
			owner,
			pos,
			radius: def.radius,
			startTime: now,
			endTime: def.duration > 0 ? now + def.duration * 1000 : -1,
			active: true,
			entities: new Set([owner]),
			ruleOverride: new RuleOverride(this.baseRules)
		}
		for (const [key, val] of Object.entries(def.rules)) {
			inst.ruleOverride.set(key as any, val)
		}
		this.instances.set(id, inst)
		return id
	}

	collapse(id: string) {
		const inst = this.instances.get(id)
		if (inst) {
			inst.active = false
		}
	}

	get(id: string): DimensionInstance | undefined {
		return this.instances.get(id)
	}

	getByOwner(owner: EntityId): DimensionInstance | undefined {
		for (const inst of this.instances.values()) {
			if (inst.owner === owner && inst.active) {
				return inst
			}
		}
		return undefined
	}

	isInside(id: string, pos: Vec3): boolean {
		const inst = this.instances.get(id)
		if (!inst || !inst.active) return false
		const dx = pos.x - inst.pos.x
		const dy = pos.y - inst.pos.y
		const dz = pos.z - inst.pos.z
		return dx * dx + dy * dy + dz * dz <= inst.radius * inst.radius
	}

	enter(id: string, entId: EntityId) {
		const inst = this.instances.get(id)
		if (inst && inst.active) {
			inst.entities.add(entId)
		}
	}

	exit(id: string, entId: EntityId) {
		const inst = this.instances.get(id)
		if (inst) {
			inst.entities.delete(entId)
		}
	}

	checkCollision(id1: string, id2: string): DimensionCollision | null {
		const d1 = this.instances.get(id1)
		const d2 = this.instances.get(id2)
		if (!d1 || !d2 || !d1.active || !d2.active) return null
		const dx = d1.pos.x - d2.pos.x
		const dy = d1.pos.y - d2.pos.y
		const dz = d1.pos.z - d2.pos.z
		const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
		const sumR = d1.radius + d2.radius
		if (dist >= sumR) return null
		const overlap = sumR - dist
		const str1 = d1.radius * (d1.def.duration > 0 ? d1.def.duration : 1000)
		const str2 = d2.radius * (d2.def.duration > 0 ? d2.def.duration : 1000)
		return {
			dim1: id1,
			dim2: id2,
			winner: str1 > str2 ? id1 : str2 > str1 ? id2 : null,
			overlap
		}
	}

	upd(now: number) {
		for (const inst of this.instances.values()) {
			if (inst.active && inst.endTime > 0 && now >= inst.endTime) {
				inst.active = false
			}
		}
	}

	getActiveInRange(pos: Vec3, range: number): DimensionInstance[] {
		const result: DimensionInstance[] = []
		for (const inst of this.instances.values()) {
			if (!inst.active) continue
			const dx = pos.x - inst.pos.x
			const dy = pos.y - inst.pos.y
			const dz = pos.z - inst.pos.z
			const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
			if (dist <= range + inst.radius) {
				result.push(inst)
			}
		}
		return result
	}

	clrInactive() {
		for (const [id, inst] of this.instances) {
			if (!inst.active) {
				this.instances.delete(id)
			}
		}
	}
}
