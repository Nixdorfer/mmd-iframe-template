import { CHUNK_SIZE, CHUNK_HEIGHT, BiomeType, type ChunkPos } from '@engine/common'
import type { WorldGenerator } from './world-gen'
import { CaveGenerator } from './cave-gen'

export class ChunkGenerator {
	world: WorldGenerator
	cave: CaveGenerator

	constructor(world: WorldGenerator) {
		this.world = world
		this.cave = new CaveGenerator(world.cfg.seed)
	}

	gen(pos: ChunkPos): number[] {
		const blocks = new Array(CHUNK_SIZE * CHUNK_SIZE * CHUNK_HEIGHT).fill(0)
		const wx = pos.x * CHUNK_SIZE
		const wy = pos.y * CHUNK_SIZE
		const setBlock = (lx: number, ly: number, z: number, block: number) => {
			if (z < 0 || z >= CHUNK_HEIGHT) return
			blocks[z * CHUNK_SIZE * CHUNK_SIZE + ly * CHUNK_SIZE + lx] = block
		}
		const _getBlock = (lx: number, ly: number, z: number): number => {
			if (z < 0 || z >= CHUNK_HEIGHT) return 0
			return blocks[z * CHUNK_SIZE * CHUNK_SIZE + ly * CHUNK_SIZE + lx]
		}
		for (let lx = 0; lx < CHUNK_SIZE; lx++) {
			for (let ly = 0; ly < CHUNK_SIZE; ly++) {
				const gx = wx + lx
				const gy = wy + ly
				const height = this.world.getHeight(gx, gy)
				const biome = this.world.getBiome(gx, gy)
				const biomeDef = this.world.biomeMap.getBiome(biome)
				const surfaceBlock = biomeDef?.surfaceBlock ?? 2
				const subBlock = biomeDef?.subBlock ?? 3
				const baseBlock = biomeDef?.baseBlock ?? 1
				for (let z = 0; z < Math.min(height, CHUNK_HEIGHT); z++) {
					if (z === height - 1) {
						setBlock(lx, ly, z, surfaceBlock)
					} else if (z > height - 5) {
						setBlock(lx, ly, z, subBlock)
					} else {
						setBlock(lx, ly, z, baseBlock)
					}
				}
				if (biome === BiomeType.Ocean && height < this.world.cfg.seaLevel) {
					for (let z = height; z < this.world.cfg.seaLevel; z++) {
						setBlock(lx, ly, z, 6)
					}
				}
			}
		}
		this.cave.carve(blocks, pos, this.world.cfg.seaLevel)
		this.genOres(blocks, pos)
		return blocks
	}

	private genOres(blocks: number[], pos: ChunkPos) {
		const wx = pos.x * CHUNK_SIZE
		const wy = pos.y * CHUNK_SIZE
		const oreTypes = [
			{ id: 20, minZ: 0, maxZ: 32, chance: 0.02, veinSize: 4 },
			{ id: 21, minZ: 0, maxZ: 24, chance: 0.015, veinSize: 3 },
			{ id: 22, minZ: 0, maxZ: 16, chance: 0.01, veinSize: 3 },
			{ id: 23, minZ: 0, maxZ: 10, chance: 0.005, veinSize: 2 },
			{ id: 24, minZ: 0, maxZ: 6, chance: 0.002, veinSize: 2 }
		]
		const setBlock = (lx: number, ly: number, z: number, block: number) => {
			if (lx < 0 || lx >= CHUNK_SIZE || ly < 0 || ly >= CHUNK_SIZE || z < 0 || z >= CHUNK_HEIGHT) return
			const idx = z * CHUNK_SIZE * CHUNK_SIZE + ly * CHUNK_SIZE + lx
			if (blocks[idx] === 1) {
				blocks[idx] = block
			}
		}
		const rng = (x: number, y: number, z: number): number => {
			let h = (wx + x) * 374761393 + (wy + y) * 668265263 + z * 1274126177
			h = (h ^ (h >> 13)) * 1274126177
			return ((h ^ (h >> 16)) & 0x7fffffff) / 0x7fffffff
		}
		for (const ore of oreTypes) {
			for (let z = ore.minZ; z < ore.maxZ; z++) {
				for (let lx = 0; lx < CHUNK_SIZE; lx++) {
					for (let ly = 0; ly < CHUNK_SIZE; ly++) {
						if (rng(lx, ly, z) < ore.chance) {
							for (let i = 0; i < ore.veinSize; i++) {
								const ox = Math.floor(rng(lx + i, ly, z) * 3) - 1
								const oy = Math.floor(rng(lx, ly + i, z) * 3) - 1
								const oz = Math.floor(rng(lx, ly, z + i) * 3) - 1
								setBlock(lx + ox, ly + oy, z + oz, ore.id)
							}
						}
					}
				}
			}
		}
	}
}
