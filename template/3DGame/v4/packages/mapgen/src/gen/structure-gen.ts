import { BiomeType, type Vec3 } from '@engine/common'

export interface StructureDef {
	id: string
	typ: StructureType
	pos: Vec3
	size: Vec3
	rot: number
	variant: string
}

export enum StructureType {
	Tree = 'tree',
	Rock = 'rock',
	Bush = 'bush',
	CaveEntrance = 'cave_entrance',
	Dungeon = 'dungeon',
	Ruins = 'ruins',
	Village = 'village',
	Tower = 'tower',
	Shrine = 'shrine',
	Well = 'well'
}

export interface TreeVariant {
	id: string
	trunkHeight: number
	trunkRadius: number
	canopyRadius: number
	canopyHeight: number
	biomes: BiomeType[]
}

export interface DungeonRoom {
	id: string
	pos: Vec3
	size: Vec3
	typ: 'entrance' | 'corridor' | 'room' | 'treasure' | 'boss'
	connections: string[]
	loot: LootEntry[]
}

export interface LootEntry {
	item: string
	chance: number
	minCnt: number
	maxCnt: number
}

export interface DungeonDef {
	id: string
	entrance: Vec3
	depth: number
	rooms: DungeonRoom[]
	difficulty: number
	theme: 'stone' | 'ice' | 'fire' | 'crystal' | 'void'
}

export interface VillageDef {
	id: string
	center: Vec3
	radius: number
	buildings: VillageBuilding[]
	roads: VillageRoad[]
	population: number
}

export interface VillageBuilding {
	id: string
	typ: 'house' | 'shop' | 'inn' | 'blacksmith' | 'temple' | 'well' | 'farm'
	pos: Vec3
	size: Vec3
	rot: number
}

export interface VillageRoad {
	from: Vec3
	to: Vec3
	width: number
}

const TREE_VARIANTS: TreeVariant[] = [
	{ id: 'oak', trunkHeight: 5, trunkRadius: 1, canopyRadius: 3, canopyHeight: 4, biomes: [BiomeType.Forest, BiomeType.Plains] },
	{ id: 'pine', trunkHeight: 8, trunkRadius: 1, canopyRadius: 2, canopyHeight: 6, biomes: [BiomeType.Forest, BiomeType.Mountain, BiomeType.Tundra] },
	{ id: 'birch', trunkHeight: 6, trunkRadius: 1, canopyRadius: 2, canopyHeight: 3, biomes: [BiomeType.Forest, BiomeType.Plains] },
	{ id: 'palm', trunkHeight: 7, trunkRadius: 1, canopyRadius: 3, canopyHeight: 2, biomes: [BiomeType.Desert] },
	{ id: 'dead', trunkHeight: 4, trunkRadius: 1, canopyRadius: 0, canopyHeight: 0, biomes: [BiomeType.Swamp, BiomeType.Desert] }
]

export class StructureGenerator {
	seed: number
	structures: Map<string, StructureDef>
	dungeons: Map<string, DungeonDef>
	villages: Map<string, VillageDef>
	nxtId: number

	constructor(seed: number) {
		this.seed = seed
		this.structures = new Map()
		this.dungeons = new Map()
		this.villages = new Map()
		this.nxtId = 1
	}

	private rng(x: number, y: number, z: number = 0): number {
		let h = x * 374761393 + y * 668265263 + z * 1274126177 + this.seed
		h = (h ^ (h >> 13)) * 1274126177
		return ((h ^ (h >> 16)) & 0x7fffffff) / 0x7fffffff
	}

	genTrees(
		getHeight: (x: number, y: number) => number,
		getBiome: (x: number, y: number) => BiomeType,
		seaLevel: number,
		mapWidth: number,
		mapHeight: number,
		density: number
	): StructureDef[] {
		const trees: StructureDef[] = []
		const spacing = Math.floor(10 / (density + 0.1))
		for (let x = spacing; x < mapWidth - spacing; x += spacing) {
			for (let y = spacing; y < mapHeight - spacing; y += spacing) {
				const ox = (this.rng(x, y, 0) - 0.5) * spacing * 0.8
				const oy = (this.rng(x, y, 1) - 0.5) * spacing * 0.8
				const px = Math.floor(x + ox)
				const py = Math.floor(y + oy)
				const h = getHeight(px, py)
				if (h < seaLevel + 1) continue
				const biome = getBiome(px, py)
				if (biome === BiomeType.Ocean || biome === BiomeType.River || biome === BiomeType.Lake) continue
				if (biome === BiomeType.City || biome === BiomeType.Village) continue
				const variants = TREE_VARIANTS.filter(v => v.biomes.includes(biome))
				if (variants.length === 0) continue
				const treeDensity = this.getTreeDensity(biome)
				if (this.rng(px, py, 2) > treeDensity * density) continue
				const variant = variants[Math.floor(this.rng(px, py, 3) * variants.length)]
				const id = `tree_${this.nxtId++}`
				const tree: StructureDef = {
					id,
					typ: StructureType.Tree,
					pos: { x: px, y: py, z: h },
					size: { x: variant.canopyRadius * 2, y: variant.canopyRadius * 2, z: variant.trunkHeight + variant.canopyHeight },
					rot: this.rng(px, py, 4) * Math.PI * 2,
					variant: variant.id
				}
				trees.push(tree)
				this.structures.set(id, tree)
			}
		}
		return trees
	}

	private getTreeDensity(biome: BiomeType): number {
		switch (biome) {
			case BiomeType.Forest: return 0.8
			case BiomeType.Swamp: return 0.5
			case BiomeType.Plains: return 0.15
			case BiomeType.Mountain: return 0.2
			case BiomeType.Tundra: return 0.1
			case BiomeType.Desert: return 0.02
			default: return 0.1
		}
	}

	genRocks(
		getHeight: (x: number, y: number) => number,
		getBiome: (x: number, y: number) => BiomeType,
		seaLevel: number,
		mapWidth: number,
		mapHeight: number,
		density: number
	): StructureDef[] {
		const rocks: StructureDef[] = []
		const spacing = Math.floor(20 / (density + 0.1))
		for (let x = spacing; x < mapWidth - spacing; x += spacing) {
			for (let y = spacing; y < mapHeight - spacing; y += spacing) {
				const px = Math.floor(x + (this.rng(x, y, 10) - 0.5) * spacing)
				const py = Math.floor(y + (this.rng(x, y, 11) - 0.5) * spacing)
				const h = getHeight(px, py)
				if (h < seaLevel) continue
				const biome = getBiome(px, py)
				const rockChance = this.getRockChance(biome)
				if (this.rng(px, py, 12) > rockChance * density) continue
				const size = 1 + this.rng(px, py, 13) * 3
				const id = `rock_${this.nxtId++}`
				const rock: StructureDef = {
					id,
					typ: StructureType.Rock,
					pos: { x: px, y: py, z: h },
					size: { x: size, y: size, z: size * 0.7 },
					rot: this.rng(px, py, 14) * Math.PI * 2,
					variant: this.getRockVariant(biome)
				}
				rocks.push(rock)
				this.structures.set(id, rock)
			}
		}
		return rocks
	}

	private getRockChance(biome: BiomeType): number {
		switch (biome) {
			case BiomeType.Mountain: return 0.4
			case BiomeType.Desert: return 0.2
			case BiomeType.Tundra: return 0.25
			case BiomeType.Plains: return 0.05
			case BiomeType.Forest: return 0.08
			default: return 0.05
		}
	}

	private getRockVariant(biome: BiomeType): string {
		switch (biome) {
			case BiomeType.Desert: return 'sandstone'
			case BiomeType.Tundra: return 'ice'
			case BiomeType.Volcano: return 'obsidian'
			default: return 'granite'
		}
	}

	genDungeon(
		entrance: Vec3,
		_getHeight: (x: number, y: number) => number,
		difficulty: number,
		theme: DungeonDef['theme']
	): DungeonDef {
		const id = `dungeon_${this.nxtId++}`
		const rooms: DungeonRoom[] = []
		const depth = 3 + Math.floor(difficulty * 3)
		const entranceRoom: DungeonRoom = {
			id: `room_${this.nxtId++}`,
			pos: { x: entrance.x, y: entrance.y, z: entrance.z - 5 },
			size: { x: 6, y: 6, z: 4 },
			typ: 'entrance',
			connections: [],
			loot: []
		}
		rooms.push(entranceRoom)
		let lastRoom = entranceRoom
		const roomCount = 5 + Math.floor(difficulty * 5)
		for (let i = 0; i < roomCount; i++) {
			const isLast = i === roomCount - 1
			const isTreasure = !isLast && this.rng(i, 0, 100) < 0.2
			const roomTyp = isLast ? 'boss' : (isTreasure ? 'treasure' : (this.rng(i, 0, 101) < 0.3 ? 'corridor' : 'room'))
			const angle = this.rng(i, 0, 102) * Math.PI * 2
			const dist = 8 + this.rng(i, 0, 103) * 6
			const newPos: Vec3 = {
				x: lastRoom.pos.x + Math.cos(angle) * dist,
				y: lastRoom.pos.y + Math.sin(angle) * dist,
				z: lastRoom.pos.z - (this.rng(i, 0, 104) < 0.3 ? 3 : 0)
			}
			const roomSize = roomTyp === 'corridor'
				? { x: 3, y: dist, z: 3 }
				: { x: 5 + this.rng(i, 0, 105) * 5, y: 5 + this.rng(i, 0, 106) * 5, z: 3 + this.rng(i, 0, 107) * 2 }
			const roomId = `room_${this.nxtId++}`
			const room: DungeonRoom = {
				id: roomId,
				pos: newPos,
				size: roomSize,
				typ: roomTyp,
				connections: [lastRoom.id],
				loot: this.genLoot(roomTyp, difficulty)
			}
			lastRoom.connections.push(roomId)
			rooms.push(room)
			if (roomTyp !== 'corridor') {
				lastRoom = room
			}
		}
		const dungeon: DungeonDef = {
			id,
			entrance,
			depth,
			rooms,
			difficulty,
			theme
		}
		this.dungeons.set(id, dungeon)
		return dungeon
	}

	private genLoot(roomTyp: DungeonRoom['typ'], difficulty: number): LootEntry[] {
		const loot: LootEntry[] = []
		if (roomTyp === 'treasure' || roomTyp === 'boss') {
			loot.push({ item: 'gold', chance: 1.0, minCnt: 10 * difficulty, maxCnt: 50 * difficulty })
			loot.push({ item: 'potion', chance: 0.5, minCnt: 1, maxCnt: 3 })
			if (roomTyp === 'boss') {
				loot.push({ item: 'rare_weapon', chance: 0.3, minCnt: 1, maxCnt: 1 })
				loot.push({ item: 'rare_armor', chance: 0.3, minCnt: 1, maxCnt: 1 })
			}
		} else if (roomTyp === 'room') {
			loot.push({ item: 'gold', chance: 0.3, minCnt: 1, maxCnt: 10 })
		}
		return loot
	}

	genVillage(
		center: Vec3,
		getHeight: (x: number, y: number) => number,
		isWater: (x: number, y: number) => boolean,
		population: number
	): VillageDef {
		const id = `village_${this.nxtId++}`
		const buildings: VillageBuilding[] = []
		const roads: VillageRoad[] = []
		const radius = 30 + population * 5
		const wellPos: Vec3 = { x: center.x, y: center.y, z: getHeight(center.x, center.y) }
		buildings.push({
			id: `building_${this.nxtId++}`,
			typ: 'well',
			pos: wellPos,
			size: { x: 3, y: 3, z: 4 },
			rot: 0
		})
		const buildingCount = Math.floor(population / 3) + 2
		const buildingTypes: VillageBuilding['typ'][] = ['house', 'house', 'house', 'shop', 'inn', 'blacksmith', 'temple', 'farm']
		for (let i = 0; i < buildingCount; i++) {
			const angle = (i / buildingCount) * Math.PI * 2 + this.rng(i, 200, 0) * 0.5
			const dist = 15 + this.rng(i, 200, 1) * (radius - 20)
			const bx = Math.floor(center.x + Math.cos(angle) * dist)
			const by = Math.floor(center.y + Math.sin(angle) * dist)
			if (isWater(bx, by)) continue
			const h = getHeight(bx, by)
			const typ = buildingTypes[Math.floor(this.rng(i, 200, 2) * buildingTypes.length)]
			const size = this.getBuildingSize(typ)
			buildings.push({
				id: `building_${this.nxtId++}`,
				typ,
				pos: { x: bx, y: by, z: h },
				size,
				rot: angle + Math.PI + (this.rng(i, 200, 3) - 0.5) * 0.3
			})
			roads.push({
				from: wellPos,
				to: { x: bx, y: by, z: h },
				width: 2
			})
		}
		const village: VillageDef = {
			id,
			center,
			radius,
			buildings,
			roads,
			population
		}
		this.villages.set(id, village)
		return village
	}

	private getBuildingSize(typ: VillageBuilding['typ']): Vec3 {
		switch (typ) {
			case 'house': return { x: 6 + Math.random() * 2, y: 6 + Math.random() * 2, z: 4 }
			case 'shop': return { x: 7, y: 7, z: 4 }
			case 'inn': return { x: 10, y: 8, z: 6 }
			case 'blacksmith': return { x: 8, y: 6, z: 4 }
			case 'temple': return { x: 10, y: 12, z: 8 }
			case 'well': return { x: 3, y: 3, z: 4 }
			case 'farm': return { x: 12, y: 12, z: 3 }
			default: return { x: 6, y: 6, z: 4 }
		}
	}

	genRuins(
		pos: Vec3,
		_getHeight: (x: number, y: number) => number,
		size: number
	): StructureDef {
		const id = `ruins_${this.nxtId++}`
		const ruins: StructureDef = {
			id,
			typ: StructureType.Ruins,
			pos,
			size: { x: size, y: size, z: size * 0.5 },
			rot: this.rng(pos.x, pos.y, 300) * Math.PI * 2,
			variant: this.rng(pos.x, pos.y, 301) < 0.5 ? 'ancient' : 'medieval'
		}
		this.structures.set(id, ruins)
		return ruins
	}

	genShrine(
		pos: Vec3,
		_getHeight: (x: number, y: number) => number
	): StructureDef {
		const id = `shrine_${this.nxtId++}`
		const shrine: StructureDef = {
			id,
			typ: StructureType.Shrine,
			pos,
			size: { x: 4, y: 4, z: 6 },
			rot: this.rng(pos.x, pos.y, 400) * Math.PI * 2,
			variant: ['stone', 'wood', 'crystal'][Math.floor(this.rng(pos.x, pos.y, 401) * 3)]
		}
		this.structures.set(id, shrine)
		return shrine
	}

	genTower(
		pos: Vec3,
		height: number
	): StructureDef {
		const id = `tower_${this.nxtId++}`
		const tower: StructureDef = {
			id,
			typ: StructureType.Tower,
			pos,
			size: { x: 8, y: 8, z: height },
			rot: 0,
			variant: 'wizard'
		}
		this.structures.set(id, tower)
		return tower
	}

	getStructure(id: string): StructureDef | undefined {
		return this.structures.get(id)
	}

	getDungeon(id: string): DungeonDef | undefined {
		return this.dungeons.get(id)
	}

	getVillage(id: string): VillageDef | undefined {
		return this.villages.get(id)
	}

	getAllStructures(): StructureDef[] {
		return Array.from(this.structures.values())
	}

	getStructuresInRange(cx: number, cy: number, radius: number): StructureDef[] {
		const result: StructureDef[] = []
		for (const s of this.structures.values()) {
			const dx = s.pos.x - cx
			const dy = s.pos.y - cy
			if (dx * dx + dy * dy <= radius * radius) {
				result.push(s)
			}
		}
		return result
	}
}
