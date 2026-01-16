import { BiomeType, type ChunkPos } from '@engine/common'
import { BiomeMap, whittakerBiome } from '../biome/biome'
import { ChunkGenerator } from './chunk-gen'

export interface WorldGenConfig {
	seed: number
	seaLevel: number
	mountainHeight: number
	continentScale: number
	detailScale: number
	tempScale: number
	humidScale: number
	biomeMinSize: number
}

export interface Noise2D {
	get(x: number, y: number): number
}

export class SimplexNoise implements Noise2D {
	perm: number[]
	grad: number[][]

	constructor(seed: number) {
		this.perm = []
		this.grad = [
			[1, 1], [-1, 1], [1, -1], [-1, -1],
			[1, 0], [-1, 0], [0, 1], [0, -1]
		]
		const p = []
		for (let i = 0; i < 256; i++) p[i] = i
		let n = seed
		for (let i = 255; i > 0; i--) {
			n = (n * 1103515245 + 12345) & 0x7fffffff
			const j = n % (i + 1)
			;[p[i], p[j]] = [p[j], p[i]]
		}
		for (let i = 0; i < 512; i++) {
			this.perm[i] = p[i & 255]
		}
	}

	private dot(g: number[], x: number, y: number): number {
		return g[0] * x + g[1] * y
	}

	get(x: number, y: number): number {
		const F2 = 0.5 * (Math.sqrt(3) - 1)
		const G2 = (3 - Math.sqrt(3)) / 6
		const s = (x + y) * F2
		const i = Math.floor(x + s)
		const j = Math.floor(y + s)
		const t = (i + j) * G2
		const X0 = i - t
		const Y0 = j - t
		const x0 = x - X0
		const y0 = y - Y0
		let i1 = 0, j1 = 1
		if (x0 > y0) { i1 = 1; j1 = 0 }
		const x1 = x0 - i1 + G2
		const y1 = y0 - j1 + G2
		const x2 = x0 - 1 + 2 * G2
		const y2 = y0 - 1 + 2 * G2
		const ii = i & 255
		const jj = j & 255
		const gi0 = this.perm[ii + this.perm[jj]] % 8
		const gi1 = this.perm[ii + i1 + this.perm[jj + j1]] % 8
		const gi2 = this.perm[ii + 1 + this.perm[jj + 1]] % 8
		let n0 = 0, n1 = 0, n2 = 0
		let t0 = 0.5 - x0 * x0 - y0 * y0
		if (t0 >= 0) {
			t0 *= t0
			n0 = t0 * t0 * this.dot(this.grad[gi0], x0, y0)
		}
		let t1 = 0.5 - x1 * x1 - y1 * y1
		if (t1 >= 0) {
			t1 *= t1
			n1 = t1 * t1 * this.dot(this.grad[gi1], x1, y1)
		}
		let t2 = 0.5 - x2 * x2 - y2 * y2
		if (t2 >= 0) {
			t2 *= t2
			n2 = t2 * t2 * this.dot(this.grad[gi2], x2, y2)
		}
		return 70 * (n0 + n1 + n2)
	}
}

export class VoronoiNoise {
	seed: number
	cellSize: number

	constructor(seed: number, cellSize: number) {
		this.seed = seed
		this.cellSize = cellSize
	}

	private hash(x: number, y: number): number {
		let h = (x * 374761393 + y * 668265263 + this.seed) ^ 0x85ebca6b
		h = (h ^ (h >> 13)) * 0xc2b2ae35
		return (h ^ (h >> 16)) & 0x7fffffff
	}

	private cellPoint(cx: number, cy: number): [number, number, number, number] {
		const h = this.hash(cx, cy)
		const px = cx * this.cellSize + (h % 1000) / 1000 * this.cellSize * 0.8 + this.cellSize * 0.1
		const py = cy * this.cellSize + ((h >> 10) % 1000) / 1000 * this.cellSize * 0.8 + this.cellSize * 0.1
		const temp = ((h >> 20) % 1000) / 1000
		const humid = ((h >> 5) % 1000) / 1000
		return [px, py, temp, humid]
	}

	get(wx: number, wy: number): [number, number] {
		const cx = Math.floor(wx / this.cellSize)
		const cy = Math.floor(wy / this.cellSize)
		let minDist = Infinity
		let nearTemp = 0.5
		let nearHumid = 0.5
		for (let dx = -1; dx <= 1; dx++) {
			for (let dy = -1; dy <= 1; dy++) {
				const [px, py, temp, humid] = this.cellPoint(cx + dx, cy + dy)
				const dist = (wx - px) * (wx - px) + (wy - py) * (wy - py)
				if (dist < minDist) {
					minDist = dist
					nearTemp = temp
					nearHumid = humid
				}
			}
		}
		return [nearTemp, nearHumid]
	}
}

export class WorldGenerator {
	cfg: WorldGenConfig
	continentNoise: SimplexNoise
	detailNoise: SimplexNoise
	tempNoise: SimplexNoise
	humidNoise: SimplexNoise
	voronoi: VoronoiNoise
	biomeMap: BiomeMap
	chunkGen: ChunkGenerator

	constructor(cfg: Partial<WorldGenConfig> = {}) {
		this.cfg = {
			seed: 12345,
			seaLevel: 32,
			mountainHeight: 48,
			continentScale: 0.002,
			detailScale: 0.02,
			tempScale: 0.00002,
			humidScale: 0.00002,
			biomeMinSize: 50000,
			...cfg
		}
		this.continentNoise = new SimplexNoise(this.cfg.seed)
		this.detailNoise = new SimplexNoise(this.cfg.seed + 1)
		this.tempNoise = new SimplexNoise(this.cfg.seed + 2)
		this.humidNoise = new SimplexNoise(this.cfg.seed + 3)
		this.voronoi = new VoronoiNoise(this.cfg.seed + 4, this.cfg.biomeMinSize)
		this.biomeMap = new BiomeMap()
		this.chunkGen = new ChunkGenerator(this)
	}

	getHeight(wx: number, wy: number): number {
		const continent = (this.continentNoise.get(wx * this.cfg.continentScale, wy * this.cfg.continentScale) + 1) * 0.5
		const detail = (this.detailNoise.get(wx * this.cfg.detailScale, wy * this.cfg.detailScale) + 1) * 0.5
		const combined = continent * 0.7 + detail * 0.3
		if (combined < 0.4) {
			return Math.floor(this.cfg.seaLevel * combined / 0.4)
		}
		const landHeight = (combined - 0.4) / 0.6
		return Math.floor(this.cfg.seaLevel + landHeight * (this.cfg.mountainHeight - this.cfg.seaLevel))
	}

	getTemp(wx: number, wy: number): number {
		const [vTemp] = this.voronoi.get(wx, wy)
		const noise = (this.tempNoise.get(wx * this.cfg.tempScale, wy * this.cfg.tempScale) + 1) * 0.5
		const base = vTemp * 0.8 + noise * 0.2
		return Math.max(0, Math.min(1, base))
	}

	getHumid(wx: number, wy: number): number {
		const [, vHumid] = this.voronoi.get(wx, wy)
		const noise = (this.humidNoise.get(wx * this.cfg.humidScale, wy * this.cfg.humidScale) + 1) * 0.5
		const base = vHumid * 0.8 + noise * 0.2
		return Math.max(0, Math.min(1, base))
	}

	getBiome(wx: number, wy: number): BiomeType {
		const height = this.getHeight(wx, wy)
		if (height < this.cfg.seaLevel - 2) return BiomeType.Ocean
		const temp = this.getTemp(wx, wy)
		const humid = this.getHumid(wx, wy)
		if (height > this.cfg.mountainHeight - 5) return BiomeType.Mountain
		return whittakerBiome(temp, humid)
	}

	genChunk(pos: ChunkPos): number[] {
		return this.chunkGen.gen(pos)
	}

	isWater(wx: number, wy: number): boolean {
		return this.getHeight(wx, wy) < this.cfg.seaLevel
	}
}
