import type { Vec3, EntityId } from '@engine/common'

export interface PathNode {
	x: number
	y: number
	z: number
	g: number
	h: number
	f: number
	parent: PathNode | null
}

export interface PathOpts {
	maxDist: number
	heuristic: 'manhattan' | 'euclidean' | 'octile'
	allowDiag: boolean
	maxIter: number
	costMod?: (x: number, y: number, z: number) => number
}

export interface PathRequest {
	id: string
	entId: EntityId
	sta: Vec3
	end: Vec3
	callback: (path: Vec3[] | null) => void
	opts: PathOpts
	state?: PathState
}

interface PathState {
	open: BinaryHeap<PathNode>
	closed: Set<string>
	iter: number
}

export interface PathGrid {
	width: number
	height: number
	depth: number
	isWalkable: (x: number, y: number, z: number) => boolean
	getCost: (x: number, y: number, z: number) => number
}

const DEFAULT_OPTS: PathOpts = {
	maxDist: 100,
	heuristic: 'manhattan',
	allowDiag: true,
	maxIter: 5000
}

class BinaryHeap<T> {
	items: T[]
	cmp: (a: T, b: T) => number

	constructor(cmp: (a: T, b: T) => number) {
		this.items = []
		this.cmp = cmp
	}

	push(item: T): void {
		this.items.push(item)
		this.bubbleUp(this.items.length - 1)
	}

	pop(): T | undefined {
		if (this.items.length === 0) return undefined
		const top = this.items[0]
		const last = this.items.pop()!
		if (this.items.length > 0) {
			this.items[0] = last
			this.sinkDown(0)
		}
		return top
	}

	isEmpty(): boolean {
		return this.items.length === 0
	}

	private bubbleUp(idx: number): void {
		while (idx > 0) {
			const pIdx = Math.floor((idx - 1) / 2)
			if (this.cmp(this.items[idx], this.items[pIdx]) >= 0) break
			const tmp = this.items[idx]
			this.items[idx] = this.items[pIdx]
			this.items[pIdx] = tmp
			idx = pIdx
		}
	}

	private sinkDown(idx: number): void {
		const len = this.items.length
		while (true) {
			const lIdx = 2 * idx + 1
			const rIdx = 2 * idx + 2
			let minIdx = idx
			if (lIdx < len && this.cmp(this.items[lIdx], this.items[minIdx]) < 0) {
				minIdx = lIdx
			}
			if (rIdx < len && this.cmp(this.items[rIdx], this.items[minIdx]) < 0) {
				minIdx = rIdx
			}
			if (minIdx === idx) break
			const tmp = this.items[idx]
			this.items[idx] = this.items[minIdx]
			this.items[minIdx] = tmp
			idx = minIdx
		}
	}
}

export class Pathfinder {
	grid: PathGrid
	requests: Map<string, PathRequest>
	cache: Map<string, { path: Vec3[]; timestamp: number }>
	maxPerFrame: number
	nxtReqId: number
	cacheTTL: number

	constructor(grid: PathGrid, maxPerFrame: number = 100) {
		this.grid = grid
		this.requests = new Map()
		this.cache = new Map()
		this.maxPerFrame = maxPerFrame
		this.nxtReqId = 1
		this.cacheTTL = 5000
	}

	reqPath(
		entId: EntityId,
		sta: Vec3,
		end: Vec3,
		opts: Partial<PathOpts>,
		callback: (path: Vec3[] | null) => void
	): string {
		const id = `path_${this.nxtReqId++}`
		const fullOpts = { ...DEFAULT_OPTS, ...opts }
		const cacheKey = this.getCacheKey(sta, end)
		const cached = this.cache.get(cacheKey)
		if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
			callback([...cached.path])
			return id
		}
		this.requests.set(id, { id, entId, sta, end, callback, opts: fullOpts })
		return id
	}

	cancelReq(id: string): void {
		this.requests.delete(id)
	}

	upd(): void {
		let processed = 0
		for (const [id, req] of this.requests) {
			if (processed >= this.maxPerFrame) break
			const result = this.processReq(req)
			if (result.done) {
				this.requests.delete(id)
				if (result.path) {
					const cacheKey = this.getCacheKey(req.sta, req.end)
					this.cache.set(cacheKey, { path: result.path, timestamp: Date.now() })
				}
				req.callback(result.path)
			}
			processed++
		}
	}

	private processReq(req: PathRequest): { done: boolean; path: Vec3[] | null } {
		if (!req.state) {
			req.state = {
				open: new BinaryHeap<PathNode>((a, b) => a.f - b.f),
				closed: new Set(),
				iter: 0
			}
			const h = this.heuristic(req.sta, req.end, req.opts)
			req.state.open.push({
				x: Math.floor(req.sta.x),
				y: Math.floor(req.sta.y),
				z: Math.floor(req.sta.z),
				g: 0,
				h,
				f: h,
				parent: null
			})
		}
		const { open, closed } = req.state
		let iterThisFrame = 0
		while (!open.isEmpty() && iterThisFrame < this.maxPerFrame) {
			if (req.state.iter >= req.opts.maxIter) {
				return { done: true, path: null }
			}
			const cur = open.pop()!
			const key = `${cur.x},${cur.y},${cur.z}`
			if (closed.has(key)) continue
			closed.add(key)
			if (this.isGoal(cur, req.end)) {
				const path = this.reconstructPath(cur)
				return { done: true, path: this.smoothPath(path) }
			}
			const neighbors = this.getNeighbors(cur, req.opts.allowDiag)
			for (const n of neighbors) {
				const nKey = `${n.x},${n.y},${n.z}`
				if (closed.has(nKey)) continue
				if (!this.grid.isWalkable(n.x, n.y, n.z)) continue
				let cost = this.grid.getCost(n.x, n.y, n.z)
				if (req.opts.costMod) {
					cost *= req.opts.costMod(n.x, n.y, n.z)
				}
				const g = cur.g + cost
				const h = this.heuristic(n, req.end, req.opts)
				open.push({ ...n, g, h, f: g + h, parent: cur })
			}
			req.state.iter++
			iterThisFrame++
		}
		if (open.isEmpty()) {
			return { done: true, path: null }
		}
		return { done: false, path: null }
	}

	private heuristic(from: Vec3 | PathNode, to: Vec3, opts: PathOpts): number {
		const dx = Math.abs(from.x - to.x)
		const dy = Math.abs(from.y - to.y)
		const dz = Math.abs(from.z - to.z)
		switch (opts.heuristic) {
			case 'manhattan':
				return (dx + dy + dz) * 1.001
			case 'euclidean':
				return Math.sqrt(dx * dx + dy * dy + dz * dz)
			case 'octile':
				const min = Math.min(dx, dy, dz)
				const max = Math.max(dx, dy, dz)
				const mid = dx + dy + dz - min - max
				return max + (Math.SQRT2 - 1) * mid + (Math.sqrt(3) - Math.SQRT2) * min
			default:
				return dx + dy + dz
		}
	}

	private isGoal(node: PathNode, end: Vec3): boolean {
		return Math.floor(end.x) === node.x &&
			Math.floor(end.y) === node.y &&
			Math.floor(end.z) === node.z
	}

	private getNeighbors(node: PathNode, allowDiag: boolean): { x: number; y: number; z: number }[] {
		const neighbors: { x: number; y: number; z: number }[] = []
		const dirs = [
			{ x: 1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 },
			{ x: 0, y: 1, z: 0 }, { x: 0, y: -1, z: 0 },
			{ x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: -1 }
		]
		if (allowDiag) {
			dirs.push(
				{ x: 1, y: 1, z: 0 }, { x: 1, y: -1, z: 0 },
				{ x: -1, y: 1, z: 0 }, { x: -1, y: -1, z: 0 },
				{ x: 1, y: 0, z: 1 }, { x: 1, y: 0, z: -1 },
				{ x: -1, y: 0, z: 1 }, { x: -1, y: 0, z: -1 },
				{ x: 0, y: 1, z: 1 }, { x: 0, y: 1, z: -1 },
				{ x: 0, y: -1, z: 1 }, { x: 0, y: -1, z: -1 }
			)
		}
		for (const d of dirs) {
			neighbors.push({
				x: node.x + d.x,
				y: node.y + d.y,
				z: node.z + d.z
			})
		}
		return neighbors
	}

	private reconstructPath(node: PathNode): Vec3[] {
		const path: Vec3[] = []
		let cur: PathNode | null = node
		while (cur) {
			path.unshift({ x: cur.x + 0.5, y: cur.y + 0.5, z: cur.z + 0.5 })
			cur = cur.parent
		}
		return path
	}

	private smoothPath(path: Vec3[]): Vec3[] {
		if (path.length <= 2) return path
		const result: Vec3[] = [path[0]]
		let cur = 0
		while (cur < path.length - 1) {
			let farthest = cur + 1
			for (let i = path.length - 1; i > cur + 1; i--) {
				if (this.hasLOS(path[cur], path[i])) {
					farthest = i
					break
				}
			}
			result.push(path[farthest])
			cur = farthest
		}
		return result
	}

	private hasLOS(from: Vec3, to: Vec3): boolean {
		const dx = to.x - from.x
		const dy = to.y - from.y
		const dz = to.z - from.z
		const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
		const steps = Math.ceil(dist * 2)
		for (let i = 1; i < steps; i++) {
			const t = i / steps
			const x = Math.floor(from.x + dx * t)
			const y = Math.floor(from.y + dy * t)
			const z = Math.floor(from.z + dz * t)
			if (!this.grid.isWalkable(x, y, z)) return false
		}
		return true
	}

	private getCacheKey(sta: Vec3, end: Vec3): string {
		return `${Math.floor(sta.x)},${Math.floor(sta.y)},${Math.floor(sta.z)}_${Math.floor(end.x)},${Math.floor(end.y)},${Math.floor(end.z)}`
	}

	clearCache(): void {
		this.cache.clear()
	}

	findPathSync(sta: Vec3, end: Vec3, opts: Partial<PathOpts> = {}): Vec3[] | null {
		const fullOpts = { ...DEFAULT_OPTS, ...opts }
		const open = new BinaryHeap<PathNode>((a, b) => a.f - b.f)
		const closed = new Set<string>()
		const h = this.heuristic(sta, end, fullOpts)
		open.push({
			x: Math.floor(sta.x),
			y: Math.floor(sta.y),
			z: Math.floor(sta.z),
			g: 0,
			h,
			f: h,
			parent: null
		})
		let iter = 0
		while (!open.isEmpty() && iter < fullOpts.maxIter) {
			const cur = open.pop()!
			const key = `${cur.x},${cur.y},${cur.z}`
			if (closed.has(key)) continue
			closed.add(key)
			if (this.isGoal(cur, end)) {
				return this.smoothPath(this.reconstructPath(cur))
			}
			const neighbors = this.getNeighbors(cur, fullOpts.allowDiag)
			for (const n of neighbors) {
				const nKey = `${n.x},${n.y},${n.z}`
				if (closed.has(nKey)) continue
				if (!this.grid.isWalkable(n.x, n.y, n.z)) continue
				let cost = this.grid.getCost(n.x, n.y, n.z)
				if (fullOpts.costMod) {
					cost *= fullOpts.costMod(n.x, n.y, n.z)
				}
				const g = cur.g + cost
				const hVal = this.heuristic(n, end, fullOpts)
				open.push({ ...n, g, h: hVal, f: g + hVal, parent: cur })
			}
			iter++
		}
		return null
	}
}
