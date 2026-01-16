import { type ChunkPos, type Vec3 } from '@engine/common'
import { type Chunk, type SpaceLayer } from './space'

export enum ChunkLoadState {
	Unloaded = 0,
	Queued = 1,
	Loading = 2,
	Generating = 3,
	Meshing = 4,
	Ready = 5
}

export interface ChunkLoadTask {
	pos: ChunkPos
	priority: number
	state: ChunkLoadState
	startTime: number
}

export interface StreamCfg {
	loadDist: number
	unloadDist: number
	maxConcurrent: number
	maxPerFrame: number
	priorityByDist: boolean
}

export type ChunkGenerator = (pos: ChunkPos) => Promise<Chunk>
export type MeshBuilder = (chunk: Chunk) => Promise<void>
export type ChunkReadyCallback = (chunk: Chunk) => void

export function defStreamCfg(): StreamCfg {
	return {
		loadDist: 4,
		unloadDist: 6,
		maxConcurrent: 4,
		maxPerFrame: 2,
		priorityByDist: true
	}
}

export class ChunkStreamer {
	space: SpaceLayer
	cfg: StreamCfg
	queue: Map<string, ChunkLoadTask>
	loading: Map<string, ChunkLoadTask>
	states: Map<string, ChunkLoadState>
	centerPos: Vec3
	generator: ChunkGenerator | null
	meshBuilder: MeshBuilder | null
	onChunkReady: ChunkReadyCallback | null
	paused: boolean
	stats: StreamStats

	constructor(space: SpaceLayer, cfg?: Partial<StreamCfg>) {
		this.space = space
		this.cfg = { ...defStreamCfg(), ...cfg }
		this.queue = new Map()
		this.loading = new Map()
		this.states = new Map()
		this.centerPos = { x: 0, y: 0, z: 0 }
		this.generator = null
		this.meshBuilder = null
		this.onChunkReady = null
		this.paused = false
		this.stats = {
			totalLoaded: 0,
			totalUnloaded: 0,
			queueSize: 0,
			loadingCount: 0,
			avgLoadTime: 0
		}
	}

	setGenerator(gen: ChunkGenerator) {
		this.generator = gen
	}

	setMeshBuilder(builder: MeshBuilder) {
		this.meshBuilder = builder
	}

	setOnReady(cb: ChunkReadyCallback) {
		this.onChunkReady = cb
	}

	private chunkKey(pos: ChunkPos): string {
		return `${pos.x},${pos.y}`
	}

	private distToCenter(pos: ChunkPos): number {
		const dx = pos.x * 32 - this.centerPos.x
		const dy = pos.y * 32 - this.centerPos.y
		return Math.sqrt(dx * dx + dy * dy)
	}

	private calPriority(pos: ChunkPos): number {
		if (!this.cfg.priorityByDist) return 0
		return this.distToCenter(pos)
	}

	getState(pos: ChunkPos): ChunkLoadState {
		return this.states.get(this.chunkKey(pos)) ?? ChunkLoadState.Unloaded
	}

	setState(pos: ChunkPos, state: ChunkLoadState) {
		this.states.set(this.chunkKey(pos), state)
	}

	updCenter(pos: Vec3) {
		this.centerPos = { ...pos }
		this.updQueue()
	}

	private updQueue() {
		const cx = Math.floor(this.centerPos.x / 32)
		const cy = Math.floor(this.centerPos.y / 32)
		const toKeep = new Set<string>()
		for (let dx = -this.cfg.loadDist; dx <= this.cfg.loadDist; dx++) {
			for (let dy = -this.cfg.loadDist; dy <= this.cfg.loadDist; dy++) {
				const pos: ChunkPos = { x: cx + dx, y: cy + dy, z: 0 }
				const key = this.chunkKey(pos)
				toKeep.add(key)
				const state = this.getState(pos)
				if (state === ChunkLoadState.Unloaded) {
					this.enqueue(pos)
				}
			}
		}
		for (const key of this.queue.keys()) {
			if (!toKeep.has(key)) {
				this.queue.delete(key)
				const [x, y] = key.split(',').map(Number)
				this.setState({ x, y, z: 0 }, ChunkLoadState.Unloaded)
			}
		}
		for (const key of this.states.keys()) {
			if (!toKeep.has(key)) {
				const state = this.states.get(key)
				if (state === ChunkLoadState.Ready) {
					const [x, y] = key.split(',').map(Number)
					this.unloadChunk({ x, y, z: 0 })
				}
			}
		}
	}

	private enqueue(pos: ChunkPos) {
		const key = this.chunkKey(pos)
		if (this.queue.has(key) || this.loading.has(key)) return
		const task: ChunkLoadTask = {
			pos,
			priority: this.calPriority(pos),
			state: ChunkLoadState.Queued,
			startTime: 0
		}
		this.queue.set(key, task)
		this.setState(pos, ChunkLoadState.Queued)
		this.stats.queueSize = this.queue.size
	}

	private unloadChunk(pos: ChunkPos) {
		const key = this.chunkKey(pos)
		this.space.unloadChunk(pos)
		this.states.delete(key)
		this.queue.delete(key)
		this.loading.delete(key)
		this.stats.totalUnloaded++
	}

	private getSortedQueue(): ChunkLoadTask[] {
		const tasks = Array.from(this.queue.values())
		tasks.sort((a, b) => a.priority - b.priority)
		return tasks
	}

	async tick() {
		if (this.paused) return
		let started = 0
		const sorted = this.getSortedQueue()
		for (const task of sorted) {
			if (this.loading.size >= this.cfg.maxConcurrent) break
			if (started >= this.cfg.maxPerFrame) break
			const key = this.chunkKey(task.pos)
			this.queue.delete(key)
			this.loading.set(key, task)
			task.startTime = performance.now()
			this.loadChunkAsync(task)
			started++
		}
		this.stats.queueSize = this.queue.size
		this.stats.loadingCount = this.loading.size
	}

	private async loadChunkAsync(task: ChunkLoadTask) {
		const key = this.chunkKey(task.pos)
		try {
			this.setState(task.pos, ChunkLoadState.Loading)
			let chunk = this.space.getChunk(task.pos)
			if (!chunk) {
				chunk = this.space.loadChunk(task.pos)
			}
			if (!chunk.gen && this.generator) {
				this.setState(task.pos, ChunkLoadState.Generating)
				const genChunk = await this.generator(task.pos)
				chunk.blocks = genChunk.blocks
				chunk.biome = genChunk.biome
				chunk.lightMap = genChunk.lightMap
				chunk.gen = true
				chunk.dirty = true
			}
			if (chunk.dirty && this.meshBuilder) {
				this.setState(task.pos, ChunkLoadState.Meshing)
				await this.meshBuilder(chunk)
				chunk.dirty = false
			}
			this.setState(task.pos, ChunkLoadState.Ready)
			const loadTime = performance.now() - task.startTime
			this.stats.avgLoadTime = (this.stats.avgLoadTime * this.stats.totalLoaded + loadTime) / (this.stats.totalLoaded + 1)
			this.stats.totalLoaded++
			if (this.onChunkReady) {
				this.onChunkReady(chunk)
			}
		} catch (e) {
			console.error(`chunk load failed: ${key}`, e)
			this.setState(task.pos, ChunkLoadState.Unloaded)
		} finally {
			this.loading.delete(key)
			this.stats.loadingCount = this.loading.size
		}
	}

	pause() {
		this.paused = true
	}

	resume() {
		this.paused = false
	}

	forceLoad(pos: ChunkPos): Promise<Chunk | null> {
		return new Promise((resolve) => {
			const key = this.chunkKey(pos)
			const existing = this.space.getChunk(pos)
			if (existing && existing.gen) {
				resolve(existing)
				return
			}
			const task: ChunkLoadTask = {
				pos,
				priority: -Infinity,
				state: ChunkLoadState.Queued,
				startTime: performance.now()
			}
			this.loading.set(key, task)
			this.loadChunkAsync(task).then(() => {
				resolve(this.space.getChunk(pos) ?? null)
			})
		})
	}

	preload(positions: ChunkPos[]) {
		for (const pos of positions) {
			this.enqueue(pos)
		}
	}

	getStats(): StreamStats {
		return { ...this.stats }
	}

	isChunkReady(pos: ChunkPos): boolean {
		return this.getState(pos) === ChunkLoadState.Ready
	}

	getLoadedCount(): number {
		let cnt = 0
		for (const state of this.states.values()) {
			if (state === ChunkLoadState.Ready) cnt++
		}
		return cnt
	}

	clear() {
		this.queue.clear()
		this.loading.clear()
		this.states.clear()
		this.stats = {
			totalLoaded: 0,
			totalUnloaded: 0,
			queueSize: 0,
			loadingCount: 0,
			avgLoadTime: 0
		}
	}
}

export interface StreamStats {
	totalLoaded: number
	totalUnloaded: number
	queueSize: number
	loadingCount: number
	avgLoadTime: number
}
