import type { Vec3, EntityId } from '@engine/common'

export interface FlockCfg {
	sepDist: number
	sepWeight: number
	alignDist: number
	alignWeight: number
	cohDist: number
	cohWeight: number
	maxSpeed: number
	maxForce: number
	viewAngle: number
}

export enum FormationType {
	None = 'none',
	Line = 'line',
	Circle = 'circle',
	Wedge = 'wedge',
	Square = 'square',
	Column = 'column'
}

export interface FlockGroup {
	id: string
	members: Set<EntityId>
	leader: EntityId | null
	formation: FormationType
	targetPos: Vec3 | null
	spacing: number
}

export interface EntityProvider {
	get(id: EntityId): { transform: { pos: Vec3; rot: Vec3 }; alive: boolean } | undefined
}

const DEFAULT_CFG: FlockCfg = {
	sepDist: 2,
	sepWeight: 1.5,
	alignDist: 5,
	alignWeight: 1.0,
	cohDist: 8,
	cohWeight: 1.0,
	maxSpeed: 5,
	maxForce: 3,
	viewAngle: 270
}

export class FlockSys {
	groups: Map<string, FlockGroup>
	entityGroups: Map<EntityId, string>
	velocities: Map<EntityId, Vec3>
	cfg: FlockCfg
	entityProvider: EntityProvider | null
	nxtGroupId: number

	constructor(cfg: Partial<FlockCfg> = {}) {
		this.groups = new Map()
		this.entityGroups = new Map()
		this.velocities = new Map()
		this.cfg = { ...DEFAULT_CFG, ...cfg }
		this.entityProvider = null
		this.nxtGroupId = 1
	}

	setCfg(cfg: Partial<FlockCfg>): void {
		this.cfg = { ...this.cfg, ...cfg }
	}

	setEntityProvider(provider: EntityProvider): void {
		this.entityProvider = provider
	}

	createGroup(leader: EntityId | null = null, spacing: number = 2): string {
		const id = `flock_${this.nxtGroupId++}`
		const group: FlockGroup = {
			id,
			members: new Set(),
			leader,
			formation: FormationType.None,
			targetPos: null,
			spacing
		}
		if (leader) {
			group.members.add(leader)
			this.entityGroups.set(leader, id)
		}
		this.groups.set(id, group)
		return id
	}

	deleteGroup(groupId: string): void {
		const group = this.groups.get(groupId)
		if (group) {
			for (const memberId of group.members) {
				this.entityGroups.delete(memberId)
			}
			this.groups.delete(groupId)
		}
	}

	addMember(groupId: string, entId: EntityId): boolean {
		const group = this.groups.get(groupId)
		if (!group) return false
		const existingGroup = this.entityGroups.get(entId)
		if (existingGroup && existingGroup !== groupId) {
			this.delMember(existingGroup, entId)
		}
		group.members.add(entId)
		this.entityGroups.set(entId, groupId)
		if (!this.velocities.has(entId)) {
			this.velocities.set(entId, { x: 0, y: 0, z: 0 })
		}
		return true
	}

	delMember(groupId: string, entId: EntityId): boolean {
		const group = this.groups.get(groupId)
		if (!group) return false
		group.members.delete(entId)
		this.entityGroups.delete(entId)
		if (group.leader === entId) {
			group.leader = group.members.size > 0 ? (group.members.values().next().value ?? null) : null
		}
		if (group.members.size === 0) {
			this.groups.delete(groupId)
		}
		return true
	}

	getGroup(entId: EntityId): FlockGroup | null {
		const groupId = this.entityGroups.get(entId)
		if (!groupId) return null
		return this.groups.get(groupId) ?? null
	}

	setLeader(groupId: string, entId: EntityId): boolean {
		const group = this.groups.get(groupId)
		if (!group || !group.members.has(entId)) return false
		group.leader = entId
		return true
	}

	setFormation(groupId: string, formation: FormationType): void {
		const group = this.groups.get(groupId)
		if (group) {
			group.formation = formation
		}
	}

	setTarget(groupId: string, pos: Vec3 | null): void {
		const group = this.groups.get(groupId)
		if (group) {
			group.targetPos = pos ? { ...pos } : null
		}
	}

	calSteering(entId: EntityId): Vec3 {
		if (!this.entityProvider) return { x: 0, y: 0, z: 0 }
		const ent = this.entityProvider.get(entId)
		if (!ent) return { x: 0, y: 0, z: 0 }
		const group = this.getGroup(entId)
		if (!group) return { x: 0, y: 0, z: 0 }
		const neighbors = this.getNeighbors(entId, group)
		if (neighbors.length === 0 && !group.targetPos) {
			return { x: 0, y: 0, z: 0 }
		}
		const sep = this.vecMul(this.calSeparation(entId, neighbors), this.cfg.sepWeight)
		const align = this.vecMul(this.calAlignment(entId, neighbors), this.cfg.alignWeight)
		const coh = this.vecMul(this.calCohesion(entId, neighbors), this.cfg.cohWeight)
		let steering = this.vecAdd(this.vecAdd(sep, align), coh)
		if (group.formation !== FormationType.None) {
			const formPos = this.getFormationPos(group.id, entId)
			if (formPos) {
				const toForm = this.vecSub(formPos, ent.transform.pos)
				steering = this.vecAdd(steering, this.vecMul(toForm, 0.8))
			}
		}
		if (group.targetPos && group.leader === entId) {
			const toTarget = this.vecSub(group.targetPos, ent.transform.pos)
			steering = this.vecAdd(steering, this.vecMul(this.vecNorm(toTarget), 2))
		}
		const len = this.vecLen(steering)
		if (len > this.cfg.maxForce) {
			steering = this.vecMul(this.vecNorm(steering), this.cfg.maxForce)
		}
		return steering
	}

	calSeparation(entId: EntityId, neighbors: EntityId[]): Vec3 {
		if (!this.entityProvider) return { x: 0, y: 0, z: 0 }
		const ent = this.entityProvider.get(entId)
		if (!ent) return { x: 0, y: 0, z: 0 }
		let steer = { x: 0, y: 0, z: 0 }
		let count = 0
		for (const nId of neighbors) {
			const n = this.entityProvider.get(nId)
			if (!n) continue
			const diff = this.vecSub(ent.transform.pos, n.transform.pos)
			const dist = this.vecLen(diff)
			if (dist > 0 && dist < this.cfg.sepDist) {
				const repel = this.vecMul(this.vecNorm(diff), 1 / dist)
				steer = this.vecAdd(steer, repel)
				count++
			}
		}
		if (count > 0) {
			steer = this.vecMul(steer, 1 / count)
		}
		return steer
	}

	calAlignment(entId: EntityId, neighbors: EntityId[]): Vec3 {
		if (neighbors.length === 0) return { x: 0, y: 0, z: 0 }
		let avgVel = { x: 0, y: 0, z: 0 }
		let count = 0
		for (const nId of neighbors) {
			const vel = this.velocities.get(nId)
			if (vel) {
				avgVel = this.vecAdd(avgVel, vel)
				count++
			}
		}
		if (count > 0) {
			avgVel = this.vecMul(avgVel, 1 / count)
			const curVel = this.velocities.get(entId) ?? { x: 0, y: 0, z: 0 }
			return this.vecSub(avgVel, curVel)
		}
		return { x: 0, y: 0, z: 0 }
	}

	calCohesion(entId: EntityId, neighbors: EntityId[]): Vec3 {
		if (!this.entityProvider || neighbors.length === 0) return { x: 0, y: 0, z: 0 }
		const ent = this.entityProvider.get(entId)
		if (!ent) return { x: 0, y: 0, z: 0 }
		let center = { x: 0, y: 0, z: 0 }
		let count = 0
		for (const nId of neighbors) {
			const n = this.entityProvider.get(nId)
			if (n) {
				center = this.vecAdd(center, n.transform.pos)
				count++
			}
		}
		if (count > 0) {
			center = this.vecMul(center, 1 / count)
			return this.vecSub(center, ent.transform.pos)
		}
		return { x: 0, y: 0, z: 0 }
	}

	getFormationPos(groupId: string, entId: EntityId): Vec3 | null {
		if (!this.entityProvider) return null
		const group = this.groups.get(groupId)
		if (!group || !group.leader) return null
		const leader = this.entityProvider.get(group.leader)
		if (!leader) return null
		if (entId === group.leader) return null
		const members = Array.from(group.members).filter(m => m !== group.leader)
		const idx = members.indexOf(entId)
		if (idx < 0) return null
		const leaderPos = leader.transform.pos
		const leaderRot = leader.transform.rot.y * Math.PI / 180
		const spacing = group.spacing
		let offset: Vec3
		switch (group.formation) {
			case FormationType.Line:
				offset = { x: 0, y: 0, z: -(idx + 1) * spacing }
				break
			case FormationType.Column:
				offset = { x: (idx % 2 === 0 ? 1 : -1) * spacing, y: 0, z: -Math.floor(idx / 2 + 1) * spacing }
				break
			case FormationType.Circle: {
				const angle = (idx / members.length) * Math.PI * 2
				const radius = spacing * 2
				offset = { x: Math.cos(angle) * radius, y: 0, z: Math.sin(angle) * radius }
				break
			}
			case FormationType.Wedge: {
				const row = Math.floor((Math.sqrt(1 + 8 * idx) - 1) / 2)
				const posInRow = idx - (row * (row + 1)) / 2
				const xOff = (posInRow - row / 2) * spacing
				offset = { x: xOff, y: 0, z: -(row + 1) * spacing }
				break
			}
			case FormationType.Square: {
				const side = Math.ceil(Math.sqrt(members.length))
				const row = Math.floor(idx / side)
				const col = idx % side
				offset = {
					x: (col - (side - 1) / 2) * spacing,
					y: 0,
					z: -(row + 1) * spacing
				}
				break
			}
			default:
				return null
		}
		const cos = Math.cos(leaderRot)
		const sin = Math.sin(leaderRot)
		return {
			x: leaderPos.x + offset.x * cos - offset.z * sin,
			y: leaderPos.y + offset.y,
			z: leaderPos.z + offset.x * sin + offset.z * cos
		}
	}

	upd(dt: number): void {
		if (!this.entityProvider) return
		for (const [entId, groupId] of this.entityGroups) {
			const ent = this.entityProvider.get(entId)
			if (!ent || !ent.alive) {
				this.delMember(groupId, entId)
				continue
			}
			const steering = this.calSteering(entId)
			let vel = this.velocities.get(entId) ?? { x: 0, y: 0, z: 0 }
			vel = this.vecAdd(vel, this.vecMul(steering, dt))
			const speed = this.vecLen(vel)
			if (speed > this.cfg.maxSpeed) {
				vel = this.vecMul(this.vecNorm(vel), this.cfg.maxSpeed)
			}
			this.velocities.set(entId, vel)
		}
	}

	getVelocity(entId: EntityId): Vec3 {
		return this.velocities.get(entId) ?? { x: 0, y: 0, z: 0 }
	}

	setVelocity(entId: EntityId, vel: Vec3): void {
		this.velocities.set(entId, { ...vel })
	}

	private getNeighbors(entId: EntityId, group: FlockGroup): EntityId[] {
		if (!this.entityProvider) return []
		const ent = this.entityProvider.get(entId)
		if (!ent) return []
		const neighbors: EntityId[] = []
		const maxDist = Math.max(this.cfg.sepDist, this.cfg.alignDist, this.cfg.cohDist)
		for (const memberId of group.members) {
			if (memberId === entId) continue
			const member = this.entityProvider.get(memberId)
			if (!member) continue
			const dist = this.vecDist(ent.transform.pos, member.transform.pos)
			if (dist <= maxDist) {
				if (this.isInViewAngle(ent.transform, member.transform.pos)) {
					neighbors.push(memberId)
				}
			}
		}
		return neighbors
	}

	private isInViewAngle(transform: { pos: Vec3; rot: Vec3 }, targetPos: Vec3): boolean {
		if (this.cfg.viewAngle >= 360) return true
		const yaw = transform.rot.y * Math.PI / 180
		const forward = { x: Math.sin(yaw), y: 0, z: Math.cos(yaw) }
		const toTarget = this.vecNorm(this.vecSub(targetPos, transform.pos))
		const dot = forward.x * toTarget.x + forward.z * toTarget.z
		const halfAngle = (this.cfg.viewAngle / 2) * Math.PI / 180
		return dot >= Math.cos(halfAngle)
	}

	private vecAdd(a: Vec3, b: Vec3): Vec3 {
		return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }
	}

	private vecSub(a: Vec3, b: Vec3): Vec3 {
		return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }
	}

	private vecMul(v: Vec3, s: number): Vec3 {
		return { x: v.x * s, y: v.y * s, z: v.z * s }
	}

	private vecLen(v: Vec3): number {
		return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z)
	}

	private vecNorm(v: Vec3): Vec3 {
		const len = this.vecLen(v)
		if (len < 0.0001) return { x: 0, y: 0, z: 0 }
		return { x: v.x / len, y: v.y / len, z: v.z / len }
	}

	private vecDist(a: Vec3, b: Vec3): number {
		return this.vecLen(this.vecSub(a, b))
	}
}
