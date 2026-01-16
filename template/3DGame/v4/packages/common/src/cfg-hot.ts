export interface CfgSnapshot {
	id: string
	tsp: number
	data: string
	desc?: string
}

export interface CfgChgEvt<T = any> {
	path: string
	oldVal: T
	newVal: T
	tsp: number
}

export interface CfgLsnOpt {
	deep?: boolean
	immediate?: boolean
	throttle?: number
}

export type CfgLsnCbk<T = any> = (evt: CfgChgEvt<T>) => void

interface LsnEntry {
	id: string
	cbk: CfgLsnCbk
	opt: CfgLsnOpt
}

let lsnIdCnt = 0

export class CfgHotLoader<T extends object> {
	cfg: T
	defCfg: T
	snapshots: CfgSnapshot[]
	maxSnapshots: number
	listeners: Map<string, LsnEntry[]>
	throttleTimers: Map<string, number>
	curSnapshotIdx: number

	constructor(defCfg: T, maxSnapshots: number = 50) {
		this.defCfg = this.deepCln(defCfg)
		this.cfg = this.createProxy(this.deepCln(defCfg), '')
		this.snapshots = []
		this.maxSnapshots = maxSnapshots
		this.listeners = new Map()
		this.throttleTimers = new Map()
		this.curSnapshotIdx = -1
	}

	private deepCln<U>(obj: U): U {
		return JSON.parse(JSON.stringify(obj))
	}

	private createProxy(obj: any, path: string): any {
		if (typeof obj !== 'object' || obj === null) return obj
		const self = this
		return new Proxy(obj, {
			get(target, prop) {
				const val = target[prop]
				if (typeof val === 'object' && val !== null) {
					const newPath = path ? `${path}.${String(prop)}` : String(prop)
					return self.createProxy(val, newPath)
				}
				return val
			},
			set(target, prop, val) {
				const oldVal = target[prop]
				if (oldVal === val) return true
				target[prop] = val
				const evtPath = path ? `${path}.${String(prop)}` : String(prop)
				self.notifyLsn(evtPath, {
					path: evtPath,
					oldVal,
					newVal: val,
					tsp: Date.now()
				})
				return true
			}
		})
	}

	private notifyLsn(path: string, evt: CfgChgEvt) {
		for (const [lsnPath, entries] of this.listeners) {
			for (const entry of entries) {
				if (this.matchPath(lsnPath, path, entry.opt.deep ?? false)) {
					if (entry.opt.throttle && entry.opt.throttle > 0) {
						const timerKey = `${entry.id}_${path}`
						if (this.throttleTimers.has(timerKey)) continue
						this.throttleTimers.set(timerKey, window.setTimeout(() => {
							this.throttleTimers.delete(timerKey)
						}, entry.opt.throttle))
					}
					entry.cbk(evt)
				}
			}
		}
	}

	private matchPath(lsnPath: string, evtPath: string, deep: boolean): boolean {
		if (lsnPath === '*') return true
		if (lsnPath === evtPath) return true
		if (deep && evtPath.startsWith(lsnPath + '.')) return true
		return false
	}

	get<K extends keyof T>(key: K): T[K] {
		return this.cfg[key]
	}

	set<K extends keyof T>(key: K, val: T[K]) {
		(this.cfg as any)[key] = val
	}

	setPath(path: string, val: any) {
		const parts = path.split('.')
		let cur: any = this.cfg
		for (let i = 0; i < parts.length - 1; i++) {
			cur = cur[parts[i]]
			if (!cur) return
		}
		cur[parts[parts.length - 1]] = val
	}

	getPath(path: string): any {
		const parts = path.split('.')
		let cur: any = this.cfg
		for (const part of parts) {
			cur = cur[part]
			if (cur === undefined) return undefined
		}
		return cur
	}

	sub(path: string, cbk: CfgLsnCbk, opt?: CfgLsnOpt): string {
		const id = `lsn_${++lsnIdCnt}`
		const entry: LsnEntry = {
			id,
			cbk,
			opt: opt ?? {}
		}
		if (!this.listeners.has(path)) {
			this.listeners.set(path, [])
		}
		this.listeners.get(path)!.push(entry)
		if (opt?.immediate) {
			cbk({
				path,
				oldVal: undefined,
				newVal: this.getPath(path),
				tsp: Date.now()
			})
		}
		return id
	}

	unsub(id: string) {
		for (const [path, entries] of this.listeners) {
			const idx = entries.findIndex(e => e.id === id)
			if (idx !== -1) {
				entries.splice(idx, 1)
				if (entries.length === 0) {
					this.listeners.delete(path)
				}
				return
			}
		}
	}

	unsubAll(path?: string) {
		if (path) {
			this.listeners.delete(path)
		} else {
			this.listeners.clear()
		}
	}

	snapshot(desc?: string): string {
		const id = `snap_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
		const snap: CfgSnapshot = {
			id,
			tsp: Date.now(),
			data: JSON.stringify(this.getRaw()),
			desc
		}
		if (this.curSnapshotIdx < this.snapshots.length - 1) {
			this.snapshots = this.snapshots.slice(0, this.curSnapshotIdx + 1)
		}
		this.snapshots.push(snap)
		if (this.snapshots.length > this.maxSnapshots) {
			this.snapshots.shift()
		}
		this.curSnapshotIdx = this.snapshots.length - 1
		return id
	}

	bak(id?: string): boolean {
		let snap: CfgSnapshot | undefined
		if (id) {
			snap = this.snapshots.find(s => s.id === id)
		} else if (this.snapshots.length > 0) {
			snap = this.snapshots[this.snapshots.length - 1]
		}
		if (!snap) return false
		try {
			const data = JSON.parse(snap.data)
			this.lodFromObj(data)
			const idx = this.snapshots.findIndex(s => s.id === snap!.id)
			if (idx !== -1) this.curSnapshotIdx = idx
			return true
		} catch (e) {
			return false
		}
	}

	bakToPrv(): boolean {
		if (this.curSnapshotIdx <= 0) return false
		this.curSnapshotIdx--
		const snap = this.snapshots[this.curSnapshotIdx]
		try {
			const data = JSON.parse(snap.data)
			this.lodFromObjSilent(data)
			return true
		} catch (e) {
			return false
		}
	}

	bakToNxt(): boolean {
		if (this.curSnapshotIdx >= this.snapshots.length - 1) return false
		this.curSnapshotIdx++
		const snap = this.snapshots[this.curSnapshotIdx]
		try {
			const data = JSON.parse(snap.data)
			this.lodFromObjSilent(data)
			return true
		} catch (e) {
			return false
		}
	}

	getSnapshots(): CfgSnapshot[] {
		return [...this.snapshots]
	}

	delSnapshot(id: string): boolean {
		const idx = this.snapshots.findIndex(s => s.id === id)
		if (idx === -1) return false
		this.snapshots.splice(idx, 1)
		if (this.curSnapshotIdx >= idx) {
			this.curSnapshotIdx = Math.max(0, this.curSnapshotIdx - 1)
		}
		return true
	}

	clrSnapshots() {
		this.snapshots = []
		this.curSnapshotIdx = -1
	}

	async lodFromUrl(url: string): Promise<boolean> {
		try {
			const res = await fetch(url)
			if (!res.ok) return false
			const data = await res.json()
			this.lodFromObj(data)
			return true
		} catch (e) {
			return false
		}
	}

	async lodFromFile(file: File): Promise<boolean> {
		try {
			const text = await file.text()
			const data = JSON.parse(text)
			this.lodFromObj(data)
			return true
		} catch (e) {
			return false
		}
	}

	lodFromObj(obj: Partial<T>) {
		this.mergeDeep(this.cfg, obj)
	}

	private lodFromObjSilent(obj: Partial<T>) {
		const raw = this.getRaw()
		this.mergeDeepRaw(raw, obj)
		this.cfg = this.createProxy(raw, '')
	}

	private mergeDeep(target: any, source: any) {
		for (const key of Object.keys(source)) {
			if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
				if (!target[key]) target[key] = {}
				this.mergeDeep(target[key], source[key])
			} else {
				target[key] = source[key]
			}
		}
	}

	private mergeDeepRaw(target: any, source: any) {
		for (const key of Object.keys(source)) {
			if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
				if (!target[key]) target[key] = {}
				this.mergeDeepRaw(target[key], source[key])
			} else {
				target[key] = source[key]
			}
		}
	}

	rst() {
		this.cfg = this.createProxy(this.deepCln(this.defCfg), '')
	}

	getRaw(): T {
		return this.deepCln(this.extractRaw(this.cfg))
	}

	private extractRaw(proxy: any): any {
		if (typeof proxy !== 'object' || proxy === null) return proxy
		if (Array.isArray(proxy)) {
			return proxy.map(item => this.extractRaw(item))
		}
		const raw: any = {}
		for (const key of Object.keys(proxy)) {
			raw[key] = this.extractRaw(proxy[key])
		}
		return raw
	}

	toJSON(): string {
		return JSON.stringify(this.getRaw())
	}

	fromJSON(json: string): boolean {
		try {
			const data = JSON.parse(json)
			this.lodFromObj(data)
			return true
		} catch (e) {
			return false
		}
	}

	canUndo(): boolean {
		return this.curSnapshotIdx > 0
	}

	canRedo(): boolean {
		return this.curSnapshotIdx < this.snapshots.length - 1
	}
}
