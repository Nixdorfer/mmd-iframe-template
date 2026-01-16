import type { Vec3, EntityId } from '@engine/common'
import { Pathfinder, type PathGrid, type PathOpts } from './pathfinder'
import { PerceptionSys, type PerceptionCfg, type SoundEvent } from './perception'
import { AggroMgr, type AggroCfg } from './aggro'
import { MemorySys, MemoryType } from './memory'
import { FlockSys, type FlockCfg, FormationType } from './flock'
import { type BTTree, type BTContext, NodeStatus } from './bt'

export interface EntityProvider {
	get(id: EntityId): {
		id: EntityId
		transform: { pos: Vec3; rot: Vec3 }
		alive: boolean
		hp?: number
		maxHp?: number
	} | undefined
	getInRange(pos: Vec3, range: number): { id: EntityId; transform: { pos: Vec3 } }[]
}

export interface AIEntity {
	id: EntityId
	btId: string | null
	perceptionCfgId: string
	flockGroupId: string | null
	blackboard: Map<string, any>
	target: EntityId | null
}

export interface MoveCommand {
	entId: EntityId
	target: Vec3
	speed: number
}

export interface AttackCommand {
	entId: EntityId
	targetId: EntityId
}

export class AIMgr {
	entityProvider: EntityProvider | null
	pathfinder: Pathfinder | null
	perceptionSys: PerceptionSys
	aggroMgr: AggroMgr
	memorySys: MemorySys
	flockSys: FlockSys
	behaviorTrees: Map<string, BTTree>
	entities: Map<EntityId, AIEntity>
	moveCommands: Map<EntityId, MoveCommand>
	attackCommands: Map<EntityId, AttackCommand>
	onMove: ((cmd: MoveCommand) => void) | null
	onAttack: ((cmd: AttackCommand) => void) | null
	onIdle: ((entId: EntityId) => void) | null

	constructor() {
		this.entityProvider = null
		this.pathfinder = null
		this.perceptionSys = new PerceptionSys()
		this.aggroMgr = new AggroMgr()
		this.memorySys = new MemorySys()
		this.flockSys = new FlockSys()
		this.behaviorTrees = new Map()
		this.entities = new Map()
		this.moveCommands = new Map()
		this.attackCommands = new Map()
		this.onMove = null
		this.onAttack = null
		this.onIdle = null
	}

	setEntityProvider(provider: EntityProvider): void {
		this.entityProvider = provider
		this.perceptionSys.setEntityProvider(provider)
		this.flockSys.setEntityProvider(provider)
	}

	setPathGrid(grid: PathGrid): void {
		this.pathfinder = new Pathfinder(grid)
	}

	setPerceptionCfg(cfgId: string, cfg: Partial<PerceptionCfg>): void {
		this.perceptionSys.setCfg(cfgId, cfg)
	}

	setAggroCfg(cfg: Partial<AggroCfg>): void {
		this.aggroMgr.setCfg(cfg)
	}

	setFlockCfg(cfg: Partial<FlockCfg>): void {
		this.flockSys.setCfg(cfg)
	}

	registerBT(id: string, tree: BTTree): void {
		this.behaviorTrees.set(id, tree)
	}

	unregisterBT(id: string): void {
		this.behaviorTrees.delete(id)
	}

	registerEntity(entId: EntityId, btId: string | null = null, perceptionCfgId: string = 'default'): void {
		const aiEntity: AIEntity = {
			id: entId,
			btId,
			perceptionCfgId,
			flockGroupId: null,
			blackboard: new Map(),
			target: null
		}
		this.entities.set(entId, aiEntity)
		this.perceptionSys.registerEntity(entId)
		this.aggroMgr.registerEntity(entId)
		this.memorySys.registerEntity(entId)
	}

	unregisterEntity(entId: EntityId): void {
		const aiEntity = this.entities.get(entId)
		if (aiEntity && aiEntity.flockGroupId) {
			this.flockSys.delMember(aiEntity.flockGroupId, entId)
		}
		this.entities.delete(entId)
		this.perceptionSys.unregisterEntity(entId)
		this.aggroMgr.unregisterEntity(entId)
		this.memorySys.unregisterEntity(entId)
		this.moveCommands.delete(entId)
		this.attackCommands.delete(entId)
	}

	setEntityBT(entId: EntityId, btId: string | null): void {
		const aiEntity = this.entities.get(entId)
		if (aiEntity) {
			aiEntity.btId = btId
			if (btId) {
				const tree = this.behaviorTrees.get(btId)
				tree?.reset()
			}
		}
	}

	setEntityTarget(entId: EntityId, targetId: EntityId | null): void {
		const aiEntity = this.entities.get(entId)
		if (aiEntity) {
			aiEntity.target = targetId
		}
	}

	getEntityTarget(entId: EntityId): EntityId | null {
		return this.entities.get(entId)?.target ?? null
	}

	addToFlock(entId: EntityId, groupId: string): void {
		const aiEntity = this.entities.get(entId)
		if (aiEntity) {
			this.flockSys.addMember(groupId, entId)
			aiEntity.flockGroupId = groupId
		}
	}

	removeFromFlock(entId: EntityId): void {
		const aiEntity = this.entities.get(entId)
		if (aiEntity && aiEntity.flockGroupId) {
			this.flockSys.delMember(aiEntity.flockGroupId, entId)
			aiEntity.flockGroupId = null
		}
	}

	createFlock(leaderId: EntityId | null = null, spacing: number = 2): string {
		const groupId = this.flockSys.createGroup(leaderId, spacing)
		if (leaderId) {
			const aiEntity = this.entities.get(leaderId)
			if (aiEntity) {
				aiEntity.flockGroupId = groupId
			}
		}
		return groupId
	}

	setFlockFormation(groupId: string, formation: FormationType): void {
		this.flockSys.setFormation(groupId, formation)
	}

	setFlockTarget(groupId: string, pos: Vec3 | null): void {
		this.flockSys.setTarget(groupId, pos)
	}

	reportDamage(targetId: EntityId, attackerId: EntityId, dmg: number): void {
		this.aggroMgr.addDmgThreat(targetId, attackerId, dmg)
		const aiEntity = this.entities.get(targetId)
		if (aiEntity && !aiEntity.target) {
			aiEntity.target = attackerId
		}
		if (this.entityProvider) {
			const target = this.entityProvider.get(targetId)
			if (target) {
				this.memorySys.rememberDanger(targetId, target.transform.pos, 5, 'attack', 0.8)
			}
		}
	}

	reportHeal(targetId: EntityId, healerId: EntityId, heal: number): void {
		this.aggroMgr.addHealThreat(targetId, healerId, heal)
	}

	emitSound(evt: Omit<SoundEvent, 'timestamp'>): void {
		this.perceptionSys.emitSound(evt)
	}

	reqPath(
		entId: EntityId,
		end: Vec3,
		opts: Partial<PathOpts> = {},
		callback: (path: Vec3[] | null) => void
	): string | null {
		if (!this.pathfinder || !this.entityProvider) return null
		const ent = this.entityProvider.get(entId)
		if (!ent) return null
		return this.pathfinder.reqPath(entId, ent.transform.pos, end, opts, callback)
	}

	findPathSync(entId: EntityId, end: Vec3, opts: Partial<PathOpts> = {}): Vec3[] | null {
		if (!this.pathfinder || !this.entityProvider) return null
		const ent = this.entityProvider.get(entId)
		if (!ent) return null
		return this.pathfinder.findPathSync(ent.transform.pos, end, opts)
	}

	upd(dt: number): void {
		this.pathfinder?.upd()
		this.perceptionSys.upd(dt)
		this.aggroMgr.upd(dt)
		this.memorySys.upd(dt)
		this.flockSys.upd(dt)
		this.moveCommands.clear()
		this.attackCommands.clear()
		for (const aiEntity of this.entities.values()) {
			this.updEntity(aiEntity, dt)
		}
		for (const cmd of this.moveCommands.values()) {
			this.onMove?.(cmd)
		}
		for (const cmd of this.attackCommands.values()) {
			this.onAttack?.(cmd)
		}
	}

	private updEntity(aiEntity: AIEntity, dt: number): void {
		if (!this.entityProvider) return
		const ent = this.entityProvider.get(aiEntity.id)
		if (!ent || !ent.alive) return
		this.perceptionSys.updPerception(aiEntity.id, aiEntity.perceptionCfgId)
		this.updTarget(aiEntity)
		if (ent.hp !== undefined && ent.maxHp !== undefined) {
			aiEntity.blackboard.set('hpRatio', ent.hp / ent.maxHp)
		}
		if (aiEntity.btId) {
			const tree = this.behaviorTrees.get(aiEntity.btId)
			if (tree) {
				const ctx = this.createContext(aiEntity, dt)
				tree.tick(ctx)
			}
		}
	}

	private updTarget(aiEntity: AIEntity): void {
		if (!aiEntity.target) {
			const threatTarget = this.aggroMgr.getHighestThreat(aiEntity.id)
			if (threatTarget) {
				aiEntity.target = threatTarget
				return
			}
			const perceived = this.perceptionSys.getHighestConfidence(aiEntity.id)
			if (perceived && perceived.confidence > 0.5) {
				aiEntity.target = perceived.entId
			}
		} else {
			if (!this.entityProvider) return
			const target = this.entityProvider.get(aiEntity.target)
			if (!target || !target.alive) {
				aiEntity.target = null
				this.aggroMgr.removeThreat(aiEntity.id, aiEntity.target!)
			}
		}
	}

	private createContext(aiEntity: AIEntity, dt: number): BTContext {
		const self = this
		return {
			entId: aiEntity.id,
			blackboard: aiEntity.blackboard,
			dt,
			getPos(): Vec3 | null {
				const ent = self.entityProvider?.get(aiEntity.id)
				return ent?.transform.pos ?? null
			},
			getTarget(): EntityId | null {
				return aiEntity.target
			},
			getTargetPos(): Vec3 | null {
				if (!aiEntity.target || !self.entityProvider) return null
				const target = self.entityProvider.get(aiEntity.target)
				return target?.transform.pos ?? null
			},
			moveTo(pos: Vec3): void {
				const ent = self.entityProvider?.get(aiEntity.id)
				if (!ent) return
				const flockVel = aiEntity.flockGroupId
					? self.flockSys.getVelocity(aiEntity.id)
					: { x: 0, y: 0, z: 0 }
				const dx = pos.x - ent.transform.pos.x + flockVel.x * 0.5
				const dy = pos.y - ent.transform.pos.y + flockVel.y * 0.5
				const dz = pos.z - ent.transform.pos.z + flockVel.z * 0.5
				const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
				if (dist > 0.1) {
					const speed = aiEntity.blackboard.get('speed') as number | undefined ?? 5
					self.moveCommands.set(aiEntity.id, {
						entId: aiEntity.id,
						target: pos,
						speed
					})
				}
			},
			attack(targetId: EntityId): void {
				self.attackCommands.set(aiEntity.id, {
					entId: aiEntity.id,
					targetId
				})
			},
			flee(dir: Vec3): void {
				const ent = self.entityProvider?.get(aiEntity.id)
				if (!ent) return
				const speed = aiEntity.blackboard.get('speed') as number | undefined ?? 5
				const fleeDist = 10
				self.moveCommands.set(aiEntity.id, {
					entId: aiEntity.id,
					target: {
						x: ent.transform.pos.x + dir.x * fleeDist,
						y: ent.transform.pos.y + dir.y * fleeDist,
						z: ent.transform.pos.z + dir.z * fleeDist
					},
					speed: speed * 1.2
				})
			},
			idle(): void {
				self.onIdle?.(aiEntity.id)
			}
		}
	}

	getBlackboard(entId: EntityId): Map<string, any> | null {
		return this.entities.get(entId)?.blackboard ?? null
	}

	setBlackboardValue(entId: EntityId, key: string, value: any): void {
		const aiEntity = this.entities.get(entId)
		if (aiEntity) {
			aiEntity.blackboard.set(key, value)
		}
	}

	getBlackboardValue<T>(entId: EntityId, key: string): T | undefined {
		return this.entities.get(entId)?.blackboard.get(key)
	}

	getPerceived(entId: EntityId) {
		return this.perceptionSys.getPerceived(entId)
	}

	getThreats(entId: EntityId) {
		return this.aggroMgr.getAllThreats(entId)
	}

	getMemories(entId: EntityId, typ?: MemoryType) {
		return this.memorySys.getMemories(entId, typ)
	}

	setPatrol(entId: EntityId, points: Vec3[], loop: boolean = true, waitTime: number = 2): void {
		this.memorySys.setPatrol(entId, points, loop, waitTime)
	}

	rememberLocation(entId: EntityId, pos: Vec3, label: string): void {
		this.memorySys.rememberLocation(entId, pos, label)
	}

	rememberEntity(entId: EntityId, targetId: EntityId, disposition: 'friendly' | 'neutral' | 'hostile'): void {
		if (!this.entityProvider) return
		const target = this.entityProvider.get(targetId)
		if (target) {
			this.memorySys.rememberEntity(entId, targetId, target.transform.pos, disposition)
		}
	}
}

export {
	Pathfinder, type PathGrid, type PathOpts,
	PerceptionSys, type PerceptionCfg,
	AggroMgr, type AggroCfg,
	MemorySys, MemoryType,
	FlockSys, type FlockCfg, FormationType,
	BTTree, BTContext, NodeStatus
}
export * from './bt'
