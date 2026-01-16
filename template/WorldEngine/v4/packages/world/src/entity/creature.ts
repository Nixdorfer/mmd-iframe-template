import {
	type EntityId, type Vec3, LocomotionType, LocomotionModifier,
	ColliderType, RigidBodyType,
	getAllAnimsForCreature, getFullBoneList, type AnimDef,
	LifeStage, STAGE_SCALE_DEFAULTS, STAGE_STAT_MODS, getAnimsForStage
} from '@engine/common'
import { type EntityDef, type EntityInstance, EntityLayer } from './entity'
import { type AIMgr } from '../ai/ai-mgr'

export interface StageModelPaths {
	model: string
	tex: string
	rig: string
}

export interface CreatureTemplate {
	id: string
	name: string
	base: LocomotionType
	mods: LocomotionModifier[]
	variant: 'mammal' | 'reptile' | 'avian' | 'insect' | 'aquatic' | 'fantasy' | 'plant' | 'elemental'
	size: 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'colossal'
	stats: CreatureStats
	abilities: string[]
	drops: DropEntry[]
	spawnBiomes: string[]
	rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
	stageModels?: Partial<Record<LifeStage, StageModelPaths>>
	maturityTime?: number
}

export interface CreatureStats {
	hp: number
	atk: number
	def: number
	spd: number
	xp: number
}

export interface DropEntry {
	item: string
	chance: number
	minCnt: number
	maxCnt: number
}

export interface CreatureInstance extends EntityInstance {
	templateId: string
	aiState: AIState
	target: EntityId | null
	homePos: Vec3
	wanderRadius: number
	aggroRadius: number
	leashRadius: number
	curAttack: string | null
	attackCd: number
	stage: LifeStage
	stageAge: number
	parentId: EntityId | null
	btId: string | null
	perceptionCfgId: string
	flockGroupId: string | null
}

export interface AIState {
	state: 'idle' | 'wander' | 'chase' | 'attack' | 'flee' | 'return'
	stateTime: number
	lastPos: Vec3
	stuckTime: number
}

const SIZE_MULTIPLIERS: Record<string, { scale: number; hp: number; atk: number; radius: number }> = {
	tiny: { scale: 0.3, hp: 0.3, atk: 0.5, radius: 0.2 },
	small: { scale: 0.6, hp: 0.6, atk: 0.7, radius: 0.4 },
	medium: { scale: 1.0, hp: 1.0, atk: 1.0, radius: 0.5 },
	large: { scale: 1.5, hp: 1.8, atk: 1.5, radius: 1.0 },
	huge: { scale: 2.5, hp: 3.0, atk: 2.0, radius: 2.0 },
	colossal: { scale: 5.0, hp: 6.0, atk: 3.0, radius: 4.0 }
}

export class CreatureFactory {
	templates: Map<string, CreatureTemplate>
	entityLayer: EntityLayer
	creatures: Map<EntityId, CreatureInstance>
	nxtId: number
	aiMgr: AIMgr | null

	constructor(entityLayer: EntityLayer) {
		this.templates = new Map()
		this.entityLayer = entityLayer
		this.creatures = new Map()
		this.nxtId = 1
		this.aiMgr = null
		this.iniDefaultTemplates()
	}

	setAIMgr(aiMgr: AIMgr): void {
		this.aiMgr = aiMgr
	}

	private iniDefaultTemplates() {
		this.addTemplate({
			id: 'wolf',
			name: '狼',
			base: LocomotionType.Quadruped,
			mods: [],
			variant: 'mammal',
			size: 'medium',
			stats: { hp: 60, atk: 15, def: 5, spd: 8, xp: 20 },
			abilities: ['bite', 'howl'],
			drops: [{ item: 'wolf_pelt', chance: 0.5, minCnt: 1, maxCnt: 1 }],
			spawnBiomes: ['forest', 'plains', 'tundra'],
			rarity: 'common'
		})
		this.addTemplate({
			id: 'bear',
			name: '熊',
			base: LocomotionType.Quadruped,
			mods: [],
			variant: 'mammal',
			size: 'large',
			stats: { hp: 150, atk: 25, def: 10, spd: 5, xp: 50 },
			abilities: ['claw', 'charge'],
			drops: [
				{ item: 'bear_pelt', chance: 0.6, minCnt: 1, maxCnt: 1 },
				{ item: 'bear_claw', chance: 0.3, minCnt: 1, maxCnt: 2 }
			],
			spawnBiomes: ['forest', 'mountain'],
			rarity: 'uncommon'
		})
		this.addTemplate({
			id: 'dragon',
			name: '龙',
			base: LocomotionType.Quadruped,
			mods: [LocomotionModifier.Winged],
			variant: 'reptile',
			size: 'huge',
			stats: { hp: 500, atk: 80, def: 40, spd: 10, xp: 300 },
			abilities: ['fire_breath', 'tail_sweep', 'fly'],
			drops: [
				{ item: 'dragon_scale', chance: 0.8, minCnt: 2, maxCnt: 5 },
				{ item: 'dragon_heart', chance: 0.1, minCnt: 1, maxCnt: 1 }
			],
			spawnBiomes: ['mountain', 'volcano'],
			rarity: 'legendary'
		})
		this.addTemplate({
			id: 'snake',
			name: '蛇',
			base: LocomotionType.Serpent,
			mods: [],
			variant: 'reptile',
			size: 'small',
			stats: { hp: 30, atk: 10, def: 2, spd: 6, xp: 10 },
			abilities: ['bite', 'poison'],
			drops: [{ item: 'snake_venom', chance: 0.4, minCnt: 1, maxCnt: 1 }],
			spawnBiomes: ['swamp', 'desert', 'forest'],
			rarity: 'common'
		})
		this.addTemplate({
			id: 'spider',
			name: '蜘蛛',
			base: LocomotionType.Octopod,
			mods: [],
			variant: 'insect',
			size: 'small',
			stats: { hp: 40, atk: 12, def: 3, spd: 7, xp: 15 },
			abilities: ['bite', 'web'],
			drops: [{ item: 'spider_silk', chance: 0.6, minCnt: 1, maxCnt: 3 }],
			spawnBiomes: ['cave', 'forest', 'dungeon'],
			rarity: 'common'
		})
		this.addTemplate({
			id: 'slime',
			name: '史莱姆',
			base: LocomotionType.Monopod,
			mods: [],
			variant: 'fantasy',
			size: 'small',
			stats: { hp: 20, atk: 5, def: 1, spd: 3, xp: 5 },
			abilities: ['bounce', 'split'],
			drops: [{ item: 'slime_gel', chance: 0.8, minCnt: 1, maxCnt: 2 }],
			spawnBiomes: ['cave', 'dungeon', 'swamp'],
			rarity: 'common'
		})
		this.addTemplate({
			id: 'eagle',
			name: '鹰',
			base: LocomotionType.Biped,
			mods: [LocomotionModifier.Winged],
			variant: 'avian',
			size: 'medium',
			stats: { hp: 50, atk: 18, def: 4, spd: 12, xp: 25 },
			abilities: ['dive', 'claw'],
			drops: [{ item: 'eagle_feather', chance: 0.7, minCnt: 1, maxCnt: 3 }],
			spawnBiomes: ['mountain', 'plains'],
			rarity: 'uncommon'
		})
		this.addTemplate({
			id: 'ghost',
			name: '幽灵',
			base: LocomotionType.Biped,
			mods: [LocomotionModifier.Floating],
			variant: 'fantasy',
			size: 'medium',
			stats: { hp: 70, atk: 20, def: 0, spd: 6, xp: 35 },
			abilities: ['phase', 'drain'],
			drops: [{ item: 'ectoplasm', chance: 0.5, minCnt: 1, maxCnt: 1 }],
			spawnBiomes: ['dungeon', 'ruins', 'cave'],
			rarity: 'rare'
		})
		this.addTemplate({
			id: 'centipede',
			name: '蜈蚣',
			base: LocomotionType.Multipod,
			mods: [],
			variant: 'insect',
			size: 'medium',
			stats: { hp: 80, atk: 16, def: 8, spd: 9, xp: 30 },
			abilities: ['bite', 'coil', 'poison'],
			drops: [{ item: 'chitin', chance: 0.6, minCnt: 2, maxCnt: 4 }],
			spawnBiomes: ['cave', 'dungeon'],
			rarity: 'uncommon'
		})
		this.addTemplate({
			id: 'shark',
			name: '鲨鱼',
			base: LocomotionType.Serpent,
			mods: [],
			variant: 'aquatic',
			size: 'large',
			stats: { hp: 120, atk: 30, def: 8, spd: 12, xp: 45 },
			abilities: ['bite', 'ram', 'frenzy'],
			drops: [
				{ item: 'shark_tooth', chance: 0.7, minCnt: 1, maxCnt: 3 },
				{ item: 'shark_fin', chance: 0.3, minCnt: 1, maxCnt: 1 }
			],
			spawnBiomes: ['ocean', 'coast'],
			rarity: 'uncommon',
			maturityTime: 7200
		})
		this.addTemplate({
			id: 'kraken',
			name: '海妖',
			base: LocomotionType.Octopod,
			mods: [],
			variant: 'aquatic',
			size: 'colossal',
			stats: { hp: 800, atk: 100, def: 50, spd: 6, xp: 500 },
			abilities: ['grab', 'crush', 'ink', 'summon_tentacle'],
			drops: [
				{ item: 'kraken_ink', chance: 0.9, minCnt: 3, maxCnt: 8 },
				{ item: 'kraken_eye', chance: 0.1, minCnt: 1, maxCnt: 1 }
			],
			spawnBiomes: ['deep_ocean'],
			rarity: 'legendary',
			maturityTime: 36000
		})
		this.addTemplate({
			id: 'treant',
			name: '树人',
			base: LocomotionType.Biped,
			mods: [],
			variant: 'plant',
			size: 'huge',
			stats: { hp: 300, atk: 40, def: 35, spd: 3, xp: 100 },
			abilities: ['slam', 'root', 'regrowth'],
			drops: [
				{ item: 'ancient_wood', chance: 0.8, minCnt: 2, maxCnt: 5 },
				{ item: 'nature_essence', chance: 0.2, minCnt: 1, maxCnt: 1 }
			],
			spawnBiomes: ['ancient_forest', 'enchanted_grove'],
			rarity: 'rare',
			maturityTime: 14400
		})
		this.addTemplate({
			id: 'mushroom',
			name: '蘑菇怪',
			base: LocomotionType.Monopod,
			mods: [],
			variant: 'plant',
			size: 'small',
			stats: { hp: 25, atk: 8, def: 2, spd: 4, xp: 8 },
			abilities: ['spore', 'poison'],
			drops: [{ item: 'mushroom_cap', chance: 0.9, minCnt: 1, maxCnt: 2 }],
			spawnBiomes: ['cave', 'swamp', 'forest'],
			rarity: 'common',
			maturityTime: 1800
		})
		this.addTemplate({
			id: 'fire_elemental',
			name: '火元素',
			base: LocomotionType.Biped,
			mods: [LocomotionModifier.Floating],
			variant: 'elemental',
			size: 'medium',
			stats: { hp: 90, atk: 35, def: 5, spd: 8, xp: 40 },
			abilities: ['fireball', 'burn', 'explosion'],
			drops: [
				{ item: 'fire_essence', chance: 0.6, minCnt: 1, maxCnt: 2 },
				{ item: 'ember', chance: 0.8, minCnt: 2, maxCnt: 4 }
			],
			spawnBiomes: ['volcano', 'fire_temple'],
			rarity: 'rare',
			maturityTime: 3600
		})
		this.addTemplate({
			id: 'ice_golem',
			name: '冰魔像',
			base: LocomotionType.Biped,
			mods: [],
			variant: 'elemental',
			size: 'large',
			stats: { hp: 200, atk: 25, def: 30, spd: 4, xp: 60 },
			abilities: ['frost', 'freeze', 'shatter'],
			drops: [
				{ item: 'ice_crystal', chance: 0.7, minCnt: 2, maxCnt: 4 },
				{ item: 'frost_core', chance: 0.15, minCnt: 1, maxCnt: 1 }
			],
			spawnBiomes: ['tundra', 'ice_cave', 'frozen_peak'],
			rarity: 'rare',
			maturityTime: 7200
		})
		this.addTemplate({
			id: 'scorpion',
			name: '蝎子',
			base: LocomotionType.Octopod,
			mods: [],
			variant: 'insect',
			size: 'small',
			stats: { hp: 35, atk: 14, def: 6, spd: 6, xp: 12 },
			abilities: ['sting', 'claw', 'poison'],
			drops: [
				{ item: 'scorpion_venom', chance: 0.5, minCnt: 1, maxCnt: 1 },
				{ item: 'scorpion_tail', chance: 0.3, minCnt: 1, maxCnt: 1 }
			],
			spawnBiomes: ['desert', 'cave'],
			rarity: 'common',
			maturityTime: 2400
		})
		this.addTemplate({
			id: 'phoenix',
			name: '凤凰',
			base: LocomotionType.Biped,
			mods: [LocomotionModifier.Winged],
			variant: 'fantasy',
			size: 'large',
			stats: { hp: 350, atk: 60, def: 20, spd: 14, xp: 200 },
			abilities: ['fireball', 'dive', 'rebirth', 'flame_aura'],
			drops: [
				{ item: 'phoenix_feather', chance: 0.9, minCnt: 2, maxCnt: 5 },
				{ item: 'phoenix_ash', chance: 0.3, minCnt: 1, maxCnt: 1 }
			],
			spawnBiomes: ['volcano', 'sky_temple'],
			rarity: 'epic',
			maturityTime: 10800
		})
		this.addTemplate({
			id: 'wyvern',
			name: '飞龙',
			base: LocomotionType.Biped,
			mods: [LocomotionModifier.Winged],
			variant: 'reptile',
			size: 'large',
			stats: { hp: 180, atk: 45, def: 18, spd: 11, xp: 80 },
			abilities: ['claw', 'dive', 'tail_whip', 'screech'],
			drops: [
				{ item: 'wyvern_scale', chance: 0.7, minCnt: 1, maxCnt: 3 },
				{ item: 'wyvern_wing', chance: 0.2, minCnt: 1, maxCnt: 1 }
			],
			spawnBiomes: ['mountain', 'cliff', 'canyon'],
			rarity: 'uncommon',
			maturityTime: 5400
		})
		this.addTemplate({
			id: 'dire_wolf',
			name: '恐狼',
			base: LocomotionType.Quadruped,
			mods: [],
			variant: 'mammal',
			size: 'large',
			stats: { hp: 100, atk: 28, def: 10, spd: 10, xp: 35 },
			abilities: ['bite', 'howl', 'pack_tactics'],
			drops: [
				{ item: 'dire_wolf_pelt', chance: 0.6, minCnt: 1, maxCnt: 1 },
				{ item: 'fang', chance: 0.4, minCnt: 1, maxCnt: 2 }
			],
			spawnBiomes: ['tundra', 'mountain', 'dark_forest'],
			rarity: 'uncommon',
			maturityTime: 4800
		})
		this.addTemplate({
			id: 'turtle',
			name: '龟',
			base: LocomotionType.Quadruped,
			mods: [],
			variant: 'reptile',
			size: 'medium',
			stats: { hp: 100, atk: 10, def: 25, spd: 2, xp: 20 },
			abilities: ['shell_defense', 'bite'],
			drops: [{ item: 'turtle_shell', chance: 0.4, minCnt: 1, maxCnt: 1 }],
			spawnBiomes: ['swamp', 'coast', 'river'],
			rarity: 'common',
			maturityTime: 9000
		})
		this.addTemplate({
			id: 'mantis',
			name: '螳螂',
			base: LocomotionType.Hexapod,
			mods: [],
			variant: 'insect',
			size: 'small',
			stats: { hp: 30, atk: 18, def: 3, spd: 9, xp: 15 },
			abilities: ['slash', 'ambush', 'leap'],
			drops: [{ item: 'mantis_claw', chance: 0.5, minCnt: 1, maxCnt: 2 }],
			spawnBiomes: ['forest', 'jungle', 'plains'],
			rarity: 'common',
			maturityTime: 1800
		})
		this.addTemplate({
			id: 'beetle',
			name: '甲虫',
			base: LocomotionType.Hexapod,
			mods: [],
			variant: 'insect',
			size: 'tiny',
			stats: { hp: 15, atk: 5, def: 8, spd: 4, xp: 5 },
			abilities: ['ram', 'shell'],
			drops: [{ item: 'beetle_shell', chance: 0.6, minCnt: 1, maxCnt: 1 }],
			spawnBiomes: ['forest', 'cave', 'plains'],
			rarity: 'common',
			maturityTime: 1200
		})
		this.addTemplate({
			id: 'hydra',
			name: '九头蛇',
			base: LocomotionType.Serpent,
			mods: [],
			variant: 'fantasy',
			size: 'huge',
			stats: { hp: 450, atk: 55, def: 25, spd: 5, xp: 250 },
			abilities: ['multi_bite', 'poison', 'regenerate', 'head_regrow'],
			drops: [
				{ item: 'hydra_scale', chance: 0.8, minCnt: 3, maxCnt: 6 },
				{ item: 'hydra_blood', chance: 0.4, minCnt: 1, maxCnt: 2 }
			],
			spawnBiomes: ['swamp', 'cave', 'dungeon'],
			rarity: 'epic',
			maturityTime: 14400
		})
		this.addTemplate({
			id: 'unicorn',
			name: '独角兽',
			base: LocomotionType.Quadruped,
			mods: [],
			variant: 'fantasy',
			size: 'medium',
			stats: { hp: 120, atk: 20, def: 15, spd: 14, xp: 60 },
			abilities: ['charge', 'heal', 'purify'],
			drops: [
				{ item: 'unicorn_hair', chance: 0.6, minCnt: 1, maxCnt: 3 },
				{ item: 'unicorn_horn', chance: 0.05, minCnt: 1, maxCnt: 1 }
			],
			spawnBiomes: ['enchanted_grove', 'meadow'],
			rarity: 'rare',
			maturityTime: 7200
		})
		this.addTemplate({
			id: 'griffin',
			name: '狮鹫',
			base: LocomotionType.Quadruped,
			mods: [LocomotionModifier.Winged],
			variant: 'fantasy',
			size: 'large',
			stats: { hp: 160, atk: 40, def: 15, spd: 12, xp: 70 },
			abilities: ['claw', 'dive', 'screech', 'pounce'],
			drops: [
				{ item: 'griffin_feather', chance: 0.7, minCnt: 2, maxCnt: 4 },
				{ item: 'griffin_claw', chance: 0.3, minCnt: 1, maxCnt: 2 }
			],
			spawnBiomes: ['mountain', 'cliff', 'sky_temple'],
			rarity: 'rare',
			maturityTime: 6000
		})
	}

	addTemplate(template: CreatureTemplate) {
		this.templates.set(template.id, template)
	}

	getTemplate(id: string): CreatureTemplate | undefined {
		return this.templates.get(id)
	}

	spawn(templateId: string, pos: Vec3, level: number = 1, stage: LifeStage = LifeStage.Adult, parentId: EntityId | null = null): EntityId {
		const template = this.templates.get(templateId)
		if (!template) return 0
		const sizeMod = SIZE_MULTIPLIERS[template.size]
		const stageScale = STAGE_SCALE_DEFAULTS[stage]
		const stageMod = STAGE_STAT_MODS[stage]
		const finalScale = sizeMod.scale * stageScale
		const finalRadius = sizeMod.radius * stageScale
		const entDef: EntityDef = {
			id: `creature_${templateId}_${stage}_${this.nxtId}`,
			name: this.getStageName(template.name, stage),
			typ: { base: template.base, mods: template.mods },
			baseHp: Math.floor(template.stats.hp * sizeMod.hp * stageMod.hp * (1 + (level - 1) * 0.1)),
			baseAtk: Math.floor(template.stats.atk * sizeMod.atk * stageMod.atk * (1 + (level - 1) * 0.05)),
			baseDef: Math.floor(template.stats.def * stageMod.def * (1 + (level - 1) * 0.05)),
			baseSpd: Math.floor(template.stats.spd * stageMod.spd),
			collider: {
				typ: ColliderType.Capsule,
				offset: { x: 0, y: 0, z: finalRadius },
				size: { x: finalRadius * 2, y: finalRadius * 2, z: finalScale },
				radius: finalRadius,
				height: finalScale,
				isTrg: false
			},
			rigidBody: {
				typ: RigidBodyType.Dynamic,
				mass: finalScale * 50,
				vel: { x: 0, y: 0, z: 0 },
				angVel: { x: 0, y: 0, z: 0 },
				drag: 0.1,
				angDrag: 0.05,
				gravityScl: template.mods.includes(LocomotionModifier.Floating) ? 0 : 1.0
			},
			anims: getAnimsForStage(template.base, template.mods, stage).map(a => a.name),
			tags: [template.variant, template.rarity, stage, ...template.abilities]
		}
		this.entityLayer.addDef(entDef)
		const entId = this.entityLayer.spawn(entDef.id, pos)
		const ent = this.entityLayer.get(entId)
		if (ent) {
			ent.level = level
			const creature: CreatureInstance = {
				...ent,
				templateId,
				aiState: {
					state: 'idle',
					stateTime: 0,
					lastPos: { ...pos },
					stuckTime: 0
				},
				target: null,
				homePos: { ...pos },
				wanderRadius: stage === LifeStage.Infant ? 5 : stage === LifeStage.Child ? 10 : 20,
				aggroRadius: stage === LifeStage.Adult ? 15 : stage === LifeStage.Juvenile ? 10 : 0,
				leashRadius: 40,
				curAttack: null,
				attackCd: 0,
				stage,
				stageAge: 0,
				parentId,
				btId: null,
				perceptionCfgId: 'default',
				flockGroupId: null
			}
			this.creatures.set(entId, creature)
			if (this.aiMgr) {
				this.aiMgr.registerEntity(entId, null, 'default')
				this.aiMgr.setBlackboardValue(entId, 'speed', template.stats.spd)
			}
		}
		this.nxtId++
		return entId
	}

	private getStageName(baseName: string, stage: LifeStage): string {
		switch (stage) {
			case LifeStage.Infant: return `幼崽${baseName}`
			case LifeStage.Child: return `幼年${baseName}`
			case LifeStage.Juvenile: return `少年${baseName}`
			default: return baseName
		}
	}

	getCreature(id: EntityId): CreatureInstance | undefined {
		return this.creatures.get(id)
	}

	despawn(id: EntityId) {
		if (this.aiMgr) {
			this.aiMgr.unregisterEntity(id)
		}
		this.creatures.delete(id)
		this.entityLayer.despawn(id)
	}

	getAnims(templateId: string): AnimDef[] {
		const template = this.templates.get(templateId)
		if (!template) return []
		return getAllAnimsForCreature(template.base, template.mods)
	}

	getBones(templateId: string): string[] {
		const template = this.templates.get(templateId)
		if (!template) return []
		return getFullBoneList(template.base, template.mods)
	}

	calDrops(templateId: string): { item: string; cnt: number }[] {
		const template = this.templates.get(templateId)
		if (!template) return []
		const result: { item: string; cnt: number }[] = []
		for (const drop of template.drops) {
			if (Math.random() < drop.chance) {
				const cnt = drop.minCnt + Math.floor(Math.random() * (drop.maxCnt - drop.minCnt + 1))
				result.push({ item: drop.item, cnt })
			}
		}
		return result
	}

	upd(dt: number) {
		if (this.aiMgr) {
			this.aiMgr.upd(dt)
		}
		for (const creature of this.creatures.values()) {
			if (!creature.alive) continue
			creature.aiState.stateTime += dt
			creature.attackCd = Math.max(0, creature.attackCd - dt)
			creature.stageAge += dt
			this.checkStageGrowth(creature)
			if (!creature.btId) {
				this.updAI(creature, dt)
			}
		}
	}

	private checkStageGrowth(creature: CreatureInstance) {
		const template = this.templates.get(creature.templateId)
		if (!template || creature.stage === LifeStage.Adult) return
		const maturityTime = template.maturityTime ?? 3600
		const stageThreshold = maturityTime / 3
		let nxtStage: LifeStage | null = null
		if (creature.stage === LifeStage.Infant && creature.stageAge >= stageThreshold) {
			nxtStage = LifeStage.Child
		} else if (creature.stage === LifeStage.Child && creature.stageAge >= stageThreshold * 2) {
			nxtStage = LifeStage.Juvenile
		} else if (creature.stage === LifeStage.Juvenile && creature.stageAge >= stageThreshold * 3) {
			nxtStage = LifeStage.Adult
		}
		if (nxtStage) {
			this.growToStage(creature.id, nxtStage)
		}
	}

	growToStage(creatureId: EntityId, newStage: LifeStage) {
		const creature = this.creatures.get(creatureId)
		if (!creature) return
		const template = this.templates.get(creature.templateId)
		if (!template) return
		const ent = this.entityLayer.get(creatureId)
		if (!ent) return
		const sizeMod = SIZE_MULTIPLIERS[template.size]
		const stageScale = STAGE_SCALE_DEFAULTS[newStage]
		const stageMod = STAGE_STAT_MODS[newStage]
		const finalScale = sizeMod.scale * stageScale
		const finalRadius = sizeMod.radius * stageScale
		ent.maxHp = Math.floor(template.stats.hp * sizeMod.hp * stageMod.hp * (1 + (ent.level - 1) * 0.1))
		ent.hp = Math.min(ent.hp, ent.maxHp)
		ent.atk = Math.floor(template.stats.atk * sizeMod.atk * stageMod.atk * (1 + (ent.level - 1) * 0.05))
		ent.def = Math.floor(template.stats.def * stageMod.def * (1 + (ent.level - 1) * 0.05))
		ent.spd = Math.floor(template.stats.spd * stageMod.spd)
		ent.transform.scl = { x: finalScale, y: finalScale, z: finalScale }
		creature.stage = newStage
		creature.wanderRadius = newStage === LifeStage.Infant ? 5 : newStage === LifeStage.Child ? 10 : 20
		creature.aggroRadius = newStage === LifeStage.Adult ? 15 : newStage === LifeStage.Juvenile ? 10 : 0
		if (newStage === LifeStage.Adult) {
			creature.parentId = null
		}
	}

	getStage(creatureId: EntityId): LifeStage | undefined {
		return this.creatures.get(creatureId)?.stage
	}

	getByStage(stage: LifeStage): CreatureInstance[] {
		const result: CreatureInstance[] = []
		for (const creature of this.creatures.values()) {
			if (creature.stage === stage) {
				result.push(creature)
			}
		}
		return result
	}

	getOffspring(parentId: EntityId): CreatureInstance[] {
		const result: CreatureInstance[] = []
		for (const creature of this.creatures.values()) {
			if (creature.parentId === parentId) {
				result.push(creature)
			}
		}
		return result
	}

	spawnFamily(templateId: string, pos: Vec3, level: number = 1): EntityId[] {
		const ids: EntityId[] = []
		const adultId = this.spawn(templateId, pos, level, LifeStage.Adult)
		ids.push(adultId)
		const childCount = 1 + Math.floor(Math.random() * 3)
		for (let i = 0; i < childCount; i++) {
			const offset = { x: (Math.random() - 0.5) * 5, y: (Math.random() - 0.5) * 5, z: 0 }
			const childPos = { x: pos.x + offset.x, y: pos.y + offset.y, z: pos.z }
			const childStage = Math.random() < 0.5 ? LifeStage.Infant : LifeStage.Child
			ids.push(this.spawn(templateId, childPos, level, childStage, adultId))
		}
		return ids
	}

	private updAI(creature: CreatureInstance, dt: number) {
		const ent = this.entityLayer.get(creature.id)
		if (!ent) return
		switch (creature.aiState.state) {
			case 'idle':
				if (creature.aiState.stateTime > 2 + Math.random() * 3) {
					creature.aiState.state = 'wander'
					creature.aiState.stateTime = 0
				}
				break
			case 'wander':
				if (creature.aiState.stateTime > 5) {
					creature.aiState.state = 'idle'
					creature.aiState.stateTime = 0
				}
				break
			case 'chase':
				if (creature.target) {
					const target = this.entityLayer.get(creature.target)
					if (!target || !target.alive) {
						creature.target = null
						creature.aiState.state = 'return'
						creature.aiState.stateTime = 0
					}
				}
				break
			case 'attack':
				if (creature.aiState.stateTime > 1) {
					creature.aiState.state = 'chase'
					creature.aiState.stateTime = 0
				}
				break
			case 'flee':
				if (creature.aiState.stateTime > 5) {
					creature.aiState.state = 'return'
					creature.aiState.stateTime = 0
				}
				break
			case 'return':
				const dx = creature.homePos.x - ent.transform.pos.x
				const dy = creature.homePos.y - ent.transform.pos.y
				if (dx * dx + dy * dy < 4) {
					creature.aiState.state = 'idle'
					creature.aiState.stateTime = 0
				}
				break
		}
	}

	setTarget(creatureId: EntityId, targetId: EntityId) {
		const creature = this.creatures.get(creatureId)
		if (creature) {
			creature.target = targetId
			creature.aiState.state = 'chase'
			creature.aiState.stateTime = 0
		}
	}

	clearTarget(creatureId: EntityId) {
		const creature = this.creatures.get(creatureId)
		if (creature) {
			creature.target = null
			creature.aiState.state = 'return'
			creature.aiState.stateTime = 0
		}
	}

	getByBiome(biome: string): CreatureTemplate[] {
		const result: CreatureTemplate[] = []
		for (const template of this.templates.values()) {
			if (template.spawnBiomes.includes(biome)) {
				result.push(template)
			}
		}
		return result
	}

	getByRarity(rarity: string): CreatureTemplate[] {
		const result: CreatureTemplate[] = []
		for (const template of this.templates.values()) {
			if (template.rarity === rarity) {
				result.push(template)
			}
		}
		return result
	}

	setBehaviorTree(creatureId: EntityId, btId: string | null): void {
		const creature = this.creatures.get(creatureId)
		if (creature) {
			creature.btId = btId
			if (this.aiMgr) {
				this.aiMgr.setEntityBT(creatureId, btId)
			}
		}
	}

	setPerceptionCfg(creatureId: EntityId, cfgId: string): void {
		const creature = this.creatures.get(creatureId)
		if (creature) {
			creature.perceptionCfgId = cfgId
		}
	}

	joinFlock(creatureId: EntityId, groupId: string): void {
		const creature = this.creatures.get(creatureId)
		if (creature && this.aiMgr) {
			creature.flockGroupId = groupId
			this.aiMgr.addToFlock(creatureId, groupId)
		}
	}

	leaveFlock(creatureId: EntityId): void {
		const creature = this.creatures.get(creatureId)
		if (creature && this.aiMgr) {
			creature.flockGroupId = null
			this.aiMgr.removeFromFlock(creatureId)
		}
	}
}
