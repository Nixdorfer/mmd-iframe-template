export type EventCallback = (data: any) => void | Promise<void>

export interface Subscription {
	id: string
	event: string
	callback: EventCallback
	priority: number
	once: boolean
}

export interface QueuedEvent {
	event: string
	data: any
	time: number
	priority: number
}

export class SBRSystem {
	subs: Map<string, Subscription[]>
	queue: QueuedEvent[]
	nxtId: number
	processing: boolean

	constructor() {
		this.subs = new Map()
		this.queue = []
		this.nxtId = 1
		this.processing = false
	}

	sub(event: string, callback: EventCallback, priority = 0, once = false): string {
		const id = `sub_${this.nxtId++}`
		const subscription: Subscription = { id, event, callback, priority, once }
		if (!this.subs.has(event)) {
			this.subs.set(event, [])
		}
		const list = this.subs.get(event)!
		list.push(subscription)
		list.sort((a, b) => b.priority - a.priority)
		return id
	}

	unsub(id: string) {
		for (const [, list] of this.subs) {
			const idx = list.findIndex(s => s.id === id)
			if (idx >= 0) {
				list.splice(idx, 1)
				return
			}
		}
	}

	unsubAll(event: string) {
		this.subs.delete(event)
	}

	pub(event: string, data: any = {}, priority = 0) {
		this.queue.push({
			event,
			data,
			time: Date.now(),
			priority
		})
		this.queue.sort((a, b) => {
			if (b.priority !== a.priority) return b.priority - a.priority
			return a.time - b.time
		})
	}

	async process() {
		if (this.processing) return
		this.processing = true
		while (this.queue.length > 0) {
			const evt = this.queue.shift()!
			await this.dispatch(evt.event, evt.data)
		}
		this.processing = false
	}

	private async dispatch(event: string, data: any) {
		const list = this.subs.get(event)
		if (!list) return
		const toRemove: string[] = []
		for (const sub of list) {
			try {
				await sub.callback(data)
			} catch (e) {
				console.error(`Event handler error for ${event}:`, e)
			}
			if (sub.once) {
				toRemove.push(sub.id)
			}
		}
		for (const id of toRemove) {
			this.unsub(id)
		}
	}

	pubSync(event: string, data: any = {}) {
		const list = this.subs.get(event)
		if (!list) return
		const toRemove: string[] = []
		for (const sub of list) {
			try {
				sub.callback(data)
			} catch (e) {
				console.error(`Event handler error for ${event}:`, e)
			}
			if (sub.once) {
				toRemove.push(sub.id)
			}
		}
		for (const id of toRemove) {
			this.unsub(id)
		}
	}

	once(event: string, callback: EventCallback, priority = 0): string {
		return this.sub(event, callback, priority, true)
	}

	has(event: string): boolean {
		const list = this.subs.get(event)
		return list !== undefined && list.length > 0
	}

	cnt(event: string): number {
		return this.subs.get(event)?.length ?? 0
	}

	clr() {
		this.subs.clear()
		this.queue = []
	}
}

export const globalSBR = new SBRSystem()

export interface RecordedEvent {
	id: number
	event: string
	data: any
	time: number
	frame: number
}

export interface EventRecord {
	ver: number
	staTime: number
	events: RecordedEvent[]
	checkpoints: { frame: number; state: any }[]
}

export class RecordableSBR extends SBRSystem {
	recording: boolean
	replaying: boolean
	record: EventRecord | null
	replayIdx: number
	replaySpd: number
	curFrame: number
	replayStaTime: number
	cpInterval: number
	getSnapshot: (() => any) | null
	setSnapshot: ((s: any) => void) | null

	constructor() {
		super()
		this.recording = false
		this.replaying = false
		this.record = null
		this.replayIdx = 0
		this.replaySpd = 1.0
		this.curFrame = 0
		this.replayStaTime = 0
		this.cpInterval = 300
		this.getSnapshot = null
		this.setSnapshot = null
	}

	staRecord() {
		this.recording = true
		this.curFrame = 0
		this.record = { ver: 1, staTime: Date.now(), events: [], checkpoints: [] }
	}

	endRecord(): EventRecord | null {
		this.recording = false
		const r = this.record
		this.record = null
		return r
	}

	pub(event: string, data: any = {}, priority = 0) {
		if (this.recording && this.record) {
			this.record.events.push({
				id: this.record.events.length,
				event,
				data: this.clnData(data),
				time: Date.now() - this.record.staTime,
				frame: this.curFrame
			})
			if (this.curFrame % this.cpInterval === 0 && this.getSnapshot) {
				this.record.checkpoints.push({ frame: this.curFrame, state: this.getSnapshot() })
			}
		}
		super.pub(event, data, priority)
	}

	private clnData(d: any): any {
		if (d === null || typeof d !== 'object') return d
		if (d instanceof Map) return { __t: 'Map', d: Array.from(d.entries()) }
		if (d instanceof Set) return { __t: 'Set', d: Array.from(d) }
		return JSON.parse(JSON.stringify(d))
	}

	private rstData(d: any): any {
		if (d === null || typeof d !== 'object') return d
		if (d.__t === 'Map') return new Map(d.d)
		if (d.__t === 'Set') return new Set(d.d)
		return d
	}

	staReplay(rec: EventRecord, spd = 1.0) {
		this.record = rec
		this.replaying = true
		this.replayIdx = 0
		this.replaySpd = spd
		this.curFrame = 0
		this.replayStaTime = Date.now()
	}

	endReplay() {
		this.replaying = false
		this.record = null
		this.replayIdx = 0
	}

	seekFrame(frame: number) {
		if (!this.record || !this.replaying) return
		const cp = this.findCp(frame)
		if (cp && this.setSnapshot) {
			this.setSnapshot(cp.state)
			this.curFrame = cp.frame
			this.replayIdx = this.record.events.findIndex(e => e.frame >= cp.frame)
			if (this.replayIdx < 0) this.replayIdx = 0
		}
		while (this.curFrame < frame && this.replayIdx < this.record.events.length) {
			const evt = this.record.events[this.replayIdx]
			if (evt.frame <= frame) {
				super.pub(evt.event, this.rstData(evt.data))
				this.replayIdx++
			} else break
		}
		this.curFrame = frame
	}

	private findCp(frame: number) {
		if (!this.record) return null
		let best = null
		for (const cp of this.record.checkpoints) {
			if (cp.frame <= frame) best = cp
			else break
		}
		return best
	}

	updReplay(_dt: number) {
		if (!this.replaying || !this.record) return
		const elapsed = (Date.now() - this.replayStaTime) * this.replaySpd
		while (this.replayIdx < this.record.events.length) {
			const evt = this.record.events[this.replayIdx]
			if (evt.time <= elapsed) {
				super.pub(evt.event, this.rstData(evt.data))
				this.replayIdx++
			} else break
		}
		if (this.replayIdx >= this.record.events.length) this.endReplay()
	}

	incFrame() {
		this.curFrame++
	}

	exportRecord(): string {
		return JSON.stringify(this.record)
	}

	importRecord(json: string): EventRecord {
		return JSON.parse(json)
	}
}
