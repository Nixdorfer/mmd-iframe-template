import { BiomeType } from '@engine/common'

export interface BiomeDef {
	typ: BiomeType
	name: string
	minTemp: number
	maxTemp: number
	minHumid: number
	maxHumid: number
	surfaceBlock: number
	subBlock: number
	baseBlock: number
	vegetation: number
	treeChance: number
	oreChance: number
}

export class BiomeMap {
	biomes: Map<BiomeType, BiomeDef>

	constructor() {
		this.biomes = new Map()
		this.iniBiomes()
	}

	private iniBiomes() {
		this.addBiome({
			typ: BiomeType.Tundra,
			name: '冻原',
			minTemp: 0, maxTemp: 0.2,
			minHumid: 0, maxHumid: 1,
			surfaceBlock: 10,
			subBlock: 11,
			baseBlock: 1,
			vegetation: 0.05,
			treeChance: 0.01,
			oreChance: 0.02
		})
		this.addBiome({
			typ: BiomeType.Plains,
			name: '平原',
			minTemp: 0.3, maxTemp: 0.7,
			minHumid: 0.3, maxHumid: 0.6,
			surfaceBlock: 2,
			subBlock: 3,
			baseBlock: 1,
			vegetation: 0.3,
			treeChance: 0.02,
			oreChance: 0.01
		})
		this.addBiome({
			typ: BiomeType.Forest,
			name: '森林',
			minTemp: 0.3, maxTemp: 0.7,
			minHumid: 0.6, maxHumid: 1,
			surfaceBlock: 2,
			subBlock: 3,
			baseBlock: 1,
			vegetation: 0.6,
			treeChance: 0.15,
			oreChance: 0.01
		})
		this.addBiome({
			typ: BiomeType.Desert,
			name: '沙漠',
			minTemp: 0.7, maxTemp: 1,
			minHumid: 0, maxHumid: 0.3,
			surfaceBlock: 4,
			subBlock: 4,
			baseBlock: 1,
			vegetation: 0.02,
			treeChance: 0.005,
			oreChance: 0.015
		})
		this.addBiome({
			typ: BiomeType.Swamp,
			name: '沼泽',
			minTemp: 0.5, maxTemp: 0.8,
			minHumid: 0.8, maxHumid: 1,
			surfaceBlock: 5,
			subBlock: 3,
			baseBlock: 1,
			vegetation: 0.4,
			treeChance: 0.08,
			oreChance: 0.008
		})
		this.addBiome({
			typ: BiomeType.Mountain,
			name: '山地',
			minTemp: 0.2, maxTemp: 0.5,
			minHumid: 0, maxHumid: 0.5,
			surfaceBlock: 1,
			subBlock: 1,
			baseBlock: 1,
			vegetation: 0.1,
			treeChance: 0.03,
			oreChance: 0.05
		})
		this.addBiome({
			typ: BiomeType.Ocean,
			name: '海洋',
			minTemp: 0, maxTemp: 1,
			minHumid: 0, maxHumid: 1,
			surfaceBlock: 6,
			subBlock: 6,
			baseBlock: 1,
			vegetation: 0,
			treeChance: 0,
			oreChance: 0
		})
	}

	addBiome(def: BiomeDef) {
		this.biomes.set(def.typ, def)
	}

	getBiome(typ: BiomeType): BiomeDef | undefined {
		return this.biomes.get(typ)
	}

	getBiomeAt(temp: number, humid: number): BiomeType {
		let best = BiomeType.Plains
		let bestScore = -1
		for (const [typ, def] of this.biomes) {
			if (typ === BiomeType.Ocean) continue
			if (temp >= def.minTemp && temp <= def.maxTemp &&
				humid >= def.minHumid && humid <= def.maxHumid) {
				const tempDist = Math.min(temp - def.minTemp, def.maxTemp - temp)
				const humidDist = Math.min(humid - def.minHumid, def.maxHumid - humid)
				const score = tempDist + humidDist
				if (score > bestScore) {
					bestScore = score
					best = typ
				}
			}
		}
		return best
	}
}

export const WHITTAKER_BIOMES: BiomeType[][] = [
	[BiomeType.Tundra, BiomeType.Tundra, BiomeType.Tundra],
	[BiomeType.Desert, BiomeType.Plains, BiomeType.Forest],
	[BiomeType.Desert, BiomeType.Swamp, BiomeType.Swamp]
]

export function whittakerBiome(temp: number, humid: number): BiomeType {
	const ti = Math.min(2, Math.floor(temp * 3))
	const hi = Math.min(2, Math.floor(humid * 3))
	return WHITTAKER_BIOMES[ti][hi]
}
