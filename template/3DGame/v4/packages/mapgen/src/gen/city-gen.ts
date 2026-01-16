import { CHUNK_SIZE, CHUNK_HEIGHT, type ChunkPos, type Vec3 } from '@engine/common'

export interface BuildingDef {
	id: string
	name: string
	size: { x: number; y: number; z: number }
	blocks: number[][][]
	type: 'house' | 'shop' | 'tower' | 'wall' | 'road'
}

export interface CityDef {
	id: string
	name: string
	center: { x: number; y: number }
	radius: number
	buildings: PlacedBuilding[]
	roads: Road[]
}

export interface PlacedBuilding {
	def: BuildingDef
	pos: Vec3
	rot: number
}

export interface Road {
	start: { x: number; y: number }
	end: { x: number; y: number }
	width: number
}

export interface InterCityRoad {
	fromCity: string
	toCity: string
	points: { x: number; y: number }[]
	hasBridge: boolean
}

export interface IslandInfo {
	isIsland: boolean
	distToLand: number
}

export class CityGenerator {
	seed: number
	buildings: Map<string, BuildingDef>
	isWater?: (x: number, y: number) => boolean

	constructor(seed: number, isWater?: (x: number, y: number) => boolean) {
		this.seed = seed
		this.isWater = isWater
		this.buildings = new Map()
		this.iniBldgs()
	}

	private iniBldgs() {
		this.buildings.set('house_small', {
			id: 'house_small',
			name: '小房子',
			size: { x: 5, y: 5, z: 4 },
			blocks: this.genHouseBlocks(5, 5, 4),
			type: 'house'
		})
		this.buildings.set('house_medium', {
			id: 'house_medium',
			name: '中房子',
			size: { x: 7, y: 7, z: 5 },
			blocks: this.genHouseBlocks(7, 7, 5),
			type: 'house'
		})
		this.buildings.set('shop', {
			id: 'shop',
			name: '商店',
			size: { x: 6, y: 8, z: 4 },
			blocks: this.genShopBlocks(6, 8, 4),
			type: 'shop'
		})
		this.buildings.set('tower', {
			id: 'tower',
			name: '塔楼',
			size: { x: 5, y: 5, z: 12 },
			blocks: this.genTowerBlocks(5, 5, 12),
			type: 'tower'
		})
	}

	private genHouseBlocks(sx: number, sy: number, sz: number): number[][][] {
		const blocks: number[][][] = []
		for (let z = 0; z < sz; z++) {
			blocks[z] = []
			for (let y = 0; y < sy; y++) {
				blocks[z][y] = []
				for (let x = 0; x < sx; x++) {
					if (z === 0) {
						blocks[z][y][x] = 30
					} else if (z === sz - 1) {
						blocks[z][y][x] = 31
					} else if (x === 0 || x === sx - 1 || y === 0 || y === sy - 1) {
						if (z === 1 && ((x === Math.floor(sx / 2) && y === 0) || (x === Math.floor(sx / 2) && y === sy - 1))) {
							blocks[z][y][x] = 0
						} else {
							blocks[z][y][x] = 32
						}
					} else {
						blocks[z][y][x] = 0
					}
				}
			}
		}
		return blocks
	}

	private genShopBlocks(sx: number, sy: number, sz: number): number[][][] {
		const blocks: number[][][] = []
		for (let z = 0; z < sz; z++) {
			blocks[z] = []
			for (let y = 0; y < sy; y++) {
				blocks[z][y] = []
				for (let x = 0; x < sx; x++) {
					if (z === 0) {
						blocks[z][y][x] = 30
					} else if (z === sz - 1) {
						blocks[z][y][x] = 31
					} else if (x === 0 || x === sx - 1 || y === 0 || y === sy - 1) {
						if (z === 1 && y === 0 && x >= 1 && x < sx - 1) {
							blocks[z][y][x] = 0
						} else {
							blocks[z][y][x] = 33
						}
					} else {
						blocks[z][y][x] = 0
					}
				}
			}
		}
		return blocks
	}

	private genTowerBlocks(sx: number, sy: number, sz: number): number[][][] {
		const blocks: number[][][] = []
		for (let z = 0; z < sz; z++) {
			blocks[z] = []
			for (let y = 0; y < sy; y++) {
				blocks[z][y] = []
				for (let x = 0; x < sx; x++) {
					if (z === 0 || z === sz - 1) {
						blocks[z][y][x] = 34
					} else if (x === 0 || x === sx - 1 || y === 0 || y === sy - 1) {
						blocks[z][y][x] = 34
					} else {
						blocks[z][y][x] = 0
					}
				}
			}
		}
		return blocks
	}

	private rng(x: number, y: number): number {
		let h = x * 374761393 + y * 668265263 + this.seed
		h = (h ^ (h >> 13)) * 1274126177
		return ((h ^ (h >> 16)) & 0x7fffffff) / 0x7fffffff
	}

	genCity(center: { x: number; y: number }, radius: number): CityDef {
		const city: CityDef = {
			id: `city_${center.x}_${center.y}`,
			name: '城市',
			center,
			radius,
			buildings: [],
			roads: []
		}
		const numBuildings = Math.floor(radius * radius * 0.01)
		const placed: PlacedBuilding[] = []
		for (let i = 0; i < numBuildings * 3; i++) {
			const angle = this.rng(i, 0) * Math.PI * 2
			const dist = this.rng(i, 1) * radius * 0.8
			const px = Math.floor(center.x + Math.cos(angle) * dist)
			const py = Math.floor(center.y + Math.sin(angle) * dist)
			if (this.isWater && this.isWater(px, py)) continue
			const buildingType = this.rng(i, 2) < 0.6 ? 'house_small' :
				this.rng(i, 2) < 0.85 ? 'house_medium' :
				this.rng(i, 2) < 0.95 ? 'shop' : 'tower'
			const def = this.buildings.get(buildingType)
			if (!def) continue
			let canPlace = true
			for (const p of placed) {
				const dx = px - p.pos.x
				const dy = py - p.pos.y
				const minDist = Math.max(def.size.x, def.size.y) + Math.max(p.def.size.x, p.def.size.y)
				if (dx * dx + dy * dy < minDist * minDist) {
					canPlace = false
					break
				}
			}
			if (canPlace) {
				const building: PlacedBuilding = {
					def,
					pos: { x: px, y: py, z: 0 },
					rot: Math.floor(this.rng(i, 3) * 4) * 90
				}
				placed.push(building)
				if (placed.length >= numBuildings) break
			}
		}
		city.buildings = placed
		city.roads = this.genRoads(center, placed)
		return city
	}

	private genRoads(center: { x: number; y: number }, buildings: PlacedBuilding[]): Road[] {
		const roads: Road[] = []
		for (const building of buildings) {
			roads.push({
				start: center,
				end: { x: Math.floor(building.pos.x), y: Math.floor(building.pos.y) },
				width: 2
			})
		}
		return roads
	}

	placeCity(blocks: number[], pos: ChunkPos, city: CityDef, getHeight: (x: number, y: number) => number) {
		const wx = pos.x * CHUNK_SIZE
		const wy = pos.y * CHUNK_SIZE
		const setBlock = (gx: number, gy: number, z: number, block: number) => {
			const lx = gx - wx
			const ly = gy - wy
			if (lx < 0 || lx >= CHUNK_SIZE || ly < 0 || ly >= CHUNK_SIZE || z < 0 || z >= CHUNK_HEIGHT) return
			blocks[z * CHUNK_SIZE * CHUNK_SIZE + ly * CHUNK_SIZE + lx] = block
		}
		for (const road of city.roads) {
			this.placeRoad(setBlock, road, getHeight)
		}
		for (const building of city.buildings) {
			this.placeBuilding(setBlock, building, getHeight)
		}
	}

	private placeRoad(setBlock: (gx: number, gy: number, z: number, block: number) => void, road: Road, getHeight: (x: number, y: number) => number) {
		const dx = road.end.x - road.start.x
		const dy = road.end.y - road.start.y
		const dist = Math.sqrt(dx * dx + dy * dy)
		if (dist < 1) return
		const steps = Math.ceil(dist)
		for (let i = 0; i <= steps; i++) {
			const t = i / steps
			const x = Math.floor(road.start.x + dx * t)
			const y = Math.floor(road.start.y + dy * t)
			const z = getHeight(x, y)
			for (let ox = -road.width; ox <= road.width; ox++) {
				for (let oy = -road.width; oy <= road.width; oy++) {
					setBlock(x + ox, y + oy, z, 35)
				}
			}
		}
	}

	private placeBuilding(setBlock: (gx: number, gy: number, z: number, block: number) => void, building: PlacedBuilding, getHeight: (x: number, y: number) => number) {
		const { def, pos } = building
		const baseZ = getHeight(Math.floor(pos.x), Math.floor(pos.y))
		for (let z = 0; z < def.size.z; z++) {
			for (let y = 0; y < def.size.y; y++) {
				for (let x = 0; x < def.size.x; x++) {
					const block = def.blocks[z]?.[y]?.[x] ?? 0
					if (block !== 0) {
						setBlock(
							Math.floor(pos.x) + x - Math.floor(def.size.x / 2),
							Math.floor(pos.y) + y - Math.floor(def.size.y / 2),
							baseZ + z,
							block
						)
					}
				}
			}
		}
	}

	isIslandCity(city: CityDef): IslandInfo {
		if (!this.isWater) return { isIsland: false, distToLand: 0 }
		const cx = city.center.x
		const cy = city.center.y
		const directions = [
			{ dx: 1, dy: 0 },
			{ dx: -1, dy: 0 },
			{ dx: 0, dy: 1 },
			{ dx: 0, dy: -1 },
			{ dx: 1, dy: 1 },
			{ dx: -1, dy: 1 },
			{ dx: 1, dy: -1 },
			{ dx: -1, dy: -1 }
		]
		let minDistToLand = Infinity
		const maxSearchDist = 2000
		const step = 10
		for (const dir of directions) {
			let foundLand = false
			for (let d = city.radius; d < maxSearchDist; d += step) {
				const px = Math.floor(cx + dir.dx * d)
				const py = Math.floor(cy + dir.dy * d)
				if (!this.isWater(px, py)) {
					const dist = d - city.radius
					if (dist < minDistToLand) minDistToLand = dist
					foundLand = true
					break
				}
			}
			if (!foundLand && maxSearchDist < minDistToLand) {
				minDistToLand = maxSearchDist
			}
		}
		return {
			isIsland: minDistToLand > 500,
			distToLand: minDistToLand
		}
	}

	genInterCityRoads(cities: CityDef[]): InterCityRoad[] {
		if (!this.isWater) return []
		const roads: InterCityRoad[] = []
		const connected = new Set<string>()
		const validCities = cities.filter(c => {
			const info = this.isIslandCity(c)
			return !info.isIsland
		})
		const sorted = [...validCities].sort((a, b) => b.radius - a.radius)
		for (let i = 0; i < sorted.length; i++) {
			let nearestIdx = -1
			let nearestDist = Infinity
			for (let j = 0; j < sorted.length; j++) {
				if (i === j) continue
				const key = [sorted[i].id, sorted[j].id].sort().join('-')
				if (connected.has(key)) continue
				const dx = sorted[i].center.x - sorted[j].center.x
				const dy = sorted[i].center.y - sorted[j].center.y
				const dist = Math.sqrt(dx * dx + dy * dy)
				if (dist < nearestDist) {
					nearestDist = dist
					nearestIdx = j
				}
			}
			if (nearestIdx >= 0) {
				const fromCity = sorted[i]
				const toCity = sorted[nearestIdx]
				const key = [fromCity.id, toCity.id].sort().join('-')
				connected.add(key)
				const roadPoints = this.planInterCityRoad(fromCity, toCity)
				roads.push({
					fromCity: fromCity.id,
					toCity: toCity.id,
					points: roadPoints.points,
					hasBridge: roadPoints.hasBridge
				})
			}
		}
		return roads
	}

	private planInterCityRoad(from: CityDef, to: CityDef): { points: { x: number; y: number }[]; hasBridge: boolean } {
		const points: { x: number; y: number }[] = []
		const dx = to.center.x - from.center.x
		const dy = to.center.y - from.center.y
		const dist = Math.sqrt(dx * dx + dy * dy)
		const steps = Math.ceil(dist / 5)
		let hasBridge = false
		let cx = from.center.x
		let cy = from.center.y
		for (let s = 0; s <= steps; s++) {
			const t = s / steps
			const targetX = from.center.x + dx * t
			const targetY = from.center.y + dy * t
			cx += (targetX - cx) * 0.35
			cy += (targetY - cy) * 0.35
			const px = Math.floor(cx)
			const py = Math.floor(cy)
			if (this.isWater && this.isWater(px, py)) {
				hasBridge = true
			}
			points.push({ x: px, y: py })
		}
		return { points, hasBridge }
	}
}
