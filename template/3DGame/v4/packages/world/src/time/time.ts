import { TimeAbilityType, type TimeAbility, type EntityId, type Vec3, type Quat, type TimeEffectCfg, defTimeEffectCfg } from '@engine/common'

export interface TimeAnchor {
	id: string
	entId: EntityId
	tick: number
	time: number
	state: any
}

export interface TimeStopState {
	active: boolean
	owner: EntityId
	startTick: number
	duration: number
	affectedEnts: Set<EntityId>
	frozenInputs: Map<EntityId, any[]>
}

export interface RewindState {
	entId: EntityId
	maxSeconds: number
	snapshots: TimeSnapshot[]
}

export interface TimeSnapshot {
	tick: number
	time: number
	pos: Vec3
	rot: Quat
	vel: Vec3
	angVel: Vec3
	hp: number
	sleeping: boolean
	state: any
}

export interface ForesightState {
	entId: EntityId
	duration: number
	predictions: Map<EntityId, TimeSnapshot[]>
	locked: boolean
}

export class TimeLayer {
	tick: number
	time: number
	paused: boolean
	timeScale: number
	anchors: Map<string, TimeAnchor>
	timeStop: TimeStopState | null
	rewinds: Map<EntityId, RewindState>
	foresights: Map<EntityId, ForesightState>
	snapshotInterval: number
	nxtAnchorId: number
	onTimeStopStart: ((owner: EntityId, cfg: TimeEffectCfg) => void) | null
	onTimeStopEnd: (() => void) | null
	onEntFreeze: ((entId: EntityId) => void) | null
	onEntUnfreeze: ((entId: EntityId) => void) | null

	constructor() {
		this.tick = 0
		this.time = 0
		this.paused = false
		this.timeScale = 1.0
		this.anchors = new Map()
		this.timeStop = null
		this.rewinds = new Map()
		this.foresights = new Map()
		this.snapshotInterval = 100
		this.nxtAnchorId = 1
		this.onTimeStopStart = null
		this.onTimeStopEnd = null
		this.onEntFreeze = null
		this.onEntUnfreeze = null
	}

	upd(dt: number) {
		if (this.paused) return
		const scaledDt = dt * this.timeScale
		this.time += scaledDt
		this.tick++
		if (this.timeStop && this.timeStop.active) {
			if (this.tick - this.timeStop.startTick >= this.timeStop.duration) {
				this.endTimeStop()
			}
		}
		for (const [entId, rewind] of this.rewinds) {
			if (this.tick % Math.floor(1000 / this.snapshotInterval) === 0) {
				this.captureRewindSnapshot(entId)
			}
		}
	}

	pause() {
		this.paused = true
	}

	resume() {
		this.paused = false
	}

	setTimeScale(scale: number) {
		this.timeScale = Math.max(0, scale)
	}

	startTimeStop(owner: EntityId, duration: number, effectCfg?: TimeEffectCfg): boolean {
		if (this.timeStop && this.timeStop.active) return false
		this.timeStop = {
			active: true,
			owner,
			startTick: this.tick,
			duration,
			affectedEnts: new Set(),
			frozenInputs: new Map()
		}
		if (this.onTimeStopStart) {
			this.onTimeStopStart(owner, effectCfg ?? defTimeEffectCfg())
		}
		return true
	}

	endTimeStop() {
		if (!this.timeStop) return
		this.timeStop.active = false
		this.timeStop = null
		if (this.onTimeStopEnd) {
			this.onTimeStopEnd()
		}
	}

	isTimeStopped(): boolean {
		return this.timeStop?.active ?? false
	}

	isEntFrozen(entId: EntityId): boolean {
		if (!this.timeStop || !this.timeStop.active) return false
		if (entId === this.timeStop.owner) return false
		return this.timeStop.affectedEnts.has(entId)
	}

	freezeEnt(entId: EntityId) {
		if (this.timeStop && this.timeStop.active) {
			this.timeStop.affectedEnts.add(entId)
			if (this.onEntFreeze) {
				this.onEntFreeze(entId)
			}
		}
	}

	unfreezeEnt(entId: EntityId) {
		if (this.timeStop) {
			this.timeStop.affectedEnts.delete(entId)
			if (this.onEntUnfreeze) {
				this.onEntUnfreeze(entId)
			}
		}
	}

	queueFrozenInput(entId: EntityId, input: any) {
		if (this.timeStop && this.timeStop.active) {
			if (!this.timeStop.frozenInputs.has(entId)) {
				this.timeStop.frozenInputs.set(entId, [])
			}
			this.timeStop.frozenInputs.get(entId)!.push(input)
		}
	}

	createAnchor(entId: EntityId, state: any): string {
		const id = `anchor_${this.nxtAnchorId++}`
		this.anchors.set(id, {
			id,
			entId,
			tick: this.tick,
			time: this.time,
			state
		})
		return id
	}

	getAnchor(id: string): TimeAnchor | undefined {
		return this.anchors.get(id)
	}

	returnToAnchor(id: string): TimeAnchor | null {
		const anchor = this.anchors.get(id)
		if (!anchor) return null
		this.anchors.delete(id)
		return anchor
	}

	delAnchor(id: string) {
		this.anchors.delete(id)
	}

	enableRewind(entId: EntityId, maxSeconds: number) {
		this.rewinds.set(entId, {
			entId,
			maxSeconds,
			snapshots: []
		})
	}

	disableRewind(entId: EntityId) {
		this.rewinds.delete(entId)
	}

	captureRewindSnapshot(
		entId: EntityId,
		pos?: Vec3,
		rot?: Quat,
		vel?: Vec3,
		angVel?: Vec3,
		hp?: number,
		sleeping?: boolean,
		state?: any
	) {
		const rewind = this.rewinds.get(entId)
		if (!rewind) return
		const snapshot: TimeSnapshot = {
			tick: this.tick,
			time: this.time,
			pos: pos ?? { x: 0, y: 0, z: 0 },
			rot: rot ?? { x: 0, y: 0, z: 0, w: 1 },
			vel: vel ?? { x: 0, y: 0, z: 0 },
			angVel: angVel ?? { x: 0, y: 0, z: 0 },
			hp: hp ?? 0,
			sleeping: sleeping ?? false,
			state
		}
		rewind.snapshots.push(snapshot)
		const maxSnapshots = Math.floor(rewind.maxSeconds * 1000 / this.snapshotInterval)
		while (rewind.snapshots.length > maxSnapshots) {
			rewind.snapshots.shift()
		}
	}

	rewind(entId: EntityId, seconds: number): TimeSnapshot | null {
		const rewind = this.rewinds.get(entId)
		if (!rewind || rewind.snapshots.length === 0) return null
		const targetTime = this.time - seconds * 1000
		let closest = rewind.snapshots[0]
		for (const snap of rewind.snapshots) {
			if (Math.abs(snap.time - targetTime) < Math.abs(closest.time - targetTime)) {
				closest = snap
			}
		}
		const idx = rewind.snapshots.indexOf(closest)
		rewind.snapshots.splice(idx + 1)
		return closest
	}

	startForesight(entId: EntityId, duration: number) {
		this.foresights.set(entId, {
			entId,
			duration,
			predictions: new Map(),
			locked: false
		})
	}

	endForesight(entId: EntityId) {
		this.foresights.delete(entId)
	}

	addPrediction(observerId: EntityId, targetId: EntityId, prediction: TimeSnapshot) {
		const foresight = this.foresights.get(observerId)
		if (!foresight) return
		if (!foresight.predictions.has(targetId)) {
			foresight.predictions.set(targetId, [])
		}
		foresight.predictions.get(targetId)!.push(prediction)
	}

	getPredictions(observerId: EntityId, targetId: EntityId): TimeSnapshot[] {
		const foresight = this.foresights.get(observerId)
		if (!foresight) return []
		return foresight.predictions.get(targetId) ?? []
	}

	lockFate(observerId: EntityId) {
		const foresight = this.foresights.get(observerId)
		if (foresight) {
			foresight.locked = true
		}
	}

	isFateLocked(observerId: EntityId): boolean {
		return this.foresights.get(observerId)?.locked ?? false
	}

	getTickRate(): number {
		return 60
	}

	getTime(): number {
		return this.time
	}

	getTick(): number {
		return this.tick
	}
}

export interface StateChange {
	tick: number
	time: number
	entId: EntityId
	field: string
	oldVal: any
	newVal: any
}

export interface DelayedSnapshot {
	baseSnapshot: TimeSnapshot
	pendingChanges: StateChange[]
}

export class FixedRewindSystem {
	entId: EntityId
	maxSeconds: number
	baseSnapshot: DelayedSnapshot | null
	changes: StateChange[]
	level: number

	constructor(entId: EntityId, maxSeconds: number, level: number = 1) {
		this.entId = entId
		this.maxSeconds = maxSeconds
		this.baseSnapshot = null
		this.changes = []
		this.level = level
	}

	getRewindDuration(): number {
		return 3 + this.level * 2
	}

	createBase(
		pos: Vec3,
		rot: Quat,
		vel: Vec3,
		angVel: Vec3,
		hp: number,
		sleeping: boolean,
		state: any,
		tick: number,
		time: number
	) {
		this.baseSnapshot = {
			baseSnapshot: {
				tick,
				time,
				pos,
				rot,
				vel,
				angVel,
				hp,
				sleeping,
				state
			},
			pendingChanges: []
		}
		this.changes = []
	}

	recordChange(tick: number, time: number, field: string, oldVal: any, newVal: any) {
		const change: StateChange = {
			tick,
			time,
			entId: this.entId,
			field,
			oldVal,
			newVal
		}
		this.changes.push(change)
		const cutoffTime = time - this.maxSeconds * 1000
		this.changes = this.changes.filter(c => c.time >= cutoffTime)
	}

	rewind(targetSeconds: number, curTime: number): { snapshot: TimeSnapshot; appliedChanges: StateChange[] } | null {
		if (!this.baseSnapshot) return null
		const effectiveSeconds = Math.min(targetSeconds, this.getRewindDuration())
		const targetTime = curTime - effectiveSeconds * 1000
		const appliedChanges: StateChange[] = []
		const base = this.baseSnapshot.baseSnapshot
		const result: TimeSnapshot = {
			tick: base.tick,
			time: base.time,
			pos: { ...base.pos },
			rot: { ...base.rot },
			vel: { ...base.vel },
			angVel: { ...base.angVel },
			hp: base.hp,
			sleeping: base.sleeping,
			state: base.state ? { ...base.state } : null
		}
		for (const change of this.changes) {
			if (change.time <= targetTime) {
				appliedChanges.push(change)
				switch (change.field) {
					case 'pos':
						result.pos = change.newVal
						break
					case 'rot':
						result.rot = change.newVal
						break
					case 'vel':
						result.vel = change.newVal
						break
					case 'angVel':
						result.angVel = change.newVal
						break
					case 'hp':
						result.hp = change.newVal
						break
					case 'sleeping':
						result.sleeping = change.newVal
						break
					default:
						if (result.state && change.field in result.state) {
							result.state[change.field] = change.newVal
						}
				}
			}
		}
		result.time = targetTime
		return { snapshot: result, appliedChanges }
	}

	clr() {
		this.baseSnapshot = null
		this.changes = []
	}
}

export interface ForesightAction {
	tick: number
	time: number
	targetId: EntityId
	action: string
	params: Record<string, any>
	pos: { x: number; y: number; z: number }
}

export class ForesightSimulation {
	observerId: EntityId
	duration: number
	predictions: Map<EntityId, ForesightAction[]>
	lockedFates: Map<EntityId, ForesightAction[]>
	active: boolean
	startTime: number

	constructor(observerId: EntityId, duration: number) {
		this.observerId = observerId
		this.duration = duration
		this.predictions = new Map()
		this.lockedFates = new Map()
		this.active = false
		this.startTime = 0
	}

	start(curTime: number) {
		this.active = true
		this.startTime = curTime
		this.predictions.clear()
		this.lockedFates.clear()
	}

	stop() {
		this.active = false
	}

	addPredictedAction(targetId: EntityId, action: ForesightAction) {
		if (!this.predictions.has(targetId)) {
			this.predictions.set(targetId, [])
		}
		this.predictions.get(targetId)!.push(action)
	}

	getPredictedActions(targetId: EntityId): ForesightAction[] {
		return this.predictions.get(targetId) ?? []
	}

	getAllPredictions(): { targetId: EntityId; actions: ForesightAction[] }[] {
		const result: { targetId: EntityId; actions: ForesightAction[] }[] = []
		for (const [targetId, actions] of this.predictions) {
			result.push({ targetId, actions })
		}
		return result
	}

	lockFate(targetId: EntityId): boolean {
		const actions = this.predictions.get(targetId)
		if (!actions || actions.length === 0) return false
		this.lockedFates.set(targetId, [...actions])
		return true
	}

	isFateLocked(targetId: EntityId): boolean {
		return this.lockedFates.has(targetId)
	}

	getLockedAction(targetId: EntityId, curTime: number): ForesightAction | null {
		const locked = this.lockedFates.get(targetId)
		if (!locked || locked.length === 0) return null
		for (const action of locked) {
			if (action.time >= curTime && action.time <= curTime + 100) {
				return action
			}
		}
		return null
	}

	isExpired(curTime: number): boolean {
		return curTime > this.startTime + this.duration * 1000
	}

	clr() {
		this.predictions.clear()
		this.lockedFates.clear()
		this.active = false
	}
}

export interface KeyframeData {
	tick: number
	time: number
	snapshot: TimeSnapshot
}

export interface DeltaData {
	tick: number
	changes: { field: string; val: any }[]
}

export class HierarchicalRewindSystem {
	entId: EntityId
	maxSeconds: number
	keyframeInterval: number
	keyframes: KeyframeData[]
	deltas: Map<number, DeltaData[]>
	prvSnapshot: TimeSnapshot | null
	curKeyframeTick: number

	constructor(entId: EntityId, maxSeconds: number = 60, keyframeInterval: number = 60) {
		this.entId = entId
		this.maxSeconds = maxSeconds
		this.keyframeInterval = keyframeInterval
		this.keyframes = []
		this.deltas = new Map()
		this.prvSnapshot = null
		this.curKeyframeTick = 0
	}

	captureFrame(snapshot: TimeSnapshot) {
		const isKeyframe = snapshot.tick % this.keyframeInterval === 0
		if (isKeyframe) {
			this.keyframes.push({
				tick: snapshot.tick,
				time: snapshot.time,
				snapshot: this.cloneSnapshot(snapshot)
			})
			this.curKeyframeTick = snapshot.tick
			this.deltas.set(snapshot.tick, [])
			this.pruneOldData(snapshot.time)
		} else if (this.prvSnapshot) {
			const changes = this.calDelta(this.prvSnapshot, snapshot)
			if (changes.length > 0) {
				const deltasForKey = this.deltas.get(this.curKeyframeTick)
				if (deltasForKey) {
					deltasForKey.push({ tick: snapshot.tick, changes })
				}
			}
		}
		this.prvSnapshot = this.cloneSnapshot(snapshot)
	}

	private cloneSnapshot(snap: TimeSnapshot): TimeSnapshot {
		return {
			tick: snap.tick,
			time: snap.time,
			pos: { ...snap.pos },
			rot: { ...snap.rot },
			vel: { ...snap.vel },
			angVel: { ...snap.angVel },
			hp: snap.hp,
			sleeping: snap.sleeping,
			state: snap.state ? JSON.parse(JSON.stringify(snap.state)) : null
		}
	}

	private calDelta(from: TimeSnapshot, to: TimeSnapshot): { field: string; val: any }[] {
		const changes: { field: string; val: any }[] = []
		if (from.pos.x !== to.pos.x || from.pos.y !== to.pos.y || from.pos.z !== to.pos.z) {
			changes.push({ field: 'pos', val: { ...to.pos } })
		}
		if (from.rot.x !== to.rot.x || from.rot.y !== to.rot.y || from.rot.z !== to.rot.z || from.rot.w !== to.rot.w) {
			changes.push({ field: 'rot', val: { ...to.rot } })
		}
		if (from.vel.x !== to.vel.x || from.vel.y !== to.vel.y || from.vel.z !== to.vel.z) {
			changes.push({ field: 'vel', val: { ...to.vel } })
		}
		if (from.angVel.x !== to.angVel.x || from.angVel.y !== to.angVel.y || from.angVel.z !== to.angVel.z) {
			changes.push({ field: 'angVel', val: { ...to.angVel } })
		}
		if (from.hp !== to.hp) {
			changes.push({ field: 'hp', val: to.hp })
		}
		if (from.sleeping !== to.sleeping) {
			changes.push({ field: 'sleeping', val: to.sleeping })
		}
		return changes
	}

	private pruneOldData(curTime: number) {
		const cutoffTime = curTime - this.maxSeconds * 1000
		while (this.keyframes.length > 0 && this.keyframes[0].time < cutoffTime) {
			const oldKey = this.keyframes.shift()!
			this.deltas.delete(oldKey.tick)
		}
	}

	reconstruct(targetTick: number): TimeSnapshot | null {
		let keyframe: KeyframeData | null = null
		for (let i = this.keyframes.length - 1; i >= 0; i--) {
			if (this.keyframes[i].tick <= targetTick) {
				keyframe = this.keyframes[i]
				break
			}
		}
		if (!keyframe) return null
		const result = this.cloneSnapshot(keyframe.snapshot)
		const deltasForKey = this.deltas.get(keyframe.tick)
		if (deltasForKey) {
			for (const delta of deltasForKey) {
				if (delta.tick <= targetTick) {
					for (const change of delta.changes) {
						switch (change.field) {
							case 'pos':
								result.pos = change.val
								break
							case 'rot':
								result.rot = change.val
								break
							case 'vel':
								result.vel = change.val
								break
							case 'angVel':
								result.angVel = change.val
								break
							case 'hp':
								result.hp = change.val
								break
							case 'sleeping':
								result.sleeping = change.val
								break
						}
					}
					result.tick = delta.tick
				}
			}
		}
		return result
	}

	rewindBySeconds(seconds: number, curTick: number, tickRate: number = 60): TimeSnapshot | null {
		const targetTick = curTick - Math.floor(seconds * tickRate)
		return this.reconstruct(targetTick)
	}

	getMemoryUsage(): { keyframes: number; deltas: number; total: number } {
		let deltaCount = 0
		for (const arr of this.deltas.values()) {
			deltaCount += arr.length
		}
		return {
			keyframes: this.keyframes.length,
			deltas: deltaCount,
			total: this.keyframes.length + deltaCount
		}
	}

	clr() {
		this.keyframes = []
		this.deltas.clear()
		this.prvSnapshot = null
		this.curKeyframeTick = 0
	}
}

export interface SimulatedEvent {
	tick: number
	typ: 'collision' | 'damage' | 'death' | 'ability'
	entA: EntityId
	entB?: EntityId
	data: any
}

export interface SimulatedFrame {
	tick: number
	time: number
	entities: Map<EntityId, TimeSnapshot>
	events: SimulatedEvent[]
}

export interface ForesightPhysicsCfg {
	seed: number
	fixedDt: number
	gravity: Vec3
}

export class ForesightPhysicsSimulator {
	cfg: ForesightPhysicsCfg
	entities: Map<EntityId, TimeSnapshot>
	frames: SimulatedFrame[]
	curTick: number
	curTime: number

	constructor(cfg: ForesightPhysicsCfg) {
		this.cfg = cfg
		this.entities = new Map()
		this.frames = []
		this.curTick = 0
		this.curTime = 0
	}

	cloneState(snapshots: Map<EntityId, TimeSnapshot>, tick: number, time: number) {
		this.entities.clear()
		for (const [id, snap] of snapshots) {
			this.entities.set(id, {
				tick: snap.tick,
				time: snap.time,
				pos: { ...snap.pos },
				rot: { ...snap.rot },
				vel: { ...snap.vel },
				angVel: { ...snap.angVel },
				hp: snap.hp,
				sleeping: snap.sleeping,
				state: snap.state ? JSON.parse(JSON.stringify(snap.state)) : null
			})
		}
		this.curTick = tick
		this.curTime = time
		this.frames = []
	}

	simulateStep(): SimulatedFrame {
		const dt = this.cfg.fixedDt
		const events: SimulatedEvent[] = []
		for (const [id, ent] of this.entities) {
			if (ent.sleeping) continue
			ent.vel.y += this.cfg.gravity.y * dt
			ent.pos.x += ent.vel.x * dt
			ent.pos.y += ent.vel.y * dt
			ent.pos.z += ent.vel.z * dt
		}
		this.curTick++
		this.curTime += dt * 1000
		const frame: SimulatedFrame = {
			tick: this.curTick,
			time: this.curTime,
			entities: new Map(),
			events
		}
		for (const [id, ent] of this.entities) {
			frame.entities.set(id, {
				tick: ent.tick,
				time: ent.time,
				pos: { ...ent.pos },
				rot: { ...ent.rot },
				vel: { ...ent.vel },
				angVel: { ...ent.angVel },
				hp: ent.hp,
				sleeping: ent.sleeping,
				state: null
			})
		}
		this.frames.push(frame)
		return frame
	}

	simulateDuration(seconds: number): SimulatedFrame[] {
		const steps = Math.ceil(seconds / this.cfg.fixedDt)
		for (let i = 0; i < steps; i++) {
			this.simulateStep()
		}
		return this.frames
	}

	getPrediction(entId: EntityId, targetTime: number): TimeSnapshot | null {
		for (const frame of this.frames) {
			if (frame.time >= targetTime) {
				return frame.entities.get(entId) ?? null
			}
		}
		return null
	}

	getPredictedEvents(entId?: EntityId): SimulatedEvent[] {
		const allEvents: SimulatedEvent[] = []
		for (const frame of this.frames) {
			for (const evt of frame.events) {
				if (!entId || evt.entA === entId || evt.entB === entId) {
					allEvents.push(evt)
				}
			}
		}
		return allEvents
	}

	clr() {
		this.entities.clear()
		this.frames = []
		this.curTick = 0
		this.curTime = 0
	}
}
