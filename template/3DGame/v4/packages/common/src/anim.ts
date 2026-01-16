import { LocomotionType, LocomotionModifier } from './types'

export enum LifeStage {
	Infant = 'infant',
	Child = 'child',
	Juvenile = 'juvenile',
	Adult = 'adult'
}

export interface AnimDef {
	name: string
	frames: number
	loop: boolean
	category: 'idle' | 'move' | 'attack' | 'react' | 'social' | 'special'
	dmgFrame?: number
	stageOnly?: LifeStage[]
}

export const SERPENT_ANIMS: AnimDef[] = [
	{ name: 'idle', frames: 60, loop: true, category: 'idle' },
	{ name: 'idle_coil', frames: 60, loop: true, category: 'idle' },
	{ name: 'slither', frames: 30, loop: true, category: 'move' },
	{ name: 'slither_fast', frames: 20, loop: true, category: 'move' },
	{ name: 'attack_bite', frames: 20, loop: false, category: 'attack', dmgFrame: 12 },
	{ name: 'attack_coil', frames: 40, loop: false, category: 'attack', dmgFrame: 25 },
	{ name: 'attack_spit', frames: 25, loop: false, category: 'attack', dmgFrame: 15 },
	{ name: 'attack_tail', frames: 25, loop: false, category: 'attack', dmgFrame: 15 },
	{ name: 'hit', frames: 15, loop: false, category: 'react' },
	{ name: 'death', frames: 50, loop: false, category: 'react' },
	{ name: 'spawn', frames: 30, loop: false, category: 'react' }
]

export const MONOPOD_ANIMS: AnimDef[] = [
	{ name: 'idle', frames: 40, loop: true, category: 'idle' },
	{ name: 'hop', frames: 20, loop: true, category: 'move' },
	{ name: 'bounce_fast', frames: 15, loop: true, category: 'move' },
	{ name: 'attack_slam', frames: 25, loop: false, category: 'attack', dmgFrame: 18 },
	{ name: 'attack_bounce', frames: 30, loop: false, category: 'attack', dmgFrame: 20 },
	{ name: 'attack_spit', frames: 20, loop: false, category: 'attack', dmgFrame: 12 },
	{ name: 'hit', frames: 15, loop: false, category: 'react' },
	{ name: 'death', frames: 30, loop: false, category: 'react' },
	{ name: 'spawn', frames: 25, loop: false, category: 'react' }
]

export const BIPED_ANIMS: AnimDef[] = [
	{ name: 'idle', frames: 60, loop: true, category: 'idle' },
	{ name: 'idle_sit', frames: 60, loop: true, category: 'idle' },
	{ name: 'walk', frames: 30, loop: true, category: 'move' },
	{ name: 'run', frames: 20, loop: true, category: 'move' },
	{ name: 'jump', frames: 40, loop: false, category: 'move' },
	{ name: 'attack_punch', frames: 20, loop: false, category: 'attack', dmgFrame: 10 },
	{ name: 'attack_kick', frames: 25, loop: false, category: 'attack', dmgFrame: 15 },
	{ name: 'attack_claw', frames: 20, loop: false, category: 'attack', dmgFrame: 12 },
	{ name: 'attack_bite', frames: 20, loop: false, category: 'attack', dmgFrame: 12 },
	{ name: 'attack_ranged', frames: 25, loop: false, category: 'attack', dmgFrame: 18 },
	{ name: 'hit', frames: 15, loop: false, category: 'react' },
	{ name: 'hit_heavy', frames: 30, loop: false, category: 'react' },
	{ name: 'death', frames: 45, loop: false, category: 'react' },
	{ name: 'spawn', frames: 30, loop: false, category: 'react' }
]

export const TRIPOD_ANIMS: AnimDef[] = [
	{ name: 'idle', frames: 60, loop: true, category: 'idle' },
	{ name: 'walk', frames: 35, loop: true, category: 'move' },
	{ name: 'run', frames: 25, loop: true, category: 'move' },
	{ name: 'attack_claw', frames: 25, loop: false, category: 'attack', dmgFrame: 15 },
	{ name: 'attack_ranged', frames: 25, loop: false, category: 'attack', dmgFrame: 18 },
	{ name: 'attack_stomp', frames: 30, loop: false, category: 'attack', dmgFrame: 22 },
	{ name: 'hit', frames: 15, loop: false, category: 'react' },
	{ name: 'death', frames: 40, loop: false, category: 'react' },
	{ name: 'spawn', frames: 30, loop: false, category: 'react' }
]

export const QUADRUPED_ANIMS: AnimDef[] = [
	{ name: 'idle', frames: 60, loop: true, category: 'idle' },
	{ name: 'idle_sit', frames: 60, loop: true, category: 'idle' },
	{ name: 'idle_sleep', frames: 90, loop: true, category: 'idle' },
	{ name: 'walk', frames: 30, loop: true, category: 'move' },
	{ name: 'run', frames: 20, loop: true, category: 'move' },
	{ name: 'jump', frames: 40, loop: false, category: 'move' },
	{ name: 'attack_bite', frames: 20, loop: false, category: 'attack', dmgFrame: 12 },
	{ name: 'attack_claw', frames: 25, loop: false, category: 'attack', dmgFrame: 15 },
	{ name: 'attack_charge', frames: 35, loop: false, category: 'attack', dmgFrame: 25 },
	{ name: 'attack_tail', frames: 25, loop: false, category: 'attack', dmgFrame: 15 },
	{ name: 'attack_stomp', frames: 30, loop: false, category: 'attack', dmgFrame: 22 },
	{ name: 'attack_ranged', frames: 25, loop: false, category: 'attack', dmgFrame: 18 },
	{ name: 'hit', frames: 15, loop: false, category: 'react' },
	{ name: 'hit_heavy', frames: 35, loop: false, category: 'react' },
	{ name: 'death', frames: 50, loop: false, category: 'react' },
	{ name: 'spawn', frames: 30, loop: false, category: 'react' }
]

export const HEXAPOD_ANIMS: AnimDef[] = [
	{ name: 'idle', frames: 60, loop: true, category: 'idle' },
	{ name: 'walk', frames: 30, loop: true, category: 'move' },
	{ name: 'run', frames: 20, loop: true, category: 'move' },
	{ name: 'attack_bite', frames: 20, loop: false, category: 'attack', dmgFrame: 12 },
	{ name: 'attack_sting', frames: 25, loop: false, category: 'attack', dmgFrame: 18 },
	{ name: 'attack_claw', frames: 20, loop: false, category: 'attack', dmgFrame: 12 },
	{ name: 'attack_spit', frames: 25, loop: false, category: 'attack', dmgFrame: 18 },
	{ name: 'hit', frames: 15, loop: false, category: 'react' },
	{ name: 'death', frames: 40, loop: false, category: 'react' },
	{ name: 'spawn', frames: 25, loop: false, category: 'react' }
]

export const OCTOPOD_ANIMS: AnimDef[] = [
	{ name: 'idle', frames: 60, loop: true, category: 'idle' },
	{ name: 'walk', frames: 35, loop: true, category: 'move' },
	{ name: 'run', frames: 25, loop: true, category: 'move' },
	{ name: 'climb', frames: 30, loop: true, category: 'move' },
	{ name: 'attack_bite', frames: 20, loop: false, category: 'attack', dmgFrame: 12 },
	{ name: 'attack_grab', frames: 30, loop: false, category: 'attack', dmgFrame: 20 },
	{ name: 'attack_web', frames: 25, loop: false, category: 'attack', dmgFrame: 18 },
	{ name: 'attack_ink', frames: 25, loop: false, category: 'attack', dmgFrame: 15 },
	{ name: 'attack_wrap', frames: 40, loop: false, category: 'attack', dmgFrame: 30 },
	{ name: 'hit', frames: 15, loop: false, category: 'react' },
	{ name: 'death', frames: 45, loop: false, category: 'react' },
	{ name: 'spawn', frames: 30, loop: false, category: 'react' }
]

export const MULTIPOD_ANIMS: AnimDef[] = [
	{ name: 'idle', frames: 60, loop: true, category: 'idle' },
	{ name: 'walk', frames: 30, loop: true, category: 'move' },
	{ name: 'run', frames: 20, loop: true, category: 'move' },
	{ name: 'attack_bite', frames: 20, loop: false, category: 'attack', dmgFrame: 12 },
	{ name: 'attack_coil', frames: 40, loop: false, category: 'attack', dmgFrame: 28 },
	{ name: 'attack_sting', frames: 25, loop: false, category: 'attack', dmgFrame: 18 },
	{ name: 'hit', frames: 15, loop: false, category: 'react' },
	{ name: 'death', frames: 40, loop: false, category: 'react' },
	{ name: 'spawn', frames: 25, loop: false, category: 'react' }
]

export const FLOATING_ANIMS: AnimDef[] = [
	{ name: 'hover', frames: 60, loop: true, category: 'idle' },
	{ name: 'float_move', frames: 30, loop: true, category: 'move' },
	{ name: 'float_fast', frames: 20, loop: true, category: 'move' },
	{ name: 'ascend', frames: 25, loop: false, category: 'move' },
	{ name: 'descend', frames: 25, loop: false, category: 'move' }
]

export const WINGED_ANIMS: AnimDef[] = [
	{ name: 'fly_hover', frames: 40, loop: true, category: 'idle' },
	{ name: 'fly', frames: 25, loop: true, category: 'move' },
	{ name: 'fly_fast', frames: 20, loop: true, category: 'move' },
	{ name: 'takeoff', frames: 30, loop: false, category: 'move' },
	{ name: 'land', frames: 30, loop: false, category: 'move' },
	{ name: 'attack_dive', frames: 35, loop: false, category: 'attack', dmgFrame: 25 },
	{ name: 'attack_wing', frames: 25, loop: false, category: 'attack', dmgFrame: 15 }
]

export const AQUATIC_ANIMS: AnimDef[] = [
	{ name: 'idle', frames: 60, loop: true, category: 'idle' },
	{ name: 'idle_float', frames: 80, loop: true, category: 'idle' },
	{ name: 'swim', frames: 30, loop: true, category: 'move' },
	{ name: 'swim_fast', frames: 20, loop: true, category: 'move' },
	{ name: 'dive', frames: 25, loop: false, category: 'move' },
	{ name: 'surface', frames: 25, loop: false, category: 'move' },
	{ name: 'attack_bite', frames: 20, loop: false, category: 'attack', dmgFrame: 12 },
	{ name: 'attack_tail', frames: 25, loop: false, category: 'attack', dmgFrame: 15 },
	{ name: 'attack_ram', frames: 30, loop: false, category: 'attack', dmgFrame: 20 },
	{ name: 'hit', frames: 15, loop: false, category: 'react' },
	{ name: 'death', frames: 40, loop: false, category: 'react' },
	{ name: 'spawn', frames: 25, loop: false, category: 'react' }
]

export const AMORPHOUS_ANIMS: AnimDef[] = [
	{ name: 'idle', frames: 60, loop: true, category: 'idle' },
	{ name: 'idle_pulse', frames: 90, loop: true, category: 'idle' },
	{ name: 'crawl', frames: 40, loop: true, category: 'move' },
	{ name: 'flow', frames: 30, loop: true, category: 'move' },
	{ name: 'stretch', frames: 35, loop: false, category: 'move' },
	{ name: 'attack_engulf', frames: 40, loop: false, category: 'attack', dmgFrame: 30 },
	{ name: 'attack_tendril', frames: 25, loop: false, category: 'attack', dmgFrame: 15 },
	{ name: 'attack_spit', frames: 25, loop: false, category: 'attack', dmgFrame: 18 },
	{ name: 'split', frames: 30, loop: false, category: 'special' },
	{ name: 'merge', frames: 30, loop: false, category: 'special' },
	{ name: 'hit', frames: 15, loop: false, category: 'react' },
	{ name: 'death', frames: 50, loop: false, category: 'react' },
	{ name: 'spawn', frames: 30, loop: false, category: 'react' }
]

export const PLANTOID_ANIMS: AnimDef[] = [
	{ name: 'idle', frames: 90, loop: true, category: 'idle' },
	{ name: 'idle_sway', frames: 120, loop: true, category: 'idle' },
	{ name: 'root_walk', frames: 50, loop: true, category: 'move' },
	{ name: 'burrow', frames: 40, loop: false, category: 'move' },
	{ name: 'emerge', frames: 40, loop: false, category: 'move' },
	{ name: 'attack_vine', frames: 30, loop: false, category: 'attack', dmgFrame: 20 },
	{ name: 'attack_spore', frames: 25, loop: false, category: 'attack', dmgFrame: 18 },
	{ name: 'attack_thorn', frames: 20, loop: false, category: 'attack', dmgFrame: 12 },
	{ name: 'bloom', frames: 40, loop: false, category: 'special' },
	{ name: 'wilt', frames: 60, loop: false, category: 'special' },
	{ name: 'hit', frames: 20, loop: false, category: 'react' },
	{ name: 'death', frames: 60, loop: false, category: 'react' },
	{ name: 'spawn', frames: 45, loop: false, category: 'react' }
]

export const INFANT_ANIMS: AnimDef[] = [
	{ name: 'nurse', frames: 60, loop: true, category: 'social', stageOnly: [LifeStage.Infant] },
	{ name: 'cry', frames: 30, loop: false, category: 'react', stageOnly: [LifeStage.Infant] },
	{ name: 'sleep', frames: 120, loop: true, category: 'idle', stageOnly: [LifeStage.Infant] },
	{ name: 'wobble', frames: 40, loop: true, category: 'move', stageOnly: [LifeStage.Infant] }
]

export const CHILD_ANIMS: AnimDef[] = [
	{ name: 'play', frames: 60, loop: true, category: 'social', stageOnly: [LifeStage.Infant, LifeStage.Child] },
	{ name: 'follow_parent', frames: 30, loop: true, category: 'move', stageOnly: [LifeStage.Infant, LifeStage.Child] },
	{ name: 'curious', frames: 45, loop: false, category: 'idle', stageOnly: [LifeStage.Child, LifeStage.Juvenile] },
	{ name: 'scared', frames: 25, loop: false, category: 'react', stageOnly: [LifeStage.Infant, LifeStage.Child] },
	{ name: 'tumble', frames: 35, loop: false, category: 'react', stageOnly: [LifeStage.Child] }
]

export const JUVENILE_ANIMS: AnimDef[] = [
	{ name: 'practice_attack', frames: 30, loop: false, category: 'special', stageOnly: [LifeStage.Juvenile] },
	{ name: 'spar', frames: 45, loop: false, category: 'social', stageOnly: [LifeStage.Juvenile] },
	{ name: 'hunt_learn', frames: 40, loop: false, category: 'special', stageOnly: [LifeStage.Juvenile] },
	{ name: 'challenge', frames: 35, loop: false, category: 'social', stageOnly: [LifeStage.Juvenile, LifeStage.Adult] }
]

export const ADULT_ANIMS: AnimDef[] = [
	{ name: 'mate_call', frames: 60, loop: false, category: 'social', stageOnly: [LifeStage.Adult] },
	{ name: 'mate_dance', frames: 90, loop: false, category: 'social', stageOnly: [LifeStage.Adult] },
	{ name: 'protect_young', frames: 45, loop: false, category: 'react', stageOnly: [LifeStage.Adult] },
	{ name: 'feed_young', frames: 50, loop: false, category: 'social', stageOnly: [LifeStage.Adult] },
	{ name: 'territorial', frames: 40, loop: false, category: 'react', stageOnly: [LifeStage.Adult] }
]

export const ALL_STAGE_ANIMS: AnimDef[] = [
	...INFANT_ANIMS,
	...CHILD_ANIMS,
	...JUVENILE_ANIMS,
	...ADULT_ANIMS
]

export function getAnimsForType(typ: LocomotionType): AnimDef[] {
	switch (typ) {
		case LocomotionType.Serpent: return SERPENT_ANIMS
		case LocomotionType.Monopod: return MONOPOD_ANIMS
		case LocomotionType.Biped: return BIPED_ANIMS
		case LocomotionType.Tripod: return TRIPOD_ANIMS
		case LocomotionType.Quadruped: return QUADRUPED_ANIMS
		case LocomotionType.Hexapod: return HEXAPOD_ANIMS
		case LocomotionType.Octopod: return OCTOPOD_ANIMS
		case LocomotionType.Multipod: return MULTIPOD_ANIMS
		default: return BIPED_ANIMS
	}
}

export function getAnimsForModifier(mod: LocomotionModifier): AnimDef[] {
	switch (mod) {
		case LocomotionModifier.Floating: return FLOATING_ANIMS
		case LocomotionModifier.Winged: return WINGED_ANIMS
		default: return []
	}
}

export function getAllAnimsForCreature(typ: LocomotionType, mods: LocomotionModifier[]): AnimDef[] {
	const baseAnims = getAnimsForType(typ)
	const modAnims: AnimDef[] = []
	for (const mod of mods) {
		modAnims.push(...getAnimsForModifier(mod))
	}
	return [...baseAnims, ...modAnims]
}

export interface SkeletonTemplate {
	typ: LocomotionType
	bones: string[]
	boneCount: number
}

export const SKELETON_TEMPLATES: SkeletonTemplate[] = [
	{
		typ: LocomotionType.Serpent,
		bones: [
			'root', 'spine_01', 'spine_02', 'spine_03', 'spine_04', 'spine_05',
			'spine_06', 'spine_07', 'spine_08', 'spine_09', 'spine_10',
			'spine_11', 'spine_12', 'head', 'jaw'
		],
		boneCount: 15
	},
	{
		typ: LocomotionType.Biped,
		bones: [
			'root', 'spine_01', 'spine_02', 'spine_03', 'neck', 'head', 'jaw',
			'clavicle_l', 'upper_arm_l', 'lower_arm_l', 'hand_l',
			'clavicle_r', 'upper_arm_r', 'lower_arm_r', 'hand_r',
			'pelvis', 'thigh_l', 'calf_l', 'foot_l', 'toe_l',
			'thigh_r', 'calf_r', 'foot_r', 'toe_r'
		],
		boneCount: 24
	},
	{
		typ: LocomotionType.Quadruped,
		bones: [
			'root', 'spine_01', 'spine_02', 'spine_03', 'neck', 'head', 'jaw',
			'shoulder_l', 'front_upper_leg_l', 'front_lower_leg_l', 'front_foot_l',
			'shoulder_r', 'front_upper_leg_r', 'front_lower_leg_r', 'front_foot_r',
			'hip_l', 'back_upper_leg_l', 'back_lower_leg_l', 'back_foot_l',
			'hip_r', 'back_upper_leg_r', 'back_lower_leg_r', 'back_foot_r',
			'tail_01', 'tail_02', 'tail_03'
		],
		boneCount: 26
	},
	{
		typ: LocomotionType.Hexapod,
		bones: [
			'root', 'thorax', 'abdomen', 'head',
			'leg_front_l_01', 'leg_front_l_02', 'leg_front_l_03',
			'leg_front_r_01', 'leg_front_r_02', 'leg_front_r_03',
			'leg_mid_l_01', 'leg_mid_l_02', 'leg_mid_l_03',
			'leg_mid_r_01', 'leg_mid_r_02', 'leg_mid_r_03',
			'leg_back_l_01', 'leg_back_l_02', 'leg_back_l_03',
			'leg_back_r_01', 'leg_back_r_02', 'leg_back_r_03'
		],
		boneCount: 22
	},
	{
		typ: LocomotionType.Octopod,
		bones: [
			'root', 'body', 'head',
			'leg_1_01', 'leg_1_02', 'leg_1_03',
			'leg_2_01', 'leg_2_02', 'leg_2_03',
			'leg_3_01', 'leg_3_02', 'leg_3_03',
			'leg_4_01', 'leg_4_02', 'leg_4_03',
			'leg_5_01', 'leg_5_02', 'leg_5_03',
			'leg_6_01', 'leg_6_02', 'leg_6_03',
			'leg_7_01', 'leg_7_02', 'leg_7_03',
			'leg_8_01', 'leg_8_02', 'leg_8_03'
		],
		boneCount: 27
	}
]

export const WINGED_BONES: string[] = [
	'wing_root_l', 'wing_mid_l', 'wing_tip_l', 'wing_finger_1_l', 'wing_finger_2_l',
	'wing_root_r', 'wing_mid_r', 'wing_tip_r', 'wing_finger_1_r', 'wing_finger_2_r'
]

export function getSkeletonTemplate(typ: LocomotionType): SkeletonTemplate | undefined {
	return SKELETON_TEMPLATES.find(t => t.typ === typ)
}

export function getFullBoneList(typ: LocomotionType, mods: LocomotionModifier[]): string[] {
	const template = getSkeletonTemplate(typ)
	if (!template) return []
	const bones = [...template.bones]
	if (mods.includes(LocomotionModifier.Winged)) {
		bones.push(...WINGED_BONES)
	}
	return bones
}

export interface CreatureAssetMeta {
	id: string
	name: string
	typ: LocomotionType
	mods: LocomotionModifier[]
	polyCount: number
	texSize: number
	boneCount: number
	anims: string[]
}

export interface LifeStageAsset {
	stage: LifeStage
	modelPath: string
	texPath: string
	rigPath: string
	scale: number
	anims: string[]
}

export interface StagedCreatureAsset {
	id: string
	name: string
	typ: LocomotionType
	mods: LocomotionModifier[]
	stages: Record<LifeStage, LifeStageAsset>
}

export const STAGE_SCALE_DEFAULTS: Record<LifeStage, number> = {
	[LifeStage.Infant]: 0.25,
	[LifeStage.Child]: 0.5,
	[LifeStage.Juvenile]: 0.75,
	[LifeStage.Adult]: 1.0
}

export const STAGE_STAT_MODS: Record<LifeStage, { hp: number; atk: number; def: number; spd: number }> = {
	[LifeStage.Infant]: { hp: 0.15, atk: 0.0, def: 0.1, spd: 0.3 },
	[LifeStage.Child]: { hp: 0.35, atk: 0.2, def: 0.25, spd: 0.6 },
	[LifeStage.Juvenile]: { hp: 0.65, atk: 0.6, def: 0.55, spd: 0.85 },
	[LifeStage.Adult]: { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.0 }
}

export interface AssetGenRequest {
	creatureId: string
	stage: LifeStage
	typ: 'design' | 'model' | 'rig' | 'anim'
	baseRef?: string
}

export interface AssetGenResult {
	creatureId: string
	stage: LifeStage
	typ: 'design' | 'model' | 'rig' | 'anim'
	path: string
	success: boolean
	error?: string
}

export class StagedAssetWorkflow {
	requests: Map<string, AssetGenRequest>
	results: Map<string, AssetGenResult[]>
	constructor() {
		this.requests = new Map()
		this.results = new Map()
	}
	genDesignOrder(creatureId: string): AssetGenRequest[] {
		return [
			{ creatureId, stage: LifeStage.Adult, typ: 'design' },
			{ creatureId, stage: LifeStage.Juvenile, typ: 'design', baseRef: `${creatureId}_adult_design` },
			{ creatureId, stage: LifeStage.Child, typ: 'design', baseRef: `${creatureId}_adult_design` },
			{ creatureId, stage: LifeStage.Infant, typ: 'design', baseRef: `${creatureId}_adult_design` }
		]
	}
	genModelOrder(creatureId: string): AssetGenRequest[] {
		return [
			{ creatureId, stage: LifeStage.Adult, typ: 'model', baseRef: `${creatureId}_adult_design` },
			{ creatureId, stage: LifeStage.Juvenile, typ: 'model', baseRef: `${creatureId}_juvenile_design` },
			{ creatureId, stage: LifeStage.Child, typ: 'model', baseRef: `${creatureId}_child_design` },
			{ creatureId, stage: LifeStage.Infant, typ: 'model', baseRef: `${creatureId}_infant_design` }
		]
	}
	genSingleStage(creatureId: string, stage: LifeStage, typ: 'design' | 'model'): AssetGenRequest {
		const baseRef = typ === 'design' && stage !== LifeStage.Adult
			? `${creatureId}_adult_design`
			: `${creatureId}_${stage}_design`
		return { creatureId, stage, typ, baseRef }
	}
	addResult(result: AssetGenResult) {
		const key = result.creatureId
		if (!this.results.has(key)) {
			this.results.set(key, [])
		}
		this.results.get(key)!.push(result)
	}
	getResults(creatureId: string): AssetGenResult[] {
		return this.results.get(creatureId) ?? []
	}
	isStageComplete(creatureId: string, stage: LifeStage): boolean {
		const results = this.getResults(creatureId)
		const stageResults = results.filter(r => r.stage === stage && r.success)
		return stageResults.some(r => r.typ === 'design') &&
			stageResults.some(r => r.typ === 'model') &&
			stageResults.some(r => r.typ === 'rig') &&
			stageResults.some(r => r.typ === 'anim')
	}
	isCreatureComplete(creatureId: string): boolean {
		return Object.values(LifeStage).every(stage =>
			this.isStageComplete(creatureId, stage as LifeStage)
		)
	}
}

export class AnimRegistry {
	anims: Map<string, AnimDef[]>
	creatures: Map<string, CreatureAssetMeta>
	stagedCreatures: Map<string, StagedCreatureAsset>

	constructor() {
		this.anims = new Map()
		this.creatures = new Map()
		this.stagedCreatures = new Map()
		this.iniDefaultAnims()
	}

	private iniDefaultAnims() {
		this.anims.set(LocomotionType.Serpent, SERPENT_ANIMS)
		this.anims.set(LocomotionType.Monopod, MONOPOD_ANIMS)
		this.anims.set(LocomotionType.Biped, BIPED_ANIMS)
		this.anims.set(LocomotionType.Tripod, TRIPOD_ANIMS)
		this.anims.set(LocomotionType.Quadruped, QUADRUPED_ANIMS)
		this.anims.set(LocomotionType.Hexapod, HEXAPOD_ANIMS)
		this.anims.set(LocomotionType.Octopod, OCTOPOD_ANIMS)
		this.anims.set(LocomotionType.Multipod, MULTIPOD_ANIMS)
		this.anims.set('floating', FLOATING_ANIMS)
		this.anims.set('winged', WINGED_ANIMS)
		this.anims.set('aquatic', AQUATIC_ANIMS)
		this.anims.set('amorphous', AMORPHOUS_ANIMS)
		this.anims.set('plantoid', PLANTOID_ANIMS)
		this.anims.set('infant', INFANT_ANIMS)
		this.anims.set('child', CHILD_ANIMS)
		this.anims.set('juvenile', JUVENILE_ANIMS)
		this.anims.set('adult', ADULT_ANIMS)
	}

	getAnims(key: string): AnimDef[] {
		return this.anims.get(key) ?? []
	}

	addCreature(meta: CreatureAssetMeta) {
		this.creatures.set(meta.id, meta)
	}

	getCreature(id: string): CreatureAssetMeta | undefined {
		return this.creatures.get(id)
	}

	getCreatureAnims(id: string): AnimDef[] {
		const meta = this.creatures.get(id)
		if (!meta) return []
		return getAllAnimsForCreature(meta.typ, meta.mods)
	}

	getAnimByName(creatureId: string, animName: string): AnimDef | undefined {
		const anims = this.getCreatureAnims(creatureId)
		return anims.find(a => a.name === animName)
	}

	getDmgFrame(creatureId: string, animName: string): number {
		const anim = this.getAnimByName(creatureId, animName)
		return anim?.dmgFrame ?? 0
	}

	addStagedCreature(asset: StagedCreatureAsset) {
		this.stagedCreatures.set(asset.id, asset)
	}

	getStagedCreature(id: string): StagedCreatureAsset | undefined {
		return this.stagedCreatures.get(id)
	}

	getStageAsset(creatureId: string, stage: LifeStage): LifeStageAsset | undefined {
		const staged = this.stagedCreatures.get(creatureId)
		return staged?.stages[stage]
	}

	getAnimsForStage(creatureId: string, stage: LifeStage): AnimDef[] {
		const meta = this.creatures.get(creatureId)
		if (!meta) return []
		const baseAnims = getAllAnimsForCreature(meta.typ, meta.mods)
		const stageAnims = ALL_STAGE_ANIMS.filter(a =>
			!a.stageOnly || a.stageOnly.includes(stage)
		)
		return [...baseAnims, ...stageAnims]
	}
}

export function getAnimsForStage(typ: LocomotionType, mods: LocomotionModifier[], stage: LifeStage): AnimDef[] {
	const baseAnims = getAllAnimsForCreature(typ, mods)
	const stageAnims = ALL_STAGE_ANIMS.filter(a =>
		!a.stageOnly || a.stageOnly.includes(stage)
	)
	return [...baseAnims, ...stageAnims]
}

export interface BoneTransform {
	pos: [number, number, number]
	rot: [number, number, number, number]
	scl: [number, number, number]
}

export function identityBoneTransform(): BoneTransform {
	return {
		pos: [0, 0, 0],
		rot: [0, 0, 0, 1],
		scl: [1, 1, 1]
	}
}

export function boneTransformToMtx(t: BoneTransform): Float32Array {
	const { pos, rot, scl } = t
	const [qx, qy, qz, qw] = rot
	const xx = qx * qx, yy = qy * qy, zz = qz * qz
	const xy = qx * qy, xz = qx * qz, yz = qy * qz
	const wx = qw * qx, wy = qw * qy, wz = qw * qz
	return new Float32Array([
		scl[0] * (1 - 2 * (yy + zz)), scl[0] * 2 * (xy + wz), scl[0] * 2 * (xz - wy), 0,
		scl[1] * 2 * (xy - wz), scl[1] * (1 - 2 * (xx + zz)), scl[1] * 2 * (yz + wx), 0,
		scl[2] * 2 * (xz + wy), scl[2] * 2 * (yz - wx), scl[2] * (1 - 2 * (xx + yy)), 0,
		pos[0], pos[1], pos[2], 1
	])
}

export function lerpBoneTransform(a: BoneTransform, b: BoneTransform, t: number): BoneTransform {
	const lerp = (x: number, y: number) => x + (y - x) * t
	return {
		pos: [lerp(a.pos[0], b.pos[0]), lerp(a.pos[1], b.pos[1]), lerp(a.pos[2], b.pos[2])],
		rot: slerpQuat(a.rot, b.rot, t),
		scl: [lerp(a.scl[0], b.scl[0]), lerp(a.scl[1], b.scl[1]), lerp(a.scl[2], b.scl[2])]
	}
}

function slerpQuat(a: [number, number, number, number], b: [number, number, number, number], t: number): [number, number, number, number] {
	let dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]
	const bx = dot < 0 ? -b[0] : b[0]
	const by = dot < 0 ? -b[1] : b[1]
	const bz = dot < 0 ? -b[2] : b[2]
	const bw = dot < 0 ? -b[3] : b[3]
	dot = Math.abs(dot)
	if (dot > 0.9995) {
		return [
			a[0] + t * (bx - a[0]),
			a[1] + t * (by - a[1]),
			a[2] + t * (bz - a[2]),
			a[3] + t * (bw - a[3])
		]
	}
	const theta = Math.acos(dot)
	const sinTheta = Math.sin(theta)
	const wa = Math.sin((1 - t) * theta) / sinTheta
	const wb = Math.sin(t * theta) / sinTheta
	return [
		wa * a[0] + wb * bx,
		wa * a[1] + wb * by,
		wa * a[2] + wb * bz,
		wa * a[3] + wb * bw
	]
}

export function mulMtx4(a: Float32Array, b: Float32Array): Float32Array {
	const out = new Float32Array(16)
	for (let i = 0; i < 4; i++) {
		for (let j = 0; j < 4; j++) {
			let sum = 0
			for (let k = 0; k < 4; k++) {
				sum += a[i * 4 + k] * b[k * 4 + j]
			}
			out[i * 4 + j] = sum
		}
	}
	return out
}

export function invertMtx4(m: Float32Array): Float32Array {
	const out = new Float32Array(16)
	const m00 = m[0], m01 = m[1], m02 = m[2], m03 = m[3]
	const m10 = m[4], m11 = m[5], m12 = m[6], m13 = m[7]
	const m20 = m[8], m21 = m[9], m22 = m[10], m23 = m[11]
	const m30 = m[12], m31 = m[13], m32 = m[14], m33 = m[15]
	const b00 = m00 * m11 - m01 * m10
	const b01 = m00 * m12 - m02 * m10
	const b02 = m00 * m13 - m03 * m10
	const b03 = m01 * m12 - m02 * m11
	const b04 = m01 * m13 - m03 * m11
	const b05 = m02 * m13 - m03 * m12
	const b06 = m20 * m31 - m21 * m30
	const b07 = m20 * m32 - m22 * m30
	const b08 = m20 * m33 - m23 * m30
	const b09 = m21 * m32 - m22 * m31
	const b10 = m21 * m33 - m23 * m31
	const b11 = m22 * m33 - m23 * m32
	let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06
	if (!det) return out
	det = 1.0 / det
	out[0] = (m11 * b11 - m12 * b10 + m13 * b09) * det
	out[1] = (m02 * b10 - m01 * b11 - m03 * b09) * det
	out[2] = (m31 * b05 - m32 * b04 + m33 * b03) * det
	out[3] = (m22 * b04 - m21 * b05 - m23 * b03) * det
	out[4] = (m12 * b08 - m10 * b11 - m13 * b07) * det
	out[5] = (m00 * b11 - m02 * b08 + m03 * b07) * det
	out[6] = (m32 * b02 - m30 * b05 - m33 * b01) * det
	out[7] = (m20 * b05 - m22 * b02 + m23 * b01) * det
	out[8] = (m10 * b10 - m11 * b08 + m13 * b06) * det
	out[9] = (m01 * b08 - m00 * b10 - m03 * b06) * det
	out[10] = (m30 * b04 - m31 * b02 + m33 * b00) * det
	out[11] = (m21 * b02 - m20 * b04 - m23 * b00) * det
	out[12] = (m11 * b07 - m10 * b09 - m12 * b06) * det
	out[13] = (m00 * b09 - m01 * b07 + m02 * b06) * det
	out[14] = (m31 * b01 - m30 * b03 - m32 * b00) * det
	out[15] = (m20 * b03 - m21 * b01 + m22 * b00) * det
	return out
}
