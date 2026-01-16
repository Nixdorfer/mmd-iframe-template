import { CHUNK_SIZE, CHUNK_HEIGHT, type ChunkPos } from '@engine/common'
import { SimplexNoise } from './world-gen'

export class CaveGenerator {
	noise3d: SimplexNoise
	noise2d: SimplexNoise
	seed: number

	constructor(seed: number) {
		this.seed = seed
		this.noise3d = new SimplexNoise(seed + 100)
		this.noise2d = new SimplexNoise(seed + 101)
	}

	private noise3D(x: number, y: number, z: number): number {
		const xy = this.noise3d.get(x, y)
		const xz = this.noise3d.get(x + 1000, z)
		const yz = this.noise3d.get(y + 2000, z)
		return (xy + xz + yz) / 3
	}

	carve(blocks: number[], pos: ChunkPos, seaLevel: number) {
		const wx = pos.x * CHUNK_SIZE
		const wy = pos.y * CHUNK_SIZE
		const caveScale = 0.05
		const caveThreshold = 0.3
		const getIdx = (lx: number, ly: number, z: number): number => {
			return z * CHUNK_SIZE * CHUNK_SIZE + ly * CHUNK_SIZE + lx
		}
		for (let lx = 0; lx < CHUNK_SIZE; lx++) {
			for (let ly = 0; ly < CHUNK_SIZE; ly++) {
				for (let z = 1; z < seaLevel - 3; z++) {
					const gx = wx + lx
					const gy = wy + ly
					const density = this.noise3D(gx * caveScale, gy * caveScale, z * caveScale)
					const depthFactor = 1 - (z / seaLevel)
					const threshold = caveThreshold + depthFactor * 0.1
					if (density > threshold) {
						const idx = getIdx(lx, ly, z)
						if (blocks[idx] !== 0 && blocks[idx] !== 6) {
							blocks[idx] = 0
						}
					}
				}
			}
		}
		this.carveTunnels(blocks, pos, seaLevel)
		this.carveWaterPockets(blocks, pos, seaLevel)
	}

	private carveTunnels(blocks: number[], pos: ChunkPos, seaLevel: number) {
		const wx = pos.x * CHUNK_SIZE
		const wy = pos.y * CHUNK_SIZE
		const tunnelScale = 0.03
		const _tunnelThreshold = 0.6
		const getIdx = (lx: number, ly: number, z: number): number => {
			return z * CHUNK_SIZE * CHUNK_SIZE + ly * CHUNK_SIZE + lx
		}
		for (let lx = 0; lx < CHUNK_SIZE; lx++) {
			for (let ly = 0; ly < CHUNK_SIZE; ly++) {
				for (let z = 1; z < seaLevel - 5; z++) {
					const gx = wx + lx
					const gy = wy + ly
					const tunnel1 = Math.abs(this.noise3D(gx * tunnelScale, gy * tunnelScale, z * tunnelScale * 0.5))
					const tunnel2 = Math.abs(this.noise3D(gx * tunnelScale + 500, gy * tunnelScale + 500, z * tunnelScale * 0.5))
					if (tunnel1 < 0.08 && tunnel2 < 0.08) {
						const idx = getIdx(lx, ly, z)
						if (blocks[idx] !== 0 && blocks[idx] !== 6) {
							blocks[idx] = 0
						}
					}
				}
			}
		}
	}

	private carveWaterPockets(blocks: number[], pos: ChunkPos, _seaLevel: number) {
		const wx = pos.x * CHUNK_SIZE
		const wy = pos.y * CHUNK_SIZE
		const waterScale = 0.02
		const waterLevel = 10
		const getIdx = (lx: number, ly: number, z: number): number => {
			return z * CHUNK_SIZE * CHUNK_SIZE + ly * CHUNK_SIZE + lx
		}
		for (let lx = 0; lx < CHUNK_SIZE; lx++) {
			for (let ly = 0; ly < CHUNK_SIZE; ly++) {
				for (let z = waterLevel - 5; z < waterLevel + 5; z++) {
					if (z < 0 || z >= CHUNK_HEIGHT) continue
					const gx = wx + lx
					const gy = wy + ly
					const waterNoise = this.noise2d.get(gx * waterScale, gy * waterScale)
					if (waterNoise > 0.4) {
						const idx = getIdx(lx, ly, z)
						if (blocks[idx] === 0) {
							blocks[idx] = 6
						}
					}
				}
			}
		}
	}

	genCaveEntrance(blocks: number[], pos: ChunkPos, surfaceHeight: number) {
		const wx = pos.x * CHUNK_SIZE
		const wy = pos.y * CHUNK_SIZE
		const entranceChance = 0.001
		const getIdx = (lx: number, ly: number, z: number): number => {
			return z * CHUNK_SIZE * CHUNK_SIZE + ly * CHUNK_SIZE + lx
		}
		for (let lx = 2; lx < CHUNK_SIZE - 2; lx++) {
			for (let ly = 2; ly < CHUNK_SIZE - 2; ly++) {
				const gx = wx + lx
				const gy = wy + ly
				let h = gx * 374761393 + gy * 668265263
				h = (h ^ (h >> 13)) * 1274126177
				const rng = ((h ^ (h >> 16)) & 0x7fffffff) / 0x7fffffff
				if (rng < entranceChance) {
					const height = surfaceHeight
					for (let oz = -5; oz < 0; oz++) {
						for (let ox = -1; ox <= 1; ox++) {
							for (let oy = -1; oy <= 1; oy++) {
								const z = height + oz
								if (z >= 0 && z < CHUNK_HEIGHT) {
									const idx = getIdx(lx + ox, ly + oy, z)
									if (idx >= 0 && idx < blocks.length) {
										blocks[idx] = 0
									}
								}
							}
						}
					}
				}
			}
		}
	}
}
