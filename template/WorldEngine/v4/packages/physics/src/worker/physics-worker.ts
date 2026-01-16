import { type Vec3, type EntityId, RigidBodyType } from '@engine/common'
import { PhysicsWorld, type PhysicsConfig } from '../world'

interface WorkerMsg {
	typ: 'init' | 'step' | 'addBody' | 'removeBody' | 'setPos' | 'setVel' | 'addForce' | 'clr' | 'batchUpd' | 'stepBuf'
	data: any
	buf?: ArrayBuffer
}

interface BodyState {
	id: EntityId
	pos: Vec3
	vel: Vec3
	angVel: Vec3
	sleeping: boolean
}

interface WorkerRes {
	typ: 'stepDone' | 'collision' | 'trigger' | 'stepBufDone'
	data: any
	buf?: ArrayBuffer
}

let world: PhysicsWorld | null = null
let stateBuf: Float32Array | null = null

function ensureBuf(bodyCnt: number) {
	const stateSize = bodyCnt * 10
	if (!stateBuf || stateBuf.length < stateSize) {
		stateBuf = new Float32Array(stateSize)
	}
}

self.onmessage = (e: MessageEvent<WorkerMsg>) => {
	const { typ, data, buf } = e.data
	switch (typ) {
		case 'init':
			world = new PhysicsWorld(data.cfg as Partial<PhysicsConfig>)
			world.onCollision = (a, b, manifold) => {
				self.postMessage({ typ: 'collision', data: { a, b, manifold } } as WorkerRes)
			}
			world.onTrigger = (a, b, enter) => {
				self.postMessage({ typ: 'trigger', data: { a, b, enter } } as WorkerRes)
			}
			break
		case 'step':
			if (!world) return
			world.step(data.dt)
			const bodies: BodyState[] = []
			for (const [id, body] of world.bodies) {
				bodies.push({
					id,
					pos: { ...body.pos },
					vel: { ...body.vel },
					angVel: { ...body.angVel },
					sleeping: body.sleeping
				})
			}
			self.postMessage({ typ: 'stepDone', data: { bodies } } as WorkerRes)
			break
		case 'stepBuf':
			if (!world) return
			world.step(data.dt)
			const cnt = world.bodies.size
			ensureBuf(cnt)
			let idx = 0
			for (const [id, body] of world.bodies) {
				stateBuf![idx++] = id
				stateBuf![idx++] = body.pos.x
				stateBuf![idx++] = body.pos.y
				stateBuf![idx++] = body.pos.z
				stateBuf![idx++] = body.vel.x
				stateBuf![idx++] = body.vel.y
				stateBuf![idx++] = body.vel.z
				stateBuf![idx++] = body.angVel.x
				stateBuf![idx++] = body.angVel.y
				stateBuf![idx++] = body.sleeping ? 1 : 0
			}
			const resBuf = stateBuf!.slice(0, idx)
			;(self as unknown as Worker).postMessage(
				{ typ: 'stepBufDone', data: { cnt }, buf: resBuf.buffer } as WorkerRes,
				[resBuf.buffer]
			)
			break
		case 'batchUpd':
			if (!world || !buf) return
			const updArr = new Float32Array(buf)
			const updCnt = updArr.length / 7
			for (let i = 0; i < updCnt; i++) {
				const oi = i * 7
				const eid = updArr[oi] as EntityId
				const b = world.getBody(eid)
				if (b) {
					b.pos.x = updArr[oi + 1]
					b.pos.y = updArr[oi + 2]
					b.pos.z = updArr[oi + 3]
					b.vel.x = updArr[oi + 4]
					b.vel.y = updArr[oi + 5]
					b.vel.z = updArr[oi + 6]
				}
			}
			break
		case 'addBody':
			if (!world) return
			const body = world.addBody(data.entityId, data.typ, data.mass)
			if (data.pos) body.pos = { ...data.pos }
			if (data.vel) body.vel = { ...data.vel }
			if (data.collider) {
				const c = data.collider
				if (c.typ === 'box') {
					world.addBoxCollider(data.entityId, c.size, c.offset, c.isTrg)
				} else if (c.typ === 'sphere') {
					world.addSphereCollider(data.entityId, c.radius, c.offset, c.isTrg)
				} else if (c.typ === 'capsule') {
					world.addCapsuleCollider(data.entityId, c.radius, c.height, c.offset, c.isTrg)
				}
			}
			break
		case 'removeBody':
			world?.removeBody(data.entityId)
			world?.removeCollider(data.entityId)
			break
		case 'setPos':
			const b1 = world?.getBody(data.entityId)
			if (b1) b1.pos = { ...data.pos }
			break
		case 'setVel':
			const b2 = world?.getBody(data.entityId)
			if (b2) b2.vel = { ...data.vel }
			break
		case 'addForce':
			const b3 = world?.getBody(data.entityId)
			if (b3) {
				b3.force.x += data.force.x
				b3.force.y += data.force.y
				b3.force.z += data.force.z
			}
			break
		case 'clr':
			world?.clr()
			break
	}
}
