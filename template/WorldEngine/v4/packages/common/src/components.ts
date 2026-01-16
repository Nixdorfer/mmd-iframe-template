import { Vec3, Quat } from './types'

export const COMP = {
	TRANSFORM: 1,
	HEALTH: 2,
	COMBAT: 3,
	PHYSICS: 4,
	AI: 5,
	RENDER: 6,
	BUFF: 7,
	COOLDOWN: 8,
	TAG: 9,
	NAME: 10
} as const

export interface TransformComp {
	pos: Vec3
	rot: Quat
	scl: Vec3
}

export interface HealthComp {
	cur: number
	max: number
	alive: boolean
}

export interface CombatComp {
	atk: number
	def: number
	spd: number
	level: number
	exp: number
}

export interface PhysicsComp {
	vel: Vec3
	angVel: Vec3
	mass: number
	drag: number
	angDrag: number
	gravityScl: number
}

export interface AIComp {
	state: 'idle' | 'wander' | 'chase' | 'attack' | 'flee' | 'return'
	target: number | null
	homePos: Vec3
	wanderRadius: number
	aggroRadius: number
	leashRadius: number
}

export interface RenderComp {
	meshId: string
	matId: string
	visible: boolean
	castShadow: boolean
	receiveShadow: boolean
}

export interface BuffComp {
	buffs: Map<string, { id: string; stacks: number; remaining: number }>
}

export interface CooldownComp {
	cooldowns: Map<string, number>
}

export interface TagComp {
	tags: Set<string>
}

export interface NameComp {
	name: string
	defId: string
}

export function defTransform(): TransformComp {
	return {
		pos: { x: 0, y: 0, z: 0 },
		rot: { x: 0, y: 0, z: 0, w: 1 },
		scl: { x: 1, y: 1, z: 1 }
	}
}

export function defHealth(max: number): HealthComp {
	return { cur: max, max, alive: true }
}

export function defCombat(): CombatComp {
	return { atk: 10, def: 5, spd: 1, level: 1, exp: 0 }
}

export function defPhysics(mass: number): PhysicsComp {
	return {
		vel: { x: 0, y: 0, z: 0 },
		angVel: { x: 0, y: 0, z: 0 },
		mass,
		drag: 0.1,
		angDrag: 0.05,
		gravityScl: 1
	}
}

export function defAI(homePos: Vec3): AIComp {
	return {
		state: 'idle',
		target: null,
		homePos,
		wanderRadius: 10,
		aggroRadius: 15,
		leashRadius: 30
	}
}
