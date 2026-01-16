export interface ProfileSample {
	name: string
	start: number
	end: number
	dur: number
	parent?: string
}

export interface SystemProfile {
	name: string
	samples: number[]
	avgMs: number
	maxMs: number
	minMs: number
	totalMs: number
	percent: number
}

export interface EntityProfile {
	id: number
	name: string
	totalMs: number
	percent: number
	updates: Map<string, UpdateProfile>
}

export interface UpdateProfile {
	name: string
	avgMs: number
	maxMs: number
	totalMs: number
	callCnt: number
}

export interface FrameProfile {
	frameIdx: number
	totalMs: number
	systems: Map<string, number>
	entities: Map<number, Map<string, number>>
}

export type ProfileViewMode = 'system' | 'entity' | 'frame'

export class Profiler {
	enabled: boolean
	maxSamples: number
	curFrame: FrameProfile
	frames: FrameProfile[]
	systems: Map<string, SystemProfile>
	entities: Map<number, EntityProfile>
	entityNames: Map<number, string>
	frameIdx: number
	frameStart: number
	activeStack: { name: string; start: number; isSystem: boolean; entityId?: number }[]
	viewMode: ProfileViewMode
	selectedEntity: number | null
	expanded: Set<number>

	constructor(maxSamples: number = 120) {
		this.enabled = false
		this.maxSamples = maxSamples
		this.curFrame = this.createFrame(0)
		this.frames = []
		this.systems = new Map()
		this.entities = new Map()
		this.entityNames = new Map()
		this.frameIdx = 0
		this.frameStart = 0
		this.activeStack = []
		this.viewMode = 'system'
		this.selectedEntity = null
		this.expanded = new Set()
	}

	private createFrame(idx: number): FrameProfile {
		return {
			frameIdx: idx,
			totalMs: 0,
			systems: new Map(),
			entities: new Map()
		}
	}

	setEnabled(enabled: boolean) {
		this.enabled = enabled
		if (enabled) {
			this.rst()
		}
	}

	rst() {
		this.frames = []
		this.systems.clear()
		this.entities.clear()
		this.frameIdx = 0
		this.curFrame = this.createFrame(0)
	}

	beginFrame() {
		if (!this.enabled) return
		this.frameStart = performance.now()
		this.curFrame = this.createFrame(this.frameIdx)
	}

	endFrame() {
		if (!this.enabled) return
		this.curFrame.totalMs = performance.now() - this.frameStart
		this.frames.push(this.curFrame)
		if (this.frames.length > this.maxSamples) {
			this.frames.shift()
		}
		this.updAggregates()
		this.frameIdx++
	}

	beginSystem(name: string) {
		if (!this.enabled) return
		this.activeStack.push({
			name,
			start: performance.now(),
			isSystem: true
		})
	}

	endSystem(name: string) {
		if (!this.enabled) return
		const entry = this.activeStack.pop()
		if (!entry || entry.name !== name) return
		const dur = performance.now() - entry.start
		const prev = this.curFrame.systems.get(name) ?? 0
		this.curFrame.systems.set(name, prev + dur)
	}

	beginEntity(entityId: number, updateName: string) {
		if (!this.enabled) return
		this.activeStack.push({
			name: updateName,
			start: performance.now(),
			isSystem: false,
			entityId
		})
	}

	endEntity(entityId: number, updateName: string) {
		if (!this.enabled) return
		const entry = this.activeStack.pop()
		if (!entry || entry.entityId !== entityId) return
		const dur = performance.now() - entry.start
		let entityMap = this.curFrame.entities.get(entityId)
		if (!entityMap) {
			entityMap = new Map()
			this.curFrame.entities.set(entityId, entityMap)
		}
		const prev = entityMap.get(updateName) ?? 0
		entityMap.set(updateName, prev + dur)
	}

	regEntityName(entityId: number, name: string) {
		this.entityNames.set(entityId, name)
	}

	private updAggregates() {
		const frameCnt = this.frames.length
		if (frameCnt === 0) return
		const totalFrameMs = this.frames.reduce((sum, f) => sum + f.totalMs, 0)
		const systemTotals = new Map<string, number[]>()
		const entityTotals = new Map<number, Map<string, number[]>>()
		for (const frame of this.frames) {
			for (const [sysName, dur] of frame.systems) {
				if (!systemTotals.has(sysName)) {
					systemTotals.set(sysName, [])
				}
				systemTotals.get(sysName)!.push(dur)
			}
			for (const [entId, updates] of frame.entities) {
				if (!entityTotals.has(entId)) {
					entityTotals.set(entId, new Map())
				}
				const entMap = entityTotals.get(entId)!
				for (const [updName, dur] of updates) {
					if (!entMap.has(updName)) {
						entMap.set(updName, [])
					}
					entMap.get(updName)!.push(dur)
				}
			}
		}
		this.systems.clear()
		for (const [name, samples] of systemTotals) {
			const totalMs = samples.reduce((a, b) => a + b, 0)
			const avgMs = totalMs / samples.length
			const maxMs = Math.max(...samples)
			const minMs = Math.min(...samples)
			this.systems.set(name, {
				name,
				samples,
				avgMs,
				maxMs,
				minMs,
				totalMs,
				percent: (totalMs / totalFrameMs) * 100
			})
		}
		this.entities.clear()
		for (const [entId, updateMap] of entityTotals) {
			let entTotal = 0
			const updates = new Map<string, UpdateProfile>()
			for (const [updName, samples] of updateMap) {
				const totalMs = samples.reduce((a, b) => a + b, 0)
				entTotal += totalMs
				updates.set(updName, {
					name: updName,
					avgMs: totalMs / samples.length,
					maxMs: Math.max(...samples),
					totalMs,
					callCnt: samples.length
				})
			}
			this.entities.set(entId, {
				id: entId,
				name: this.entityNames.get(entId) ?? `Entity_${entId}`,
				totalMs: entTotal,
				percent: (entTotal / totalFrameMs) * 100,
				updates
			})
		}
	}

	getSystemsSorted(): SystemProfile[] {
		return [...this.systems.values()].sort((a, b) => b.totalMs - a.totalMs)
	}

	getEntitiesSorted(): EntityProfile[] {
		return [...this.entities.values()].sort((a, b) => b.totalMs - a.totalMs)
	}

	getAvgFrameMs(): number {
		if (this.frames.length === 0) return 0
		return this.frames.reduce((sum, f) => sum + f.totalMs, 0) / this.frames.length
	}

	getFps(): number {
		const avgMs = this.getAvgFrameMs()
		return avgMs > 0 ? 1000 / avgMs : 0
	}

	getLastFrameMs(): number {
		return this.frames.length > 0 ? this.frames[this.frames.length - 1].totalMs : 0
	}

	toggleExpand(entityId: number) {
		if (this.expanded.has(entityId)) {
			this.expanded.delete(entityId)
		} else {
			this.expanded.add(entityId)
		}
	}

	setViewMode(mode: ProfileViewMode) {
		this.viewMode = mode
	}

	selectEntity(entityId: number | null) {
		this.selectedEntity = entityId
	}
}

export interface DebugUIConfig {
	x: number
	y: number
	width: number
	height: number
	bgClr: string
	txtClr: string
	barClr: string
	barBgClr: string
	hdrClr: string
	selClr: string
	fontSize: number
	padding: number
	rowHeight: number
}

export const DEFAULT_DEBUG_UI_CONFIG: DebugUIConfig = {
	x: 10,
	y: 10,
	width: 320,
	height: 400,
	bgClr: 'rgba(0,0,0,0.85)',
	txtClr: '#fff',
	barClr: '#4a9',
	barBgClr: '#333',
	hdrClr: '#6bf',
	selClr: 'rgba(100,180,255,0.3)',
	fontSize: 12,
	padding: 8,
	rowHeight: 18
}

export class DebugUIRenderer {
	profiler: Profiler
	cfg: DebugUIConfig
	ctx: CanvasRenderingContext2D | null
	scrollY: number
	maxScrollY: number
	dragging: boolean
	lastY: number

	constructor(profiler: Profiler, cfg: Partial<DebugUIConfig> = {}) {
		this.profiler = profiler
		this.cfg = { ...DEFAULT_DEBUG_UI_CONFIG, ...cfg }
		this.ctx = null
		this.scrollY = 0
		this.maxScrollY = 0
		this.dragging = false
		this.lastY = 0
	}

	attach(ctx: CanvasRenderingContext2D) {
		this.ctx = ctx
	}

	onMouseDown(x: number, y: number): boolean {
		if (!this.isInBounds(x, y)) return false
		this.dragging = true
		this.lastY = y
		const localY = y - this.cfg.y - 60 + this.scrollY
		const rowIdx = Math.floor(localY / this.cfg.rowHeight)
		if (this.profiler.viewMode === 'entity') {
			const entities = this.profiler.getEntitiesSorted()
			let curRow = 0
			for (const ent of entities) {
				if (curRow === rowIdx) {
					this.profiler.toggleExpand(ent.id)
					return true
				}
				curRow++
				if (this.profiler.expanded.has(ent.id)) {
					curRow += ent.updates.size
				}
			}
		}
		return true
	}

	onMouseUp() {
		this.dragging = false
	}

	onMouseMove(_x: number, y: number) {
		if (this.dragging) {
			const dy = this.lastY - y
			this.scrollY = Math.max(0, Math.min(this.maxScrollY, this.scrollY + dy))
			this.lastY = y
		}
	}

	onWheel(x: number, y: number, delta: number): boolean {
		if (!this.isInBounds(x, y)) return false
		this.scrollY = Math.max(0, Math.min(this.maxScrollY, this.scrollY + delta * 0.5))
		return true
	}

	onKeyDown(key: string): boolean {
		if (key === '1') {
			this.profiler.setViewMode('system')
			return true
		} else if (key === '2') {
			this.profiler.setViewMode('entity')
			return true
		} else if (key === '3') {
			this.profiler.setViewMode('frame')
			return true
		}
		return false
	}

	isInBounds(x: number, y: number): boolean {
		return x >= this.cfg.x && x <= this.cfg.x + this.cfg.width &&
			y >= this.cfg.y && y <= this.cfg.y + this.cfg.height
	}

	render() {
		if (!this.ctx || !this.profiler.enabled) return
		const ctx = this.ctx
		const c = this.cfg
		ctx.save()
		ctx.fillStyle = c.bgClr
		ctx.fillRect(c.x, c.y, c.width, c.height)
		ctx.font = `bold ${c.fontSize + 2}px monospace`
		ctx.fillStyle = c.hdrClr
		ctx.fillText('Performance Profiler', c.x + c.padding, c.y + c.padding + c.fontSize)
		const fps = this.profiler.getFps().toFixed(1)
		const frameMs = this.profiler.getLastFrameMs().toFixed(2)
		const avgMs = this.profiler.getAvgFrameMs().toFixed(2)
		ctx.font = `${c.fontSize}px monospace`
		ctx.fillStyle = c.txtClr
		ctx.fillText(`FPS: ${fps}  Frame: ${frameMs}ms  Avg: ${avgMs}ms`, c.x + c.padding, c.y + c.padding + c.fontSize * 2.5)
		const tabY = c.y + 45
		const tabs = ['[1]System', '[2]Entity', '[3]Frame']
		const modes: ProfileViewMode[] = ['system', 'entity', 'frame']
		let tabX = c.x + c.padding
		for (let i = 0; i < tabs.length; i++) {
			ctx.fillStyle = this.profiler.viewMode === modes[i] ? c.hdrClr : '#888'
			ctx.fillText(tabs[i], tabX, tabY)
			tabX += 90
		}
		ctx.beginPath()
		ctx.rect(c.x, c.y + 55, c.width, c.height - 55)
		ctx.clip()
		const contentY = c.y + 60 - this.scrollY
		switch (this.profiler.viewMode) {
			case 'system':
				this.renderSystemView(contentY)
				break
			case 'entity':
				this.renderEntityView(contentY)
				break
			case 'frame':
				this.renderFrameView(contentY)
				break
		}
		ctx.restore()
	}

	private renderSystemView(startY: number) {
		if (!this.ctx) return
		const ctx = this.ctx
		const c = this.cfg
		const systems = this.profiler.getSystemsSorted()
		let y = startY
		let totalRows = 0
		for (const sys of systems) {
			if (y > c.y && y < c.y + c.height) {
				ctx.fillStyle = c.txtClr
				ctx.fillText(sys.name, c.x + c.padding, y + c.fontSize)
				const barWidth = (c.width - c.padding * 2 - 120) * (sys.percent / 100)
				ctx.fillStyle = c.barBgClr
				ctx.fillRect(c.x + 120, y + 2, c.width - c.padding * 2 - 120, c.rowHeight - 4)
				ctx.fillStyle = c.barClr
				ctx.fillRect(c.x + 120, y + 2, Math.min(barWidth, c.width - c.padding * 2 - 120), c.rowHeight - 4)
				ctx.fillStyle = c.txtClr
				const statsText = `${sys.avgMs.toFixed(2)}ms (${sys.percent.toFixed(1)}%)`
				ctx.fillText(statsText, c.x + c.width - c.padding - ctx.measureText(statsText).width, y + c.fontSize)
			}
			y += c.rowHeight
			totalRows++
		}
		this.maxScrollY = Math.max(0, totalRows * c.rowHeight - (c.height - 60))
	}

	private renderEntityView(startY: number) {
		if (!this.ctx) return
		const ctx = this.ctx
		const c = this.cfg
		const entities = this.profiler.getEntitiesSorted()
		let y = startY
		let totalRows = 0
		for (const ent of entities) {
			const isExpanded = this.profiler.expanded.has(ent.id)
			if (y > c.y && y < c.y + c.height) {
				const arrow = isExpanded ? '▼' : '▶'
				ctx.fillStyle = c.txtClr
				ctx.fillText(`${arrow} ${ent.name}`, c.x + c.padding, y + c.fontSize)
				const barWidth = (c.width - c.padding * 2 - 140) * (ent.percent / 100)
				ctx.fillStyle = c.barBgClr
				ctx.fillRect(c.x + 140, y + 2, c.width - c.padding * 2 - 140, c.rowHeight - 4)
				ctx.fillStyle = c.barClr
				ctx.fillRect(c.x + 140, y + 2, Math.min(barWidth, c.width - c.padding * 2 - 140), c.rowHeight - 4)
				ctx.fillStyle = c.txtClr
				const statsText = `${ent.totalMs.toFixed(2)}ms`
				ctx.fillText(statsText, c.x + c.width - c.padding - ctx.measureText(statsText).width, y + c.fontSize)
			}
			y += c.rowHeight
			totalRows++
			if (isExpanded) {
				const sortedUpdates = [...ent.updates.values()].sort((a, b) => b.totalMs - a.totalMs)
				for (const upd of sortedUpdates) {
					if (y > c.y && y < c.y + c.height) {
						ctx.fillStyle = '#aaa'
						ctx.fillText(`  ${upd.name}`, c.x + c.padding + 16, y + c.fontSize)
						const updBarWidth = (c.width - c.padding * 2 - 160) * (upd.totalMs / ent.totalMs)
						ctx.fillStyle = c.barBgClr
						ctx.fillRect(c.x + 160, y + 2, c.width - c.padding * 2 - 160, c.rowHeight - 4)
						ctx.fillStyle = '#6a6'
						ctx.fillRect(c.x + 160, y + 2, Math.min(updBarWidth, c.width - c.padding * 2 - 160), c.rowHeight - 4)
						ctx.fillStyle = '#aaa'
						const updText = `${upd.avgMs.toFixed(2)}ms x${upd.callCnt}`
						ctx.fillText(updText, c.x + c.width - c.padding - ctx.measureText(updText).width, y + c.fontSize)
					}
					y += c.rowHeight
					totalRows++
				}
			}
		}
		this.maxScrollY = Math.max(0, totalRows * c.rowHeight - (c.height - 60))
	}

	private renderFrameView(startY: number) {
		if (!this.ctx) return
		const ctx = this.ctx
		const c = this.cfg
		const frames = this.profiler.frames
		const graphHeight = 80
		const graphY = startY + 10
		ctx.fillStyle = c.barBgClr
		ctx.fillRect(c.x + c.padding, graphY, c.width - c.padding * 2, graphHeight)
		if (frames.length > 1) {
			const maxMs = Math.max(...frames.map(f => f.totalMs), 16.67)
			const barW = (c.width - c.padding * 2) / frames.length
			for (let i = 0; i < frames.length; i++) {
				const frame = frames[i]
				const barH = (frame.totalMs / maxMs) * graphHeight
				const barClr = frame.totalMs > 16.67 ? '#f64' : c.barClr
				ctx.fillStyle = barClr
				ctx.fillRect(c.x + c.padding + i * barW, graphY + graphHeight - barH, barW - 1, barH)
			}
			ctx.strokeStyle = '#ff0'
			ctx.setLineDash([4, 4])
			const targetY = graphY + graphHeight - (16.67 / maxMs) * graphHeight
			ctx.beginPath()
			ctx.moveTo(c.x + c.padding, targetY)
			ctx.lineTo(c.x + c.width - c.padding, targetY)
			ctx.stroke()
			ctx.setLineDash([])
			ctx.fillStyle = '#ff0'
			ctx.fillText('60fps', c.x + c.width - c.padding - 30, targetY - 2)
		}
		let y = startY + graphHeight + 30
		ctx.fillStyle = c.hdrClr
		ctx.fillText('Last Frame Breakdown:', c.x + c.padding, y)
		y += c.rowHeight
		if (frames.length > 0) {
			const lastFrame = frames[frames.length - 1]
			const sortedSystems = [...lastFrame.systems.entries()].sort((a, b) => b[1] - a[1])
			for (const [sysName, dur] of sortedSystems) {
				if (y > c.y && y < c.y + c.height) {
					const pct = (dur / lastFrame.totalMs) * 100
					ctx.fillStyle = c.txtClr
					ctx.fillText(sysName, c.x + c.padding, y + c.fontSize)
					ctx.fillText(`${dur.toFixed(2)}ms (${pct.toFixed(1)}%)`, c.x + 150, y + c.fontSize)
				}
				y += c.rowHeight
			}
		}
		this.maxScrollY = Math.max(0, y - startY - (c.height - 60))
	}
}

export const globalProfiler = new Profiler()
