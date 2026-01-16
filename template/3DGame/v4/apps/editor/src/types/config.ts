export interface LawConfig {
	enabled: boolean
	costType: 'health' | 'lifespan' | 'soul' | 'karma' | 'resource' | 'permanent'
	costAmount: number
	costReduction: number
	exemptTags: string[]
}

export interface CombatRules {
	friendlyFire: boolean
	pvp: boolean
	levelScaling: boolean
	resistanceCap: number
	dodgeCap: number
	critMul: number
	damageFormula: string
}

export interface DeathRules {
	permaDeath: boolean
	expLoss: number
	itemDrop: boolean
	respawnDelay: number
	respawnLoc: 'checkpoint' | 'home' | 'death'
	soulRecovery: boolean
}

export interface ProgressionRules {
	levelCap: number
	expCurve: 'linear' | 'exponential' | 'logarithmic'
	skillPerLevel: number
	attrPerLevel: number
	canRespec: boolean
	respecCost: number
}

export interface EconomyRules {
	tradeTax: number
	inflation: number
	maxInventory: number
	bankInterest: number
}

export interface SocialRules {
	maxParty: number
	maxGuild: number
	marriage: boolean
}

export interface RulesConfig {
	combat: CombatRules
	death: DeathRules
	progression: ProgressionRules
	economy: EconomyRules
	social: SocialRules
}

export interface PhysicsConfig {
	gravityX: number
	gravityY: number
	gravityZ: number
	maxSubSteps: number
	tps: number
	sleepEnabled: boolean
	defaultRestitution: number
	defaultFriction: number
	solverIterations: number
	broadphaseMargin: number
	ccdEnabled: boolean
	ccdVelThreshold: number
}

export interface RenderConfig {
	mode: 'realistic' | 'acrylic' | 'anime'
	shadowIntensity: number
	aoStrength: number
	specularPower: number
	rimPower: number
	smoothness: number
	steps: number
	outlineWidth: number
	outlineColor: string
	outlineEntity: boolean
	outlineTerrain: boolean
}

export interface CameraConfig {
	fov: number
	near: number
	far: number
}

export interface PostProcessConfig {
	shadow: {
		enabled: boolean
		resolution: number
		bias: number
		intensity: number
		cascades: number
		distance: number
	}
	ssao: {
		enabled: boolean
		radius: number
		intensity: number
		samples: number
		bias: number
	}
	bloom: {
		enabled: boolean
		threshold: number
		intensity: number
		radius: number
	}
	gi: {
		enabled: boolean
		intensity: number
		probeSpacing: number
	}
	fog: {
		enabled: boolean
		type: number
		density: number
		start: number
		end: number
		color: string
	}
	volumetric: {
		enabled: boolean
		intensity: number
		samples: number
	}
	tonemap: {
		enabled: boolean
		exposure: number
		gamma: number
		contrast: number
		saturation: number
	}
	ssr: {
		enabled: boolean
		maxSteps: number
		thickness: number
	}
	dof: {
		enabled: boolean
		focusDist: number
		aperture: number
	}
}

export interface LODConfig {
	enabled: boolean
	tier: number
	distMul: number
	maxInstances: number
	cullDist: number
}

export interface PhysicsAdvancedConfig {
	ragdoll: {
		enabled: boolean
		damping: number
	}
	cloth: {
		enabled: boolean
		iterations: number
		stiffness: number
	}
	fluid: {
		enabled: boolean
		viscosity: number
		density: number
	}
	rope: {
		enabled: boolean
		segments: number
		stiffness: number
	}
	destruction: {
		enabled: boolean
		fragments: number
		debrisLife: number
	}
}

export interface LightConfig {
	ambientR: number
	ambientG: number
	ambientB: number
	sunDirX: number
	sunDirY: number
	sunDirZ: number
	sunColorR: number
	sunColorG: number
	sunColorB: number
}

export interface AIDialogueConfig {
	canTalk: boolean
	personality: string
	knowledge: string[]
	talkRange: number
	greeting: string
}

export interface LLMConfig {
	provider: 'openai' | 'anthropic' | 'ollama' | 'custom'
	endpoint: string
	apiKey: string
	model: string
}

export interface WorldConfig {
	era: string
	techLevel: number
	magicLevel: number
	plane: string
	gravityMul: number
	timeFlow: number
	manaLevel: number
	physics: PhysicsConfig
	physicsAdvanced: PhysicsAdvancedConfig
	render: RenderConfig
	camera: CameraConfig
	postProcess: PostProcessConfig
	lod: LODConfig
}

export interface MapGenConfig {
	seed: number
	seaLevel: number
	mountainHeight: number
	continentScale: number
	detailScale: number
	tempScale: number
	humidScale: number
	biomeMinSize: number
}

export interface PocketConfig {
	sizeX: number
	sizeY: number
	sizeZ: number
	timeFlow: number
	pvp: boolean
	godMode: boolean
}

export interface DimensionConfig {
	type: 'domain' | 'realityMarble' | 'pocket' | 'barrier' | 'territory' | 'boundedField'
	radius: number
	duration: number
}

export interface SpaceConfig {
	style: string
	ruined: boolean
	temp: number
	daylight: number
	sunColor: string
	sunIntensity: number
	pocket: PocketConfig
	mapGen: MapGenConfig
	light: LightConfig
	plane: string
	dimension: DimensionConfig
}

export interface EntityConfig {
	id: string
	name: string
	desc: string
	tags: string[]
	hp: number
	atk: number
	def: number
	spd: number
	locomotion: 'serpent' | 'monopod' | 'biped' | 'tripod' | 'quadruped' | 'hexapod' | 'octopod' | 'multipod'
	locomotionMod: 'none' | 'floating' | 'winged'
	size: 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'colossal'
	rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
	collider: 'capsule' | 'box' | 'sphere'
	mass: number
	drag: number
	angDrag: number
	gravityScale: number
	bounce: number
	friction: number
}

export interface SkillEffect {
	type: string
	dmgType?: string
	dmgBase?: number
	dmgAtkRatio?: number
	meleeDist?: number
	meleeAngle?: number
	meleeHeight?: number
	meleeDelay?: number
	meleeCount?: number
	meleeInterval?: number
	meleeBlock?: boolean
	meleeDodge?: boolean
	meleeKb?: number
	meleeKup?: number
	meleeStagger?: number
	meleePierce?: number
	projSpeed?: number
	projGravity?: number
	projPierce?: number
	projBounce?: number
	projLifetime?: number
	areaRadius?: number
	areaDuration?: number
	areaTickRate?: number
	healBase?: number
	healRatio?: number
	buffId?: string
	buffDuration?: number
	buffStacks?: number
	summonId?: string
	summonCount?: number
	summonDuration?: number
	teleportDist?: number
	knockbackDist?: number
	knockbackUp?: number
	stunDuration?: number
	[key: string]: any
}

export interface SkillConfig {
	id: string
	name: string
	icon: string
	type: 'active' | 'passive' | 'toggle'
	category: 'attack' | 'defense' | 'support' | 'utility' | 'movement' | 'control'
	target: 'self' | 'ally' | 'enemy' | 'any' | 'area' | 'cone' | 'line' | 'ground' | 'none'
	range: number
	radius: number
	cd: number
	castTime: number
	costType: 'none' | 'hp' | 'mp' | 'stamina' | 'rage' | 'energy' | 'soul' | 'item'
	costVal: number
	costItem: string
	canCrit: boolean
	canDodge: boolean
	canBlock: boolean
	ignoreArmor: boolean
	interrupt: boolean
	effects: SkillEffect[]
}

export interface TriggerConfig {
	type: 'immediate' | 'realTimer' | 'gameTimer' | 'realTime' | 'gameTime' | 'runCount' | 'realDuration' | 'gameDuration'
	delay: number
	interval: number
	count: number
	duration: number
}

export interface AIConfig {
	behavior: {
		template: 'neutral' | 'aggressive' | 'defensive'
		alertRadius: number
		chaseRadius: number
		returnRadius: number
	}
	state: { initial: string; transDelay: number }
	utility: { evalInterval: number; randomFactor: number }
	pathfind: { algo: 'astar' | 'dijkstra'; updateFreq: number; avoidRadius: number }
	perception: { sightRange: number; sightAngle: number; hearRange: number }
	dialogue: AIDialogueConfig
}

export interface GameConfig {
	laws: Record<string, LawConfig>
	rules: RulesConfig
	world: WorldConfig
	space: SpaceConfig
	entities: Record<string, EntityConfig>
	factions: Record<string, { id: string; name: string; color: string }>
	skills: Record<string, SkillConfig>
	modules: any
	systems: any
	ai: AIConfig
	llm: LLMConfig
}
