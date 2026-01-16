export enum MatCombRule {
	Avg = 'avg',
	Min = 'min',
	Max = 'max',
	Mul = 'mul'
}

export interface PhysMat {
	name: string
	friction: number
	bounce: number
	frictionCombRule: MatCombRule
	bounceCombRule: MatCombRule
	sndId?: string
}

export const MAT_DEF: PhysMat = {
	name: 'def',
	friction: 0.5,
	bounce: 0.3,
	frictionCombRule: MatCombRule.Avg,
	bounceCombRule: MatCombRule.Avg
}

export const MAT_ICE: PhysMat = {
	name: 'ice',
	friction: 0.02,
	bounce: 0.1,
	frictionCombRule: MatCombRule.Min,
	bounceCombRule: MatCombRule.Avg,
	sndId: 'ice_hit'
}

export const MAT_SAND: PhysMat = {
	name: 'sand',
	friction: 0.8,
	bounce: 0.05,
	frictionCombRule: MatCombRule.Max,
	bounceCombRule: MatCombRule.Min,
	sndId: 'sand_hit'
}

export const MAT_RUBBER: PhysMat = {
	name: 'rubber',
	friction: 0.9,
	bounce: 0.9,
	frictionCombRule: MatCombRule.Avg,
	bounceCombRule: MatCombRule.Max,
	sndId: 'rubber_hit'
}

export const MAT_METAL: PhysMat = {
	name: 'metal',
	friction: 0.4,
	bounce: 0.3,
	frictionCombRule: MatCombRule.Avg,
	bounceCombRule: MatCombRule.Avg,
	sndId: 'metal_hit'
}

export const MAT_WOOD: PhysMat = {
	name: 'wood',
	friction: 0.5,
	bounce: 0.4,
	frictionCombRule: MatCombRule.Avg,
	bounceCombRule: MatCombRule.Avg,
	sndId: 'wood_hit'

}

export const MAT_STONE: PhysMat = {
	name: 'stone',
	friction: 0.6,
	bounce: 0.2,
	frictionCombRule: MatCombRule.Avg,
	bounceCombRule: MatCombRule.Min,
	sndId: 'stone_hit'
}

export const MAT_PRESET: Record<string, PhysMat> = {
	def: MAT_DEF,
	ice: MAT_ICE,
	sand: MAT_SAND,
	rubber: MAT_RUBBER,
	metal: MAT_METAL,
	wood: MAT_WOOD,
	stone: MAT_STONE
}

function combine(a: number, b: number, rule: MatCombRule): number {
	switch (rule) {
		case MatCombRule.Avg: return (a + b) * 0.5
		case MatCombRule.Min: return Math.min(a, b)
		case MatCombRule.Max: return Math.max(a, b)
		case MatCombRule.Mul: return a * b
	}
}

export function combineFriction(a: PhysMat, b: PhysMat): number {
	return combine(a.friction, b.friction, a.frictionCombRule)
}

export function combineBounce(a: PhysMat, b: PhysMat): number {
	return combine(a.bounce, b.bounce, a.bounceCombRule)
}

export function getColSnd(a: PhysMat, b: PhysMat): string | null {
	if (a.sndId && b.sndId) {
		return a.bounce > b.bounce ? a.sndId : b.sndId
	}
	return a.sndId || b.sndId || null
}

export function createMat(
	name: string,
	friction: number,
	bounce: number,
	frictionCombRule: MatCombRule = MatCombRule.Avg,
	bounceCombRule: MatCombRule = MatCombRule.Avg,
	sndId?: string
): PhysMat {
	return { name, friction, bounce, frictionCombRule, bounceCombRule, sndId }
}
