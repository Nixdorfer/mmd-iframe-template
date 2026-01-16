import { CHUNK_SIZE, CHUNK_HEIGHT, type ChunkPos, type BlockId, type Vec3, type EntityId, BiomeType } from '@engine/common'

export interface Block {
	id: BlockId
	meta: number
}

export interface Chunk {
	pos: ChunkPos
	blocks: BlockId[]
	biome: BiomeType
	dirty: boolean
	gen: boolean
	entities: Set<EntityId>
	lightMap: Uint8Array
}

export interface Region {
	x: number
	y: number
	chunks: Map<string, Chunk>
}

export interface PocketWorld {
	id: string
	owner: EntityId
	name: string
	size: { x: number; y: number; z: number }
	chunks: Map<string, Chunk>
	permissions: Map<EntityId, PocketPermission>
}

export enum PocketPermission {
	None = 0,
	Visit = 1,
	Build = 2,
	Admin = 3
}

export class SpaceLayer {
	regions: Map<string, Region>
	loadedChunks: Map<string, Chunk>
	pockets: Map<string, PocketWorld>
	curRegion: { x: number; y: number }
	loadDist: number
	nxtPocketId: number

	constructor() {
		this.regions = new Map()
		this.loadedChunks = new Map()
		this.pockets = new Map()
		this.curRegion = { x: 0, y: 0 }
		this.loadDist = 3
		this.nxtPocketId = 1
	}

	private chunkKey(pos: ChunkPos): string {
		return `${pos.x},${pos.y}`
	}

	private regionKey(x: number, y: number): string {
		return `${x},${y}`
	}

	getChunk(pos: ChunkPos): Chunk | undefined {
		return this.loadedChunks.get(this.chunkKey(pos))
	}

	loadChunk(pos: ChunkPos): Chunk {
		const key = this.chunkKey(pos)
		let chunk = this.loadedChunks.get(key)
		if (chunk) return chunk
		chunk = {
			pos,
			blocks: new Array(CHUNK_SIZE * CHUNK_SIZE * CHUNK_HEIGHT).fill(0),
			biome: BiomeType.Plains,
			dirty: true,
			gen: false,
			entities: new Set(),
			lightMap: new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * CHUNK_HEIGHT)
		}
		this.loadedChunks.set(key, chunk)
		return chunk
	}

	unloadChunk(pos: ChunkPos) {
		this.loadedChunks.delete(this.chunkKey(pos))
	}

	getBlock(x: number, y: number, z: number): BlockId {
		const cx = Math.floor(x / CHUNK_SIZE)
		const cy = Math.floor(y / CHUNK_SIZE)
		const lx = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE
		const ly = ((y % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE
		const lz = Math.floor(z)
		if (lz < 0 || lz >= CHUNK_HEIGHT) return 0
		const chunk = this.getChunk({ x: cx, y: cy, z: 0 })
		if (!chunk) return 0
		return chunk.blocks[lz * CHUNK_SIZE * CHUNK_SIZE + ly * CHUNK_SIZE + lx]
	}

	setBlock(x: number, y: number, z: number, block: BlockId) {
		const cx = Math.floor(x / CHUNK_SIZE)
		const cy = Math.floor(y / CHUNK_SIZE)
		const lx = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE
		const ly = ((y % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE
		const lz = Math.floor(z)
		if (lz < 0 || lz >= CHUNK_HEIGHT) return
		const chunk = this.loadChunk({ x: cx, y: cy, z: 0 })
		const idx = lz * CHUNK_SIZE * CHUNK_SIZE + ly * CHUNK_SIZE + lx
		if (chunk.blocks[idx] !== block) {
			chunk.blocks[idx] = block
			chunk.dirty = true
		}
	}

	updLoadedChunks(centerX: number, centerY: number): ChunkPos[] {
		const cx = Math.floor(centerX / CHUNK_SIZE)
		const cy = Math.floor(centerY / CHUNK_SIZE)
		const toLoad: ChunkPos[] = []
		const toKeep = new Set<string>()
		for (let dx = -this.loadDist; dx <= this.loadDist; dx++) {
			for (let dy = -this.loadDist; dy <= this.loadDist; dy++) {
				const pos: ChunkPos = { x: cx + dx, y: cy + dy, z: 0 }
				const key = this.chunkKey(pos)
				toKeep.add(key)
				if (!this.loadedChunks.has(key)) {
					toLoad.push(pos)
					this.loadChunk(pos)
				}
			}
		}
		for (const key of this.loadedChunks.keys()) {
			if (!toKeep.has(key)) {
				this.loadedChunks.delete(key)
			}
		}
		return toLoad
	}

	getDirtyChunks(): Chunk[] {
		const result: Chunk[] = []
		for (const chunk of this.loadedChunks.values()) {
			if (chunk.dirty) {
				result.push(chunk)
			}
		}
		return result
	}

	markChunkClean(pos: ChunkPos) {
		const chunk = this.getChunk(pos)
		if (chunk) chunk.dirty = false
	}

	createPocket(owner: EntityId, name: string, size: { x: number; y: number; z: number }): string {
		const id = `pocket_${this.nxtPocketId++}`
		const pocket: PocketWorld = {
			id,
			owner,
			name,
			size,
			chunks: new Map(),
			permissions: new Map([[owner, PocketPermission.Admin]])
		}
		this.pockets.set(id, pocket)
		return id
	}

	getPocket(id: string): PocketWorld | undefined {
		return this.pockets.get(id)
	}

	getPocketByOwner(owner: EntityId): PocketWorld | undefined {
		for (const pocket of this.pockets.values()) {
			if (pocket.owner === owner) return pocket
		}
		return undefined
	}

	setPocketPermission(pocketId: string, entId: EntityId, perm: PocketPermission) {
		const pocket = this.pockets.get(pocketId)
		if (pocket) {
			pocket.permissions.set(entId, perm)
		}
	}

	getPocketPermission(pocketId: string, entId: EntityId): PocketPermission {
		const pocket = this.pockets.get(pocketId)
		if (!pocket) return PocketPermission.None
		return pocket.permissions.get(entId) ?? PocketPermission.None
	}

	canBuildInPocket(pocketId: string, entId: EntityId): boolean {
		const perm = this.getPocketPermission(pocketId, entId)
		return perm >= PocketPermission.Build
	}

	expandPocket(pocketId: string, newSize: { x: number; y: number; z: number }) {
		const pocket = this.pockets.get(pocketId)
		if (pocket) {
			pocket.size = {
				x: Math.max(pocket.size.x, newSize.x),
				y: Math.max(pocket.size.y, newSize.y),
				z: Math.max(pocket.size.z, newSize.z)
			}
		}
	}

	addEntToChunk(pos: ChunkPos, entId: EntityId) {
		const chunk = this.getChunk(pos)
		if (chunk) {
			chunk.entities.add(entId)
		}
	}

	delEntFromChunk(pos: ChunkPos, entId: EntityId) {
		const chunk = this.getChunk(pos)
		if (chunk) {
			chunk.entities.delete(entId)
		}
	}

	getEntsInChunk(pos: ChunkPos): EntityId[] {
		const chunk = this.getChunk(pos)
		if (!chunk) return []
		return Array.from(chunk.entities)
	}

	worldToChunk(x: number, y: number): ChunkPos {
		return {
			x: Math.floor(x / CHUNK_SIZE),
			y: Math.floor(y / CHUNK_SIZE),
			z: 0
		}
	}

	chunkToWorld(pos: ChunkPos): { x: number; y: number } {
		return {
			x: pos.x * CHUNK_SIZE,
			y: pos.y * CHUNK_SIZE
		}
	}
}
