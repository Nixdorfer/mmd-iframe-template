import {
	type EntityId, type Vec3, type Quat, type Transform,
	LocomotionType, type LocomotionModifier, type CreatureType,
	type Collider, type RigidBody, ColliderType, RigidBodyType
} from '@engine/common'

export interface EntityDef {
	id: string
	name: string
	typ: CreatureType
	baseHp: number
	baseAtk: number
	baseDef: number
	baseSpd: number
	collider: Collider
	rigidBody: RigidBody
	anims: string[]
	tags: string[]
}

export interface EntityInstance {
	id: EntityId
	defId: string
	name: string
	transform: Transform
	hp: number
	maxHp: number
	atk: number
	def: number
	spd: number
	level: number
	exp: number
	alive: boolean
	tags: Set<string>
	buffs: Map<string, BuffInstance>
	cooldowns: Map<string, number>
	curAnim: string
	animTime: number
}

export interface BuffInstance {
	id: string
	name: string
	duration: number
	remaining: number
	stacks: number
	effects: BuffEffect[]
}

export interface BuffEffect {
	stat: string
	op: 'add' | 'mul'
	value: number
}

export class EntityLayer {
	defs: Map<string, EntityDef>
	instances: Map<EntityId, EntityInstance>
	nxtId: number

	constructor() {
		this.defs = new Map()
		this.instances = new Map()
		this.nxtId = 1
		this.iniDefEntities()
	}

	private iniDefEntities() {
		this.addDef({
			id: 'human',
			name: '人类',
			typ: { base: LocomotionType.Biped, mods: [] },
			baseHp: 100,
			baseAtk: 10,
			baseDef: 5,
			baseSpd: 5,
			collider: {
				typ: ColliderType.Capsule,
				offset: { x: 0, y: 0, z: 0.9 },
				size: { x: 1, y: 1, z: 1 },
				radius: 0.4,
				height: 1.8,
				isTrg: false
			},
			rigidBody: {
				typ: RigidBodyType.Dynamic,
				mass: 70,
				vel: { x: 0, y: 0, z: 0 },
				angVel: { x: 0, y: 0, z: 0 },
				drag: 0.1,
				angDrag: 0.05,
				gravityScl: 1.0
			},
			anims: ['idle', 'walk', 'run', 'attack', 'hit', 'death'],
			tags: ['humanoid', 'sentient']
		})
		this.addDef({
			id: 'quadruped_beast',
			name: '四足兽',
			typ: { base: LocomotionType.Quadruped, mods: [] },
			baseHp: 80,
			baseAtk: 15,
			baseDef: 3,
			baseSpd: 8,
			collider: {
				typ: ColliderType.Box,
				offset: { x: 0, y: 0, z: 0.5 },
				size: { x: 1.2, y: 2.0, z: 1.0 },
				radius: 0.5,
				height: 1.0,
				isTrg: false
			},
			rigidBody: {
				typ: RigidBodyType.Dynamic,
				mass: 50,
				vel: { x: 0, y: 0, z: 0 },
				angVel: { x: 0, y: 0, z: 0 },
				drag: 0.05,
				angDrag: 0.05,
				gravityScl: 1.0
			},
			anims: ['idle', 'walk', 'run', 'attack_bite', 'attack_claw', 'hit', 'death'],
			tags: ['beast', 'animal']
		})
		this.addDef({
			id: 'flying_creature',
			name: '飞行生物',
			typ: { base: LocomotionType.Biped, mods: ['winged' as LocomotionModifier] },
			baseHp: 60,
			baseAtk: 12,
			baseDef: 2,
			baseSpd: 12,
			collider: {
				typ: ColliderType.Sphere,
				offset: { x: 0, y: 0, z: 1.0 },
				size: { x: 1, y: 1, z: 1 },
				radius: 0.6,
				height: 1.2,
				isTrg: false
			},
			rigidBody: {
				typ: RigidBodyType.Dynamic,
				mass: 20,
				vel: { x: 0, y: 0, z: 0 },
				angVel: { x: 0, y: 0, z: 0 },
				drag: 0.02,
				angDrag: 0.02,
				gravityScl: 0.3
			},
			anims: ['idle', 'fly', 'glide', 'dive', 'attack', 'hit', 'death'],
			tags: ['flying', 'winged']
		})
	}

	addDef(def: EntityDef) {
		this.defs.set(def.id, def)
	}

	getDef(id: string): EntityDef | undefined {
		return this.defs.get(id)
	}

	spawn(defId: string, pos: Vec3, name?: string): EntityId {
		const def = this.defs.get(defId)
		if (!def) return 0
		const id = this.nxtId++
		const inst: EntityInstance = {
			id,
			defId,
			name: name ?? def.name,
			transform: {
				pos,
				rot: { x: 0, y: 0, z: 0, w: 1 },
				scl: { x: 1, y: 1, z: 1 }
			},
			hp: def.baseHp,
			maxHp: def.baseHp,
			atk: def.baseAtk,
			def: def.baseDef,
			spd: def.baseSpd,
			level: 1,
			exp: 0,
			alive: true,
			tags: new Set(def.tags),
			buffs: new Map(),
			cooldowns: new Map(),
			curAnim: 'idle',
			animTime: 0
		}
		this.instances.set(id, inst)
		return id
	}

	despawn(id: EntityId) {
		this.instances.delete(id)
	}

	get(id: EntityId): EntityInstance | undefined {
		return this.instances.get(id)
	}

	setPos(id: EntityId, pos: Vec3) {
		const ent = this.instances.get(id)
		if (ent) ent.transform.pos = pos
	}

	setRot(id: EntityId, rot: Quat) {
		const ent = this.instances.get(id)
		if (ent) ent.transform.rot = rot
	}

	damage(id: EntityId, amount: number): boolean {
		const ent = this.instances.get(id)
		if (!ent || !ent.alive) return false
		ent.hp = Math.max(0, ent.hp - amount)
		if (ent.hp <= 0) {
			ent.alive = false
			ent.curAnim = 'death'
			return true
		}
		return false
	}

	heal(id: EntityId, amount: number) {
		const ent = this.instances.get(id)
		if (!ent || !ent.alive) return
		ent.hp = Math.min(ent.maxHp, ent.hp + amount)
	}

	addBuff(id: EntityId, buff: BuffInstance) {
		const ent = this.instances.get(id)
		if (!ent) return
		const existing = ent.buffs.get(buff.id)
		if (existing) {
			existing.stacks = Math.min(existing.stacks + 1, 10)
			existing.remaining = buff.duration
		} else {
			ent.buffs.set(buff.id, { ...buff })
		}
	}

	delBuff(id: EntityId, buffId: string) {
		const ent = this.instances.get(id)
		if (ent) ent.buffs.delete(buffId)
	}

	getStatWithBuffs(id: EntityId, stat: string): number {
		const ent = this.instances.get(id)
		if (!ent) return 0
		let base = 0
		switch (stat) {
			case 'atk': base = ent.atk; break
			case 'def': base = ent.def; break
			case 'spd': base = ent.spd; break
			case 'maxHp': base = ent.maxHp; break
			default: return 0
		}
		let addTotal = 0
		let mulTotal = 1
		for (const buff of ent.buffs.values()) {
			for (const eff of buff.effects) {
				if (eff.stat === stat) {
					if (eff.op === 'add') addTotal += eff.value * buff.stacks
					else mulTotal *= Math.pow(eff.value, buff.stacks)
				}
			}
		}
		return (base + addTotal) * mulTotal
	}

	setCooldown(id: EntityId, skill: string, duration: number) {
		const ent = this.instances.get(id)
		if (ent) ent.cooldowns.set(skill, Date.now() + duration)
	}

	isOnCooldown(id: EntityId, skill: string): boolean {
		const ent = this.instances.get(id)
		if (!ent) return true
		const cd = ent.cooldowns.get(skill)
		if (!cd) return false
		return Date.now() < cd
	}

	getCooldownRemaining(id: EntityId, skill: string): number {
		const ent = this.instances.get(id)
		if (!ent) return 0
		const cd = ent.cooldowns.get(skill)
		if (!cd) return 0
		return Math.max(0, cd - Date.now())
	}

	hasTag(id: EntityId, tag: string): boolean {
		const ent = this.instances.get(id)
		return ent?.tags.has(tag) ?? false
	}

	addTag(id: EntityId, tag: string) {
		const ent = this.instances.get(id)
		if (ent) ent.tags.add(tag)
	}

	delTag(id: EntityId, tag: string) {
		const ent = this.instances.get(id)
		if (ent) ent.tags.delete(tag)
	}

	getTags(id: EntityId): string[] {
		const ent = this.instances.get(id)
		return ent ? Array.from(ent.tags) : []
	}

	upd(dt: number) {
		const now = Date.now()
		for (const ent of this.instances.values()) {
			ent.animTime += dt
			for (const [buffId, buff] of ent.buffs) {
				buff.remaining -= dt * 1000
				if (buff.remaining <= 0) {
					ent.buffs.delete(buffId)
				}
			}
		}
	}

	getAllAlive(): EntityInstance[] {
		const result: EntityInstance[] = []
		for (const ent of this.instances.values()) {
			if (ent.alive) result.push(ent)
		}
		return result
	}

	getInRange(pos: Vec3, range: number): EntityInstance[] {
		const result: EntityInstance[] = []
		for (const ent of this.instances.values()) {
			if (!ent.alive) continue
			const dx = ent.transform.pos.x - pos.x
			const dy = ent.transform.pos.y - pos.y
			const dz = ent.transform.pos.z - pos.z
			if (dx * dx + dy * dy + dz * dz <= range * range) {
				result.push(ent)
			}
		}
		return result
	}
}
