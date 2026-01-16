const VisibilitySystem = {
	playerX: 0,
	playerY: 0,
	playerZ: 0,
	viewRadius: 30,
	cameraAzimuth: 45,
	visibleTiles: new Set(),
	occludedTiles: new Set(),
	worldGen: null,

	init(worldGen) {
		this.worldGen = worldGen
		this.visibleTiles.clear()
		this.occludedTiles.clear()
	},

	updatePlayer(x, y, z, azimuth) {
		this.playerX = x
		this.playerY = y
		this.playerZ = z
		this.cameraAzimuth = azimuth
	},

	calVisibility(minX, maxX, minY, maxY, currentZ) {
		this.visibleTiles.clear()
		this.occludedTiles.clear()
		const px = Math.floor(this.playerX)
		const py = Math.floor(this.playerY)
		const pz = Math.floor(this.playerZ)
		for (let x = minX; x <= maxX; x++) {
			for (let y = minY; y <= maxY; y++) {
				const key = `${x},${y},${currentZ}`
				const dx = x - px
				const dy = y - py
				const dist = Math.sqrt(dx * dx + dy * dy)
				if (dist > this.viewRadius) {
					this.occludedTiles.add(key)
					continue
				}
				if (this.isBehindPlayer(x, y, px, py)) {
					this.occludedTiles.add(key)
					continue
				}
				if (this.hasLineOfSight(px, py, pz, x, y, currentZ)) {
					this.visibleTiles.add(key)
				} else {
					this.occludedTiles.add(key)
				}
			}
		}
	},

	isBehindPlayer(tx, ty, px, py) {
		const dx = tx - px
		const dy = ty - py
		const azRad = (this.cameraAzimuth - 180) * Math.PI / 180
		const camDirX = Math.cos(azRad)
		const camDirY = Math.sin(azRad)
		const dot = dx * camDirX + dy * camDirY
		return dot < -2
	},

	hasLineOfSight(x0, y0, z0, x1, y1, z1) {
		if (!this.worldGen) return true
		const dx = Math.abs(x1 - x0)
		const dy = Math.abs(y1 - y0)
		const sx = x0 < x1 ? 1 : -1
		const sy = y0 < y1 ? 1 : -1
		let err = dx - dy
		let cx = x0
		let cy = y0
		while (cx !== x1 || cy !== y1) {
			const e2 = 2 * err
			if (e2 > -dy) {
				err -= dy
				cx += sx
			}
			if (e2 < dx) {
				err += dx
				cy += sy
			}
			if (cx === x1 && cy === y1) break
			const tile = this.worldGen.getTile(cx, cy, z0)
			if (tile && tile.solid) return false
			if (tile && this.hasBlockingWall(tile, sx, sy)) return false
		}
		return true
	},

	hasBlockingWall(tile, dirX, dirY) {
		if (dirX > 0 && tile.wallE) return true
		if (dirX < 0 && tile.wallW) return true
		if (dirY > 0 && tile.wallN) return true
		if (dirY < 0 && tile.wallS) return true
		return false
	},

	isVisible(x, y, z) {
		const key = `${x},${y},${z}`
		return this.visibleTiles.has(key)
	},

	isOccluded(x, y, z) {
		const key = `${x},${y},${z}`
		return this.occludedTiles.has(key)
	},

	shouldHideCeiling(tileX, tileY, tileZ) {
		if (tileZ > this.playerZ) return true
		if (tileZ === Math.floor(this.playerZ)) {
			const tile = this.worldGen?.getTile(tileX, tileY, tileZ)
			if (tile && tile.ceiling) {
				const px = Math.floor(this.playerX)
				const py = Math.floor(this.playerY)
				const dist = Math.abs(tileX - px) + Math.abs(tileY - py)
				if (dist < 5) return true
			}
		}
		return false
	},

	shouldHideFloor(floorZ) {
		return floorZ > Math.floor(this.playerZ) + 1
	},

	getVisibilityState(x, y, z) {
		const key = `${x},${y},${z}`
		if (this.visibleTiles.has(key)) return 'visible'
		if (this.occludedTiles.has(key)) return 'occluded'
		return 'unknown'
	}
}

if (typeof module !== 'undefined') module.exports = VisibilitySystem
