import { type Vec3, type EntityId, RigidBodyType } from '@engine/common'
import { type RigidBody, applyImpulse, applyAngularImpulse, wake } from './rigidbody'
import {
	type AnyConstraint, type DistConstraint, type HingeConstraint, type BallSocketConstraint,
	type SliderConstraint, type FixedConstraint, type SpringConstraint, ConstraintType
} from './constraint'
import { vecAdd, vecSub, vecMul, vecLen, vecNorm, vecDot, vecCross } from './collider'

export interface SolverCfg {
	iterations: number
	warmStart: boolean
	baumgarte: number
	slop: number
}

export const DEFAULT_SOLVER_CFG: SolverCfg = {
	iterations: 10,
	warmStart: true,
	baumgarte: 0.2,
	slop: 0.005
}

interface ConstraintData {
	constraint: AnyConstraint
	impulse: number
	angImpulseA: Vec3
	angImpulseB: Vec3
}

export class SeqImpSolver {
	cfg: SolverCfg
	constraints: Map<number, ConstraintData>

	constructor(cfg: Partial<SolverCfg> = {}) {
		this.cfg = { ...DEFAULT_SOLVER_CFG, ...cfg }
		this.constraints = new Map()
	}

	addConstraint(c: AnyConstraint) {
		this.constraints.set(c.id, {
			constraint: c,
			impulse: 0,
			angImpulseA: { x: 0, y: 0, z: 0 },
			angImpulseB: { x: 0, y: 0, z: 0 }
		})
	}

	removeConstraint(id: number) {
		this.constraints.delete(id)
	}

	solve(bodies: Map<EntityId, RigidBody>, dt: number) {
		if (this.cfg.warmStart) {
			this.warmStartImpulses(bodies)
		}
		for (let i = 0; i < this.cfg.iterations; i++) {
			for (const data of this.constraints.values()) {
				if (!data.constraint.enabled || data.constraint.broken) continue
				const bodyA = bodies.get(data.constraint.bodyA)
				const bodyB = bodies.get(data.constraint.bodyB)
				if (!bodyA || !bodyB) continue
				this.solveConstraint(data, bodyA, bodyB, dt)
			}
		}
	}

	solvePositions(bodies: Map<EntityId, RigidBody>, dt: number) {
		for (const data of this.constraints.values()) {
			if (!data.constraint.enabled || data.constraint.broken) continue
			const bodyA = bodies.get(data.constraint.bodyA)
			const bodyB = bodies.get(data.constraint.bodyB)
			if (!bodyA || !bodyB) continue
			this.solvePositionConstraint(data, bodyA, bodyB, dt)
		}
	}

	private warmStartImpulses(bodies: Map<EntityId, RigidBody>) {
		for (const data of this.constraints.values()) {
			if (!data.constraint.enabled || data.constraint.broken) continue
			const bodyA = bodies.get(data.constraint.bodyA)
			const bodyB = bodies.get(data.constraint.bodyB)
			if (!bodyA || !bodyB) continue
			if (data.impulse !== 0) {
				const c = data.constraint
				const rA = vecSub(vecAdd(bodyA.pos, c.anchorA), bodyA.pos)
				const rB = vecSub(vecAdd(bodyB.pos, c.anchorB), bodyB.pos)
				const n = vecNorm(vecSub(vecAdd(bodyB.pos, c.anchorB), vecAdd(bodyA.pos, c.anchorA)))
				const impulse = vecMul(n, data.impulse * 0.8)
				if (bodyA.typ !== RigidBodyType.Static) {
					applyImpulse(bodyA, vecMul(impulse, -1))
					applyAngularImpulse(bodyA, vecCross(rA, vecMul(impulse, -1)))
				}
				if (bodyB.typ !== RigidBodyType.Static) {
					applyImpulse(bodyB, impulse)
					applyAngularImpulse(bodyB, vecCross(rB, impulse))
				}
			}
		}
	}

	private solveConstraint(data: ConstraintData, bodyA: RigidBody, bodyB: RigidBody, dt: number) {
		const c = data.constraint
		switch (c.typ) {
			case ConstraintType.Dist:
				this.solveDist(data, c, bodyA, bodyB, dt)
				break
			case ConstraintType.Hinge:
				this.solveHinge(data, c, bodyA, bodyB, dt)
				break
			case ConstraintType.BallSocket:
				this.solveBallSocket(data, c, bodyA, bodyB, dt)
				break
			case ConstraintType.Slider:
				this.solveSlider(data, c, bodyA, bodyB, dt)
				break
			case ConstraintType.Fixed:
				this.solveFixed(data, c, bodyA, bodyB, dt)
				break
			case ConstraintType.Spring:
				this.solveSpring(data, c, bodyA, bodyB, dt)
				break
		}
	}

	private solvePositionConstraint(data: ConstraintData, bodyA: RigidBody, bodyB: RigidBody, dt: number) {
		const c = data.constraint
		const worldA = vecAdd(bodyA.pos, c.anchorA)
		const worldB = vecAdd(bodyB.pos, c.anchorB)
		const delta = vecSub(worldB, worldA)
		const dist = vecLen(delta)
		if (dist < 0.0001) return
		let error = 0
		if (c.typ === ConstraintType.Dist) {
			const dc = c as DistConstraint
			if (dist < dc.minDist) error = dist - dc.minDist
			else if (dist > dc.maxDist) error = dist - dc.maxDist
		} else if (c.typ === ConstraintType.BallSocket || c.typ === ConstraintType.Fixed) {
			error = dist
		}
		if (Math.abs(error) < this.cfg.slop) return
		const n = vecMul(delta, 1 / dist)
		const correction = error * this.cfg.baumgarte
		const totalInvMass = bodyA.invMass + bodyB.invMass
		if (totalInvMass === 0) return
		if (bodyA.typ !== RigidBodyType.Static) {
			bodyA.pos = vecAdd(bodyA.pos, vecMul(n, correction * bodyA.invMass / totalInvMass))
			wake(bodyA)
		}
		if (bodyB.typ !== RigidBodyType.Static) {
			bodyB.pos = vecSub(bodyB.pos, vecMul(n, correction * bodyB.invMass / totalInvMass))
			wake(bodyB)
		}
	}

	private solveDist(data: ConstraintData, c: DistConstraint, bodyA: RigidBody, bodyB: RigidBody, dt: number) {
		const worldA = vecAdd(bodyA.pos, c.anchorA)
		const worldB = vecAdd(bodyB.pos, c.anchorB)
		const delta = vecSub(worldB, worldA)
		const dist = vecLen(delta)
		if (dist < 0.0001) return
		let error = 0
		if (dist < c.minDist) error = dist - c.minDist
		else if (dist > c.maxDist) error = dist - c.maxDist
		else return
		const n = vecMul(delta, 1 / dist)
		const rA = c.anchorA
		const rB = c.anchorB
		const velA = vecAdd(bodyA.vel, vecCross(bodyA.angVel, rA))
		const velB = vecAdd(bodyB.vel, vecCross(bodyB.angVel, rB))
		const relVel = vecDot(vecSub(velB, velA), n)
		const bias = this.cfg.baumgarte * error / dt
		const effMass = this.calEffMass(bodyA, bodyB, rA, rB, n)
		if (effMass === 0) return
		let lambda = -(relVel + bias) * effMass * c.stiffness
		const oldImpulse = data.impulse
		data.impulse = Math.max(0, oldImpulse + lambda)
		lambda = data.impulse - oldImpulse
		const impulse = vecMul(n, lambda)
		const force = vecLen(impulse) / dt
		if (force > c.breakForce) {
			c.broken = true
			return
		}
		this.applyConstraintImpulse(bodyA, bodyB, rA, rB, impulse)
	}

	private solveHinge(data: ConstraintData, c: HingeConstraint, bodyA: RigidBody, bodyB: RigidBody, dt: number) {
		const worldA = vecAdd(bodyA.pos, c.anchorA)
		const worldB = vecAdd(bodyB.pos, c.anchorB)
		const delta = vecSub(worldB, worldA)
		const dist = vecLen(delta)
		if (dist > 0.0001) {
			const n = vecMul(delta, 1 / dist)
			const rA = c.anchorA
			const rB = c.anchorB
			const velA = vecAdd(bodyA.vel, vecCross(bodyA.angVel, rA))
			const velB = vecAdd(bodyB.vel, vecCross(bodyB.angVel, rB))
			const relVel = vecDot(vecSub(velB, velA), n)
			const bias = this.cfg.baumgarte * dist / dt
			const effMass = this.calEffMass(bodyA, bodyB, rA, rB, n)
			if (effMass > 0) {
				const lambda = -(relVel + bias) * effMass
				const impulse = vecMul(n, lambda)
				this.applyConstraintImpulse(bodyA, bodyB, rA, rB, impulse)
			}
		}
		const angDiff = vecSub(bodyB.angVel, bodyA.angVel)
		const axisDot = vecDot(angDiff, c.axisA)
		const perpAngVel = vecSub(angDiff, vecMul(c.axisA, axisDot))
		const perpLen = vecLen(perpAngVel)
		if (perpLen > 0.0001) {
			const perpN = vecMul(perpAngVel, 1 / perpLen)
			const angEffMass = 1 / (bodyA.invInertia.x + bodyB.invInertia.x)
			const angLambda = -perpLen * angEffMass * 0.5
			const angImpulse = vecMul(perpN, angLambda)
			if (bodyA.typ !== RigidBodyType.Static) {
				applyAngularImpulse(bodyA, vecMul(angImpulse, -1))
			}
			if (bodyB.typ !== RigidBodyType.Static) {
				applyAngularImpulse(bodyB, angImpulse)
			}
		}
		if (c.motorEnabled) {
			const motorTorque = (c.motorSpd - axisDot) * c.motorMaxTorque * dt
			const clampedTorque = Math.max(-c.motorMaxTorque * dt, Math.min(c.motorMaxTorque * dt, motorTorque))
			const motorImpulse = vecMul(c.axisA, clampedTorque)
			if (bodyA.typ !== RigidBodyType.Static) {
				applyAngularImpulse(bodyA, vecMul(motorImpulse, -1))
			}
			if (bodyB.typ !== RigidBodyType.Static) {
				applyAngularImpulse(bodyB, motorImpulse)
			}
		}
	}

	private solveBallSocket(data: ConstraintData, c: BallSocketConstraint, bodyA: RigidBody, bodyB: RigidBody, dt: number) {
		const worldA = vecAdd(bodyA.pos, c.anchorA)
		const worldB = vecAdd(bodyB.pos, c.anchorB)
		const delta = vecSub(worldB, worldA)
		const dist = vecLen(delta)
		if (dist < 0.0001) return
		const n = vecMul(delta, 1 / dist)
		const rA = c.anchorA
		const rB = c.anchorB
		const velA = vecAdd(bodyA.vel, vecCross(bodyA.angVel, rA))
		const velB = vecAdd(bodyB.vel, vecCross(bodyB.angVel, rB))
		const relVel = vecDot(vecSub(velB, velA), n)
		const bias = this.cfg.baumgarte * dist / dt
		const effMass = this.calEffMass(bodyA, bodyB, rA, rB, n)
		if (effMass === 0) return
		const lambda = -(relVel + bias) * effMass
		const impulse = vecMul(n, lambda)
		this.applyConstraintImpulse(bodyA, bodyB, rA, rB, impulse)
	}

	private solveSlider(data: ConstraintData, c: SliderConstraint, bodyA: RigidBody, bodyB: RigidBody, dt: number) {
		const worldA = vecAdd(bodyA.pos, c.anchorA)
		const worldB = vecAdd(bodyB.pos, c.anchorB)
		const delta = vecSub(worldB, worldA)
		const axisDist = vecDot(delta, c.axis)
		const perpVec = vecSub(delta, vecMul(c.axis, axisDist))
		const perpDist = vecLen(perpVec)
		if (perpDist > 0.0001) {
			const perpN = vecMul(perpVec, 1 / perpDist)
			const rA = c.anchorA
			const rB = c.anchorB
			const velA = vecAdd(bodyA.vel, vecCross(bodyA.angVel, rA))
			const velB = vecAdd(bodyB.vel, vecCross(bodyB.angVel, rB))
			const perpRelVel = vecDot(vecSub(velB, velA), perpN)
			const bias = this.cfg.baumgarte * perpDist / dt
			const effMass = this.calEffMass(bodyA, bodyB, rA, rB, perpN)
			if (effMass > 0) {
				const lambda = -(perpRelVel + bias) * effMass
				const impulse = vecMul(perpN, lambda)
				this.applyConstraintImpulse(bodyA, bodyB, rA, rB, impulse)
			}
		}
		let limitError = 0
		if (axisDist < c.minDist) limitError = axisDist - c.minDist
		else if (axisDist > c.maxDist) limitError = axisDist - c.maxDist
		if (Math.abs(limitError) > this.cfg.slop) {
			const rA = c.anchorA
			const rB = c.anchorB
			const velA = vecAdd(bodyA.vel, vecCross(bodyA.angVel, rA))
			const velB = vecAdd(bodyB.vel, vecCross(bodyB.angVel, rB))
			const axisRelVel = vecDot(vecSub(velB, velA), c.axis)
			const bias = this.cfg.baumgarte * limitError / dt
			const effMass = this.calEffMass(bodyA, bodyB, rA, rB, c.axis)
			if (effMass > 0) {
				const lambda = -(axisRelVel + bias) * effMass
				const impulse = vecMul(c.axis, lambda)
				this.applyConstraintImpulse(bodyA, bodyB, rA, rB, impulse)
			}
		}
		if (c.motorEnabled) {
			const rA = c.anchorA
			const rB = c.anchorB
			const velA = vecAdd(bodyA.vel, vecCross(bodyA.angVel, rA))
			const velB = vecAdd(bodyB.vel, vecCross(bodyB.angVel, rB))
			const axisRelVel = vecDot(vecSub(velB, velA), c.axis)
			const motorForce = (c.motorSpd - axisRelVel) * c.motorMaxForce * dt
			const clampedForce = Math.max(-c.motorMaxForce * dt, Math.min(c.motorMaxForce * dt, motorForce))
			const motorImpulse = vecMul(c.axis, clampedForce)
			this.applyConstraintImpulse(bodyA, bodyB, rA, rB, motorImpulse)
		}
	}

	private solveFixed(data: ConstraintData, c: FixedConstraint, bodyA: RigidBody, bodyB: RigidBody, dt: number) {
		const worldA = vecAdd(bodyA.pos, c.anchorA)
		const worldB = vecAdd(bodyB.pos, c.anchorB)
		const delta = vecSub(worldB, worldA)
		const dist = vecLen(delta)
		if (dist > 0.0001) {
			const n = vecMul(delta, 1 / dist)
			const rA = c.anchorA
			const rB = c.anchorB
			const velA = vecAdd(bodyA.vel, vecCross(bodyA.angVel, rA))
			const velB = vecAdd(bodyB.vel, vecCross(bodyB.angVel, rB))
			const relVel = vecDot(vecSub(velB, velA), n)
			const bias = this.cfg.baumgarte * dist / dt
			const effMass = this.calEffMass(bodyA, bodyB, rA, rB, n)
			if (effMass > 0) {
				const lambda = -(relVel + bias) * effMass
				const impulse = vecMul(n, lambda)
				this.applyConstraintImpulse(bodyA, bodyB, rA, rB, impulse)
			}
		}
		const angDiff = vecSub(bodyB.angVel, bodyA.angVel)
		const angLen = vecLen(angDiff)
		if (angLen > 0.0001) {
			const angN = vecMul(angDiff, 1 / angLen)
			const angEffMass = 1 / (bodyA.invInertia.x + bodyB.invInertia.x)
			const angLambda = -angLen * angEffMass
			const angImpulse = vecMul(angN, angLambda)
			if (bodyA.typ !== RigidBodyType.Static) {
				applyAngularImpulse(bodyA, vecMul(angImpulse, -1))
			}
			if (bodyB.typ !== RigidBodyType.Static) {
				applyAngularImpulse(bodyB, angImpulse)
			}
		}
	}

	private solveSpring(data: ConstraintData, c: SpringConstraint, bodyA: RigidBody, bodyB: RigidBody, dt: number) {
		const worldA = vecAdd(bodyA.pos, c.anchorA)
		const worldB = vecAdd(bodyB.pos, c.anchorB)
		const delta = vecSub(worldB, worldA)
		const dist = vecLen(delta)
		if (dist < 0.0001) return
		const n = vecMul(delta, 1 / dist)
		const stretch = dist - c.restLen
		const rA = c.anchorA
		const rB = c.anchorB
		const velA = vecAdd(bodyA.vel, vecCross(bodyA.angVel, rA))
		const velB = vecAdd(bodyB.vel, vecCross(bodyB.angVel, rB))
		const relVel = vecDot(vecSub(velB, velA), n)
		const springForce = stretch * c.stiffness
		const dampingForce = relVel * c.damping
		const totalForce = springForce + dampingForce
		const impulse = vecMul(n, totalForce * dt)
		const force = Math.abs(totalForce)
		if (force > c.breakForce) {
			c.broken = true
			return
		}
		this.applyConstraintImpulse(bodyA, bodyB, rA, rB, impulse)
	}

	private calEffMass(bodyA: RigidBody, bodyB: RigidBody, rA: Vec3, rB: Vec3, n: Vec3): number {
		const invMassA = bodyA.typ === RigidBodyType.Static ? 0 : bodyA.invMass
		const invMassB = bodyB.typ === RigidBodyType.Static ? 0 : bodyB.invMass
		const rAxN = vecCross(rA, n)
		const rBxN = vecCross(rB, n)
		const angA = bodyA.typ === RigidBodyType.Static ? 0 :
			rAxN.x * rAxN.x * bodyA.invInertia.x +
			rAxN.y * rAxN.y * bodyA.invInertia.y +
			rAxN.z * rAxN.z * bodyA.invInertia.z
		const angB = bodyB.typ === RigidBodyType.Static ? 0 :
			rBxN.x * rBxN.x * bodyB.invInertia.x +
			rBxN.y * rBxN.y * bodyB.invInertia.y +
			rBxN.z * rBxN.z * bodyB.invInertia.z
		const total = invMassA + invMassB + angA + angB
		return total > 0 ? 1 / total : 0
	}

	private applyConstraintImpulse(bodyA: RigidBody, bodyB: RigidBody, rA: Vec3, rB: Vec3, impulse: Vec3) {
		if (bodyA.typ !== RigidBodyType.Static) {
			applyImpulse(bodyA, vecMul(impulse, -1))
			applyAngularImpulse(bodyA, vecCross(rA, vecMul(impulse, -1)))
		}
		if (bodyB.typ !== RigidBodyType.Static) {
			applyImpulse(bodyB, impulse)
			applyAngularImpulse(bodyB, vecCross(rB, impulse))
		}
	}

	clr() {
		this.constraints.clear()
	}
}
