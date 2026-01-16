import { type Vec3, type EntityId, ColliderType, RigidBodyType } from '@engine/common'
import {
	type AnyCollider, type BoxCollider, type SphereCollider, type CapsuleCollider,
	type CollisionPair, type Ray, type RayHit, type AABB,
	aabbFromBox, aabbFromSphere, aabbOverlap, sphereOverlap,
	rayAABB, raySphere, vecSub, vecAdd, vecMul, vecNorm, vecLen, vecDot, dist
} from './collider'
import {
	type RigidBody, createRigidBody, integrateForces, integrateVel, wake
} from './rigidbody'
import { type PhysMat, MAT_DEF, MAT_PRESET, combineFriction, combineBounce } from './material'
import { type AnyConstraint } from './constraint'
import { SeqImpSolver } from './solver'
import { CcdSystem } from './ccd'

export interface PhysicsConfig {
	gravity: Vec3
	maxSubSteps: number
	fixedDt: number
	broadphaseMargin: number
	sleepEnabled: boolean
	restitution: number
	friction: number
	solverIterations: number
	ccdEnabled: boolean
	ccdVelThreshold: number
}

export const DEFAULT_PHYSICS_CONFIG: PhysicsConfig = {
	gravity: { x: 0, y: 0, z: -9.81 },
	maxSubSteps: 4,
	fixedDt: 1 / 60,
	broadphaseMargin: 0.1,
	sleepEnabled: true,
	restitution: 0.3,
	friction: 0.5,
	solverIterations: 10,
	ccdEnabled: true,
	ccdVelThreshold: 10
}

export interface ContactPoint {
	point: Vec3
	normal: Vec3
	depth: number
	impulse: number
}

export interface ContactManifold {
	a: EntityId
	b: EntityId
	points: ContactPoint[]
	persistent: boolean
}

export type CollisionCallback = (a: EntityId, b: EntityId, manifold: ContactManifold) => void
export type TriggerCallback = (a: EntityId, b: EntityId, enter: boolean) => void

export class PhysicsWorld {
	cfg: PhysicsConfig
	bodies: Map<EntityId, RigidBody>
	colliders: Map<EntityId, AnyCollider>
	manifolds: Map<string, ContactManifold>
	activeTriggers: Set<string>
	accumulator: number
	onCollision: CollisionCallback | null
	onTrigger: TriggerCallback | null
	broadphasePairs: [EntityId, EntityId][]
	enabled: boolean
	constraints: Map<number, AnyConstraint>
	solver: SeqImpSolver
	ccd: CcdSystem
	materials: Map<string, PhysMat>

	constructor(cfg: Partial<PhysicsConfig> = {}) {
		this.cfg = { ...DEFAULT_PHYSICS_CONFIG, ...cfg }
		this.bodies = new Map()
		this.colliders = new Map()
		this.manifolds = new Map()
		this.activeTriggers = new Set()
		this.accumulator = 0
		this.onCollision = null
		this.onTrigger = null
		this.broadphasePairs = []
		this.enabled = true
		this.constraints = new Map()
		this.solver = new SeqImpSolver({ iterations: this.cfg.solverIterations })
		this.ccd = new CcdSystem({ enabled: this.cfg.ccdEnabled, velThreshold: this.cfg.ccdVelThreshold })
		this.materials = new Map(Object.entries(MAT_PRESET))
	}

	addBody(entityId: EntityId, typ: RigidBodyType, mass: number = 1): RigidBody {
		const body = createRigidBody(entityId, typ, mass)
		this.bodies.set(entityId, body)
		return body
	}

	removeBody(entityId: EntityId) {
		this.bodies.delete(entityId)
	}

	getBody(entityId: EntityId): RigidBody | undefined {
		return this.bodies.get(entityId)
	}

	addBoxCollider(entityId: EntityId, size: Vec3, offset: Vec3 = { x: 0, y: 0, z: 0 }, isTrg: boolean = false): BoxCollider {
		const collider: BoxCollider = {
			entityId,
			typ: ColliderType.Box,
			size: { ...size },
			offset: { ...offset },
			isTrg,
			enabled: true,
			layer: 1,
			mask: 0xFFFFFFFF
		}
		this.colliders.set(entityId, collider)
		return collider
	}

	addSphereCollider(entityId: EntityId, radius: number, offset: Vec3 = { x: 0, y: 0, z: 0 }, isTrg: boolean = false): SphereCollider {
		const collider: SphereCollider = {
			entityId,
			typ: ColliderType.Sphere,
			radius,
			offset: { ...offset },
			isTrg,
			enabled: true,
			layer: 1,
			mask: 0xFFFFFFFF
		}
		this.colliders.set(entityId, collider)
		return collider
	}

	addCapsuleCollider(entityId: EntityId, radius: number, height: number, offset: Vec3 = { x: 0, y: 0, z: 0 }, isTrg: boolean = false): CapsuleCollider {
		const collider: CapsuleCollider = {
			entityId,
			typ: ColliderType.Capsule,
			radius,
			height,
			offset: { ...offset },
			isTrg,
			enabled: true,
			layer: 1,
			mask: 0xFFFFFFFF
		}
		this.colliders.set(entityId, collider)
		return collider
	}

	removeCollider(entityId: EntityId) {
		this.colliders.delete(entityId)
	}

	getCollider(entityId: EntityId): AnyCollider | undefined {
		return this.colliders.get(entityId)
	}

	private pairKey(a: EntityId, b: EntityId): string {
		return a < b ? `${a}_${b}` : `${b}_${a}`
	}

	private getWorldAABB(collider: AnyCollider, body?: RigidBody): AABB {
		const pos = body ? vecAdd(body.pos, collider.offset) : collider.offset
		const m = this.cfg.broadphaseMargin
		switch (collider.typ) {
			case ColliderType.Box: {
				const bc = collider as BoxCollider
				const aabb = aabbFromBox(pos, bc.size)
				return {
					min: { x: aabb.min.x - m, y: aabb.min.y - m, z: aabb.min.z - m },
					max: { x: aabb.max.x + m, y: aabb.max.y + m, z: aabb.max.z + m }
				}
			}
			case ColliderType.Sphere: {
				const sc = collider as SphereCollider
				const r = sc.radius + m
				return {
					min: { x: pos.x - r, y: pos.y - r, z: pos.z - r },
					max: { x: pos.x + r, y: pos.y + r, z: pos.z + r }
				}
			}
			case ColliderType.Capsule: {
				const cc = collider as CapsuleCollider
				const r = cc.radius + m
				const h = cc.height / 2
				return {
					min: { x: pos.x - r, y: pos.y - r, z: pos.z - h - r },
					max: { x: pos.x + r, y: pos.y + r, z: pos.z + h + r }
				}
			}
			default:
				return { min: { ...pos }, max: { ...pos } }
		}
	}

	private broadphase() {
		this.broadphasePairs = []
		const entries = [...this.colliders.entries()]
		for (let i = 0; i < entries.length; i++) {
			const [idA, colA] = entries[i]
			if (!colA.enabled) continue
			const bodyA = this.bodies.get(idA)
			const aabbA = this.getWorldAABB(colA, bodyA)
			for (let j = i + 1; j < entries.length; j++) {
				const [idB, colB] = entries[j]
				if (!colB.enabled) continue
				if ((colA.layer & colB.mask) === 0 && (colB.layer & colA.mask) === 0) continue
				const bodyB = this.bodies.get(idB)
				const aabbB = this.getWorldAABB(colB, bodyB)
				if (aabbOverlap(aabbA, aabbB)) {
					this.broadphasePairs.push([idA, idB])
				}
			}
		}
	}

	private narrowphase(): CollisionPair[] {
		const pairs: CollisionPair[] = []
		for (const [idA, idB] of this.broadphasePairs) {
			const colA = this.colliders.get(idA)
			const colB = this.colliders.get(idB)
			if (!colA || !colB) continue
			const bodyA = this.bodies.get(idA)
			const bodyB = this.bodies.get(idB)
			const posA = bodyA ? vecAdd(bodyA.pos, colA.offset) : colA.offset
			const posB = bodyB ? vecAdd(bodyB.pos, colB.offset) : colB.offset
			const pair = this.testCollision(idA, colA, posA, idB, colB, posB)
			if (pair) {
				pairs.push(pair)
			}
		}
		return pairs
	}

	private testCollision(idA: EntityId, colA: AnyCollider, posA: Vec3, idB: EntityId, colB: AnyCollider, posB: Vec3): CollisionPair | null {
		if (colA.typ === ColliderType.Sphere && colB.typ === ColliderType.Sphere) {
			return this.sphereSphere(idA, colA as SphereCollider, posA, idB, colB as SphereCollider, posB)
		}
		if (colA.typ === ColliderType.Box && colB.typ === ColliderType.Box) {
			return this.boxBox(idA, colA as BoxCollider, posA, idB, colB as BoxCollider, posB)
		}
		if (colA.typ === ColliderType.Sphere && colB.typ === ColliderType.Box) {
			return this.sphereBox(idA, colA as SphereCollider, posA, idB, colB as BoxCollider, posB)
		}
		if (colA.typ === ColliderType.Box && colB.typ === ColliderType.Sphere) {
			const pair = this.sphereBox(idB, colB as SphereCollider, posB, idA, colA as BoxCollider, posA)
			if (pair) {
				pair.normal = vecMul(pair.normal, -1)
				const tmp = pair.a
				pair.a = pair.b
				pair.b = tmp
			}
			return pair
		}
		return null
	}

	private sphereSphere(idA: EntityId, colA: SphereCollider, posA: Vec3, idB: EntityId, colB: SphereCollider, posB: Vec3): CollisionPair | null {
		const d = vecSub(posB, posA)
		const distVal = vecLen(d)
		const radSum = colA.radius + colB.radius
		if (distVal >= radSum) return null
		const normal = distVal > 0.0001 ? vecMul(d, 1 / distVal) : { x: 0, y: 0, z: 1 }
		const depth = radSum - distVal
		const point = vecAdd(posA, vecMul(normal, colA.radius - depth / 2))
		return { a: idA, b: idB, point, normal, depth }
	}

	private boxBox(idA: EntityId, colA: BoxCollider, posA: Vec3, idB: EntityId, colB: BoxCollider, posB: Vec3): CollisionPair | null {
		const d = vecSub(posB, posA)
		const overlapX = (colA.size.x + colB.size.x) / 2 - Math.abs(d.x)
		const overlapY = (colA.size.y + colB.size.y) / 2 - Math.abs(d.y)
		const overlapZ = (colA.size.z + colB.size.z) / 2 - Math.abs(d.z)
		if (overlapX <= 0 || overlapY <= 0 || overlapZ <= 0) return null
		let normal: Vec3
		let depth: number
		if (overlapX < overlapY && overlapX < overlapZ) {
			depth = overlapX
			normal = { x: d.x > 0 ? 1 : -1, y: 0, z: 0 }
		} else if (overlapY < overlapZ) {
			depth = overlapY
			normal = { x: 0, y: d.y > 0 ? 1 : -1, z: 0 }
		} else {
			depth = overlapZ
			normal = { x: 0, y: 0, z: d.z > 0 ? 1 : -1 }
		}
		const point = vecAdd(posA, vecMul(d, 0.5))
		return { a: idA, b: idB, point, normal, depth }
	}

	private sphereBox(idA: EntityId, colA: SphereCollider, posA: Vec3, idB: EntityId, colB: BoxCollider, posB: Vec3): CollisionPair | null {
		const halfSize = vecMul(colB.size, 0.5)
		const localSphere = vecSub(posA, posB)
		const closest: Vec3 = {
			x: Math.max(-halfSize.x, Math.min(halfSize.x, localSphere.x)),
			y: Math.max(-halfSize.y, Math.min(halfSize.y, localSphere.y)),
			z: Math.max(-halfSize.z, Math.min(halfSize.z, localSphere.z))
		}
		const d = vecSub(localSphere, closest)
		const distVal = vecLen(d)
		if (distVal >= colA.radius) return null
		const normal = distVal > 0.0001 ? vecMul(d, 1 / distVal) : { x: 0, y: 0, z: 1 }
		const depth = colA.radius - distVal
		const point = vecAdd(posB, closest)
		return { a: idA, b: idB, point, normal, depth }
	}

	private resolveCollision(pair: CollisionPair) {
		const colA = this.colliders.get(pair.a)
		const colB = this.colliders.get(pair.b)
		if (!colA || !colB) return
		if (colA.isTrg || colB.isTrg) {
			const key = this.pairKey(pair.a, pair.b)
			const wasActive = this.activeTriggers.has(key)
			this.activeTriggers.add(key)
			if (!wasActive && this.onTrigger) {
				this.onTrigger(pair.a, pair.b, true)
			}
			return
		}
		const bodyA = this.bodies.get(pair.a)
		const bodyB = this.bodies.get(pair.b)
		if (!bodyA && !bodyB) return
		const invMassA = bodyA?.invMass ?? 0
		const invMassB = bodyB?.invMass ?? 0
		const totalInvMass = invMassA + invMassB
		if (totalInvMass === 0) return
		const sep = vecMul(pair.normal, pair.depth / totalInvMass)
		if (bodyA && bodyA.typ !== RigidBodyType.Static) {
			bodyA.pos = vecSub(bodyA.pos, vecMul(sep, invMassA))
			wake(bodyA)
		}
		if (bodyB && bodyB.typ !== RigidBodyType.Static) {
			bodyB.pos = vecAdd(bodyB.pos, vecMul(sep, invMassB))
			wake(bodyB)
		}
		const velA = bodyA?.vel ?? { x: 0, y: 0, z: 0 }
		const velB = bodyB?.vel ?? { x: 0, y: 0, z: 0 }
		const relVel = vecSub(velB, velA)
		const normalVel = vecDot(relVel, pair.normal)
		if (normalVel > 0) return
		const matA = colA.matId ? this.materials.get(colA.matId) ?? MAT_DEF : MAT_DEF
		const matB = colB.matId ? this.materials.get(colB.matId) ?? MAT_DEF : MAT_DEF
		const e = combineBounce(matA, matB)
		const j = -(1 + e) * normalVel / totalInvMass
		const impulse = vecMul(pair.normal, j)
		if (bodyA && bodyA.typ !== RigidBodyType.Static) {
			bodyA.vel = vecSub(bodyA.vel, vecMul(impulse, invMassA))
		}
		if (bodyB && bodyB.typ !== RigidBodyType.Static) {
			bodyB.vel = vecAdd(bodyB.vel, vecMul(impulse, invMassB))
		}
		const tangent = vecSub(relVel, vecMul(pair.normal, normalVel))
		const tangentLen = vecLen(tangent)
		if (tangentLen > 0.0001) {
			const tangentNorm = vecMul(tangent, 1 / tangentLen)
			const mu = combineFriction(matA, matB)
			const jt = -vecDot(relVel, tangentNorm) / totalInvMass
			const frictionImpulse = Math.abs(jt) < j * mu
				? vecMul(tangentNorm, jt)
				: vecMul(tangentNorm, -j * mu)
			if (bodyA && bodyA.typ !== RigidBodyType.Static) {
				bodyA.vel = vecSub(bodyA.vel, vecMul(frictionImpulse, invMassA))
			}
			if (bodyB && bodyB.typ !== RigidBodyType.Static) {
				bodyB.vel = vecAdd(bodyB.vel, vecMul(frictionImpulse, invMassB))
			}
		}
		if (this.onCollision) {
			const manifold: ContactManifold = {
				a: pair.a,
				b: pair.b,
				points: [{ point: pair.point, normal: pair.normal, depth: pair.depth, impulse: j }],
				persistent: false
			}
			this.onCollision(pair.a, pair.b, manifold)
		}
	}

	step(dt: number) {
		if (!this.enabled) return
		this.accumulator += dt
		let steps = 0
		while (this.accumulator >= this.cfg.fixedDt && steps < this.cfg.maxSubSteps) {
			this.fixedStep(this.cfg.fixedDt)
			this.accumulator -= this.cfg.fixedDt
			steps++
		}
	}

	private fixedStep(dt: number) {
		for (const body of this.bodies.values()) {
			integrateForces(body, dt, this.cfg.gravity)
		}
		for (const body of this.bodies.values()) {
			integrateVel(body, dt)
		}
		if (this.cfg.ccdEnabled) {
			for (const [id, body] of this.bodies) {
				this.ccd.markHighSpeed(body, id)
			}
		}
		this.broadphase()
		if (this.cfg.ccdEnabled && this.ccd.highSpeedBodies.size > 0) {
			const toiResults = this.ccd.detectTunneling(this.broadphasePairs, this.bodies, this.colliders, dt)
			for (const toi of toiResults) {
				if (toi.hit && toi.toi < dt) {
					const bodyA = this.bodies.get(toi.entityA)
					const bodyB = this.bodies.get(toi.entityB)
					if (bodyA) bodyA.pos = vecSub(bodyA.pos, vecMul(bodyA.vel, dt - toi.toi))
					if (bodyB) bodyB.pos = vecSub(bodyB.pos, vecMul(bodyB.vel, dt - toi.toi))
				}
			}
		}
		const pairs = this.narrowphase()
		const curTriggers = new Set<string>()
		for (const pair of pairs) {
			const colA = this.colliders.get(pair.a)
			const colB = this.colliders.get(pair.b)
			if (colA?.isTrg || colB?.isTrg) {
				curTriggers.add(this.pairKey(pair.a, pair.b))
			}
			this.resolveCollision(pair)
		}
		this.solver.solve(this.bodies, dt)
		this.solver.solvePositions(this.bodies, dt)
		for (const key of this.activeTriggers) {
			if (!curTriggers.has(key)) {
				const [a, b] = key.split('_').map(Number)
				if (this.onTrigger) {
					this.onTrigger(a, b, false)
				}
			}
		}
		this.activeTriggers = curTriggers
	}

	raycast(ray: Ray, layerMask: number = 0xFFFFFFFF): RayHit {
		let closest: RayHit = { hit: false, point: { x: 0, y: 0, z: 0 }, normal: { x: 0, y: 0, z: 0 }, dist: Infinity, entityId: 0 }
		for (const [id, col] of this.colliders) {
			if (!col.enabled || (col.layer & layerMask) === 0) continue
			const body = this.bodies.get(id)
			const pos = body ? vecAdd(body.pos, col.offset) : col.offset
			let hit: RayHit
			switch (col.typ) {
				case ColliderType.Sphere: {
					const sc = col as SphereCollider
					hit = raySphere(ray, { center: pos, radius: sc.radius })
					break
				}
				case ColliderType.Box: {
					const bc = col as BoxCollider
					hit = rayAABB(ray, aabbFromBox(pos, bc.size))
					break
				}
				default:
					continue
			}
			if (hit.hit && hit.dist < closest.dist) {
				closest = hit
				closest.entityId = id
			}
		}
		return closest
	}

	overlapSphere(center: Vec3, radius: number, layerMask: number = 0xFFFFFFFF): EntityId[] {
		const result: EntityId[] = []
		for (const [id, col] of this.colliders) {
			if (!col.enabled || (col.layer & layerMask) === 0) continue
			const body = this.bodies.get(id)
			const pos = body ? vecAdd(body.pos, col.offset) : col.offset
			let overlap = false
			switch (col.typ) {
				case ColliderType.Sphere: {
					const sc = col as SphereCollider
					overlap = sphereOverlap({ center, radius }, { center: pos, radius: sc.radius })
					break
				}
				case ColliderType.Box: {
					const bc = col as BoxCollider
					const aabb = aabbFromBox(pos, bc.size)
					const closest: Vec3 = {
						x: Math.max(aabb.min.x, Math.min(center.x, aabb.max.x)),
						y: Math.max(aabb.min.y, Math.min(center.y, aabb.max.y)),
						z: Math.max(aabb.min.z, Math.min(center.z, aabb.max.z))
					}
					overlap = dist(center, closest) <= radius
					break
				}
			}
			if (overlap) result.push(id)
		}
		return result
	}

	setEnabled(enabled: boolean) {
		this.enabled = enabled
	}

	clr() {
		this.bodies.clear()
		this.colliders.clear()
		this.manifolds.clear()
		this.activeTriggers.clear()
		this.broadphasePairs = []
		this.constraints.clear()
		this.solver.clr()
		this.ccd.clr()
	}

	addConstraint(c: AnyConstraint): number {
		this.constraints.set(c.id, c)
		this.solver.addConstraint(c)
		return c.id
	}

	removeConstraint(id: number): void {
		this.constraints.delete(id)
		this.solver.removeConstraint(id)
	}

	getConstraint(id: number): AnyConstraint | undefined {
		return this.constraints.get(id)
	}

	addMaterial(mat: PhysMat): void {
		this.materials.set(mat.name, mat)
	}

	getMaterial(name: string): PhysMat | undefined {
		return this.materials.get(name)
	}

	setColliderMaterial(entityId: EntityId, matId: string): void {
		const col = this.colliders.get(entityId)
		if (col) {
			col.matId = matId
		}
	}
}
