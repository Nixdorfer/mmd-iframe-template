export enum RuleType {
	Combat = 'combat',
	Death = 'death',
	Economy = 'economy',
	Magic = 'magic',
	Physics = 'physics',
	Social = 'social'
}

export interface RuleDef {
	typ: RuleType
	name: string
	params: Record<string, any>
	enabled: boolean
	priority: number
}

export interface CombatRules {
	critMul: number
	dodgeChance: number
	blockReduction: number
	damageFormula: string
	allowFriendlyFire: boolean
	pvpEnabled: boolean
}

export interface DeathRules {
	respawnEnabled: boolean
	respawnTime: number
	expLoss: number
	itemDrop: boolean
	soulRetrieval: boolean
	permaDeath: boolean
}

export interface EconomyRules {
	tradeTax: number
	inflationRate: number
	currencyTypes: string[]
	maxInventory: number
	bankInterest: number
}

export class RulesLayer {
	rules: Map<RuleType, RuleDef>
	combat: CombatRules
	death: DeathRules
	economy: EconomyRules

	constructor() {
		this.rules = new Map()
		this.combat = {
			critMul: 2.0,
			dodgeChance: 0.1,
			blockReduction: 0.5,
			damageFormula: 'atk * (1 - def / (def + 100))',
			allowFriendlyFire: false,
			pvpEnabled: true
		}
		this.death = {
			respawnEnabled: true,
			respawnTime: 10,
			expLoss: 0.05,
			itemDrop: false,
			soulRetrieval: true,
			permaDeath: false
		}
		this.economy = {
			tradeTax: 0.05,
			inflationRate: 0.01,
			currencyTypes: ['gold', 'gem'],
			maxInventory: 100,
			bankInterest: 0.001
		}
		this.iniDefRules()
	}

	private iniDefRules() {
		this.rules.set(RuleType.Combat, {
			typ: RuleType.Combat,
			name: '战斗规则',
			params: this.combat,
			enabled: true,
			priority: 100
		})
		this.rules.set(RuleType.Death, {
			typ: RuleType.Death,
			name: '死亡规则',
			params: this.death,
			enabled: true,
			priority: 90
		})
		this.rules.set(RuleType.Economy, {
			typ: RuleType.Economy,
			name: '经济规则',
			params: this.economy,
			enabled: true,
			priority: 80
		})
	}

	getRule(typ: RuleType): RuleDef | undefined {
		return this.rules.get(typ)
	}

	setRule(typ: RuleType, params: Partial<any>) {
		const rule = this.rules.get(typ)
		if (rule) {
			Object.assign(rule.params, params)
		}
	}

	setEnabled(typ: RuleType, enabled: boolean) {
		const rule = this.rules.get(typ)
		if (rule) rule.enabled = enabled
	}

	calDamage(atk: number, def: number): number {
		return atk * (1 - def / (def + 100))
	}

	calCrit(baseDmg: number, critRate: number): { dmg: number; isCrit: boolean } {
		const isCrit = Math.random() < critRate
		return {
			dmg: isCrit ? baseDmg * this.combat.critMul : baseDmg,
			isCrit
		}
	}

	calDodge(dodgeRate: number): boolean {
		return Math.random() < (dodgeRate + this.combat.dodgeChance)
	}

	calExpLoss(totalExp: number): number {
		return this.death.expLoss * totalExp
	}

	calTax(amount: number): number {
		return amount * this.economy.tradeTax
	}
}

export class RuleOverride {
	base: RulesLayer
	overrides: Map<RuleType, Partial<any>>

	constructor(base: RulesLayer) {
		this.base = base
		this.overrides = new Map()
	}

	set(typ: RuleType, params: Partial<any>) {
		this.overrides.set(typ, params)
	}

	clr(typ: RuleType) {
		this.overrides.delete(typ)
	}

	get<T>(typ: RuleType): T | undefined {
		const base = this.base.getRule(typ)
		if (!base) return undefined
		const override = this.overrides.get(typ)
		if (!override) return base.params as T
		return { ...base.params, ...override } as T
	}
}
