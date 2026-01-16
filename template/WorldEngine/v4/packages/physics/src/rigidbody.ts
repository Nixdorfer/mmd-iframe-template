import { type Vec3, type EntityId, RigidBodyType } from '@engine/common'
import { vecAdd, vecMul, vecLen, vecNorm } from './collider'

export interface RigidBody {
	entityId: EntityId
	typ: RigidBodyType
	pos: Vec3
	rot: Vec3
	vel: Vec3
	angVel: Vec3
	force: Vec3
	torque: Vec3
	mass: number
	invMass: number
	inertia: Vec3
	invInertia: Vec3
	drag: number
	angDrag: number
	gravityScl: number
	bounce: number
	friction: number
	sleeping: boolean
	sleepThreshold: number
	sleepTimer: number
	enabled: boolean
}

export function createRigidBody(entityId: EntityId, typ: RigidBodyType, mass: number = 1): RigidBody {
	const invMass = typ === RigidBodyType.Static ? 0 : 1 / mass
	const inertia = { x: mass, y: mass, z: mass }
	const invInertia = typ === RigidBodyType.Static ? { x: 0, y: 0, z: 0 } : { x: 1 / mass, y: 1 / mass, z: 1 / mass }
	return {
		entityId,
		typ,
		pos: { x: 0, y: 0, z: 0 },
		rot: { x: 0, y: 0, z: 0 },
		vel: { x: 0, y: 0, z: 0 },
		angVel: { x: 0, y: 0, z: 0 },
		force: { x: 0, y: 0, z: 0 },
		torque: { x: 0, y: 0, z: 0 },
		mass,
		invMass,
		inertia,
		invInertia,
		drag: 0.01,
		angDrag: 0.05,
		gravityScl: 1.0,
		bounce: 0.3,
		friction: 0.5,
		sleeping: false,
		sleepThreshold: 0.01,
		sleepTimer: 0,
		enabled: true
	}
}

export function applyForce(rb: RigidBody, force: Vec3) {
	if (rb.typ === RigidBodyType.Static) return
	rb.force = vecAdd(rb.force, force)
	rb.sleeping = false
	rb.sleepTimer = 0
}

export function applyImpulse(rb: RigidBody, impulse: Vec3) {
	if (rb.typ === RigidBodyType.Static) return
	rb.vel = vecAdd(rb.vel, vecMul(impulse, rb.invMass))
	rb.sleeping = false
	rb.sleepTimer = 0
}

export function applyTorque(rb: RigidBody, torque: Vec3) {
	if (rb.typ === RigidBodyType.Static) return
	rb.torque = vecAdd(rb.torque, torque)
	rb.sleeping = false
	rb.sleepTimer = 0
}

export function applyAngularImpulse(rb: RigidBody, impulse: Vec3) {
	if (rb.typ === RigidBodyType.Static) return
	rb.angVel = vecAdd(rb.angVel, {
		x: impulse.x * rb.invInertia.x,
		y: impulse.y * rb.invInertia.y,
		z: impulse.z * rb.invInertia.z
	})
	rb.sleeping = false
	rb.sleepTimer = 0
}

export function applyForceAtPoint(rb: RigidBody, force: Vec3, point: Vec3) {
	if (rb.typ === RigidBodyType.Static) return
	applyForce(rb, force)
	const r = { x: point.x - rb.pos.x, y: point.y - rb.pos.y, z: point.z - rb.pos.z }
	const torque = {
		x: r.y * force.z - r.z * force.y,
		y: r.z * force.x - r.x * force.z,
		z: r.x * force.y - r.y * force.x
	}
	applyTorque(rb, torque)
}

export function setVel(rb: RigidBody, vel: Vec3) {
	if (rb.typ === RigidBodyType.Static) return
	rb.vel = { ...vel }
	rb.sleeping = false
	rb.sleepTimer = 0
}

export function setAngVel(rb: RigidBody, angVel: Vec3) {
	if (rb.typ === RigidBodyType.Static) return
	rb.angVel = { ...angVel }
	rb.sleeping = false
	rb.sleepTimer = 0
}

export function integrateForces(rb: RigidBody, dt: number, gravity: Vec3) {
	if (rb.typ === RigidBodyType.Static || !rb.enabled) return
	if (rb.sleeping) return
	const grav = vecMul(gravity, rb.gravityScl)
	rb.vel = vecAdd(rb.vel, vecMul(grav, dt))
	rb.vel = vecAdd(rb.vel, vecMul(rb.force, rb.invMass * dt))
	rb.angVel = vecAdd(rb.angVel, {
		x: rb.torque.x * rb.invInertia.x * dt,
		y: rb.torque.y * rb.invInertia.y * dt,
		z: rb.torque.z * rb.invInertia.z * dt
	})
	rb.vel = vecMul(rb.vel, 1 - rb.drag * dt)
	rb.angVel = vecMul(rb.angVel, 1 - rb.angDrag * dt)
	rb.force = { x: 0, y: 0, z: 0 }
	rb.torque = { x: 0, y: 0, z: 0 }
}

export function integrateVel(rb: RigidBody, dt: number) {
	if (rb.typ === RigidBodyType.Static || !rb.enabled) return
	if (rb.sleeping) return
	rb.pos = vecAdd(rb.pos, vecMul(rb.vel, dt))
	rb.rot = vecAdd(rb.rot, vecMul(rb.angVel, dt))
	const velMag = vecLen(rb.vel)
	const angMag = vecLen(rb.angVel)
	if (velMag < rb.sleepThreshold && angMag < rb.sleepThreshold) {
		rb.sleepTimer += dt
		if (rb.sleepTimer > 0.5) {
			rb.sleeping = true
			rb.vel = { x: 0, y: 0, z: 0 }
			rb.angVel = { x: 0, y: 0, z: 0 }
		}
	} else {
		rb.sleepTimer = 0
	}
}

export function wake(rb: RigidBody) {
	rb.sleeping = false
	rb.sleepTimer = 0
}

export function calKineticEnergy(rb: RigidBody): number {
	const velSq = rb.vel.x * rb.vel.x + rb.vel.y * rb.vel.y + rb.vel.z * rb.vel.z
	return 0.5 * rb.mass * velSq
}

export function calMomentum(rb: RigidBody): Vec3 {
	return vecMul(rb.vel, rb.mass)
}
