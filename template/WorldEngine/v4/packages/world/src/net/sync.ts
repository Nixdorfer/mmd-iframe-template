import type { EntityId, Vec3, Transform } from '@engine/common'

export enum SyncMsgType {
	EntityCreate = 1,
	EntityDestroy = 2,
	EntityUpdate = 3,
	EntityFullState = 4,
	InputCmd = 5,
	RPC = 6,
	Snapshot = 7,
	Ack = 8,
	Ping = 9,
	Pong = 10
}

export interface SyncMsg {
	typ: SyncMsgType
	seq: number
	time: number
	data: unknown
}

export interface EntityCreateMsg {
	entityId: EntityId
	entityType: string
	ownerId: string
	transform: Transform
	state: Record<string, unknown>
}

export interface EntityDestroyMsg {
	entityId: EntityId
}

export interface EntityUpdateMsg {
	entityId: EntityId
	transform?: Partial<Transform>
	vel?: Vec3
	angVel?: Vec3
	state?: Record<string, unknown>
}

export interface EntityFullStateMsg {
	entityId: EntityId
	transform: Transform
	vel: Vec3
	angVel: Vec3
	state: Record<string, unknown>
}

export interface InputCmdMsg {
	entityId: EntityId
	seq: number
	inputs: InputCmd[]
}

export interface InputCmd {
	type: string
	data: unknown
	time: number
}

export interface RPCMsg {
	method: string
	args: unknown[]
	target?: EntityId
}

export interface SnapshotMsg {
	tick: number
	entities: EntityFullStateMsg[]
}

export interface SyncedEntity {
	entityId: EntityId
	entityType: string
	ownerId: string
	transform: Transform
	vel: Vec3
	angVel: Vec3
	state: Record<string, unknown>
	lastUpdTime: number
	interpFrom: Transform | null
	interpTo: Transform | null
	interpStartTime: number
	interpEndTime: number
}

export interface PredictedInput {
	seq: number
	cmd: InputCmd
	state: EntityFullStateMsg
}

export interface SyncCfg {
	tickRate: number
	sendRate: number
	interpDelay: number
	maxPredictedInputs: number
	reconciliationThreshold: number
	snapshotBufferSize: number
}

export const DEFAULT_SYNC_CFG: SyncCfg = {
	tickRate: 60,
	sendRate: 20,
	interpDelay: 100,
	maxPredictedInputs: 64,
	reconciliationThreshold: 0.1,
	snapshotBufferSize: 32
}

export class EntitySyncManager {
	cfg: SyncCfg
	localId: string
	entities: Map<EntityId, SyncedEntity>
	pendingInputs: Map<EntityId, PredictedInput[]>
	snapshots: SnapshotMsg[]
	localSeq: number
	lastAckedSeq: number
	serverTime: number
	localTime: number
	rtt: number
	jitter: number
	onSend: ((msg: SyncMsg) => void) | null
	rpcHandlers: Map<string, (args: unknown[], sender?: string) => unknown>

	constructor(localId: string, cfg: Partial<SyncCfg> = {}) {
		this.cfg = { ...DEFAULT_SYNC_CFG, ...cfg }
		this.localId = localId
		this.entities = new Map()
		this.pendingInputs = new Map()
		this.snapshots = []
		this.localSeq = 0
		this.lastAckedSeq = 0
		this.serverTime = 0
		this.localTime = 0
		this.rtt = 0
		this.jitter = 0
		this.onSend = null
		this.rpcHandlers = new Map()
	}

	setOnSend(callback: (msg: SyncMsg) => void) {
		this.onSend = callback
	}

	registerRPC(method: string, handler: (args: unknown[], sender?: string) => unknown) {
		this.rpcHandlers.set(method, handler)
	}

	receive(msg: SyncMsg) {
		switch (msg.typ) {
			case SyncMsgType.EntityCreate:
				this.handleEntityCreate(msg.data as EntityCreateMsg)
				break
			case SyncMsgType.EntityDestroy:
				this.handleEntityDestroy(msg.data as EntityDestroyMsg)
				break
			case SyncMsgType.EntityUpdate:
				this.handleEntityUpdate(msg.data as EntityUpdateMsg, msg.time)
				break
			case SyncMsgType.EntityFullState:
				this.handleEntityFullState(msg.data as EntityFullStateMsg, msg.time)
				break
			case SyncMsgType.Snapshot:
				this.handleSnapshot(msg.data as SnapshotMsg, msg.time)
				break
			case SyncMsgType.Ack:
				this.handleAck(msg.seq)
				break
			case SyncMsgType.RPC:
				this.handleRPC(msg.data as RPCMsg)
				break
			case SyncMsgType.Pong:
				this.handlePong(msg.time)
				break
		}
	}

	private handleEntityCreate(data: EntityCreateMsg) {
		if (this.entities.has(data.entityId)) return
		const entity: SyncedEntity = {
			entityId: data.entityId,
			entityType: data.entityType,
			ownerId: data.ownerId,
			transform: { ...data.transform },
			vel: { x: 0, y: 0, z: 0 },
			angVel: { x: 0, y: 0, z: 0 },
			state: { ...data.state },
			lastUpdTime: this.localTime,
			interpFrom: null,
			interpTo: null,
			interpStartTime: 0,
			interpEndTime: 0
		}
		this.entities.set(data.entityId, entity)
	}

	private handleEntityDestroy(data: EntityDestroyMsg) {
		this.entities.delete(data.entityId)
		this.pendingInputs.delete(data.entityId)
	}

	private handleEntityUpdate(data: EntityUpdateMsg, serverTime: number) {
		const entity = this.entities.get(data.entityId)
		if (!entity) return
		if (entity.ownerId === this.localId) {
			this.reconcile(entity, data)
		} else {
			this.setupInterp(entity, data, serverTime)
		}
	}

	private handleEntityFullState(data: EntityFullStateMsg, serverTime: number) {
		const entity = this.entities.get(data.entityId)
		if (!entity) return
		if (entity.ownerId === this.localId) {
			this.reconcileFull(entity, data)
		} else {
			entity.interpFrom = { ...entity.transform }
			entity.interpTo = { ...data.transform }
			entity.interpStartTime = this.localTime
			entity.interpEndTime = this.localTime + this.cfg.interpDelay
			entity.vel = { ...data.vel }
			entity.angVel = { ...data.angVel }
			entity.state = { ...data.state }
		}
		entity.lastUpdTime = serverTime
	}

	private handleSnapshot(snapshot: SnapshotMsg, serverTime: number) {
		this.snapshots.push(snapshot)
		if (this.snapshots.length > this.cfg.snapshotBufferSize) {
			this.snapshots.shift()
		}
		for (const entityState of snapshot.entities) {
			this.handleEntityFullState(entityState, serverTime)
		}
		this.serverTime = serverTime
	}

	private handleAck(seq: number) {
		this.lastAckedSeq = seq
		for (const [entityId, inputs] of this.pendingInputs) {
			const filtered = inputs.filter(i => i.seq > seq)
			this.pendingInputs.set(entityId, filtered)
		}
	}

	private handleRPC(data: RPCMsg) {
		const handler = this.rpcHandlers.get(data.method)
		if (handler) {
			handler(data.args)
		}
	}

	private handlePong(sentTime: number) {
		const newRtt = this.localTime - sentTime
		const prevRtt = this.rtt
		this.rtt = prevRtt * 0.9 + newRtt * 0.1
		this.jitter = this.jitter * 0.9 + Math.abs(newRtt - prevRtt) * 0.1
	}

	private setupInterp(entity: SyncedEntity, data: EntityUpdateMsg, _serverTime: number) {
		entity.interpFrom = { ...entity.transform }
		const newTransform = { ...entity.transform }
		if (data.transform?.pos) {
			newTransform.pos = { ...data.transform.pos }
		}
		if (data.transform?.rot) {
			newTransform.rot = { ...data.transform.rot }
		}
		if (data.transform?.scl) {
			newTransform.scl = { ...data.transform.scl }
		}
		entity.interpTo = newTransform
		entity.interpStartTime = this.localTime
		entity.interpEndTime = this.localTime + this.cfg.interpDelay
		if (data.vel) entity.vel = { ...data.vel }
		if (data.angVel) entity.angVel = { ...data.angVel }
		if (data.state) Object.assign(entity.state, data.state)
	}

	private reconcile(entity: SyncedEntity, data: EntityUpdateMsg) {
		if (!data.transform?.pos) return
		const serverPos = data.transform.pos
		const localPos = entity.transform.pos
		const dx = serverPos.x - localPos.x
		const dy = serverPos.y - localPos.y
		const dz = serverPos.z - localPos.z
		const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
		if (dist > this.cfg.reconciliationThreshold) {
			entity.transform.pos = { ...serverPos }
			this.replayPendingInputs(entity)
		}
	}

	private reconcileFull(entity: SyncedEntity, data: EntityFullStateMsg) {
		const serverPos = data.transform.pos
		const localPos = entity.transform.pos
		const dx = serverPos.x - localPos.x
		const dy = serverPos.y - localPos.y
		const dz = serverPos.z - localPos.z
		const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
		if (dist > this.cfg.reconciliationThreshold) {
			entity.transform = { ...data.transform }
			entity.vel = { ...data.vel }
			entity.angVel = { ...data.angVel }
			this.replayPendingInputs(entity)
		}
	}

	private replayPendingInputs(entity: SyncedEntity) {
		const inputs = this.pendingInputs.get(entity.entityId)
		if (!inputs) return
		for (const pending of inputs) {
			if (pending.seq > this.lastAckedSeq) {
				this.applyInput(entity, pending.cmd)
			}
		}
	}

	private applyInput(_entity: SyncedEntity, _cmd: InputCmd) {
	}

	sendInput(entityId: EntityId, cmd: InputCmd) {
		const entity = this.entities.get(entityId)
		if (!entity || entity.ownerId !== this.localId) return
		this.localSeq++
		const state: EntityFullStateMsg = {
			entityId,
			transform: { ...entity.transform },
			vel: { ...entity.vel },
			angVel: { ...entity.angVel },
			state: { ...entity.state }
		}
		let inputs = this.pendingInputs.get(entityId)
		if (!inputs) {
			inputs = []
			this.pendingInputs.set(entityId, inputs)
		}
		inputs.push({ seq: this.localSeq, cmd, state })
		if (inputs.length > this.cfg.maxPredictedInputs) {
			inputs.shift()
		}
		this.applyInput(entity, cmd)
		if (this.onSend) {
			const msg: SyncMsg = {
				typ: SyncMsgType.InputCmd,
				seq: this.localSeq,
				time: this.localTime,
				data: {
					entityId,
					seq: this.localSeq,
					inputs: [cmd]
				} as InputCmdMsg
			}
			this.onSend(msg)
		}
	}

	sendRPC(method: string, args: unknown[], target?: EntityId) {
		if (this.onSend) {
			const msg: SyncMsg = {
				typ: SyncMsgType.RPC,
				seq: ++this.localSeq,
				time: this.localTime,
				data: { method, args, target } as RPCMsg
			}
			this.onSend(msg)
		}
	}

	sendPing() {
		if (this.onSend) {
			const msg: SyncMsg = {
				typ: SyncMsgType.Ping,
				seq: ++this.localSeq,
				time: this.localTime,
				data: null
			}
			this.onSend(msg)
		}
	}

	upd(dt: number) {
		this.localTime += dt * 1000
		for (const entity of this.entities.values()) {
			if (entity.ownerId !== this.localId && entity.interpTo) {
				this.interpEntity(entity)
			}
		}
	}

	private interpEntity(entity: SyncedEntity) {
		if (!entity.interpFrom || !entity.interpTo) return
		const t = Math.min(1, (this.localTime - entity.interpStartTime) / (entity.interpEndTime - entity.interpStartTime))
		if (t >= 1) {
			entity.transform = { ...entity.interpTo }
			entity.interpFrom = null
			entity.interpTo = null
			return
		}
		entity.transform.pos = {
			x: this.lrp(entity.interpFrom.pos.x, entity.interpTo.pos.x, t),
			y: this.lrp(entity.interpFrom.pos.y, entity.interpTo.pos.y, t),
			z: this.lrp(entity.interpFrom.pos.z, entity.interpTo.pos.z, t)
		}
		entity.transform.rot = {
			x: this.lrpAngle(entity.interpFrom.rot.x, entity.interpTo.rot.x, t),
			y: this.lrpAngle(entity.interpFrom.rot.y, entity.interpTo.rot.y, t),
			z: this.lrpAngle(entity.interpFrom.rot.z, entity.interpTo.rot.z, t),
			w: this.lrp(entity.interpFrom.rot.w, entity.interpTo.rot.w, t)
		}
		entity.transform.scl = {
			x: this.lrp(entity.interpFrom.scl.x, entity.interpTo.scl.x, t),
			y: this.lrp(entity.interpFrom.scl.y, entity.interpTo.scl.y, t),
			z: this.lrp(entity.interpFrom.scl.z, entity.interpTo.scl.z, t)
		}
	}

	private lrp(a: number, b: number, t: number): number {
		return a + (b - a) * t
	}

	private lrpAngle(a: number, b: number, t: number): number {
		let delta = b - a
		while (delta > Math.PI) delta -= Math.PI * 2
		while (delta < -Math.PI) delta += Math.PI * 2
		return a + delta * t
	}

	getEntity(entityId: EntityId): SyncedEntity | null {
		return this.entities.get(entityId) ?? null
	}

	getLocalEntities(): SyncedEntity[] {
		return Array.from(this.entities.values()).filter(e => e.ownerId === this.localId)
	}

	getRemoteEntities(): SyncedEntity[] {
		return Array.from(this.entities.values()).filter(e => e.ownerId !== this.localId)
	}

	isOwner(entityId: EntityId): boolean {
		const entity = this.entities.get(entityId)
		return entity?.ownerId === this.localId
	}

	getRTT(): number {
		return this.rtt
	}

	getJitter(): number {
		return this.jitter
	}

	clr() {
		this.entities.clear()
		this.pendingInputs.clear()
		this.snapshots = []
	}
}

export function serializeMsg(msg: SyncMsg): ArrayBuffer {
	const json = JSON.stringify(msg)
	const encoder = new TextEncoder()
	return encoder.encode(json).buffer
}

export function deserializeMsg(buffer: ArrayBuffer): SyncMsg {
	const decoder = new TextDecoder()
	const json = decoder.decode(buffer)
	return JSON.parse(json) as SyncMsg
}

export class DeltaCompressor {
	baseStates: Map<EntityId, EntityFullStateMsg>

	constructor() {
		this.baseStates = new Map()
	}

	compress(current: EntityFullStateMsg): EntityUpdateMsg {
		const base = this.baseStates.get(current.entityId)
		if (!base) {
			this.baseStates.set(current.entityId, current)
			return {
				entityId: current.entityId,
				transform: current.transform,
				vel: current.vel,
				angVel: current.angVel,
				state: current.state
			}
		}
		const delta: EntityUpdateMsg = { entityId: current.entityId }
		if (!this.vecEq(base.transform.pos, current.transform.pos) ||
			!this.vecEq(base.transform.rot, current.transform.rot) ||
			!this.vecEq(base.transform.scl, current.transform.scl)) {
			delta.transform = {}
			if (!this.vecEq(base.transform.pos, current.transform.pos)) {
				delta.transform.pos = current.transform.pos
			}
			if (!this.vecEq(base.transform.rot, current.transform.rot)) {
				delta.transform.rot = current.transform.rot
			}
			if (!this.vecEq(base.transform.scl, current.transform.scl)) {
				delta.transform.scl = current.transform.scl
			}
		}
		if (!this.vecEq(base.vel, current.vel)) {
			delta.vel = current.vel
		}
		if (!this.vecEq(base.angVel, current.angVel)) {
			delta.angVel = current.angVel
		}
		this.baseStates.set(current.entityId, current)
		return delta
	}

	private vecEq(a: Vec3, b: Vec3): boolean {
		return Math.abs(a.x - b.x) < 0.001 &&
			Math.abs(a.y - b.y) < 0.001 &&
			Math.abs(a.z - b.z) < 0.001
	}

	reset(entityId?: EntityId) {
		if (entityId) {
			this.baseStates.delete(entityId)
		} else {
			this.baseStates.clear()
		}
	}
}
