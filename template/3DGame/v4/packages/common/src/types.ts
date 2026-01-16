export type EntityId = number

export interface Vec3 {
	x: number
	y: number
	z: number
}

export interface Quat {
	x: number
	y: number
	z: number
	w: number
}

export interface Transform {
	pos: Vec3
	rot: Quat
	scl: Vec3
}

export interface AABB {
	min: Vec3
	max: Vec3
}

export interface ChunkPos {
	x: number
	y: number
	z: number
}

export const CHUNK_SIZE = 32
export let CHUNK_HEIGHT = 64

export interface WorldConfig {
	chunkHeight: number
}

export function setWorldConfig(cfg: Partial<WorldConfig>) {
	if (cfg.chunkHeight !== undefined) CHUNK_HEIGHT = cfg.chunkHeight
}

export type BlockId = number

export interface BlockDef {
	id: BlockId
	name: string
	solid: boolean
	transparent: boolean
	tex: {
		tp: number
		bt: number
		side: number
	}
}

export enum ColliderType {
	Box = 'box',
	Sphere = 'sphere',
	Capsule = 'capsule',
	Mesh = 'mesh',
	Convex = 'convex'
}

export interface Collider {
	typ: ColliderType
	offset: Vec3
	size: Vec3
	radius: number
	height: number
	isTrg: boolean
}

export enum RigidBodyType {
	Static = 'static',
	Dynamic = 'dynamic',
	Kinematic = 'kinematic'
}

export interface RigidBody {
	typ: RigidBodyType
	mass: number
	vel: Vec3
	angVel: Vec3
	drag: number
	angDrag: number
	gravityScl: number
}

export enum LocomotionType {
	Serpent = 'serpent',
	Monopod = 'monopod',
	Biped = 'biped',
	Tripod = 'tripod',
	Quadruped = 'quadruped',
	Hexapod = 'hexapod',
	Octopod = 'octopod',
	Multipod = 'multipod'
}

export enum LocomotionModifier {
	Floating = 'floating',
	Winged = 'winged'
}

export interface CreatureType {
	base: LocomotionType
	mods: LocomotionModifier[]
}

export enum SystemStage {
	PreUpdate = 0,
	Update = 1,
	PostUpdate = 2,
	PreRender = 3,
	Render = 4,
	PostRender = 5
}

export interface SystemDef {
	name: string
	stage: SystemStage
	run: (world: any, dt: number) => void
}

export enum AssetType {
	Texture = 'texture',
	Model = 'model',
	Animation = 'animation',
	Sound = 'sound',
	Config = 'config'
}

export interface AssetEntry {
	id: string
	path: string
	typ: AssetType
	size: number
	hash: string
	priority: 'critical' | 'high' | 'medium' | 'low'
	deps?: string[]
}

export enum PlaneType {
	Material = 'material',
	Ethereal = 'ethereal',
	Astral = 'astral',
	Shadow = 'shadow',
	Feywild = 'feywild',
	Elemental = 'elemental',
	Digital = 'digital',
	Dream = 'dream',
	Void = 'void'
}

export interface PlaneEnv {
	gravity: number
	timeFlow: number
	mana: number
	tech: number
}

export enum DimensionType {
	Domain = 'domain',
	RealityMarble = 'reality_marble',
	Pocket = 'pocket',
	Barrier = 'barrier',
	Territory = 'territory',
	BoundedField = 'bounded_field'
}

export interface DimensionDef {
	typ: DimensionType
	radius: number
	duration: number
	rules: Record<string, any>
	effects: {
		filter?: string
		postProcess?: string
		boundary?: string
	}
	winCond?: {
		type: string
		params: Record<string, any>
	}
}

export enum TimeAbilityType {
	Stop = 'stop',
	Anchor = 'anchor',
	Rewind = 'rewind',
	Foresight = 'foresight'
}

export interface TimeAbility {
	typ: TimeAbilityType
	duration: number
	cooldown: number
	cost: number
}

export enum LawType {
	Causality = 'causality',
	EquivalentExchange = 'equivalent_exchange',
	Conservation = 'conservation',
	Contract = 'contract',
	Mortality = 'mortality',
	Identity = 'identity'
}

export interface LawViolation {
	law: LawType
	cost: string
	exempt?: string[]
}

export enum WorldviewType {
	Cyberpunk = 'cyberpunk',
	HarryPotter = 'harry_potter',
	Xianxia = 'xianxia',
	Wuxia = 'wuxia',
	Naruto = 'naruto',
	OnePiece = 'one_piece',
	JujutsuKaisen = 'jujutsu_kaisen',
	StarWars = 'star_wars',
	DemonSlayer = 'demon_slayer',
	Fate = 'fate',
	Toaru = 'toaru',
	Jojo = 'jojo',
	Pokemon = 'pokemon',
	HunterXHunter = 'hunter_x_hunter',
	Fma = 'fma'
}

export enum BiomeType {
	Plains = 'plains',
	Forest = 'forest',
	Mountain = 'mountain',
	Desert = 'desert',
	Swamp = 'swamp',
	Tundra = 'tundra',
	Ocean = 'ocean',
	River = 'river',
	Lake = 'lake',
	Cave = 'cave',
	Volcano = 'volcano',
	City = 'city',
	Village = 'village',
	Ruins = 'ruins',
	Dungeon = 'dungeon'
}

export interface ChunkHeader {
	version: number
	pos: ChunkPos
	biome: BiomeType
	genAt: number
}

export interface SpawnPoint {
	typ: string
	pos: Vec3
	radius: number
	maxCnt: number
}

export enum LODLevel {
	Full = 0,
	Medium = 1,
	Low = 2,
	Horizon = 3
}

export interface LODConfig {
	level: LODLevel
	dist: number
}

export interface PhysicsSnapshot {
	pos: Vec3
	rot: Quat
	vel: Vec3
	angVel: Vec3
	sleeping: boolean
}

export interface TimeEffectCfg {
	desaturation: number
	tint: Vec3
	vignetteStrength: number
	ghostEnabled: boolean
	ghostCount: number
	ghostOpacity: number
}

export function defTimeEffectCfg(): TimeEffectCfg {
	return {
		desaturation: 0.8,
		tint: { x: 0.3, y: 0.3, z: 0.5 },
		vignetteStrength: 0.4,
		ghostEnabled: true,
		ghostCount: 3,
		ghostOpacity: 0.3
	}
}
