import { type Vec3, type EntityId, RigidBodyType, ColliderType } from '@engine/common'
import { PhysicsWorld, type PhysicsConfig, type ContactManifold, type CollisionCallback, type TriggerCallback } from './world'

interface BodyState {
	pos: Vec3
	vel: Vec3
	angVel: Vec3
	sleeping: boolean
}

interface ColliderDef {
	typ: 'box' | 'sphere' | 'capsule'
	size?: Vec3
	radius?: number
	height?: number
	offset?: Vec3
	isTrg?: boolean
}

export class PhysicsBridge {
	worker: Worker | null
	localWorld: PhysicsWorld
	useWorker: boolean
	bodyCache: Map<EntityId, BodyState>
	onCollision: CollisionCallback | null
	onTrigger: TriggerCallback | null
	pendingBodies: { entityId: EntityId; typ: RigidBodyType; mass: number; pos?: Vec3; vel?: Vec3; collider?: ColliderDef }[]
	initialized: boolean
	useBuf: boolean

	constructor(cfg: Partial<PhysicsConfig> = {}, useWorker = true, useBuf = true) {
		this.localWorld = new PhysicsWorld(cfg)
		this.useWorker = useWorker && typeof Worker !== 'undefined'
		this.useBuf = useBuf
		this.worker = null
		this.bodyCache = new Map()
		this.onCollision = null
		this.onTrigger = null
		this.pendingBodies = []
		this.initialized = false
		if (this.useWorker) {
			this.iniWorker(cfg)
		} else {
			this.initialized = true
			this.localWorld.onCollision = (a, b, m) => this.onCollision?.(a, b, m)
			this.localWorld.onTrigger = (a, b, e) => this.onTrigger?.(a, b, e)
		}
	}

	private iniWorker(cfg: Partial<PhysicsConfig>) {
		try {
			this.worker = new Worker(new URL('./worker/physics-worker.ts', import.meta.url), { type: 'module' })
			this.worker.postMessage({ typ: 'init', data: { cfg } })
			this.worker.onmessage = (e) => {
				const { typ, data, buf } = e.data
				switch (typ) {
					case 'stepDone':
						for (const b of data.bodies) {
							this.bodyCache.set(b.id, {
								pos: b.pos,
								vel: b.vel,
								angVel: b.angVel,
								sleeping: b.sleeping
							})
						}
						break
					case 'stepBufDone':
						if (buf) {
							const arr = new Float32Array(buf)
							for (let i = 0; i < data.cnt; i++) {
								const oi = i * 10
								const id = arr[oi] as EntityId
								this.bodyCache.set(id, {
									pos: { x: arr[oi + 1], y: arr[oi + 2], z: arr[oi + 3] },
									vel: { x: arr[oi + 4], y: arr[oi + 5], z: arr[oi + 6] },
									angVel: { x: arr[oi + 7], y: arr[oi + 8], z: 0 },
									sleeping: arr[oi + 9] > 0
								})
							}
						}
						break
					case 'collision':
						this.onCollision?.(data.a, data.b, data.manifold)
						break
					case 'trigger':
						this.onTrigger?.(data.a, data.b, data.enter)
						break
				}
			}
			this.worker.onerror = (e) => {
				console.warn('Physics worker error, falling back to main thread:', e)
				this.useWorker = false
				this.worker = null
				this.initialized = true
				this.localWorld.onCollision = (a, b, m) => this.onCollision?.(a, b, m)
				this.localWorld.onTrigger = (a, b, e) => this.onTrigger?.(a, b, e)
				for (const p of this.pendingBodies) {
					this.addBodyLocal(p.entityId, p.typ, p.mass, p.pos, p.vel, p.collider)
				}
				this.pendingBodies = []
			}
			this.initialized = true
			for (const p of this.pendingBodies) {
				this.worker.postMessage({
					typ: 'addBody',
					data: { entityId: p.entityId, typ: p.typ, mass: p.mass, pos: p.pos, vel: p.vel, collider: p.collider }
				})
			}
			this.pendingBodies = []
		} catch (e) {
			console.warn('Failed to create physics worker, using main thread:', e)
			this.useWorker = false
			this.initialized = true
			this.localWorld.onCollision = (a, b, m) => this.onCollision?.(a, b, m)
			this.localWorld.onTrigger = (a, b, e) => this.onTrigger?.(a, b, e)
		}
	}

	private addBodyLocal(entityId: EntityId, typ: RigidBodyType, mass: number, pos?: Vec3, vel?: Vec3, collider?: ColliderDef) {
		const body = this.localWorld.addBody(entityId, typ, mass)
		if (pos) body.pos = { ...pos }
		if (vel) body.vel = { ...vel }
		if (collider) {
			if (collider.typ === 'box' && collider.size) {
				this.localWorld.addBoxCollider(entityId, collider.size, collider.offset, collider.isTrg)
			} else if (collider.typ === 'sphere' && collider.radius !== undefined) {
				this.localWorld.addSphereCollider(entityId, collider.radius, collider.offset, collider.isTrg)
			} else if (collider.typ === 'capsule' && collider.radius !== undefined && collider.height !== undefined) {
				this.localWorld.addCapsuleCollider(entityId, collider.radius, collider.height, collider.offset, collider.isTrg)
			}
		}
	}

	addBody(entityId: EntityId, typ: RigidBodyType, mass: number, pos?: Vec3, vel?: Vec3, collider?: ColliderDef) {
		this.addBodyLocal(entityId, typ, mass, pos, vel, collider)
		if (this.useWorker && this.worker) {
			if (this.initialized) {
				this.worker.postMessage({
					typ: 'addBody',
					data: { entityId, typ, mass, pos, vel, collider }
				})
			} else {
				this.pendingBodies.push({ entityId, typ, mass, pos, vel, collider })
			}
		}
	}

	removeBody(entityId: EntityId) {
		this.localWorld.removeBody(entityId)
		this.localWorld.removeCollider(entityId)
		this.bodyCache.delete(entityId)
		if (this.useWorker && this.worker) {
			this.worker.postMessage({ typ: 'removeBody', data: { entityId } })
		}
	}

	setPos(entityId: EntityId, pos: Vec3) {
		const body = this.localWorld.getBody(entityId)
		if (body) body.pos = { ...pos }
		if (this.useWorker && this.worker) {
			this.worker.postMessage({ typ: 'setPos', data: { entityId, pos } })
		}
	}

	setVel(entityId: EntityId, vel: Vec3) {
		const body = this.localWorld.getBody(entityId)
		if (body) body.vel = { ...vel }
		if (this.useWorker && this.worker) {
			this.worker.postMessage({ typ: 'setVel', data: { entityId, vel } })
		}
	}

	addForce(entityId: EntityId, force: Vec3) {
		const body = this.localWorld.getBody(entityId)
		if (body) {
			body.force.x += force.x
			body.force.y += force.y
			body.force.z += force.z
		}
		if (this.useWorker && this.worker) {
			this.worker.postMessage({ typ: 'addForce', data: { entityId, force } })
		}
	}

	step(dt: number) {
		if (this.useWorker && this.worker) {
			const msgTyp = this.useBuf ? 'stepBuf' : 'step'
			this.worker.postMessage({ typ: msgTyp, data: { dt } })
		} else {
			this.localWorld.step(dt)
		}
	}

	batchUpd(updates: { id: EntityId; pos: Vec3; vel: Vec3 }[]) {
		if (this.useWorker && this.worker) {
			const buf = new Float32Array(updates.length * 7)
			for (let i = 0; i < updates.length; i++) {
				const u = updates[i]
				const oi = i * 7
				buf[oi] = u.id
				buf[oi + 1] = u.pos.x
				buf[oi + 2] = u.pos.y
				buf[oi + 3] = u.pos.z
				buf[oi + 4] = u.vel.x
				buf[oi + 5] = u.vel.y
				buf[oi + 6] = u.vel.z
			}
			this.worker.postMessage({ typ: 'batchUpd', data: {}, buf: buf.buffer }, [buf.buffer])
		} else {
			for (const u of updates) {
				const body = this.localWorld.getBody(u.id)
				if (body) {
					body.pos = { ...u.pos }
					body.vel = { ...u.vel }
				}
			}
		}
	}

	getBodyPos(entityId: EntityId): Vec3 | undefined {
		if (this.useWorker) {
			return this.bodyCache.get(entityId)?.pos ?? this.localWorld.getBody(entityId)?.pos
		}
		return this.localWorld.getBody(entityId)?.pos
	}

	getBodyVel(entityId: EntityId): Vec3 | undefined {
		if (this.useWorker) {
			return this.bodyCache.get(entityId)?.vel ?? this.localWorld.getBody(entityId)?.vel
		}
		return this.localWorld.getBody(entityId)?.vel
	}

	isSleeping(entityId: EntityId): boolean {
		if (this.useWorker) {
			return this.bodyCache.get(entityId)?.sleeping ?? false
		}
		return this.localWorld.getBody(entityId)?.sleeping ?? false
	}

	raycast(origin: Vec3, dir: Vec3, maxDist: number = Infinity, layerMask?: number) {
		return this.localWorld.raycast({ origin, dir, maxDist }, layerMask)
	}

	overlapSphere(center: Vec3, radius: number, layerMask?: number) {
		return this.localWorld.overlapSphere(center, radius, layerMask)
	}

	setEnabled(enabled: boolean) {
		this.localWorld.setEnabled(enabled)
	}

	clr() {
		this.localWorld.clr()
		this.bodyCache.clear()
		if (this.useWorker && this.worker) {
			this.worker.postMessage({ typ: 'clr', data: {} })
		}
	}

	destroy() {
		this.worker?.terminate()
		this.worker = null
		this.localWorld.clr()
		this.bodyCache.clear()
	}
}
