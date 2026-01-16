import type { EntityId } from '@engine/common'

export enum TriggerType {
	Immediate = 'immediate',
	RealTimer = 'real_timer',
	GameTimer = 'game_timer',
	RealTime = 'real_time',
	GameTime = 'game_time',
	Subscribe = 'subscribe',
	RunCount = 'run_count',
	RealDuration = 'real_duration',
	GameDuration = 'game_duration'
}

export interface TriggerDef {
	typ: TriggerType
	event?: string
	delay?: number
	interval?: number
	count?: number
	duration?: number
	time?: number
}

export interface TriggerInstance {
	id: string
	def: TriggerDef
	entId?: EntityId
	startTime: number
	lastRun: number
	runCount: number
	active: boolean
	callback: () => void
}

export class TriggerManager {
	triggers: Map<string, TriggerInstance>
	nxtId: number
	gameTime: number
	realTime: number

	constructor() {
		this.triggers = new Map()
		this.nxtId = 1
		this.gameTime = 0
		this.realTime = 0
	}

	create(def: TriggerDef, callback: () => void, entId?: EntityId): string {
		const id = `trg_${this.nxtId++}`
		const now = def.typ.startsWith('real') ? this.realTime : this.gameTime
		const instance: TriggerInstance = {
			id,
			def,
			entId,
			startTime: now,
			lastRun: now,
			runCount: 0,
			active: true,
			callback
		}
		this.triggers.set(id, instance)
		if (def.typ === TriggerType.Immediate) {
			this.fire(id)
		}
		return id
	}

	del(id: string) {
		this.triggers.delete(id)
	}

	pause(id: string) {
		const trg = this.triggers.get(id)
		if (trg) trg.active = false
	}

	resume(id: string) {
		const trg = this.triggers.get(id)
		if (trg) trg.active = true
	}

	upd(realDt: number, gameDt: number) {
		this.realTime += realDt * 1000
		this.gameTime += gameDt * 1000
		for (const trg of this.triggers.values()) {
			if (!trg.active) continue
			const shouldFire = this.checkTrigger(trg)
			if (shouldFire) {
				this.fire(trg.id)
			}
		}
	}

	private checkTrigger(trg: TriggerInstance): boolean {
		const { def } = trg
		switch (def.typ) {
			case TriggerType.RealTimer: {
				const elapsed = this.realTime - trg.lastRun
				return elapsed >= (def.interval ?? 1000)
			}
			case TriggerType.GameTimer: {
				const elapsed = this.gameTime - trg.lastRun
				return elapsed >= (def.interval ?? 1000)
			}
			case TriggerType.RealTime: {
				return this.realTime >= (def.time ?? 0) && trg.runCount === 0
			}
			case TriggerType.GameTime: {
				return this.gameTime >= (def.time ?? 0) && trg.runCount === 0
			}
			case TriggerType.RunCount: {
				return trg.runCount < (def.count ?? 1)
			}
			case TriggerType.RealDuration: {
				const elapsed = this.realTime - trg.startTime
				return elapsed < (def.duration ?? 0) && this.realTime - trg.lastRun >= (def.interval ?? 100)
			}
			case TriggerType.GameDuration: {
				const elapsed = this.gameTime - trg.startTime
				return elapsed < (def.duration ?? 0) && this.gameTime - trg.lastRun >= (def.interval ?? 100)
			}
			default:
				return false
		}
	}

	private fire(id: string) {
		const trg = this.triggers.get(id)
		if (!trg) return
		try {
			trg.callback()
		} catch (e) {
			console.error(`Trigger callback error for ${id}:`, e)
		}
		trg.runCount++
		trg.lastRun = trg.def.typ.startsWith('real') ? this.realTime : this.gameTime
		if (this.shouldRemove(trg)) {
			this.triggers.delete(id)
		}
	}

	private shouldRemove(trg: TriggerInstance): boolean {
		const { def } = trg
		switch (def.typ) {
			case TriggerType.Immediate:
			case TriggerType.RealTime:
			case TriggerType.GameTime:
				return true
			case TriggerType.RunCount:
				return trg.runCount >= (def.count ?? 1)
			case TriggerType.RealDuration: {
				const elapsed = this.realTime - trg.startTime
				return elapsed >= (def.duration ?? 0)
			}
			case TriggerType.GameDuration: {
				const elapsed = this.gameTime - trg.startTime
				return elapsed >= (def.duration ?? 0)
			}
			default:
				return false
		}
	}

	getByEntity(entId: EntityId): TriggerInstance[] {
		const result: TriggerInstance[] = []
		for (const trg of this.triggers.values()) {
			if (trg.entId === entId) {
				result.push(trg)
			}
		}
		return result
	}

	delByEntity(entId: EntityId) {
		for (const [id, trg] of this.triggers) {
			if (trg.entId === entId) {
				this.triggers.delete(id)
			}
		}
	}

	clr() {
		this.triggers.clear()
	}
}
