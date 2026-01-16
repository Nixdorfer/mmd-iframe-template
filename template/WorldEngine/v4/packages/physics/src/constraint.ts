import { type Vec3, type EntityId } from '@engine/common'

export enum ConstraintType {
	Dist = 'dist',
	Hinge = 'hinge',
	BallSocket = 'ball_socket',
	Slider = 'slider',
	Fixed = 'fixed',
	Spring = 'spring'
}

export interface Constraint {
	id: number
	typ: ConstraintType
	bodyA: EntityId
	bodyB: EntityId
	anchorA: Vec3
	anchorB: Vec3
	enabled: boolean
	breakForce: number
	broken: boolean
}

export interface DistConstraint extends Constraint {
	typ: ConstraintType.Dist
	dist: number
	minDist: number
	maxDist: number
	stiffness: number
}

export interface HingeConstraint extends Constraint {
	typ: ConstraintType.Hinge
	axisA: Vec3
	axisB: Vec3
	minAng: number
	maxAng: number
	motorEnabled: boolean
	motorSpd: number
	motorMaxTorque: number
}

export interface BallSocketConstraint extends Constraint {
	typ: ConstraintType.BallSocket
	swingLimit: number
	twistLimit: number
}

export interface SliderConstraint extends Constraint {
	typ: ConstraintType.Slider
	axis: Vec3
	minDist: number
	maxDist: number
	motorEnabled: boolean
	motorSpd: number
	motorMaxForce: number
}

export interface FixedConstraint extends Constraint {
	typ: ConstraintType.Fixed
	relPos: Vec3
	relRot: Vec3
}

export interface SpringConstraint extends Constraint {
	typ: ConstraintType.Spring
	restLen: number
	stiffness: number
	damping: number
}

export type AnyConstraint = DistConstraint | HingeConstraint | BallSocketConstraint | SliderConstraint | FixedConstraint | SpringConstraint

let nextConstraintId = 1

function baseConstraint(typ: ConstraintType, bodyA: EntityId, bodyB: EntityId, anchorA: Vec3, anchorB: Vec3): Constraint {
	return {
		id: nextConstraintId++,
		typ,
		bodyA,
		bodyB,
		anchorA: { ...anchorA },
		anchorB: { ...anchorB },
		enabled: true,
		breakForce: Infinity,
		broken: false
	}
}

export function createDistConstraint(
	bodyA: EntityId,
	bodyB: EntityId,
	anchorA: Vec3,
	anchorB: Vec3,
	dist: number,
	minDist: number = dist,
	maxDist: number = dist,
	stiffness: number = 1
): DistConstraint {
	return {
		...baseConstraint(ConstraintType.Dist, bodyA, bodyB, anchorA, anchorB),
		typ: ConstraintType.Dist,
		dist,
		minDist,
		maxDist,
		stiffness
	}
}

export function createHingeConstraint(
	bodyA: EntityId,
	bodyB: EntityId,
	anchorA: Vec3,
	anchorB: Vec3,
	axisA: Vec3,
	axisB: Vec3,
	minAng: number = -Math.PI,
	maxAng: number = Math.PI
): HingeConstraint {
	return {
		...baseConstraint(ConstraintType.Hinge, bodyA, bodyB, anchorA, anchorB),
		typ: ConstraintType.Hinge,
		axisA: { ...axisA },
		axisB: { ...axisB },
		minAng,
		maxAng,
		motorEnabled: false,
		motorSpd: 0,
		motorMaxTorque: 0
	}
}

export function createBallSocketConstraint(
	bodyA: EntityId,
	bodyB: EntityId,
	anchorA: Vec3,
	anchorB: Vec3,
	swingLimit: number = Math.PI,
	twistLimit: number = Math.PI
): BallSocketConstraint {
	return {
		...baseConstraint(ConstraintType.BallSocket, bodyA, bodyB, anchorA, anchorB),
		typ: ConstraintType.BallSocket,
		swingLimit,
		twistLimit
	}
}

export function createSliderConstraint(
	bodyA: EntityId,
	bodyB: EntityId,
	anchorA: Vec3,
	anchorB: Vec3,
	axis: Vec3,
	minDist: number = -Infinity,
	maxDist: number = Infinity
): SliderConstraint {
	return {
		...baseConstraint(ConstraintType.Slider, bodyA, bodyB, anchorA, anchorB),
		typ: ConstraintType.Slider,
		axis: { ...axis },
		minDist,
		maxDist,
		motorEnabled: false,
		motorSpd: 0,
		motorMaxForce: 0
	}
}

export function createFixedConstraint(
	bodyA: EntityId,
	bodyB: EntityId,
	anchorA: Vec3,
	anchorB: Vec3,
	relPos: Vec3 = { x: 0, y: 0, z: 0 },
	relRot: Vec3 = { x: 0, y: 0, z: 0 }
): FixedConstraint {
	return {
		...baseConstraint(ConstraintType.Fixed, bodyA, bodyB, anchorA, anchorB),
		typ: ConstraintType.Fixed,
		relPos: { ...relPos },
		relRot: { ...relRot }
	}
}

export function createSpringConstraint(
	bodyA: EntityId,
	bodyB: EntityId,
	anchorA: Vec3,
	anchorB: Vec3,
	restLen: number,
	stiffness: number = 100,
	damping: number = 1
): SpringConstraint {
	return {
		...baseConstraint(ConstraintType.Spring, bodyA, bodyB, anchorA, anchorB),
		typ: ConstraintType.Spring,
		restLen,
		stiffness,
		damping
	}
}

export function setHingeMotor(c: HingeConstraint, spd: number, maxTorque: number) {
	c.motorEnabled = true
	c.motorSpd = spd
	c.motorMaxTorque = maxTorque
}

export function setSliderMotor(c: SliderConstraint, spd: number, maxForce: number) {
	c.motorEnabled = true
	c.motorSpd = spd
	c.motorMaxForce = maxForce
}

export function disableHingeMotor(c: HingeConstraint) {
	c.motorEnabled = false
}

export function disableSliderMotor(c: SliderConstraint) {
	c.motorEnabled = false
}

export function setBreakForce(c: Constraint, force: number) {
	c.breakForce = force
}
