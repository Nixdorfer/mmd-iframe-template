import type { BiomeType } from '@engine/common'

export interface RiverPoint {
	x: number
	y: number
	width: number
	depth: number
}

export interface RiverDef {
	id: string
	name: string
	points: RiverPoint[]
	isMain: boolean
	tributaries: string[]
}

export interface LakeDef {
	id: string
	cx: number
	cy: number
	radius: number
	depth: number
	isSource: boolean
}

export interface WaterMask {
	width: number
	height: number
	data: Uint8Array
}

export class RiverGenerator {
	seed: number
	rivers: Map<string, RiverDef>
	lakes: Map<string, LakeDef>
	nxtId: number

	constructor(seed: number) {
		this.seed = seed
		this.rivers = new Map()
		this.lakes = new Map()
		this.nxtId = 1
	}

	private rng(x: number, y: number): number {
		let h = x * 374761393 + y * 668265263 + this.seed
		h = (h ^ (h >> 13)) * 1274126177
		return ((h ^ (h >> 16)) & 0x7fffffff) / 0x7fffffff
	}

	private noise2D(x: number, y: number, scale: number): number {
		const ix = Math.floor(x * scale)
		const iy = Math.floor(y * scale)
		const fx = x * scale - ix
		const fy = y * scale - iy
		const v00 = this.rng(ix, iy)
		const v10 = this.rng(ix + 1, iy)
		const v01 = this.rng(ix, iy + 1)
		const v11 = this.rng(ix + 1, iy + 1)
		const sx = fx * fx * (3 - 2 * fx)
		const sy = fy * fy * (3 - 2 * fy)
		return (v00 * (1 - sx) + v10 * sx) * (1 - sy) + (v01 * (1 - sx) + v11 * sx) * sy
	}

	genRivers(
		getHeight: (x: number, y: number) => number,
		seaLevel: number,
		mapWidth: number,
		mapHeight: number,
		riverCount: number,
		meander: number = 0.5
	): void {
		const coastPoints: { x: number; y: number }[] = []
		for (let x = 0; x < mapWidth; x += 10) {
			for (let y = 0; y < mapHeight; y += 10) {
				const h = getHeight(x, y)
				if (h >= seaLevel && h < seaLevel + 5) {
					const neighbors = [
						getHeight(x - 10, y),
						getHeight(x + 10, y),
						getHeight(x, y - 10),
						getHeight(x, y + 10)
					]
					if (neighbors.some(n => n < seaLevel)) {
						coastPoints.push({ x, y })
					}
				}
			}
		}
		if (coastPoints.length === 0) return
		const usedStarts: { x: number; y: number }[] = []
		const minDist = Math.max(mapWidth, mapHeight) / (riverCount + 1)
		for (let i = 0; i < riverCount; i++) {
			let best: { x: number; y: number } | null = null
			let bestScore = -Infinity
			for (let t = 0; t < 50; t++) {
				const idx = Math.floor(this.rng(i * 100 + t, 0) * coastPoints.length)
				const c = coastPoints[idx]
				let minD = Infinity
				for (const u of usedStarts) {
					const d = Math.hypot(c.x - u.x, c.y - u.y)
					if (d < minD) minD = d
				}
				const score = minD + this.rng(i * 100 + t, 1) * 50
				if (score > bestScore && minD > minDist * 0.4) {
					bestScore = score
					best = c
				}
			}
			if (!best) continue
			usedStarts.push(best)
			const river = this.traceRiver(best, getHeight, seaLevel, mapWidth, mapHeight, meander, true)
			if (river.points.length > 10) {
				this.rivers.set(river.id, river)
			}
		}
	}

	private traceRiver(
		start: { x: number; y: number },
		getHeight: (x: number, y: number) => number,
		seaLevel: number,
		mapWidth: number,
		mapHeight: number,
		meander: number,
		isMain: boolean
	): RiverDef {
		const id = `river_${this.nxtId++}`
		const points: RiverPoint[] = [{
			x: start.x,
			y: start.y,
			width: 5 + this.rng(this.nxtId, 0) * 3,
			depth: 2
		}]
		let cx = start.x
		let cy = start.y
		let baseAngle = this.findUphillDir(cx, cy, getHeight, seaLevel, mapWidth, mapHeight)
		const maxSteps = 400
		for (let step = 0; step < maxSteps; step++) {
			const uphill = this.findUphillDir(cx, cy, getHeight, seaLevel, mapWidth, mapHeight)
			const noiseAng = this.noise2D(cx, cy, 0.02) * Math.PI * meander
			baseAngle = baseAngle * 0.6 + uphill * 0.3 + noiseAng * 0.1
			const stepSize = 3 + this.rng(step + this.nxtId * 100, 2) * 2
			const nx = cx + Math.cos(baseAngle) * stepSize
			const ny = cy + Math.sin(baseAngle) * stepSize
			if (nx < 10 || nx > mapWidth - 10 || ny < 10 || ny > mapHeight - 10) break
			const h = getHeight(nx, ny)
			if (h < seaLevel) break
			if (h > seaLevel + 40) {
				const lake = this.createLake(cx, cy, points.length > 20)
				if (lake) this.lakes.set(lake.id, lake)
				break
			}
			cx = nx
			cy = ny
			const progress = step / maxSteps
			points.push({
				x: cx,
				y: cy,
				width: Math.max(1.5, (5 + this.rng(step, 3) * 2) * (1 - progress * 0.7)),
				depth: Math.max(0.5, 2 * (1 - progress * 0.5))
			})
			if (h > seaLevel + 30 && this.rng(step, 4) < 0.25) {
				const lake = this.createLake(cx, cy, points.length > 15)
				if (lake) this.lakes.set(lake.id, lake)
				break
			}
		}
		return { id, name: `河流${this.nxtId}`, points, isMain, tributaries: [] }
	}

	private findUphillDir(
		x: number,
		y: number,
		getHeight: (x: number, y: number) => number,
		seaLevel: number,
		mapWidth: number,
		mapHeight: number
	): number {
		let bestAng = 0
		let bestH = -Infinity
		for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
			const tx = x + Math.cos(a) * 12
			const ty = y + Math.sin(a) * 12
			if (tx < 0 || tx >= mapWidth || ty < 0 || ty >= mapHeight) continue
			const h = getHeight(tx, ty)
			if (h > bestH && h >= seaLevel) {
				bestH = h
				bestAng = a
			}
		}
		return bestAng
	}

	private createLake(cx: number, cy: number, isSource: boolean): LakeDef | null {
		const radius = 10 + this.rng(cx, cy) * 20
		const id = `lake_${this.nxtId++}`
		return {
			id,
			cx,
			cy,
			radius,
			depth: 3 + this.rng(cx + 1, cy) * 5,
			isSource
		}
	}

	genTributaries(
		mainRiverId: string,
		getHeight: (x: number, y: number) => number,
		seaLevel: number,
		mapWidth: number,
		mapHeight: number,
		density: number,
		meander: number
	): void {
		const mainRiver = this.rivers.get(mainRiverId)
		if (!mainRiver) return
		const pts = mainRiver.points
		const interval = Math.floor(25 / (density + 0.1))
		for (let i = interval; i < pts.length - 15; i += interval) {
			if (this.rng(i + this.nxtId * 1000, 0) > density * 1.2) continue
			const pt = pts[i]
			const prev = pts[Math.max(0, i - 5)]
			const mainAng = Math.atan2(pt.y - prev.y, pt.x - prev.x)
			const side = this.rng(i, 1) > 0.5 ? 1 : -1
			const branchAng = mainAng + side * (Math.PI / 3 + this.rng(i, 2) * Math.PI / 4)
			const trib = this.traceTributary(pt, branchAng, getHeight, seaLevel, mapWidth, mapHeight, meander, pt.width * 0.5)
			if (trib.points.length > 8) {
				this.rivers.set(trib.id, trib)
				mainRiver.tributaries.push(trib.id)
			}
		}
	}

	private traceTributary(
		start: RiverPoint,
		angle: number,
		getHeight: (x: number, y: number) => number,
		seaLevel: number,
		mapWidth: number,
		mapHeight: number,
		meander: number,
		startWidth: number
	): RiverDef {
		const id = `trib_${this.nxtId++}`
		const points: RiverPoint[] = [{ x: start.x, y: start.y, width: startWidth, depth: 1 }]
		let cx = start.x
		let cy = start.y
		let baseAng = angle
		const maxSteps = 120
		for (let step = 0; step < maxSteps; step++) {
			const uphill = this.findUphillDir(cx, cy, getHeight, seaLevel, mapWidth, mapHeight)
			const noiseAng = this.noise2D(cx + 50, cy + 50, 0.03) * Math.PI * meander * 0.7
			baseAng = baseAng * 0.45 + uphill * 0.4 + noiseAng * 0.15
			const stepSize = 2.5 + this.rng(step + this.nxtId * 200, 0) * 1.5
			const nx = cx + Math.cos(baseAng) * stepSize
			const ny = cy + Math.sin(baseAng) * stepSize
			if (nx < 10 || nx > mapWidth - 10 || ny < 10 || ny > mapHeight - 10) break
			const h = getHeight(nx, ny)
			if (h < seaLevel || h > seaLevel + 35) break
			cx = nx
			cy = ny
			points.push({
				x: cx,
				y: cy,
				width: Math.max(0.8, startWidth * (1 - step / maxSteps * 0.8)),
				depth: Math.max(0.3, 1 * (1 - step / maxSteps * 0.6))
			})
		}
		return { id, name: `支流${this.nxtId}`, points, isMain: false, tributaries: [] }
	}

	createWaterMask(mapWidth: number, mapHeight: number): WaterMask {
		const data = new Uint8Array(mapWidth * mapHeight)
		for (const river of this.rivers.values()) {
			for (const pt of river.points) {
				const w = Math.ceil(pt.width / 2) + 1
				for (let dy = -w; dy <= w; dy++) {
					for (let dx = -w; dx <= w; dx++) {
						const px = Math.floor(pt.x + dx)
						const py = Math.floor(pt.y + dy)
						if (px < 0 || px >= mapWidth || py < 0 || py >= mapHeight) continue
						if (Math.hypot(dx, dy) <= pt.width / 2 + 0.5) {
							data[py * mapWidth + px] = 1
						}
					}
				}
			}
		}
		for (const lake of this.lakes.values()) {
			for (let dy = -lake.radius; dy <= lake.radius; dy++) {
				for (let dx = -lake.radius; dx <= lake.radius; dx++) {
					const dist = Math.hypot(dx, dy)
					if (dist > lake.radius) continue
					const px = Math.floor(lake.cx + dx)
					const py = Math.floor(lake.cy + dy)
					if (px < 0 || px >= mapWidth || py < 0 || py >= mapHeight) continue
					data[py * mapWidth + px] = 2
				}
			}
		}
		return { width: mapWidth, height: mapHeight, data }
	}

	getRiver(id: string): RiverDef | undefined {
		return this.rivers.get(id)
	}

	getLake(id: string): LakeDef | undefined {
		return this.lakes.get(id)
	}

	getAllRivers(): RiverDef[] {
		return Array.from(this.rivers.values())
	}

	getAllLakes(): LakeDef[] {
		return Array.from(this.lakes.values())
	}

	distToWater(x: number, y: number): number {
		let minDist = Infinity
		for (const river of this.rivers.values()) {
			for (const pt of river.points) {
				const d = Math.hypot(x - pt.x, y - pt.y)
				if (d < minDist) minDist = d
			}
		}
		for (const lake of this.lakes.values()) {
			const d = Math.hypot(x - lake.cx, y - lake.cy) - lake.radius
			if (d < minDist) minDist = d
		}
		return Math.max(0, minDist)
	}
}
