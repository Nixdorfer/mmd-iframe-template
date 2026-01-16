const CaveGenerator = {
	seed: 0,

	init(seed) {
		this.seed = seed || Date.now()
	},

	noise2D(x, y) {
		const n = Math.sin(x * 12.9898 + y * 78.233 + this.seed) * 43758.5453
		return n - Math.floor(n)
	},

	noise3D(x, y, z) {
		const n = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + this.seed) * 43758.5453
		return n - Math.floor(n)
	},

	perlin2D(x, y, octaves = 4, persistence = 0.5) {
		let total = 0
		let frequency = 1
		let amplitude = 1
		let maxVal = 0
		for (let i = 0; i < octaves; i++) {
			const ix = Math.floor(x * frequency)
			const iy = Math.floor(y * frequency)
			const fx = x * frequency - ix
			const fy = y * frequency - iy
			const v00 = this.noise2D(ix, iy)
			const v10 = this.noise2D(ix + 1, iy)
			const v01 = this.noise2D(ix, iy + 1)
			const v11 = this.noise2D(ix + 1, iy + 1)
			const sx = fx * fx * (3 - 2 * fx)
			const sy = fy * fy * (3 - 2 * fy)
			const v0 = v00 + sx * (v10 - v00)
			const v1 = v01 + sx * (v11 - v01)
			total += (v0 + sy * (v1 - v0)) * amplitude
			maxVal += amplitude
			amplitude *= persistence
			frequency *= 2
		}
		return total / maxVal
	},

	perlin3D(x, y, z, octaves = 3, persistence = 0.5) {
		let total = 0
		let frequency = 1
		let amplitude = 1
		let maxVal = 0
		for (let i = 0; i < octaves; i++) {
			const ix = Math.floor(x * frequency)
			const iy = Math.floor(y * frequency)
			const iz = Math.floor(z * frequency)
			const fx = x * frequency - ix
			const fy = y * frequency - iy
			const fz = z * frequency - iz
			const v000 = this.noise3D(ix, iy, iz)
			const v100 = this.noise3D(ix + 1, iy, iz)
			const v010 = this.noise3D(ix, iy + 1, iz)
			const v110 = this.noise3D(ix + 1, iy + 1, iz)
			const v001 = this.noise3D(ix, iy, iz + 1)
			const v101 = this.noise3D(ix + 1, iy, iz + 1)
			const v011 = this.noise3D(ix, iy + 1, iz + 1)
			const v111 = this.noise3D(ix + 1, iy + 1, iz + 1)
			const sx = fx * fx * (3 - 2 * fx)
			const sy = fy * fy * (3 - 2 * fy)
			const sz = fz * fz * (3 - 2 * fz)
			const v00 = v000 + sx * (v100 - v000)
			const v10 = v010 + sx * (v110 - v010)
			const v01 = v001 + sx * (v101 - v001)
			const v11 = v011 + sx * (v111 - v011)
			const v0 = v00 + sy * (v10 - v00)
			const v1 = v01 + sy * (v11 - v01)
			total += (v0 + sz * (v1 - v0)) * amplitude
			maxVal += amplitude
			amplitude *= persistence
			frequency *= 2
		}
		return total / maxVal
	},

	generateCaveMap(startX, startY, width, height, zMin, zMax) {
		const caveMap = []
		for (let lx = 0; lx < width; lx++) {
			caveMap[lx] = []
			for (let ly = 0; ly < height; ly++) {
				caveMap[lx][ly] = []
				const wx = startX + lx
				const wy = startY + ly
				for (let z = zMin; z <= zMax; z++) {
					if (z >= 0) {
						caveMap[lx][ly][z - zMin] = { type: 'air', terrain: null }
						continue
					}
					const absZ = Math.abs(z)
					const density = this.calCaveDensity(wx, wy, z)
					const isLake = this.calLake(wx, wy, z)
					const isWaterVein = this.calWaterVein(wx, wy, z)
					if (z === zMin) {
						caveMap[lx][ly][z - zMin] = { type: 'solid', terrain: 'ter_bedrock' }
					} else if (isLake) {
						caveMap[lx][ly][z - zMin] = { type: 'liquid', terrain: 'ter_underground_lake' }
					} else if (isWaterVein) {
						caveMap[lx][ly][z - zMin] = { type: 'liquid', terrain: 'ter_underground_water' }
					} else if (density < 0.4) {
						caveMap[lx][ly][z - zMin] = { type: 'cave', terrain: 'ter_cave_floor' }
					} else {
						caveMap[lx][ly][z - zMin] = { type: 'solid', terrain: 'ter_cave_wall' }
					}
				}
			}
		}
		return caveMap
	},

	calCaveDensity(x, y, z) {
		const scale = 0.05
		const base = this.perlin3D(x * scale, y * scale, z * scale * 2, 4, 0.5)
		const depthFactor = Math.abs(z) / 20
		const caveChance = 0.3 + depthFactor * 0.2
		return base + (1 - caveChance) * 0.3
	},

	calLake(x, y, z) {
		if (z > -8 || z < -16) return false
		const scale = 0.02
		const noise = this.perlin2D(x * scale, y * scale, 3, 0.6)
		const zCenter = -12
		const zDist = Math.abs(z - zCenter) / 4
		return noise > 0.6 && zDist < 0.8
	},

	calWaterVein(x, y, z) {
		if (z >= 0) return false
		const scale = 0.08
		const noise = this.perlin3D(x * scale, y * scale, z * scale * 0.5, 2, 0.5)
		const veinNoise = this.perlin2D(x * 0.1, y * 0.1, 2, 0.5)
		return noise > 0.7 && veinNoise > 0.65
	},

	generateCaveEntrance(surfaceMap, zMin) {
		const entrances = []
		const scale = 0.03
		for (let x = 0; x < surfaceMap.length; x++) {
			for (let y = 0; y < surfaceMap[0].length; y++) {
				const noise = this.perlin2D(x * scale + this.seed * 0.001, y * scale, 2, 0.5)
				if (noise > 0.75) {
					entrances.push({ x, y, depth: Math.floor(-3 - noise * 5) })
				}
			}
		}
		return entrances
	},

	getMineralType(z) {
		const absZ = Math.abs(z)
		if (absZ >= 18) return 'ter_ore_diamond'
		if (absZ >= 14) return 'ter_ore_gold'
		if (absZ >= 10) return 'ter_ore_iron'
		if (absZ >= 6) return 'ter_ore_copper'
		return 'ter_ore_coal'
	},

	shouldSpawnMineral(x, y, z) {
		const scale = 0.15
		const noise = this.perlin3D(x * scale, y * scale, z * scale, 2, 0.5)
		const depthBonus = Math.abs(z) / 40
		return noise > 0.85 - depthBonus
	}
}

if (typeof module !== 'undefined') module.exports = CaveGenerator
