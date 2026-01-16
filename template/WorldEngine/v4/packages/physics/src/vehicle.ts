import { type Vec3, type EntityId } from '@engine/common'
import { type RigidBody, applyForceAtPoint, wake } from './rigidbody'
import { type Ray, type RayHit, vecAdd, vecSub, vecMul, vecLen, vecNorm, vecDot, vecCross } from './collider'

export interface WheelCfg {
	radius: number
	width: number
	suspensionLen: number
	suspensionStiffness: number
	suspensionDamping: number
	frictionSlip: number
	rollInfluence: number
	maxBrakeForce: number
	isSteering: boolean
	isDriven: boolean
}

export const DEFAULT_WHEEL_CFG: WheelCfg = {
	radius: 0.4,
	width: 0.2,
	suspensionLen: 0.3,
	suspensionStiffness: 30000,
	suspensionDamping: 4000,
	frictionSlip: 1.5,
	rollInfluence: 0.1,
	maxBrakeForce: 5000,
	isSteering: false,
	isDriven: false
}

export interface Wheel {
	cfg: WheelCfg
	localPos: Vec3
	worldPos: Vec3
	steering: number
	rotation: number
	rpm: number
	slipRatio: number
	slipAngle: number
	groundHit: boolean
	groundNormal: Vec3
	groundPoint: Vec3
	suspensionLen: number
	suspensionForce: number
	forwardDir: Vec3
	sideDir: Vec3
}

export interface VehicleCfg {
	chassisMass: number
	engineMaxForce: number
	brakeForce: number
	maxSteerAng: number
	steerSpd: number
	antiRoll: number
	downforce: number
}

export const DEFAULT_VEHICLE_CFG: VehicleCfg = {
	chassisMass: 1500,
	engineMaxForce: 8000,
	brakeForce: 12000,
	maxSteerAng: Math.PI / 6,
	steerSpd: 3,
	antiRoll: 5000,
	downforce: 0.5
}

export interface Vehicle {
	entityId: EntityId
	cfg: VehicleCfg
	wheels: Wheel[]
	throttle: number
	brake: number
	steering: number
	handbrake: boolean
	speed: number
	localVel: Vec3
}

export type RaycastFn = (ray: Ray) => RayHit

export function createVehicle(
	entityId: EntityId,
	cfg: Partial<VehicleCfg>,
	wheelCfgs: Partial<WheelCfg>[],
	wheelPositions: Vec3[]
): Vehicle {
	const c: VehicleCfg = { ...DEFAULT_VEHICLE_CFG, ...cfg }
	const wheels: Wheel[] = []
	for (let i = 0; i < wheelPositions.length; i++) {
		const wCfg: WheelCfg = { ...DEFAULT_WHEEL_CFG, ...wheelCfgs[i] }
		wheels.push({
			cfg: wCfg,
			localPos: { ...wheelPositions[i] },
			worldPos: { x: 0, y: 0, z: 0 },
			steering: 0,
			rotation: 0,
			rpm: 0,
			slipRatio: 0,
			slipAngle: 0,
			groundHit: false,
			groundNormal: { x: 0, y: 0, z: 1 },
			groundPoint: { x: 0, y: 0, z: 0 },
			suspensionLen: wCfg.suspensionLen,
			suspensionForce: 0,
			forwardDir: { x: 1, y: 0, z: 0 },
			sideDir: { x: 0, y: 1, z: 0 }
		})
	}
	return {
		entityId,
		cfg: c,
		wheels,
		throttle: 0,
		brake: 0,
		steering: 0,
		handbrake: false,
		speed: 0,
		localVel: { x: 0, y: 0, z: 0 }
	}
}

export function updateVehicle(vehicle: Vehicle, body: RigidBody, raycast: RaycastFn, dt: number): void {
	const chassisForward = rotateVecByEuler({ x: 1, y: 0, z: 0 }, body.rot)
	const chassisRight = rotateVecByEuler({ x: 0, y: 1, z: 0 }, body.rot)
	const chassisUp = rotateVecByEuler({ x: 0, y: 0, z: 1 }, body.rot)
	vehicle.speed = vecDot(body.vel, chassisForward)
	vehicle.localVel = {
		x: vecDot(body.vel, chassisForward),
		y: vecDot(body.vel, chassisRight),
		z: vecDot(body.vel, chassisUp)
	}
	for (const wheel of vehicle.wheels) {
		updateWheelTransform(wheel, body, chassisForward, chassisRight, chassisUp, vehicle.steering)
	}
	for (const wheel of vehicle.wheels) {
		updateWheelSuspension(wheel, body, raycast, chassisUp, dt)
	}
	applyAntiRoll(vehicle, body)
	for (const wheel of vehicle.wheels) {
		if (!wheel.groundHit) continue
		applyWheelForces(wheel, vehicle, body, dt)
	}
	const downforceAmount = vehicle.cfg.downforce * vehicle.speed * vehicle.speed
	if (downforceAmount > 0) {
		applyForceAtPoint(body, vecMul(chassisUp, -downforceAmount), body.pos)
	}
	for (const wheel of vehicle.wheels) {
		if (wheel.groundHit) {
			const wheelSpeed = vehicle.speed
			wheel.rotation += wheelSpeed / wheel.cfg.radius * dt
			wheel.rpm = Math.abs(wheelSpeed) / (2 * Math.PI * wheel.cfg.radius) * 60
		}
	}
}

function updateWheelTransform(
	wheel: Wheel,
	body: RigidBody,
	chassisForward: Vec3,
	chassisRight: Vec3,
	chassisUp: Vec3,
	vehicleSteering: number
): void {
	const localRotated = rotateVecByEuler(wheel.localPos, body.rot)
	wheel.worldPos = vecAdd(body.pos, localRotated)
	if (wheel.cfg.isSteering) {
		wheel.steering = vehicleSteering
		const steerRot = { x: 0, y: 0, z: wheel.steering }
		wheel.forwardDir = rotateVecByEuler(chassisForward, steerRot)
		wheel.sideDir = rotateVecByEuler(chassisRight, steerRot)
	} else {
		wheel.forwardDir = chassisForward
		wheel.sideDir = chassisRight
	}
}

function updateWheelSuspension(
	wheel: Wheel,
	body: RigidBody,
	raycast: RaycastFn,
	chassisUp: Vec3,
	dt: number
): void {
	const rayLen = wheel.cfg.suspensionLen + wheel.cfg.radius
	const rayStart = wheel.worldPos
	const rayDir = vecMul(chassisUp, -1)
	const ray: Ray = {
		origin: rayStart,
		dir: rayDir,
		maxDist: rayLen
	}
	const hit = raycast(ray)
	if (hit.hit && hit.dist < rayLen) {
		wheel.groundHit = true
		wheel.groundNormal = hit.normal
		wheel.groundPoint = hit.point
		wheel.suspensionLen = hit.dist - wheel.cfg.radius
		const compression = wheel.cfg.suspensionLen - wheel.suspensionLen
		const suspVel = vecDot(body.vel, chassisUp)
		const springForce = compression * wheel.cfg.suspensionStiffness
		const damperForce = -suspVel * wheel.cfg.suspensionDamping
		wheel.suspensionForce = Math.max(0, springForce + damperForce)
		const forceDir = chassisUp
		const forcePoint = wheel.worldPos
		applyForceAtPoint(body, vecMul(forceDir, wheel.suspensionForce), forcePoint)
		wake(body)
	} else {
		wheel.groundHit = false
		wheel.suspensionLen = wheel.cfg.suspensionLen
		wheel.suspensionForce = 0
	}
}

function applyWheelForces(wheel: Wheel, vehicle: Vehicle, body: RigidBody, dt: number): void {
	const contactVel = getPointVelocity(body, wheel.groundPoint)
	const forwardVel = vecDot(contactVel, wheel.forwardDir)
	const sideVel = vecDot(contactVel, wheel.sideDir)
	const wheelSpeed = Math.abs(forwardVel)
	if (wheelSpeed > 0.1) {
		wheel.slipAngle = Math.atan2(sideVel, wheelSpeed)
	} else {
		wheel.slipAngle = 0
	}
	let targetSpeed = 0
	if (wheel.cfg.isDriven) {
		targetSpeed = vehicle.throttle * 30
	}
	if (wheelSpeed > 0.1) {
		wheel.slipRatio = (targetSpeed - forwardVel) / wheelSpeed
	} else {
		wheel.slipRatio = vehicle.throttle > 0 ? 1 : 0
	}
	const normalLoad = wheel.suspensionForce
	const maxFriction = normalLoad * wheel.cfg.frictionSlip
	const longForce = pacejkaFormula(wheel.slipRatio, 10, 1.9, maxFriction, 0.97)
	let latForce = -pacejkaFormula(wheel.slipAngle, 10, 1.9, maxFriction, 0.97)
	let engineForce = 0
	if (wheel.cfg.isDriven) {
		engineForce = vehicle.throttle * vehicle.cfg.engineMaxForce / countDrivenWheels(vehicle)
	}
	let brakeForce = 0
	if (vehicle.brake > 0) {
		brakeForce = vehicle.brake * wheel.cfg.maxBrakeForce
		brakeForce = Math.min(brakeForce, Math.abs(forwardVel) * body.mass / dt)
		brakeForce *= -Math.sign(forwardVel)
	}
	if (vehicle.handbrake && !wheel.cfg.isSteering) {
		brakeForce = wheel.cfg.maxBrakeForce * 0.8
		brakeForce = Math.min(brakeForce, Math.abs(forwardVel) * body.mass / dt)
		brakeForce *= -Math.sign(forwardVel)
		latForce *= 0.5
	}
	const totalLongForce = Math.max(-maxFriction, Math.min(maxFriction, longForce + engineForce + brakeForce))
	const forwardForce = vecMul(wheel.forwardDir, totalLongForce)
	const sideForce = vecMul(wheel.sideDir, Math.max(-maxFriction, Math.min(maxFriction, latForce)))
	applyForceAtPoint(body, forwardForce, wheel.groundPoint)
	applyForceAtPoint(body, sideForce, wheel.groundPoint)
	const rollTorque = vecMul(wheel.forwardDir, sideVel * normalLoad * wheel.cfg.rollInfluence)
	body.torque = vecAdd(body.torque, rollTorque)
}

function applyAntiRoll(vehicle: Vehicle, body: RigidBody): void {
	if (vehicle.wheels.length < 4) return
	const leftFront = vehicle.wheels[0]
	const rightFront = vehicle.wheels[1]
	const leftRear = vehicle.wheels[2]
	const rightRear = vehicle.wheels[3]
	applyAntiRollPair(leftFront, rightFront, vehicle.cfg.antiRoll, body)
	applyAntiRollPair(leftRear, rightRear, vehicle.cfg.antiRoll, body)
}

function applyAntiRollPair(left: Wheel, right: Wheel, antiRoll: number, body: RigidBody): void {
	if (!left.groundHit || !right.groundHit) return
	const travelL = left.cfg.suspensionLen - left.suspensionLen
	const travelR = right.cfg.suspensionLen - right.suspensionLen
	const antiRollForce = (travelL - travelR) * antiRoll
	const upDir: Vec3 = { x: 0, y: 0, z: 1 }
	if (left.groundHit) {
		applyForceAtPoint(body, vecMul(upDir, -antiRollForce), left.groundPoint)
	}
	if (right.groundHit) {
		applyForceAtPoint(body, vecMul(upDir, antiRollForce), right.groundPoint)
	}
}

function countDrivenWheels(vehicle: Vehicle): number {
	let count = 0
	for (const w of vehicle.wheels) {
		if (w.cfg.isDriven) count++
	}
	return Math.max(1, count)
}

export function pacejkaFormula(slip: number, B: number, C: number, D: number, E: number): number {
	return D * Math.sin(C * Math.atan(B * slip - E * (B * slip - Math.atan(B * slip))))
}

function getPointVelocity(body: RigidBody, point: Vec3): Vec3 {
	const r = vecSub(point, body.pos)
	const angularVel = vecCross(body.angVel, r)
	return vecAdd(body.vel, angularVel)
}

function rotateVecByEuler(v: Vec3, rot: Vec3): Vec3 {
	const cx = Math.cos(rot.x), sx = Math.sin(rot.x)
	const cy = Math.cos(rot.y), sy = Math.sin(rot.y)
	const cz = Math.cos(rot.z), sz = Math.sin(rot.z)
	const r00 = cy * cz
	const r01 = -cy * sz
	const r02 = sy
	const r10 = sx * sy * cz + cx * sz
	const r11 = -sx * sy * sz + cx * cz
	const r12 = -sx * cy
	const r20 = -cx * sy * cz + sx * sz
	const r21 = cx * sy * sz + sx * cz
	const r22 = cx * cy
	return {
		x: r00 * v.x + r01 * v.y + r02 * v.z,
		y: r10 * v.x + r11 * v.y + r12 * v.z,
		z: r20 * v.x + r21 * v.y + r22 * v.z
	}
}

export function setThrottle(vehicle: Vehicle, value: number): void {
	vehicle.throttle = Math.max(-1, Math.min(1, value))
}

export function setBrake(vehicle: Vehicle, value: number): void {
	vehicle.brake = Math.max(0, Math.min(1, value))
}

export function setSteering(vehicle: Vehicle, value: number, dt: number): void {
	const target = value * vehicle.cfg.maxSteerAng
	const diff = target - vehicle.steering
	const maxChange = vehicle.cfg.steerSpd * dt
	vehicle.steering += Math.max(-maxChange, Math.min(maxChange, diff))
}

export function setHandbrake(vehicle: Vehicle, active: boolean): void {
	vehicle.handbrake = active
}

export function getWheelWorldPositions(vehicle: Vehicle): Vec3[] {
	return vehicle.wheels.map(w => ({ ...w.worldPos }))
}

export function getWheelRotations(vehicle: Vehicle): number[] {
	return vehicle.wheels.map(w => w.rotation)
}

export function getWheelSteerings(vehicle: Vehicle): number[] {
	return vehicle.wheels.map(w => w.steering)
}
