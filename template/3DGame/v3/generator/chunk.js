const CHUNK_SIZE = 16
const Z_MIN = -20
const Z_MAX = 20
const Z_LAYERS = Z_MAX - Z_MIN + 1

const ChunkManager = {
	chunks: new Map(),
	loadedChunks: new Set(),
	genQueue: [],
	worldGen: null,
	playerChunk: { cx: 0, cy: 0 },
	loadRadius: 2,

	init(worldGen) {
		this.worldGen = worldGen
		this.chunks.clear()
		this.loadedChunks.clear()
		this.genQueue = []
	},

	getChunkKey(cx, cy) {
		return `${cx},${cy}`
	},

	worldToChunk(x, y) {
		return {
			cx: Math.floor(x / CHUNK_SIZE),
			cy: Math.floor(y / CHUNK_SIZE)
		}
	},

	worldToLocal(x, y) {
		return {
			lx: ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE,
			ly: ((y % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE
		}
	},

	createEmptyChunk(cx, cy) {
		const tiles = []
		for (let lx = 0; lx < CHUNK_SIZE; lx++) {
			tiles[lx] = []
			for (let ly = 0; ly < CHUNK_SIZE; ly++) {
				tiles[lx][ly] = []
				for (let z = Z_MIN; z <= Z_MAX; z++) {
					tiles[lx][ly][z - Z_MIN] = null
				}
			}
		}
		return {
			cx, cy,
			tiles,
			dirty: true,
			mesh: null,
			entities: [],
			crops: []
		}
	},

	getChunk(cx, cy) {
		const key = this.getChunkKey(cx, cy)
		return this.chunks.get(key)
	},

	getTile(x, y, z) {
		const { cx, cy } = this.worldToChunk(x, y)
		const chunk = this.getChunk(cx, cy)
		if (!chunk) return null
		const { lx, ly } = this.worldToLocal(x, y)
		const zi = z - Z_MIN
		if (zi < 0 || zi >= Z_LAYERS) return null
		return chunk.tiles[lx][ly][zi]
	},

	setTile(x, y, z, tile) {
		const { cx, cy } = this.worldToChunk(x, y)
		let chunk = this.getChunk(cx, cy)
		if (!chunk) {
			chunk = this.createEmptyChunk(cx, cy)
			this.chunks.set(this.getChunkKey(cx, cy), chunk)
		}
		const { lx, ly } = this.worldToLocal(x, y)
		const zi = z - Z_MIN
		if (zi < 0 || zi >= Z_LAYERS) return false
		chunk.tiles[lx][ly][zi] = tile
		chunk.dirty = true
		return true
	},

	updatePlayerPos(px, py) {
		const newChunk = this.worldToChunk(px, py)
		if (newChunk.cx !== this.playerChunk.cx || newChunk.cy !== this.playerChunk.cy) {
			this.playerChunk = newChunk
			this.updateLoadedChunks()
		}
	},

	updateLoadedChunks() {
		const toLoad = new Set()
		const { cx, cy } = this.playerChunk
		for (let dx = -this.loadRadius; dx <= this.loadRadius; dx++) {
			for (let dy = -this.loadRadius; dy <= this.loadRadius; dy++) {
				const key = this.getChunkKey(cx + dx, cy + dy)
				toLoad.add(key)
				if (!this.loadedChunks.has(key)) {
					this.queueChunkGen(cx + dx, cy + dy)
				}
			}
		}
		for (const key of this.loadedChunks) {
			if (!toLoad.has(key)) {
				this.unloadChunk(key)
			}
		}
		this.loadedChunks = toLoad
	},

	queueChunkGen(cx, cy) {
		const key = this.getChunkKey(cx, cy)
		if (this.chunks.has(key)) return
		this.genQueue.push({ cx, cy })
	},

	processGenQueue(maxPerFrame = 1) {
		let processed = 0
		while (this.genQueue.length > 0 && processed < maxPerFrame) {
			const { cx, cy } = this.genQueue.shift()
			this.generateChunk(cx, cy)
			processed++
		}
		return processed
	},

	generateChunk(cx, cy) {
		const key = this.getChunkKey(cx, cy)
		if (this.chunks.has(key)) return this.chunks.get(key)
		const chunk = this.createEmptyChunk(cx, cy)
		const worldX = cx * CHUNK_SIZE
		const worldY = cy * CHUNK_SIZE
		if (this.worldGen) {
			this.worldGen.generateChunkTerrain(chunk, worldX, worldY)
		}
		this.chunks.set(key, chunk)
		return chunk
	},

	unloadChunk(key) {
		const chunk = this.chunks.get(key)
		if (chunk && chunk.mesh) {
			chunk.mesh = null
		}
	},

	getLoadedChunks() {
		const result = []
		for (const key of this.loadedChunks) {
			const chunk = this.chunks.get(key)
			if (chunk) result.push(chunk)
		}
		return result
	},

	markChunkDirty(x, y) {
		const { cx, cy } = this.worldToChunk(x, y)
		const chunk = this.getChunk(cx, cy)
		if (chunk) chunk.dirty = true
	}
}

if (typeof module !== 'undefined') module.exports = { ChunkManager, CHUNK_SIZE, Z_MIN, Z_MAX, Z_LAYERS }
