import { LawType, type LawViolation, type EntityId } from '@engine/common'

export interface LawDef {
	typ: LawType
	name: string
	desc: string
	cost: string
	exempt: string[]
	enabled: boolean
}

export interface LawCheckResult {
	violated: boolean
	law?: LawType
	cost?: string
	exempt?: boolean
}

export class LawLayer {
	laws: Map<LawType, LawDef>
	violations: LawViolation[]

	constructor() {
		this.laws = new Map()
		this.violations = []
		this.iniDefLaws()
	}

	private iniDefLaws() {
		this.laws.set(LawType.Causality, {
			typ: LawType.Causality,
			name: '因果律',
			desc: '一切事件必有因果，果不可先于因',
			cost: '业力值+100',
			exempt: ['时间神', '因果律武装持有者'],
			enabled: true
		})
		this.laws.set(LawType.EquivalentExchange, {
			typ: LawType.EquivalentExchange,
			name: '等价交换',
			desc: '获得某物必须付出等价代价',
			cost: '灵魂侵蚀',
			exempt: ['哲学之石持有者', '真理之门通过者'],
			enabled: true
		})
		this.laws.set(LawType.Conservation, {
			typ: LawType.Conservation,
			name: '守恒律',
			desc: '能量和物质不可凭空产生或消失',
			cost: '存在抹消',
			exempt: ['创世神', '湮灭者'],
			enabled: true
		})
		this.laws.set(LawType.Contract, {
			typ: LawType.Contract,
			name: '契约律',
			desc: '契约一旦成立必须履行',
			cost: '由契约决定',
			exempt: [],
			enabled: true
		})
		this.laws.set(LawType.Mortality, {
			typ: LawType.Mortality,
			name: '必死律',
			desc: '一切生命终将死亡',
			cost: '加速老化',
			exempt: ['不死者', '超越者'],
			enabled: true
		})
		this.laws.set(LawType.Identity, {
			typ: LawType.Identity,
			name: '同一律',
			desc: '事物只能是其自身，不可同时为他物',
			cost: '存在分裂',
			exempt: ['分身术者', '量子态存在'],
			enabled: true
		})
	}

	getLaw(typ: LawType): LawDef | undefined {
		return this.laws.get(typ)
	}

	setLawEnabled(typ: LawType, enabled: boolean) {
		const law = this.laws.get(typ)
		if (law) law.enabled = enabled
	}

	addExempt(typ: LawType, tag: string) {
		const law = this.laws.get(typ)
		if (law && !law.exempt.includes(tag)) {
			law.exempt.push(tag)
		}
	}

	check(typ: LawType, entityTags: string[]): LawCheckResult {
		const law = this.laws.get(typ)
		if (!law || !law.enabled) {
			return { violated: false }
		}
		for (const tag of entityTags) {
			if (law.exempt.includes(tag)) {
				return { violated: false, exempt: true }
			}
		}
		return {
			violated: true,
			law: typ,
			cost: law.cost
		}
	}

	enforce(entId: EntityId, typ: LawType, entityTags: string[]): LawViolation | null {
		const result = this.check(typ, entityTags)
		if (result.violated && result.law && result.cost) {
			const violation: LawViolation = {
				law: result.law,
				cost: result.cost,
				exempt: entityTags
			}
			this.violations.push(violation)
			return violation
		}
		return null
	}

	clrViolations() {
		this.violations = []
	}
}

export enum CostType {
	Hp = 'hp',
	Soul = 'soul',
	Lifespan = 'lifespan',
	Karma = 'karma',
	Existence = 'existence',
	Custom = 'custom'
}

export interface CostDef {
	typ: CostType
	amount: number
	permanent: boolean
	desc: string
}

export class CostEnforcer {
	costDefs: Map<string, CostDef>

	constructor() {
		this.costDefs = new Map()
		this.iniDefCosts()
	}

	private iniDefCosts() {
		this.costDefs.set('业力值+100', {
			typ: CostType.Karma,
			amount: 100,
			permanent: false,
			desc: '业力值增加100'
		})
		this.costDefs.set('灵魂侵蚀', {
			typ: CostType.Soul,
			amount: 10,
			permanent: true,
			desc: '灵魂永久损伤10%'
		})
		this.costDefs.set('存在抹消', {
			typ: CostType.Existence,
			amount: 100,
			permanent: true,
			desc: '从存在中完全抹消'
		})
		this.costDefs.set('加速老化', {
			typ: CostType.Lifespan,
			amount: 3650,
			permanent: true,
			desc: '寿命减少10年'
		})
		this.costDefs.set('存在分裂', {
			typ: CostType.Existence,
			amount: 50,
			permanent: true,
			desc: '自我认知永久混乱'
		})
	}

	getCost(costStr: string): CostDef | undefined {
		return this.costDefs.get(costStr)
	}

	apply(entId: EntityId, costStr: string, applyFn: (entId: EntityId, cost: CostDef) => void): boolean {
		const cost = this.getCost(costStr)
		if (!cost) return false
		applyFn(entId, cost)
		return true
	}
}

export interface CausalityEvent {
	cause: string
	effect: string
	time: number
	entId: EntityId
}

export class CausalityTracker {
	events: CausalityEvent[]
	maxHistory: number

	constructor(maxHistory = 1000) {
		this.events = []
		this.maxHistory = maxHistory
	}

	record(cause: string, effect: string, entId: EntityId) {
		this.events.push({
			cause,
			effect,
			time: Date.now(),
			entId
		})
		if (this.events.length > this.maxHistory) {
			this.events.shift()
		}
	}

	findCause(effect: string): CausalityEvent | undefined {
		for (let i = this.events.length - 1; i >= 0; i--) {
			if (this.events[i].effect === effect) {
				return this.events[i]
			}
		}
		return undefined
	}

	getChain(effect: string): CausalityEvent[] {
		const chain: CausalityEvent[] = []
		let cur = this.findCause(effect)
		while (cur) {
			chain.unshift(cur)
			cur = this.findCause(cur.cause)
		}
		return chain
	}
}
