const WorldGenerator = {
	config: null,
	buildingData: null,
	terrainData: null,
	chunkMgr: null,
	caveGen: null,
	cities: [],
	roads: [],
	waterTerrains: ['ter_water_shallow', 'ter_water_deep', 'ter_swamp', 'ter_lava', 'ter_acid_pool', 'ter_underground_water', 'ter_underground_lake'],
	solidTerrains: ['ter_cave_wall', 'ter_bedrock'],

	init(config, buildingData, terrainData, chunkMgr, caveGen) {
		this.config = config
		this.buildingData = buildingData
		this.terrainData = terrainData
		this.chunkMgr = chunkMgr
		this.caveGen = caveGen
		this.cities = []
		this.roads = []
		if (chunkMgr) chunkMgr.init(this)
		if (caveGen) caveGen.init(config.seed || Date.now())
	},

	generateChunkTerrain(chunk, worldX, worldY) {
		const CHUNK_SIZE = 16
		const Z_MIN = -20
		const Z_MAX = 20
		let caveMap = null
		if (this.caveGen) {
			caveMap = this.caveGen.generateCaveMap(worldX, worldY, CHUNK_SIZE, CHUNK_SIZE, Z_MIN, -1)
		}
		for (let lx = 0; lx < CHUNK_SIZE; lx++) {
			for (let ly = 0; ly < CHUNK_SIZE; ly++) {
				const wx = worldX + lx
				const wy = worldY + ly
				chunk.tiles[lx][ly][0 - Z_MIN] = this.createTile('ter_grass', false, null)
				for (let z = Z_MIN; z < 0; z++) {
					const zi = z - Z_MIN
					if (caveMap) {
						const cave = caveMap[lx][ly][zi]
						if (cave.type === 'solid') {
							chunk.tiles[lx][ly][zi] = this.createTile(cave.terrain, true, null)
						} else if (cave.type === 'liquid') {
							chunk.tiles[lx][ly][zi] = this.createTile(cave.terrain, false, null)
						} else if (cave.type === 'cave') {
							chunk.tiles[lx][ly][zi] = this.createTile(cave.terrain, false, null)
						} else {
							chunk.tiles[lx][ly][zi] = null
						}
					} else {
						chunk.tiles[lx][ly][zi] = this.createTile('ter_cave_wall', true, null)
					}
				}
				for (let z = 1; z <= Z_MAX; z++) {
					chunk.tiles[lx][ly][z - Z_MIN] = null
				}
			}
		}
	},

	createTile(terrain, solid, ceiling) {
		return {
			terrain,
			solid,
			ceiling,
			wallN: null,
			wallS: null,
			wallE: null,
			wallW: null,
			light: 1.0,
			visible: true,
			occluded: false
		}
	},

	getTile(x, y, z) {
		if (this.chunkMgr) {
			return this.chunkMgr.getTile(x, y, z)
		}
		return null
	},

	setTile(x, y, z, tile) {
		if (this.chunkMgr) {
			return this.chunkMgr.setTile(x, y, z, tile)
		}
		return false
	},

	isWater(x, y, z = 0) {
		const tile = this.getTile(x, y, z)
		if (!tile) return false
		return this.waterTerrains.includes(tile.terrain)
	},

	isSolid(x, y, z) {
		const tile = this.getTile(x, y, z)
		if (!tile) return false
		return tile.solid || this.solidTerrains.includes(tile.terrain)
	},

	isValidBuildingSpot(x, y, sizeX, sizeY) {
		for (let dy = 0; dy < sizeY; dy++) {
			for (let dx = 0; dx < sizeX; dx++) {
				if (this.isWater(x + dx, y + dy, 0)) return false
			}
		}
		return true
	},

	findValidBuildingSpot(centerX, centerY, building, maxAttempts = 50) {
		const sizeMin = building.sizeMin
		const sizeMax = building.sizeMax
		const sizeX = sizeMin.x + Math.floor(Math.random() * (sizeMax.x - sizeMin.x))
		const sizeY = sizeMin.z + Math.floor(Math.random() * (sizeMax.z - sizeMin.z))
		for (let attempt = 0; attempt < maxAttempts; attempt++) {
			const offsetX = Math.floor((Math.random() - 0.5) * 100)
			const offsetY = Math.floor((Math.random() - 0.5) * 100)
			const x = centerX + offsetX
			const y = centerY + offsetY
			if (this.isValidBuildingSpot(x, y, sizeX, sizeY)) {
				return { x, y, sizeX, sizeY }
			}
		}
		return null
	},

	generateCity(centerX, centerY, radius, cityConfig) {
		const city = {
			id: `city_${this.cities.length}`,
			center: { x: centerX, y: centerY },
			radius,
			buildings: [],
			isIsland: false
		}
		city.isIsland = this.checkIsIsland(centerX, centerY, radius)
		const buildingList = this.selectBuildingsForCity(cityConfig)
		for (const buildingDef of buildingList) {
			const spot = this.findValidBuildingSpot(centerX, centerY, buildingDef)
			if (spot) {
				const instance = this.createBuildingInstance(buildingDef, spot)
				city.buildings.push(instance)
				this.writeBuildingToWorld(instance, buildingDef)
			}
		}
		this.cities.push(city)
		return city
	},

	checkIsIsland(centerX, centerY, radius) {
		const checkRadius = radius * 1.5
		const directions = [
			{ x: 1, y: 0 }, { x: -1, y: 0 },
			{ x: 0, y: 1 }, { x: 0, y: -1 },
			{ x: 0.7, y: 0.7 }, { x: -0.7, y: 0.7 },
			{ x: 0.7, y: -0.7 }, { x: -0.7, y: -0.7 }
		]
		let waterCount = 0
		for (const dir of directions) {
			const checkX = Math.floor(centerX + dir.x * checkRadius)
			const checkY = Math.floor(centerY + dir.y * checkRadius)
			if (this.isWater(checkX, checkY, 0)) waterCount++
		}
		return waterCount >= 6
	},

	generateRoads() {
		const nonIslandCities = this.cities.filter(c => !c.isIsland)
		for (let i = 0; i < nonIslandCities.length; i++) {
			for (let j = i + 1; j < nonIslandCities.length; j++) {
				const cityA = nonIslandCities[i]
				const cityB = nonIslandCities[j]
				const dist = this.calDistance(cityA.center, cityB.center)
				if (dist < this.config.citySpacing * 1.5 * 1000) {
					const road = this.createRoad(cityA, cityB)
					if (road) this.roads.push(road)
				}
			}
		}
		return this.roads
	},

	createRoad(cityA, cityB) {
		const path = this.findPath(cityA.center, cityB.center)
		if (!path) return null
		for (const pt of path) {
			this.setTile(pt.x, pt.y, 0, this.createTile('ter_asphalt', false, null))
		}
		return {
			id: `road_${this.roads.length}`,
			from: cityA.id,
			to: cityB.id,
			path,
			width: 10
		}
	},

	findPath(start, end) {
		const path = []
		const dx = end.x - start.x
		const dy = end.y - start.y
		const steps = Math.max(Math.abs(dx), Math.abs(dy))
		for (let i = 0; i <= steps; i++) {
			const t = steps === 0 ? 0 : i / steps
			const x = Math.floor(start.x + dx * t)
			const y = Math.floor(start.y + dy * t)
			if (this.isWater(x, y, 0)) {
				return null
			}
			path.push({ x, y })
		}
		return path
	},

	calDistance(a, b) {
		const dx = b.x - a.x
		const dy = b.y - a.y
		return Math.sqrt(dx * dx + dy * dy)
	},

	selectBuildingsForCity(cityConfig) {
		const result = []
		const ensureSpawn = this.buildingData.filter(b => b.ensureSpawn)
		result.push(...ensureSpawn)
		const optional = this.buildingData.filter(b => !b.ensureSpawn)
		const count = Math.floor(20 + Math.random() * 30)
		for (let i = 0; i < count; i++) {
			const idx = Math.floor(Math.random() * optional.length)
			result.push(optional[idx])
		}
		return result
	},

	createBuildingInstance(buildingDef, spot) {
		const interior = this.generateInterior(buildingDef, spot.sizeX, spot.sizeY)
		return {
			id: `${buildingDef.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			defId: buildingDef.id,
			position: { x: spot.x, y: spot.y },
			size: { x: spot.sizeX, y: spot.sizeY },
			floors: buildingDef.floors,
			interior,
			rotation: Math.floor(Math.random() * 4) * 90
		}
	},

	writeBuildingToWorld(instance, buildingDef) {
		const { x: startX, y: startY } = instance.position
		const { x: sizeX, y: sizeY } = instance.size
		const floors = instance.floors || 1
		for (let floor = 0; floor < floors; floor++) {
			const z = floor + 1
			for (let dx = 0; dx < sizeX; dx++) {
				for (let dy = 0; dy < sizeY; dy++) {
					const wx = startX + dx
					const wy = startY + dy
					const isEdgeX = dx === 0 || dx === sizeX - 1
					const isEdgeY = dy === 0 || dy === sizeY - 1
					const tile = this.createTile('ter_wood_floor', false, floor < floors - 1 ? 'ceiling_wood' : null)
					if (dx === 0) tile.wallW = 'wall_brick'
					if (dx === sizeX - 1) tile.wallE = 'wall_brick'
					if (dy === 0) tile.wallS = 'wall_brick'
					if (dy === sizeY - 1) tile.wallN = 'wall_brick'
					if (floor === 0 && (isEdgeX || isEdgeY)) {
						const doorChance = Math.random()
						if (doorChance < 0.1) {
							if (dx === 0) tile.wallW = 'door_wood'
							else if (dx === sizeX - 1) tile.wallE = 'door_wood'
							else if (dy === 0) tile.wallS = 'door_wood'
							else if (dy === sizeY - 1) tile.wallN = 'door_wood'
						}
					}
					this.setTile(wx, wy, z, tile)
				}
			}
		}
	},

	generateInterior(buildingDef, plotSizeX, plotSizeY) {
		const layout = buildingDef.layout || 'single'
		switch (layout) {
			case 'single': return this.genLayoutSingle(buildingDef, plotSizeX, plotSizeY)
			case 'compound': return this.genLayoutCompound(buildingDef, plotSizeX, plotSizeY)
			case 'courtyard': return this.genLayoutCourtyard(buildingDef, plotSizeX, plotSizeY)
			case 'tower': return this.genLayoutTower(buildingDef, plotSizeX, plotSizeY)
			case 'scattered': return this.genLayoutScattered(buildingDef, plotSizeX, plotSizeY)
			default: return this.genLayoutSingle(buildingDef, plotSizeX, plotSizeY)
		}
	},

	genLayoutSingle(buildingDef, plotSizeX, plotSizeY) {
		const margin = 2
		return {
			mainBuilding: {
				x: margin,
				y: margin,
				width: plotSizeX - margin * 2,
				depth: plotSizeY - margin * 2
			},
			rooms: this.genRooms(buildingDef, plotSizeX - margin * 2, plotSizeY - margin * 2),
			yard: null
		}
	},

	genLayoutCompound(buildingDef, plotSizeX, plotSizeY) {
		const mainRatio = 0.6 + Math.random() * 0.2
		const mainWidth = Math.floor(plotSizeX * mainRatio)
		const mainDepth = Math.floor(plotSizeY * mainRatio)
		const mainX = Math.floor((plotSizeX - mainWidth) / 2)
		const mainY = 2
		return {
			mainBuilding: { x: mainX, y: mainY, width: mainWidth, depth: mainDepth },
			rooms: this.genRooms(buildingDef, mainWidth, mainDepth),
			yard: {
				x: 0, y: mainY + mainDepth + 2,
				width: plotSizeX, depth: plotSizeY - mainDepth - mainY - 4
			},
			annexes: this.genAnnexes(plotSizeX, plotSizeY, mainX, mainY, mainWidth, mainDepth)
		}
	},

	genLayoutCourtyard(buildingDef, plotSizeX, plotSizeY) {
		const wallThickness = Math.max(8, Math.floor(Math.min(plotSizeX, plotSizeY) * 0.2))
		const courtX = wallThickness
		const courtY = wallThickness
		const courtWidth = plotSizeX - wallThickness * 2
		const courtDepth = plotSizeY - wallThickness * 2
		return {
			walls: [
				{ x: 0, y: 0, width: plotSizeX, depth: wallThickness, side: 'north' },
				{ x: 0, y: plotSizeY - wallThickness, width: plotSizeX, depth: wallThickness, side: 'south' },
				{ x: 0, y: wallThickness, width: wallThickness, depth: courtDepth, side: 'west' },
				{ x: plotSizeX - wallThickness, y: wallThickness, width: wallThickness, depth: courtDepth, side: 'east' }
			],
			courtyard: { x: courtX, y: courtY, width: courtWidth, depth: courtDepth },
			rooms: this.genRooms(buildingDef, wallThickness * 2, plotSizeY)
		}
	},

	genLayoutTower(buildingDef, plotSizeX, plotSizeY) {
		const towerSize = Math.min(buildingDef.voxelSize.x, buildingDef.voxelSize.z)
		const towerX = Math.floor((plotSizeX - towerSize) / 2)
		const towerY = Math.floor((plotSizeY - towerSize) / 2)
		return {
			tower: { x: towerX, y: towerY, width: towerSize, depth: towerSize },
			rooms: this.genRooms(buildingDef, towerSize, towerSize),
			plaza: {
				x: 0, y: 0,
				width: plotSizeX, depth: plotSizeY,
				exclude: { x: towerX, y: towerY, width: towerSize, depth: towerSize }
			}
		}
	},

	genLayoutScattered(buildingDef, plotSizeX, plotSizeY) {
		const buildingCount = 2 + Math.floor(Math.random() * 4)
		const buildings = []
		for (let i = 0; i < buildingCount; i++) {
			const w = 10 + Math.floor(Math.random() * 20)
			const d = 10 + Math.floor(Math.random() * 20)
			const x = Math.floor(Math.random() * (plotSizeX - w))
			const y = Math.floor(Math.random() * (plotSizeY - d))
			let overlap = false
			for (const existing of buildings) {
				if (this.rectsOverlap(x, y, w, d, existing.x, existing.y, existing.width, existing.depth)) {
					overlap = true
					break
				}
			}
			if (!overlap) {
				buildings.push({ x, y, width: w, depth: d })
			}
		}
		return {
			buildings,
			paths: this.genPaths(buildings),
			openArea: { x: 0, y: 0, width: plotSizeX, depth: plotSizeY }
		}
	},

	rectsOverlap(x1, y1, w1, d1, x2, y2, w2, d2) {
		const margin = 4
		return !(x1 + w1 + margin < x2 || x2 + w2 + margin < x1 ||
				 y1 + d1 + margin < y2 || y2 + d2 + margin < y1)
	},

	genRooms(buildingDef, width, depth) {
		const rooms = []
		const roomCount = Math.min(buildingDef.furnitureSlots / 5, 12)
		const gridX = Math.ceil(Math.sqrt(roomCount))
		const gridY = Math.ceil(roomCount / gridX)
		const roomW = Math.floor(width / gridX)
		const roomD = Math.floor(depth / gridY)
		for (let gy = 0; gy < gridY; gy++) {
			for (let gx = 0; gx < gridX; gx++) {
				if (rooms.length >= roomCount) break
				rooms.push({
					x: gx * roomW,
					y: gy * roomD,
					width: roomW,
					depth: roomD,
					type: this.getRoomType(buildingDef, rooms.length)
				})
			}
		}
		return rooms
	},

	getRoomType(buildingDef, index) {
		const types = ['main', 'secondary', 'storage', 'hallway', 'utility']
		return types[index % types.length]
	},

	genAnnexes(plotSizeX, plotSizeY, mainX, mainY, mainWidth, mainDepth) {
		const annexes = []
		if (mainX > 10) {
			annexes.push({ x: 2, y: mainY, width: mainX - 4, depth: Math.floor(mainDepth * 0.6) })
		}
		if (plotSizeX - mainX - mainWidth > 10) {
			annexes.push({ x: mainX + mainWidth + 2, y: mainY, width: plotSizeX - mainX - mainWidth - 4, depth: Math.floor(mainDepth * 0.6) })
		}
		return annexes
	},

	genPaths(buildings) {
		const paths = []
		for (let i = 0; i < buildings.length - 1; i++) {
			const a = buildings[i]
			const b = buildings[i + 1]
			paths.push({
				from: { x: a.x + a.width / 2, y: a.y + a.depth / 2 },
				to: { x: b.x + b.width / 2, y: b.y + b.depth / 2 },
				width: 2
			})
		}
		return paths
	},

	digTerrain(x, y, z, toolHardness = 1.0) {
		const tile = this.getTile(x, y, z)
		if (!tile) return false
		if (tile.terrain === 'ter_bedrock') return false
		const terrainDef = this.terrainData?.terrains?.find(t => t.id === tile.terrain)
		if (terrainDef && terrainDef.hardness > toolHardness) return false
		const belowTile = this.getTile(x, y, z - 1)
		if (belowTile && belowTile.terrain === 'ter_cave_wall') {
			this.setTile(x, y, z - 1, this.createTile('ter_cave_floor', false, null))
		}
		this.setTile(x, y, z, null)
		return true
	},

	transformTerrain(x, y, z, newTerrain) {
		const tile = this.getTile(x, y, z)
		if (!tile) return false
		tile.terrain = newTerrain
		if (this.chunkMgr) this.chunkMgr.markChunkDirty(x, y)
		return true
	},

	generateWorld(mapWidth, mapHeight) {
		if (this.chunkMgr) {
			this.chunkMgr.updatePlayerPos(mapWidth / 2, mapHeight / 2)
			this.chunkMgr.processGenQueue(100)
		}
		const cityCount = this.calCityCount(mapWidth, mapHeight)
		const cityPositions = this.placeCities(cityCount, mapWidth, mapHeight)
		for (const pos of cityPositions) {
			this.generateCity(pos.x, pos.y, this.config.cityRadius * 1000, this.config)
		}
		this.generateRoads()
		return {
			cities: this.cities,
			roads: this.roads
		}
	},

	calCityCount(mapWidth, mapHeight) {
		if (this.config.cityMode === 'none') return 0
		if (this.config.cityMode === 'single') return 1
		const spacing = this.config.citySpacing * 1000
		const countX = Math.floor(mapWidth / spacing)
		const countY = Math.floor(mapHeight / spacing)
		return Math.max(1, countX * countY)
	},

	placeCities(count, mapWidth, mapHeight) {
		const positions = []
		const spacing = this.config.citySpacing * 1000
		const margin = spacing / 2
		for (let i = 0; i < count; i++) {
			let attempts = 0
			while (attempts < 100) {
				const x = margin + Math.random() * (mapWidth - margin * 2)
				const y = margin + Math.random() * (mapHeight - margin * 2)
				let valid = true
				for (const existing of positions) {
					if (this.calDistance({ x, y }, existing) < spacing * 0.8) {
						valid = false
						break
					}
				}
				if (valid && !this.isWater(Math.floor(x), Math.floor(y), 0)) {
					positions.push({ x: Math.floor(x), y: Math.floor(y) })
					break
				}
				attempts++
			}
		}
		return positions
	}
}

if (typeof module !== 'undefined') module.exports = WorldGenerator
