import { type Vec3, type EntityId, RigidBodyType } from '@engine/common'
import { type RigidBody, createRigidBody } from './rigidbody'
import { type HingeConstraint, type BallSocketConstraint, type AnyConstraint, ConstraintType, createHingeConstraint, createBallSocketConstraint } from './constraint'

export interface BoneDef {
	name: string
	parent: string | null
	pos: Vec3
	size: Vec3
	mass: number
}

export interface JointDef {
	name: string
	boneA: string
	boneB: string
	anchor: Vec3
	typ: 'hinge' | 'ball'
	axis?: Vec3
	minAngle?: number
	maxAngle?: number
	twistLimit?: number
	swingLimit?: number
}

export interface RagdollDef {
	bones: BoneDef[]
	joints: JointDef[]
}

export interface RagdollBone {
	name: string
	entityId: EntityId
	body: RigidBody
	size: Vec3
}

export interface RagdollJoint {
	name: string
	boneA: string
	boneB: string
	constraint: AnyConstraint
}

export class Ragdoll {
	id: string
	bones: Map<string, RagdollBone>
	joints: RagdollJoint[]
	enabled: boolean
	rootBone: string | null

	constructor(id: string) {
		this.id = id
		this.bones = new Map()
		this.joints = []
		this.enabled = false
		this.rootBone = null
	}

	getBonePos(name: string): Vec3 | null {
		const bone = this.bones.get(name)
		return bone ? { ...bone.body.pos } : null
	}

	getBoneRot(name: string): Vec3 | null {
		const bone = this.bones.get(name)
		return bone ? { ...bone.body.rot } : null
	}

	setRootPos(pos: Vec3) {
		if (!this.rootBone) return
		const root = this.bones.get(this.rootBone)
		if (root) {
			root.body.pos = { ...pos }
		}
	}

	applyForce(boneName: string, force: Vec3) {
		const bone = this.bones.get(boneName)
		if (bone) {
			bone.body.force.x += force.x
			bone.body.force.y += force.y
			bone.body.force.z += force.z
		}
	}

	applyImpulse(boneName: string, impulse: Vec3) {
		const bone = this.bones.get(boneName)
		if (bone) {
			bone.body.vel.x += impulse.x / bone.body.mass
			bone.body.vel.y += impulse.y / bone.body.mass
			bone.body.vel.z += impulse.z / bone.body.mass
		}
	}

	setEnabled(enabled: boolean) {
		this.enabled = enabled
		for (const bone of this.bones.values()) {
			bone.body.sleeping = !enabled
		}
	}

	getBoneTransforms(): Map<string, { pos: Vec3, rot: Vec3 }> {
		const transforms = new Map<string, { pos: Vec3, rot: Vec3 }>()
		for (const [name, bone] of this.bones) {
			transforms.set(name, {
				pos: { ...bone.body.pos },
				rot: { ...bone.body.rot }
			})
		}
		return transforms
	}
}

export class RagdollManager {
	ragdolls: Map<string, Ragdoll>
	templates: Map<string, RagdollDef>
	nextEntityId: number

	constructor() {
		this.ragdolls = new Map()
		this.templates = new Map()
		this.nextEntityId = 10000
	}

	registerTemplate(name: string, def: RagdollDef) {
		this.templates.set(name, def)
	}

	create(id: string, templateName: string, rootPos: Vec3): Ragdoll | null {
		const template = this.templates.get(templateName)
		if (!template) return null
		const ragdoll = new Ragdoll(id)
		const boneEntities = new Map<string, EntityId>()
		for (const boneDef of template.bones) {
			const entityId = this.nextEntityId++ as EntityId
			boneEntities.set(boneDef.name, entityId)
			const pos: Vec3 = {
				x: rootPos.x + boneDef.pos.x,
				y: rootPos.y + boneDef.pos.y,
				z: rootPos.z + boneDef.pos.z
			}
			const body = createRigidBody(entityId, RigidBodyType.Dynamic, boneDef.mass)
			body.pos = pos
			body.angDrag = 0.8
			body.drag = 0.3
			ragdoll.bones.set(boneDef.name, {
				name: boneDef.name,
				entityId,
				body,
				size: { ...boneDef.size }
			})
			if (!boneDef.parent) {
				ragdoll.rootBone = boneDef.name
			}
		}
		for (const jointDef of template.joints) {
			const entityA = boneEntities.get(jointDef.boneA)
			const entityB = boneEntities.get(jointDef.boneB)
			if (!entityA || !entityB) continue
			let constraint: AnyConstraint
			if (jointDef.typ === 'hinge') {
				const axis = jointDef.axis ?? { x: 1, y: 0, z: 0 }
				constraint = createHingeConstraint(
					entityA,
					entityB,
					{ ...jointDef.anchor },
					{ x: 0, y: 0, z: 0 },
					axis,
					axis,
					jointDef.minAngle ?? -Math.PI / 4,
					jointDef.maxAngle ?? Math.PI / 4
				)
			} else {
				constraint = createBallSocketConstraint(
					entityA,
					entityB,
					{ ...jointDef.anchor },
					{ x: 0, y: 0, z: 0 },
					jointDef.swingLimit ?? Math.PI / 3,
					jointDef.twistLimit ?? Math.PI / 6
				)
			}
			ragdoll.joints.push({
				name: jointDef.name,
				boneA: jointDef.boneA,
				boneB: jointDef.boneB,
				constraint
			})
		}
		this.ragdolls.set(id, ragdoll)
		return ragdoll
	}

	get(id: string): Ragdoll | null {
		return this.ragdolls.get(id) ?? null
	}

	remove(id: string) {
		this.ragdolls.delete(id)
	}

	upd(dt: number) {
		for (const ragdoll of this.ragdolls.values()) {
			if (!ragdoll.enabled) continue
			for (const bone of ragdoll.bones.values()) {
				this.integrateBone(bone.body, dt)
			}
		}
	}

	private integrateBone(body: RigidBody, dt: number) {
		if (body.sleeping || body.typ === RigidBodyType.Static) return
		const gravity: Vec3 = { x: 0, y: 0, z: -9.81 }
		body.vel.x += (body.force.x / body.mass + gravity.x) * dt
		body.vel.y += (body.force.y / body.mass + gravity.y) * dt
		body.vel.z += (body.force.z / body.mass + gravity.z) * dt
		body.vel.x *= (1 - body.drag * dt)
		body.vel.y *= (1 - body.drag * dt)
		body.vel.z *= (1 - body.drag * dt)
		body.pos.x += body.vel.x * dt
		body.pos.y += body.vel.y * dt
		body.pos.z += body.vel.z * dt
		body.angVel.x *= (1 - body.angDrag * dt)
		body.angVel.y *= (1 - body.angDrag * dt)
		body.angVel.z *= (1 - body.angDrag * dt)
		body.rot.x += body.angVel.x * dt
		body.rot.y += body.angVel.y * dt
		body.rot.z += body.angVel.z * dt
		body.force = { x: 0, y: 0, z: 0 }
		body.torque = { x: 0, y: 0, z: 0 }
	}

	clr() {
		this.ragdolls.clear()
	}
}

export const HUMANOID_TEMPLATE: RagdollDef = {
	bones: [
		{ name: 'pelvis', parent: null, pos: { x: 0, y: 0, z: 1.0 }, size: { x: 0.3, y: 0.2, z: 0.2 }, mass: 15 },
		{ name: 'spine', parent: 'pelvis', pos: { x: 0, y: 0, z: 1.3 }, size: { x: 0.25, y: 0.15, z: 0.3 }, mass: 10 },
		{ name: 'chest', parent: 'spine', pos: { x: 0, y: 0, z: 1.5 }, size: { x: 0.35, y: 0.2, z: 0.25 }, mass: 12 },
		{ name: 'head', parent: 'chest', pos: { x: 0, y: 0, z: 1.8 }, size: { x: 0.2, y: 0.2, z: 0.25 }, mass: 5 },
		{ name: 'upperArmL', parent: 'chest', pos: { x: -0.35, y: 0, z: 1.5 }, size: { x: 0.08, y: 0.08, z: 0.25 }, mass: 3 },
		{ name: 'upperArmR', parent: 'chest', pos: { x: 0.35, y: 0, z: 1.5 }, size: { x: 0.08, y: 0.08, z: 0.25 }, mass: 3 },
		{ name: 'lowerArmL', parent: 'upperArmL', pos: { x: -0.35, y: 0, z: 1.25 }, size: { x: 0.06, y: 0.06, z: 0.25 }, mass: 2 },
		{ name: 'lowerArmR', parent: 'upperArmR', pos: { x: 0.35, y: 0, z: 1.25 }, size: { x: 0.06, y: 0.06, z: 0.25 }, mass: 2 },
		{ name: 'upperLegL', parent: 'pelvis', pos: { x: -0.1, y: 0, z: 0.7 }, size: { x: 0.1, y: 0.1, z: 0.35 }, mass: 8 },
		{ name: 'upperLegR', parent: 'pelvis', pos: { x: 0.1, y: 0, z: 0.7 }, size: { x: 0.1, y: 0.1, z: 0.35 }, mass: 8 },
		{ name: 'lowerLegL', parent: 'upperLegL', pos: { x: -0.1, y: 0, z: 0.3 }, size: { x: 0.08, y: 0.08, z: 0.35 }, mass: 5 },
		{ name: 'lowerLegR', parent: 'upperLegR', pos: { x: 0.1, y: 0, z: 0.3 }, size: { x: 0.08, y: 0.08, z: 0.35 }, mass: 5 }
	],
	joints: [
		{ name: 'spine_joint', boneA: 'pelvis', boneB: 'spine', anchor: { x: 0, y: 0, z: 0.15 }, typ: 'ball', swingLimit: 0.3, twistLimit: 0.2 },
		{ name: 'chest_joint', boneA: 'spine', boneB: 'chest', anchor: { x: 0, y: 0, z: 0.1 }, typ: 'ball', swingLimit: 0.2, twistLimit: 0.15 },
		{ name: 'neck_joint', boneA: 'chest', boneB: 'head', anchor: { x: 0, y: 0, z: 0.15 }, typ: 'ball', swingLimit: 0.5, twistLimit: 0.7 },
		{ name: 'shoulderL', boneA: 'chest', boneB: 'upperArmL', anchor: { x: -0.2, y: 0, z: 0 }, typ: 'ball', swingLimit: 1.2, twistLimit: 0.8 },
		{ name: 'shoulderR', boneA: 'chest', boneB: 'upperArmR', anchor: { x: 0.2, y: 0, z: 0 }, typ: 'ball', swingLimit: 1.2, twistLimit: 0.8 },
		{ name: 'elbowL', boneA: 'upperArmL', boneB: 'lowerArmL', anchor: { x: 0, y: 0, z: -0.12 }, typ: 'hinge', axis: { x: 1, y: 0, z: 0 }, minAngle: 0, maxAngle: 2.5 },
		{ name: 'elbowR', boneA: 'upperArmR', boneB: 'lowerArmR', anchor: { x: 0, y: 0, z: -0.12 }, typ: 'hinge', axis: { x: 1, y: 0, z: 0 }, minAngle: 0, maxAngle: 2.5 },
		{ name: 'hipL', boneA: 'pelvis', boneB: 'upperLegL', anchor: { x: -0.1, y: 0, z: -0.1 }, typ: 'ball', swingLimit: 0.8, twistLimit: 0.3 },
		{ name: 'hipR', boneA: 'pelvis', boneB: 'upperLegR', anchor: { x: 0.1, y: 0, z: -0.1 }, typ: 'ball', swingLimit: 0.8, twistLimit: 0.3 },
		{ name: 'kneeL', boneA: 'upperLegL', boneB: 'lowerLegL', anchor: { x: 0, y: 0, z: -0.17 }, typ: 'hinge', axis: { x: 1, y: 0, z: 0 }, minAngle: -2.5, maxAngle: 0 },
		{ name: 'kneeR', boneA: 'upperLegR', boneB: 'lowerLegR', anchor: { x: 0, y: 0, z: -0.17 }, typ: 'hinge', axis: { x: 1, y: 0, z: 0 }, minAngle: -2.5, maxAngle: 0 }
	]
}
