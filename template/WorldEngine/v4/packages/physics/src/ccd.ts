import { type Vec3, type EntityId, ColliderType } from '@engine/common'
import { type RigidBody } from './rigidbody'
import { type AnyCollider, type BoxCollider, type SphereCollider, type AABB, vecSub, vecAdd, vecMul, vecLen, vecNorm, vecDot } from './collider'

export interface CcdCfg {
	enabled: boolean
	velThreshold: number
	maxIterations: number
	tolerance: number
}

export const DEFAULT_CCD_CFG: CcdCfg = {
	enabled: true,
	velThreshold: 10,
	maxIterations: 8,
	tolerance: 0.001
}

export interface ToiResult {
	hit: boolean
	toi: number
	normal: Vec3
	point: Vec3
	entityA: EntityId
	entityB: EntityId
}

export class CcdSystem {
	cfg: CcdCfg
	highSpeedBodies: Set<EntityId>

	constructor(cfg: Partial<CcdCfg> = {}) {
		this.cfg = { ...DEFAULT_CCD_CFG, ...cfg }
		this.highSpeedBodies = new Set()
	}

	markHighSpeed(body: RigidBody, entityId: EntityId) {
		const speed = vecLen(body.vel)
		if (speed > this.cfg.velThreshold) {
			this.highSpeedBodies.add(entityId)
		} else {
			this.highSpeedBodies.delete(entityId)
		}
	}

	detectTunneling(
		pairs: [EntityId, EntityId][],
		bodies: Map<EntityId, RigidBody>,
		colliders: Map<EntityId, AnyCollider>,
		dt: number
	): ToiResult[] {
		const results: ToiResult[] = []
		for (const [idA, idB] of pairs) {
			if (!this.highSpeedBodies.has(idA) && !this.highSpeedBodies.has(idB)) continue
			const bodyA = bodies.get(idA)
			const bodyB = bodies.get(idB)
			const colA = colliders.get(idA)
			const colB = colliders.get(idB)
			if (!colA || !colB) continue
			const velA = bodyA?.vel ?? { x: 0, y: 0, z: 0 }
			const velB = bodyB?.vel ?? { x: 0, y: 0, z: 0 }
			const posA = bodyA ? vecAdd(bodyA.pos, colA.offset) : colA.offset
			const posB = bodyB ? vecAdd(bodyB.pos, colB.offset) : colB.offset
			const toi = this.calcToi(colA, posA, velA, colB, posB, velB, dt)
			if (toi.hit) {
				toi.entityA = idA
				toi.entityB = idB
				results.push(toi)
			}
		}
		results.sort((a, b) => a.toi - b.toi)
		return results
	}

	private calcToi(
		colA: AnyCollider, posA: Vec3, velA: Vec3,
		colB: AnyCollider, posB: Vec3, velB: Vec3,
		dt: number
	): ToiResult {
		if (colA.typ === ColliderType.Sphere && colB.typ === ColliderType.Sphere) {
			return this.toiSphereSphere(
				posA, (colA as SphereCollider).radius, velA,
				posB, (colB as SphereCollider).radius, velB,
				dt
			)
		}
		if (colA.typ === ColliderType.Sphere && colB.typ === ColliderType.Box) {
			return this.toiSphereBox(
				posA, (colA as SphereCollider).radius, velA,
				posB, (colB as BoxCollider).size, velB,
				dt
			)
		}
		if (colA.typ === ColliderType.Box && colB.typ === ColliderType.Sphere) {
			const result = this.toiSphereBox(
				posB, (colB as SphereCollider).radius, velB,
				posA, (colA as BoxCollider).size, velA,
				dt
			)
			if (result.hit) {
				result.normal = vecMul(result.normal, -1)
			}
			return result
		}
		if (colA.typ === ColliderType.Box && colB.typ === ColliderType.Box) {
			return this.toiBoxBox(
				posA, (colA as BoxCollider).size, velA,
				posB, (colB as BoxCollider).size, velB,
				dt
			)
		}
		return { hit: false, toi: dt, normal: { x: 0, y: 0, z: 0 }, point: { x: 0, y: 0, z: 0 }, entityA: 0, entityB: 0 }
	}

	private toiSphereSphere(
		posA: Vec3, radA: number, velA: Vec3,
		posB: Vec3, radB: number, velB: Vec3,
		dt: number
	): ToiResult {
		const relVel = vecSub(velB, velA)
		const relPos = vecSub(posB, posA)
		const sumRad = radA + radB
		const a = vecDot(relVel, relVel)
		const b = 2 * vecDot(relPos, relVel)
		const c = vecDot(relPos, relPos) - sumRad * sumRad
		if (c < 0) {
			const normal = vecLen(relPos) > 0.0001 ? vecNorm(relPos) : { x: 0, y: 0, z: 1 }
			return { hit: true, toi: 0, normal, point: vecAdd(posA, vecMul(normal, radA)), entityA: 0, entityB: 0 }
		}
		if (Math.abs(a) < 0.0001) {
			return { hit: false, toi: dt, normal: { x: 0, y: 0, z: 0 }, point: { x: 0, y: 0, z: 0 }, entityA: 0, entityB: 0 }
		}
		const disc = b * b - 4 * a * c
		if (disc < 0) {
			return { hit: false, toi: dt, normal: { x: 0, y: 0, z: 0 }, point: { x: 0, y: 0, z: 0 }, entityA: 0, entityB: 0 }
		}
		const sqrtDisc = Math.sqrt(disc)
		const t = (-b - sqrtDisc) / (2 * a)
		if (t < 0 || t > dt) {
			return { hit: false, toi: dt, normal: { x: 0, y: 0, z: 0 }, point: { x: 0, y: 0, z: 0 }, entityA: 0, entityB: 0 }
		}
		const hitPosA = vecAdd(posA, vecMul(velA, t))
		const hitPosB = vecAdd(posB, vecMul(velB, t))
		const normal = vecNorm(vecSub(hitPosB, hitPosA))
		const point = vecAdd(hitPosA, vecMul(normal, radA))
		return { hit: true, toi: t, normal, point, entityA: 0, entityB: 0 }
	}

	private toiSphereBox(
		spherePos: Vec3, radius: number, sphereVel: Vec3,
		boxPos: Vec3, boxSize: Vec3, boxVel: Vec3,
		dt: number
	): ToiResult {
		const relVel = vecSub(sphereVel, boxVel)
		const halfSize = vecMul(boxSize, 0.5)
		let tMin = 0
		let tMax = dt
		let hitNormal: Vec3 = { x: 0, y: 0, z: 0 }
		const axes = ['x', 'y', 'z'] as const
		for (const axis of axes) {
			const relPos = spherePos[axis] - boxPos[axis]
			const vel = relVel[axis]
			const minBound = -halfSize[axis] - radius
			const maxBound = halfSize[axis] + radius
			if (Math.abs(vel) < 0.0001) {
				if (relPos < minBound || relPos > maxBound) {
					return { hit: false, toi: dt, normal: { x: 0, y: 0, z: 0 }, point: { x: 0, y: 0, z: 0 }, entityA: 0, entityB: 0 }
				}
			} else {
				let t1 = (minBound - relPos) / vel
				let t2 = (maxBound - relPos) / vel
				let normal1: Vec3 = { x: 0, y: 0, z: 0 }
				let normal2: Vec3 = { x: 0, y: 0, z: 0 }
				if (axis === 'x') { normal1 = { x: -1, y: 0, z: 0 }; normal2 = { x: 1, y: 0, z: 0 } }
				if (axis === 'y') { normal1 = { x: 0, y: -1, z: 0 }; normal2 = { x: 0, y: 1, z: 0 } }
				if (axis === 'z') { normal1 = { x: 0, y: 0, z: -1 }; normal2 = { x: 0, y: 0, z: 1 } }
				if (t1 > t2) {
					const tmp = t1; t1 = t2; t2 = tmp
					const tmpN = normal1; normal1 = normal2; normal2 = tmpN
				}
				if (t1 > tMin) {
					tMin = t1
					hitNormal = normal1
				}
				tMax = Math.min(tMax, t2)
				if (tMin > tMax) {
					return { hit: false, toi: dt, normal: { x: 0, y: 0, z: 0 }, point: { x: 0, y: 0, z: 0 }, entityA: 0, entityB: 0 }
				}
			}
		}
		if (tMin < 0) tMin = 0
		if (tMin > dt) {
			return { hit: false, toi: dt, normal: { x: 0, y: 0, z: 0 }, point: { x: 0, y: 0, z: 0 }, entityA: 0, entityB: 0 }
		}
		const hitSpherePos = vecAdd(spherePos, vecMul(sphereVel, tMin))
		const point = vecAdd(hitSpherePos, vecMul(hitNormal, -radius))
		return { hit: true, toi: tMin, normal: hitNormal, point, entityA: 0, entityB: 0 }
	}

	private toiBoxBox(
		posA: Vec3, sizeA: Vec3, velA: Vec3,
		posB: Vec3, sizeB: Vec3, velB: Vec3,
		dt: number
	): ToiResult {
		const relVel = vecSub(velB, velA)
		const relPos = vecSub(posB, posA)
		const halfA = vecMul(sizeA, 0.5)
		const halfB = vecMul(sizeB, 0.5)
		let tMin = 0
		let tMax = dt
		let hitNormal: Vec3 = { x: 0, y: 0, z: 0 }
		const axes = ['x', 'y', 'z'] as const
		for (const axis of axes) {
			const aMin = -halfA[axis]
			const aMax = halfA[axis]
			const bMin = relPos[axis] - halfB[axis]
			const bMax = relPos[axis] + halfB[axis]
			const vel = relVel[axis]
			if (Math.abs(vel) < 0.0001) {
				if (bMax < aMin || bMin > aMax) {
					return { hit: false, toi: dt, normal: { x: 0, y: 0, z: 0 }, point: { x: 0, y: 0, z: 0 }, entityA: 0, entityB: 0 }
				}
			} else {
				let t1 = (aMin - bMax) / vel
				let t2 = (aMax - bMin) / vel
				let normal1: Vec3 = { x: 0, y: 0, z: 0 }
				let normal2: Vec3 = { x: 0, y: 0, z: 0 }
				if (axis === 'x') { normal1 = { x: -1, y: 0, z: 0 }; normal2 = { x: 1, y: 0, z: 0 } }
				if (axis === 'y') { normal1 = { x: 0, y: -1, z: 0 }; normal2 = { x: 0, y: 1, z: 0 } }
				if (axis === 'z') { normal1 = { x: 0, y: 0, z: -1 }; normal2 = { x: 0, y: 0, z: 1 } }
				if (t1 > t2) {
					const tmp = t1; t1 = t2; t2 = tmp
					const tmpN = normal1; normal1 = normal2; normal2 = tmpN
				}
				if (t1 > tMin) {
					tMin = t1
					hitNormal = normal1
				}
				tMax = Math.min(tMax, t2)
				if (tMin > tMax) {
					return { hit: false, toi: dt, normal: { x: 0, y: 0, z: 0 }, point: { x: 0, y: 0, z: 0 }, entityA: 0, entityB: 0 }
				}
			}
		}
		if (tMin < 0) tMin = 0
		if (tMin > dt) {
			return { hit: false, toi: dt, normal: { x: 0, y: 0, z: 0 }, point: { x: 0, y: 0, z: 0 }, entityA: 0, entityB: 0 }
		}
		const hitPosB = vecAdd(posB, vecMul(velB, tMin))
		const point = vecAdd(hitPosB, vecMul(hitNormal, -halfB.x))
		return { hit: true, toi: tMin, normal: hitNormal, point, entityA: 0, entityB: 0 }
	}

	clr() {
		this.highSpeedBodies.clear()
	}
}

export function calSweptAABB(pos: Vec3, size: Vec3, vel: Vec3, dt: number): AABB {
	const halfSize = vecMul(size, 0.5)
	const endPos = vecAdd(pos, vecMul(vel, dt))
	return {
		min: {
			x: Math.min(pos.x, endPos.x) - halfSize.x,
			y: Math.min(pos.y, endPos.y) - halfSize.y,
			z: Math.min(pos.z, endPos.z) - halfSize.z
		},
		max: {
			x: Math.max(pos.x, endPos.x) + halfSize.x,
			y: Math.max(pos.y, endPos.y) + halfSize.y,
			z: Math.max(pos.z, endPos.z) + halfSize.z
		}
	}
}

export function calSweptSphereAABB(pos: Vec3, radius: number, vel: Vec3, dt: number): AABB {
	const endPos = vecAdd(pos, vecMul(vel, dt))
	return {
		min: {
			x: Math.min(pos.x, endPos.x) - radius,
			y: Math.min(pos.y, endPos.y) - radius,
			z: Math.min(pos.z, endPos.z) - radius
		},
		max: {
			x: Math.max(pos.x, endPos.x) + radius,
			y: Math.max(pos.y, endPos.y) + radius,
			z: Math.max(pos.z, endPos.z) + radius
		}
	}
}
