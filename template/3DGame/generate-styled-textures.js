const { createCanvas } = require('canvas')
const fs = require('fs')
const path = require('path')
const TILE_SIZE = 64
function hashString(str) {
	let hash = 0
	for (let i = 0; i < str.length; i++) {
		hash = ((hash << 5) - hash) + str.charCodeAt(i)
		hash = hash & hash
	}
	return Math.abs(hash)
}
function seededRandom(seed) {
	const x = Math.sin(seed) * 10000
	return x - Math.floor(x)
}
function noise2D(x, y, seed = 0) {
	const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453
	return n - Math.floor(n)
}
function smoothNoise(x, y, scale, seed = 0) {
	const sx = x / scale
	const sy = y / scale
	const x0 = Math.floor(sx)
	const y0 = Math.floor(sy)
	const fx = sx - x0
	const fy = sy - y0
	const v00 = noise2D(x0, y0, seed)
	const v10 = noise2D(x0 + 1, y0, seed)
	const v01 = noise2D(x0, y0 + 1, seed)
	const v11 = noise2D(x0 + 1, y0 + 1, seed)
	const i1 = v00 + (v10 - v00) * fx
	const i2 = v01 + (v11 - v01) * fx
	return i1 + (i2 - i1) * fy
}
function hexToRgb(hex) {
	const r = parseInt(hex.slice(1, 3), 16)
	const g = parseInt(hex.slice(3, 5), 16)
	const b = parseInt(hex.slice(5, 7), 16)
	return { r, g, b }
}
function rgbToHex(r, g, b) {
	const clamp = v => Math.max(0, Math.min(255, Math.round(v)))
	return '#' + [r, g, b].map(v => clamp(v).toString(16).padStart(2, '0')).join('')
}
function mixColors(c1, c2, t) {
	return { r: c1.r + (c2.r - c1.r) * t, g: c1.g + (c2.g - c1.g) * t, b: c1.b + (c2.b - c1.b) * t }
}
function mixColorHex(c1, c2, t) {
	const rgb1 = hexToRgb(c1)
	const rgb2 = hexToRgb(c2)
	const mixed = mixColors(rgb1, rgb2, t)
	return rgbToHex(mixed.r, mixed.g, mixed.b)
}
function clamp(v, min = 0, max = 255) {
	return Math.max(min, Math.min(max, Math.round(v)))
}
function createTileCanvas() {
	return createCanvas(TILE_SIZE, TILE_SIZE)
}
function fillTileBase(ctx, color) {
	ctx.fillStyle = color
	ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE)
}
function saveCanvas(canvas, filePath) {
	const dir = path.dirname(filePath)
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
	fs.writeFileSync(filePath, canvas.toBuffer('image/png'))
}
function addNoise(ctx, seed, intensity = 20) {
	const imgData = ctx.getImageData(0, 0, TILE_SIZE, TILE_SIZE)
	for (let i = 0; i < imgData.data.length; i += 4) {
		const px = (i / 4) % TILE_SIZE
		const py = Math.floor(i / 4 / TILE_SIZE)
		const n = (noise2D(px, py, seed) - 0.5) * intensity
		imgData.data[i] = clamp(imgData.data[i] + n)
		imgData.data[i + 1] = clamp(imgData.data[i + 1] + n)
		imgData.data[i + 2] = clamp(imgData.data[i + 2] + n)
	}
	ctx.putImageData(imgData, 0, 0)
}
function drawGrid(ctx, color, spacing, lineWidth = 1) {
	ctx.strokeStyle = color
	ctx.lineWidth = lineWidth
	for (let i = 0; i <= TILE_SIZE; i += spacing) {
		ctx.beginPath()
		ctx.moveTo(i, 0)
		ctx.lineTo(i, TILE_SIZE)
		ctx.stroke()
		ctx.beginPath()
		ctx.moveTo(0, i)
		ctx.lineTo(TILE_SIZE, i)
		ctx.stroke()
	}
}
function drawBricks(ctx, baseColor, groutColor, brickW, brickH, seed) {
	fillTileBase(ctx, groutColor)
	for (let row = 0; row < Math.ceil(TILE_SIZE / brickH); row++) {
		const offset = (row % 2) * (brickW / 2)
		for (let col = -1; col < Math.ceil(TILE_SIZE / brickW) + 1; col++) {
			const shade = 0.85 + seededRandom(seed + row * 100 + col) * 0.3
			const rgb = hexToRgb(baseColor)
			ctx.fillStyle = rgbToHex(rgb.r * shade, rgb.g * shade, rgb.b * shade)
			ctx.fillRect(col * brickW + offset + 1, row * brickH + 1, brickW - 2, brickH - 2)
		}
	}
}
function drawPlanks(ctx, baseColor, plankH, seed) {
	for (let row = 0; row < Math.ceil(TILE_SIZE / plankH); row++) {
		const shade = 0.8 + seededRandom(seed + row * 7) * 0.4
		const rgb = hexToRgb(baseColor)
		ctx.fillStyle = rgbToHex(rgb.r * shade, rgb.g * shade, rgb.b * shade)
		ctx.fillRect(0, row * plankH, TILE_SIZE, plankH - 1)
		ctx.strokeStyle = mixColorHex(baseColor, '#000000', 0.3)
		ctx.lineWidth = 0.5
		for (let k = 0; k < 3; k++) {
			const lx = seededRandom(seed + row * 11 + k * 13) * TILE_SIZE
			ctx.beginPath()
			ctx.moveTo(lx, row * plankH)
			ctx.lineTo(lx + (seededRandom(seed + row * 17 + k) - 0.5) * 4, row * plankH + plankH - 1)
			ctx.stroke()
		}
	}
}
function drawTiles(ctx, baseColor, groutColor, tileSize, seed) {
	fillTileBase(ctx, groutColor)
	const count = Math.ceil(TILE_SIZE / tileSize)
	for (let row = 0; row < count; row++) {
		for (let col = 0; col < count; col++) {
			const shade = 0.9 + seededRandom(seed + row * 10 + col) * 0.2
			const rgb = hexToRgb(baseColor)
			ctx.fillStyle = rgbToHex(rgb.r * shade, rgb.g * shade, rgb.b * shade)
			ctx.fillRect(col * tileSize + 1, row * tileSize + 1, tileSize - 2, tileSize - 2)
		}
	}
}
function drawStones(ctx, baseColor, count, seed) {
	fillTileBase(ctx, mixColorHex(baseColor, '#000000', 0.2))
	for (let i = 0; i < count; i++) {
		const x = seededRandom(seed + i * 7) * (TILE_SIZE - 12)
		const y = seededRandom(seed + i * 11) * (TILE_SIZE - 10)
		const w = 6 + seededRandom(seed + i * 13) * 10
		const h = 4 + seededRandom(seed + i * 17) * 8
		const shade = 0.7 + seededRandom(seed + i * 19) * 0.5
		const rgb = hexToRgb(baseColor)
		ctx.fillStyle = rgbToHex(rgb.r * shade, rgb.g * shade, rgb.b * shade)
		ctx.beginPath()
		ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2)
		ctx.fill()
	}
}
function drawCircuit(ctx, baseColor, lineColor, seed) {
	fillTileBase(ctx, baseColor)
	ctx.strokeStyle = lineColor
	ctx.lineWidth = 1
	for (let i = 0; i < 10; i++) {
		const sx = seededRandom(seed + i * 11) * TILE_SIZE
		const sy = seededRandom(seed + i * 13) * TILE_SIZE
		ctx.beginPath()
		ctx.moveTo(sx, sy)
		let cx = sx, cy = sy
		for (let j = 0; j < 4; j++) {
			const dir = Math.floor(seededRandom(seed + i * 17 + j * 3) * 4)
			const len = 5 + seededRandom(seed + i * 19 + j * 5) * 12
			if (dir === 0) cx += len
			else if (dir === 1) cx -= len
			else if (dir === 2) cy += len
			else cy -= len
			ctx.lineTo(cx, cy)
		}
		ctx.stroke()
		ctx.fillStyle = lineColor
		ctx.fillRect(cx - 1, cy - 1, 3, 3)
	}
}
function drawGear(ctx, x, y, radius, teeth, color) {
	ctx.fillStyle = color
	ctx.beginPath()
	const toothDepth = radius * 0.2
	const toothWidth = Math.PI / teeth
	for (let i = 0; i < teeth; i++) {
		const a1 = (i / teeth) * Math.PI * 2
		const a2 = a1 + toothWidth * 0.5
		const a3 = a1 + toothWidth
		const a4 = a1 + toothWidth * 1.5
		ctx.lineTo(x + Math.cos(a1) * radius, y + Math.sin(a1) * radius)
		ctx.lineTo(x + Math.cos(a2) * (radius + toothDepth), y + Math.sin(a2) * (radius + toothDepth))
		ctx.lineTo(x + Math.cos(a3) * (radius + toothDepth), y + Math.sin(a3) * (radius + toothDepth))
		ctx.lineTo(x + Math.cos(a4) * radius, y + Math.sin(a4) * radius)
	}
	ctx.closePath()
	ctx.fill()
	ctx.fillStyle = mixColorHex(color, '#000000', 0.4)
	ctx.beginPath()
	ctx.arc(x, y, radius * 0.25, 0, Math.PI * 2)
	ctx.fill()
}
function drawRivet(ctx, x, y, r, color) {
	ctx.fillStyle = color
	ctx.beginPath()
	ctx.arc(x, y, r, 0, Math.PI * 2)
	ctx.fill()
	ctx.fillStyle = 'rgba(255,255,255,0.3)'
	ctx.beginPath()
	ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.3, 0, Math.PI * 2)
	ctx.fill()
}
function drawMetalPlate(ctx, baseColor, lineColor, rows, cols, seed) {
	fillTileBase(ctx, baseColor)
	addNoise(ctx, seed, 15)
	const cellW = TILE_SIZE / cols
	const cellH = TILE_SIZE / rows
	ctx.strokeStyle = lineColor
	ctx.lineWidth = 1
	for (let r = 0; r <= rows; r++) {
		ctx.beginPath()
		ctx.moveTo(0, r * cellH)
		ctx.lineTo(TILE_SIZE, r * cellH)
		ctx.stroke()
	}
	for (let c = 0; c <= cols; c++) {
		ctx.beginPath()
		ctx.moveTo(c * cellW, 0)
		ctx.lineTo(c * cellW, TILE_SIZE)
		ctx.stroke()
	}
	const rivetColor = mixColorHex(baseColor, '#ffffff', 0.3)
	for (let r = 0; r < rows; r++) {
		for (let c = 0; c < cols; c++) {
			drawRivet(ctx, c * cellW + 4, r * cellH + 4, 2, rivetColor)
			drawRivet(ctx, (c + 1) * cellW - 4, (r + 1) * cellH - 4, 2, rivetColor)
		}
	}
}
function drawNeonLines(ctx, baseColor, neonColor, seed, horizontal = true) {
	fillTileBase(ctx, baseColor)
	ctx.shadowColor = neonColor
	ctx.shadowBlur = 6
	ctx.fillStyle = neonColor
	const count = 2 + Math.floor(seededRandom(seed) * 3)
	const spacing = TILE_SIZE / (count + 1)
	for (let i = 1; i <= count; i++) {
		const pos = i * spacing + (seededRandom(seed + i) - 0.5) * 4
		if (horizontal) {
			ctx.fillRect(0, pos - 1, TILE_SIZE, 2)
		} else {
			ctx.fillRect(pos - 1, 0, 2, TILE_SIZE)
		}
	}
	ctx.shadowBlur = 0
}
function drawHexPattern(ctx, baseColor, lineColor, hexSize, seed) {
	fillTileBase(ctx, baseColor)
	ctx.strokeStyle = lineColor
	ctx.lineWidth = 1
	const h = hexSize * Math.sqrt(3)
	for (let row = -1; row < TILE_SIZE / h + 1; row++) {
		for (let col = -1; col < TILE_SIZE / (hexSize * 1.5) + 1; col++) {
			const cx = col * hexSize * 1.5
			const cy = row * h + (col % 2) * (h / 2)
			ctx.beginPath()
			for (let i = 0; i < 6; i++) {
				const angle = (i * 60 - 30) * Math.PI / 180
				const px = cx + hexSize * Math.cos(angle)
				const py = cy + hexSize * Math.sin(angle)
				if (i === 0) ctx.moveTo(px, py)
				else ctx.lineTo(px, py)
			}
			ctx.closePath()
			ctx.stroke()
		}
	}
}
function drawWaves(ctx, baseColor, waveColor, seed) {
	fillTileBase(ctx, baseColor)
	ctx.strokeStyle = waveColor
	ctx.lineWidth = 1.5
	const waveCount = 3 + Math.floor(seededRandom(seed) * 3)
	for (let w = 0; w < waveCount; w++) {
		const yBase = (w + 1) * TILE_SIZE / (waveCount + 1)
		ctx.beginPath()
		for (let x = 0; x <= TILE_SIZE; x += 2) {
			const y = yBase + Math.sin((x + seededRandom(seed + w) * 20) * 0.2) * 4
			if (x === 0) ctx.moveTo(x, y)
			else ctx.lineTo(x, y)
		}
		ctx.stroke()
	}
}
function drawDots(ctx, baseColor, dotColor, count, seed) {
	fillTileBase(ctx, baseColor)
	ctx.fillStyle = dotColor
	for (let i = 0; i < count; i++) {
		const x = seededRandom(seed + i * 3) * TILE_SIZE
		const y = seededRandom(seed + i * 5) * TILE_SIZE
		const r = 1 + seededRandom(seed + i * 7) * 2
		ctx.beginPath()
		ctx.arc(x, y, r, 0, Math.PI * 2)
		ctx.fill()
	}
}
function drawCracks(ctx, baseColor, crackColor, count, seed) {
	fillTileBase(ctx, baseColor)
	addNoise(ctx, seed, 10)
	ctx.strokeStyle = crackColor
	ctx.lineWidth = 0.5
	for (let i = 0; i < count; i++) {
		const sx = seededRandom(seed + i * 11) * TILE_SIZE
		const sy = seededRandom(seed + i * 13) * TILE_SIZE
		ctx.beginPath()
		ctx.moveTo(sx, sy)
		let cx = sx, cy = sy
		for (let j = 0; j < 4; j++) {
			cx += (seededRandom(seed + i * 17 + j) - 0.5) * 15
			cy += seededRandom(seed + i * 19 + j) * 10
			ctx.lineTo(cx, cy)
		}
		ctx.stroke()
	}
}
function drawStripes(ctx, color1, color2, stripeW, angle, seed) {
	fillTileBase(ctx, color1)
	ctx.fillStyle = color2
	ctx.save()
	ctx.translate(TILE_SIZE / 2, TILE_SIZE / 2)
	ctx.rotate(angle * Math.PI / 180)
	ctx.translate(-TILE_SIZE, -TILE_SIZE)
	for (let i = 0; i < TILE_SIZE * 3; i += stripeW * 2) {
		ctx.fillRect(i, -TILE_SIZE, stripeW, TILE_SIZE * 4)
	}
	ctx.restore()
}
function drawCheckerboard(ctx, color1, color2, size) {
	const count = TILE_SIZE / size
	for (let r = 0; r < count; r++) {
		for (let c = 0; c < count; c++) {
			ctx.fillStyle = (r + c) % 2 === 0 ? color1 : color2
			ctx.fillRect(c * size, r * size, size, size)
		}
	}
}
function drawCloud(ctx, x, y, scale, color) {
	ctx.fillStyle = color
	ctx.beginPath()
	ctx.arc(x, y, scale * 0.5, 0, Math.PI * 2)
	ctx.arc(x + scale * 0.4, y - scale * 0.2, scale * 0.4, 0, Math.PI * 2)
	ctx.arc(x + scale * 0.8, y, scale * 0.5, 0, Math.PI * 2)
	ctx.fill()
}
function drawStar(ctx, x, y, r, color) {
	ctx.fillStyle = color
	ctx.beginPath()
	for (let i = 0; i < 5; i++) {
		const angle = (i * 144 - 90) * Math.PI / 180
		const px = x + Math.cos(angle) * r
		const py = y + Math.sin(angle) * r
		if (i === 0) ctx.moveTo(px, py)
		else ctx.lineTo(px, py)
	}
	ctx.closePath()
	ctx.fill()
}
const naturalGrounds = [
	{ id: 'dirt', base: '#8b7355' }, { id: 'sand', base: '#dcc8a0' }, { id: 'mud', base: '#5a4a3a' },
	{ id: 'clay', base: '#a0785a' }, { id: 'red-soil', base: '#b84a30' }, { id: 'black-soil', base: '#2a2520' },
	{ id: 'swamp', base: '#3a4a30' }, { id: 'swamp-water', base: '#4a5a40' }, { id: 'shallow-water', base: '#6a9ab0' },
	{ id: 'deep-water', base: '#1a4a6a' }, { id: 'void', base: '#0a0a0a' }
]
const transitionPairs = [
	['dirt', 'sand'], ['dirt', 'mud'], ['dirt', 'clay'], ['dirt', 'red-soil'], ['dirt', 'black-soil'],
	['sand', 'shallow-water'], ['sand', 'clay'], ['mud', 'swamp'], ['mud', 'swamp-water'],
	['swamp', 'swamp-water'], ['swamp-water', 'shallow-water'], ['shallow-water', 'deep-water']
]
const directions = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']
function genNatural(id, seed) {
	const canvas = createTileCanvas()
	const ctx = canvas.getContext('2d')
	const ground = naturalGrounds.find(g => g.id === id)
	if (!ground) return canvas
	const base = hexToRgb(ground.base)
	fillTileBase(ctx, ground.base)
	if (id === 'void') {
		for (let i = 0; i < 30; i++) {
			const px = seededRandom(seed + i * 3) * TILE_SIZE
			const py = seededRandom(seed + i * 5) * TILE_SIZE
			const b = 40 + seededRandom(seed + i * 7) * 60
			ctx.fillStyle = `rgba(${b},${b},${b + 20},0.5)`
			ctx.fillRect(px, py, 1, 1)
		}
		return canvas
	}
	const imgData = ctx.getImageData(0, 0, TILE_SIZE, TILE_SIZE)
	for (let y = 0; y < TILE_SIZE; y++) {
		for (let x = 0; x < TILE_SIZE; x++) {
			const idx = (y * TILE_SIZE + x) * 4
			let n = smoothNoise(x, y, 8, seed) * 30 - 15
			if (id.includes('water')) {
				n += Math.sin((x + y) * 0.3) * 5
			}
			imgData.data[idx] = clamp(base.r + n)
			imgData.data[idx + 1] = clamp(base.g + n * 0.9)
			imgData.data[idx + 2] = clamp(base.b + n * 0.8)
		}
	}
	ctx.putImageData(imgData, 0, 0)
	if (id === 'dirt' || id === 'clay' || id.includes('soil')) {
		for (let i = 0; i < 30; i++) {
			const px = seededRandom(seed + i * 3.1) * TILE_SIZE
			const py = seededRandom(seed + i * 4.3) * TILE_SIZE
			ctx.fillStyle = `rgba(${base.r * 0.6},${base.g * 0.6},${base.b * 0.6},0.4)`
			ctx.fillRect(px, py, 1 + seededRandom(seed + i) * 2, 1)
		}
	}
	if (id === 'swamp') {
		for (let i = 0; i < 8; i++) {
			const px = seededRandom(seed + i * 8) * TILE_SIZE
			const py = seededRandom(seed + i * 9) * TILE_SIZE
			ctx.strokeStyle = 'rgba(50,70,40,0.5)'
			ctx.lineWidth = 1
			ctx.beginPath()
			ctx.moveTo(px, py)
			ctx.lineTo(px + (seededRandom(seed + i * 3) - 0.5) * 6, py - 5)
			ctx.stroke()
		}
	}
	return canvas
}
function genTransition(fromId, toId, direction) {
	const canvas = createTileCanvas()
	const ctx = canvas.getContext('2d')
	const fromCanvas = genNatural(fromId, hashString(fromId))
	const toCanvas = genNatural(toId, hashString(toId))
	const fromData = fromCanvas.getContext('2d').getImageData(0, 0, TILE_SIZE, TILE_SIZE)
	const toData = toCanvas.getContext('2d').getImageData(0, 0, TILE_SIZE, TILE_SIZE)
	const outData = ctx.createImageData(TILE_SIZE, TILE_SIZE)
	for (let y = 0; y < TILE_SIZE; y++) {
		for (let x = 0; x < TILE_SIZE; x++) {
			const idx = (y * TILE_SIZE + x) * 4
			let t = 0
			const nx = x / TILE_SIZE, ny = y / TILE_SIZE
			const noiseOffset = (smoothNoise(x, y, 8, 500) - 0.5) * 0.25
			switch (direction) {
				case 'n': t = ny + noiseOffset; break
				case 's': t = 1 - ny + noiseOffset; break
				case 'e': t = 1 - nx + noiseOffset; break
				case 'w': t = nx + noiseOffset; break
				case 'ne': t = (ny + (1 - nx)) / 2 + noiseOffset; break
				case 'nw': t = (ny + nx) / 2 + noiseOffset; break
				case 'se': t = ((1 - ny) + (1 - nx)) / 2 + noiseOffset; break
				case 'sw': t = ((1 - ny) + nx) / 2 + noiseOffset; break
			}
			t = Math.max(0, Math.min(1, t))
			outData.data[idx] = fromData.data[idx] * (1 - t) + toData.data[idx] * t
			outData.data[idx + 1] = fromData.data[idx + 1] * (1 - t) + toData.data[idx + 1] * t
			outData.data[idx + 2] = fromData.data[idx + 2] * (1 - t) + toData.data[idx + 2] * t
			outData.data[idx + 3] = 255
		}
	}
	ctx.putImageData(outData, 0, 0)
	return canvas
}
const styles = {
	cyberpunk: {
		colors: ['#ff00ff', '#00ffff', '#00ff00', '#ff6600', '#1a0a2e', '#0a0a0a', '#2a1a3e', '#1a2a3a'],
		outdoorGround: ['neon-sidewalk', 'led-tile-pink', 'led-tile-blue', 'metal-grate', 'circuit-ground', 'hologram-floor', 'glass-panel', 'carbon-fiber', 'plasma-grid', 'neon-crosswalk', 'tech-concrete', 'data-stream', 'wire-mesh', 'anti-grav-pad', 'cyber-asphalt', 'laser-grid'],
		indoorFloor: ['led-floor-rgb', 'hologram-base', 'metal-grid', 'glass-floor', 'neon-carpet', 'circuit-tile', 'plasma-floor', 'fiber-optic', 'tech-wood', 'cyber-marble', 'matrix-floor', 'vr-platform', 'data-tile', 'glow-panel', 'scanner-floor', 'holo-deck'],
		outdoorWall: ['neon-ad-wall', 'metal-panel', 'circuit-wall', 'led-billboard', 'glass-curtain', 'carbon-wall', 'hologram-display', 'cyber-brick', 'plasma-panel', 'tech-concrete-wall', 'wire-wall', 'data-wall', 'glow-strip-wall', 'scanner-wall', 'neon-sign-wall', 'cyber-steel'],
		indoorWall: ['holo-screen', 'led-panel', 'metal-partition', 'glass-wall', 'neon-wallpaper', 'circuit-panel', 'plasma-wall', 'fiber-wall', 'tech-paint', 'cyber-tile', 'matrix-wall', 'vr-wall', 'data-display', 'glow-wall', 'scanner-panel', 'holo-wall']
	},
	modern: {
		colors: ['#f5f5f5', '#808080', '#e8dcc8', '#2a2a2a', '#c0c0c0', '#9a9a9a', '#d4c4a8', '#6a6a6a'],
		outdoorGround: ['concrete-smooth', 'asphalt-new', 'marble-plaza', 'granite-pave', 'brick-modern', 'rubber-track', 'glass-walk', 'metal-deck', 'stone-tile', 'wood-deck', 'ceramic-outdoor', 'resin-floor', 'terrazzo-outdoor', 'slate-pave', 'limestone-pave', 'sandstone-pave'],
		indoorFloor: ['hardwood-oak', 'hardwood-walnut', 'tile-white', 'tile-gray', 'marble-floor', 'concrete-polish', 'carpet-gray', 'carpet-beige', 'vinyl-plank', 'epoxy-floor', 'terrazzo', 'bamboo-floor', 'cork-floor', 'rubber-floor', 'laminate-oak', 'laminate-gray'],
		outdoorWall: ['glass-curtain', 'concrete-raw', 'metal-cladding', 'stone-veneer', 'brick-white', 'wood-slat', 'composite-panel', 'stucco-smooth', 'ceramic-tile', 'granite-wall', 'limestone-wall', 'aluminum-panel', 'zinc-panel', 'fiber-cement', 'porcelain-tile', 'render-smooth'],
		indoorWall: ['paint-white', 'paint-gray', 'wallpaper-plain', 'wood-panel', 'glass-partition', 'concrete-wall', 'tile-wall', 'stone-accent', 'fabric-wall', 'metal-mesh', 'acoustic-panel', 'plaster-smooth', 'veneer-wall', 'leather-wall', 'mirror-wall', 'cork-wall']
	},
	medieval: {
		colors: ['#8a8a7a', '#6b4423', '#4a4a4a', '#8b4513', '#d4c4a8', '#5a6a4a', '#7a6a5a', '#3a3a3a'],
		outdoorGround: ['cobblestone', 'dirt-path', 'gravel-road', 'castle-stone', 'flagstone', 'muddy-road', 'wooden-bridge', 'hay-ground', 'market-stone', 'well-stone', 'moss-stone', 'broken-stone', 'sand-path', 'rocky-ground', 'farm-dirt', 'village-path'],
		indoorFloor: ['wood-plank-rough', 'stone-slab', 'hay-floor', 'dirt-floor', 'fur-rug', 'woven-mat', 'castle-tile', 'brick-floor', 'slate-floor', 'marble-rough', 'terracotta', 'mosaic-old', 'flagstone-indoor', 'reed-floor', 'leather-floor', 'tapestry-floor'],
		outdoorWall: ['castle-stone-wall', 'rough-brick', 'timber-frame', 'wattle-daub', 'mud-wall', 'wooden-palisade', 'ivy-stone', 'moss-brick', 'tower-stone', 'fortress-wall', 'village-plaster', 'barn-wood', 'stable-stone', 'church-stone', 'manor-brick', 'dungeon-stone'],
		indoorWall: ['stone-interior', 'wood-panel-old', 'plaster-rough', 'tapestry-wall', 'brick-interior', 'timber-wall', 'lime-wash', 'clay-wall', 'torch-holder-wall', 'banner-wall', 'shelf-wall', 'window-stone', 'fireplace-stone', 'cellar-stone', 'chapel-wall', 'throne-wall']
	},
	chinese: {
		colors: ['#c53d43', '#1a3c2a', '#c9a857', '#f0ede5', '#5a2a1a', '#4a7a8a', '#8a6a5a', '#2a4a3a'],
		outdoorGround: ['bluestone-slab', 'pebble-path', 'bamboo-deck', 'cloud-stone', 'jade-tile', 'lotus-pond-edge', 'temple-stone', 'garden-brick', 'moongate-floor', 'pavilion-stone', 'courtyard-tile', 'bridge-stone', 'spirit-path', 'dragon-tile', 'phoenix-tile', 'immortal-stone'],
		indoorFloor: ['redwood-floor', 'qingzhuan-tile', 'embroidered-carpet', 'white-jade', 'sandalwood-floor', 'lotus-carpet', 'cloud-carpet', 'bamboo-mat', 'tatami', 'lacquer-floor', 'gold-inlay-floor', 'pearl-floor', 'silk-carpet', 'temple-floor', 'palace-tile', 'meditation-mat'],
		outdoorWall: ['whitewash-wall', 'red-wall', 'glazed-tile', 'bamboo-wall', 'temple-brick', 'dragon-relief', 'phoenix-wall', 'cloud-pattern-wall', 'garden-screen', 'moon-window-wall', 'lattice-wall', 'pagoda-wall', 'spirit-wall', 'immortal-mural', 'jade-wall', 'gold-trim-wall'],
		indoorWall: ['ink-screen', 'red-lacquer', 'calligraphy-wall', 'silk-wall', 'bamboo-panel', 'cloud-mural', 'dragon-panel', 'phoenix-screen', 'jade-inlay', 'gold-leaf-wall', 'pearl-panel', 'lotus-mural', 'mountain-mural', 'waterfall-mural', 'temple-mural', 'palace-panel']
	},
	industrial: {
		colors: ['#7a4a2a', '#8b3a3a', '#5a5a5a', '#b5a642', '#3a3a3a', '#6a6a6a', '#4a3a2a', '#8a7a6a'],
		outdoorGround: ['brick-road', 'rail-sleeper', 'cinder-path', 'iron-plate', 'cobble-soot', 'factory-concrete', 'coal-yard', 'dock-wood', 'warehouse-stone', 'canal-edge', 'chimney-base', 'foundry-floor', 'mill-stone', 'mine-entrance', 'steam-vent-floor', 'gaslight-base'],
		indoorFloor: ['cast-iron-floor', 'wood-strip', 'oily-concrete', 'brick-factory', 'metal-grate-floor', 'boiler-plate', 'workshop-wood', 'warehouse-floor', 'engine-room-floor', 'mill-floor', 'furnace-floor', 'soot-floor', 'rivet-floor', 'pipe-floor', 'gear-floor', 'steam-floor'],
		outdoorWall: ['red-brick', 'chimney-brick', 'rust-iron', 'factory-window-wall', 'warehouse-brick', 'dock-wall', 'canal-wall', 'mill-brick', 'foundry-wall', 'soot-brick', 'pipe-wall', 'gear-wall', 'steam-pipe-wall', 'gaslight-wall', 'poster-wall', 'industrial-stone'],
		indoorWall: ['exposed-brick', 'iron-sheet', 'wood-plank-wall', 'pipe-interior', 'gear-display', 'boiler-wall', 'engine-wall', 'furnace-wall', 'workshop-wall', 'rivet-wall', 'steam-wall', 'soot-wall', 'poster-interior', 'tool-wall', 'blueprint-wall', 'factory-window']
	},
	steampunk: {
		colors: ['#b87333', '#c9a857', '#3a2a1a', '#1a3a2a', '#8a6a3a', '#d4a847', '#5a4a3a', '#2a2a2a'],
		outdoorGround: ['brass-plate', 'gear-tile', 'victorian-brick', 'copper-grate', 'clockwork-floor', 'airship-deck', 'steam-vent', 'pipe-floor', 'rivet-plate', 'ornate-metal', 'gothic-stone', 'gaslit-path', 'cog-mosaic', 'bronze-tile', 'wrought-iron', 'leather-pad'],
		indoorFloor: ['brass-inlay-floor', 'gear-carpet', 'victorian-tile', 'copper-floor', 'clockwork-wood', 'mahogany-gear', 'steam-grate', 'pipe-grate', 'rivet-wood', 'ornate-parquet', 'gothic-tile', 'velvet-carpet', 'cog-floor', 'bronze-wood', 'wrought-floor', 'leather-floor'],
		outdoorWall: ['brass-panel', 'gear-wall', 'victorian-facade', 'copper-cladding', 'clockwork-display', 'airship-hull', 'steam-pipe-wall', 'rivet-panel', 'ornate-ironwork', 'gothic-wall', 'gaslight-bracket', 'cog-relief', 'bronze-wall', 'wrought-fence', 'leather-panel', 'porthole-wall'],
		indoorWall: ['brass-interior', 'gear-display-wall', 'victorian-wallpaper', 'copper-panel', 'clockwork-art', 'mahogany-panel', 'steam-gauge-wall', 'pipe-interior', 'rivet-interior', 'ornate-plaster', 'gothic-interior', 'velvet-wall', 'cog-display', 'bronze-interior', 'wrought-interior', 'leather-wall']
	},
	space: {
		colors: ['#e0e0e0', '#0a1a3a', '#ff6600', '#0a0a0a', '#00aaaa', '#f0f0f0', '#3a4a5a', '#1a2a4a'],
		outdoorGround: ['hull-plate', 'energy-conduit', 'landing-pad', 'airlock-floor', 'solar-panel', 'antenna-base', 'cargo-plate', 'docking-floor', 'eva-plate', 'reactor-floor', 'shield-emitter', 'sensor-floor', 'comm-array-base', 'weapon-mount', 'thruster-plate', 'navigation-floor'],
		indoorFloor: ['deck-plate', 'corridor-floor', 'bridge-floor', 'engine-floor', 'lab-floor', 'medbay-floor', 'quarters-floor', 'cargo-interior', 'airlock-interior', 'reactor-interior', 'shield-floor', 'sensor-interior', 'comm-floor', 'weapon-interior', 'thruster-interior', 'nav-floor'],
		outdoorWall: ['hull-panel', 'energy-wall', 'airlock-wall', 'solar-wall', 'antenna-wall', 'cargo-wall', 'docking-wall', 'eva-wall', 'reactor-wall', 'shield-wall', 'sensor-wall', 'comm-wall', 'weapon-wall', 'thruster-wall', 'nav-wall', 'escape-pod-wall'],
		indoorWall: ['bulkhead', 'corridor-wall', 'bridge-wall', 'engine-wall', 'lab-wall', 'medbay-wall', 'quarters-wall', 'cargo-interior-wall', 'airlock-interior-wall', 'reactor-interior-wall', 'shield-interior', 'sensor-interior-wall', 'comm-interior', 'weapon-interior-wall', 'thruster-interior-wall', 'nav-interior']
	},
	cartoon: {
		colors: ['#ff99cc', '#66ccff', '#ffff66', '#66ff66', '#cc99ff', '#ffcc66', '#ff6666', '#66ffcc'],
		outdoorGround: ['candy-brick', 'rainbow-path', 'cloud-walk', 'star-tile', 'grass-cartoon', 'water-cartoon', 'sand-cartoon', 'stone-cartoon', 'flower-path', 'mushroom-floor', 'berry-ground', 'poke-center-floor', 'gym-floor', 'route-path', 'forest-floor', 'cave-floor'],
		indoorFloor: ['rainbow-floor', 'cloud-floor', 'star-carpet', 'candy-tile', 'balloon-floor', 'plush-carpet', 'toy-floor', 'game-floor', 'poke-center-interior', 'gym-interior', 'home-floor', 'lab-floor', 'shop-floor', 'castle-cartoon', 'treehouse-floor', 'underwater-floor'],
		outdoorWall: ['candy-wall', 'rainbow-wall', 'cloud-wall', 'star-wall', 'grass-wall-cartoon', 'flower-wall', 'mushroom-wall', 'berry-wall', 'poke-center-wall', 'gym-wall', 'route-fence', 'forest-wall', 'cave-wall', 'castle-cartoon-wall', 'treehouse-wall', 'underwater-wall'],
		indoorWall: ['rainbow-interior', 'cloud-interior', 'star-interior', 'candy-interior', 'balloon-wall', 'plush-wall', 'toy-wall', 'game-wall', 'poke-center-interior-wall', 'gym-interior-wall', 'home-wall', 'lab-interior', 'shop-wall', 'castle-interior-cartoon', 'treehouse-interior', 'underwater-interior']
	}
}
const textureTypes = {
	neon: (ctx, c, seed) => drawNeonLines(ctx, c[4], c[seed % 4], seed, seed % 2 === 0),
	circuit: (ctx, c, seed) => drawCircuit(ctx, c[4], c[seed % 4], seed),
	grid: (ctx, c, seed) => { fillTileBase(ctx, c[4]); drawGrid(ctx, c[seed % 4], 8 + (seed % 3) * 4, 1 + seed % 2) },
	metal: (ctx, c, seed) => drawMetalPlate(ctx, c[4 + seed % 4], c[seed % 4], 2 + seed % 2, 2 + seed % 3, seed),
	glass: (ctx, c, seed) => { fillTileBase(ctx, mixColorHex(c[4], c[seed % 4], 0.2)); ctx.strokeStyle = c[seed % 4]; ctx.lineWidth = 1; ctx.strokeRect(2, 2, 60, 60); ctx.fillStyle = `rgba(255,255,255,0.1)`; ctx.fillRect(4, 4, 20, 10) },
	brick: (ctx, c, seed) => drawBricks(ctx, c[seed % 4], mixColorHex(c[seed % 4], '#000000', 0.3), 16, 8, seed),
	tile: (ctx, c, seed) => drawTiles(ctx, c[seed % 4], mixColorHex(c[seed % 4], '#000000', 0.2), 12 + (seed % 3) * 4, seed),
	plank: (ctx, c, seed) => drawPlanks(ctx, c[seed % 4], 10 + (seed % 4) * 2, seed),
	stone: (ctx, c, seed) => drawStones(ctx, c[seed % 4], 8 + seed % 6, seed),
	concrete: (ctx, c, seed) => { fillTileBase(ctx, c[4 + seed % 4]); addNoise(ctx, seed, 15 + seed % 10) },
	carpet: (ctx, c, seed) => { fillTileBase(ctx, c[seed % 4]); addNoise(ctx, seed, 20) },
	hex: (ctx, c, seed) => drawHexPattern(ctx, c[4 + seed % 4], c[seed % 4], 10 + seed % 6, seed),
	wave: (ctx, c, seed) => drawWaves(ctx, c[4 + seed % 4], c[seed % 4], seed),
	dots: (ctx, c, seed) => drawDots(ctx, c[4 + seed % 4], c[seed % 4], 20 + seed % 30, seed),
	crack: (ctx, c, seed) => drawCracks(ctx, c[seed % 4], mixColorHex(c[seed % 4], '#000000', 0.4), 8 + seed % 8, seed),
	stripe: (ctx, c, seed) => drawStripes(ctx, c[4 + seed % 4], c[seed % 4], 6 + seed % 6, (seed % 4) * 45, seed),
	checker: (ctx, c, seed) => drawCheckerboard(ctx, c[seed % 4], c[4 + seed % 4], 8 + (seed % 3) * 4),
	gear: (ctx, c, seed) => { fillTileBase(ctx, c[4 + seed % 4]); drawGear(ctx, 20 + seed % 10, 20 + seed % 10, 12 + seed % 6, 6 + seed % 4, c[seed % 4]); drawGear(ctx, 44 - seed % 8, 44 - seed % 8, 10 + seed % 4, 5 + seed % 3, c[(seed + 1) % 4]) },
	rivet: (ctx, c, seed) => { fillTileBase(ctx, c[4 + seed % 4]); addNoise(ctx, seed, 10); for (let i = 0; i < 16; i++) { drawRivet(ctx, (i % 4) * 16 + 8, Math.floor(i / 4) * 16 + 8, 2 + seed % 2, c[seed % 4]) } },
	cloud: (ctx, c, seed) => { fillTileBase(ctx, c[4 + seed % 4]); drawCloud(ctx, 16 + seed % 10, 24 + seed % 10, 14 + seed % 6, c[seed % 4]); drawCloud(ctx, 44 - seed % 8, 40 - seed % 8, 12 + seed % 4, c[(seed + 1) % 4]) },
	star: (ctx, c, seed) => { fillTileBase(ctx, c[4 + seed % 4]); for (let i = 0; i < 6 + seed % 6; i++) { drawStar(ctx, seededRandom(seed + i * 7) * TILE_SIZE, seededRandom(seed + i * 11) * TILE_SIZE, 3 + seededRandom(seed + i * 13) * 4, c[seed % 4]) } },
	rainbow: (ctx, c, seed) => { const rc = ['#ff6666', '#ffaa66', '#ffff66', '#66ff66', '#66ffff', '#6666ff', '#ff66ff']; for (let i = 0; i < 7; i++) { ctx.fillStyle = rc[i]; ctx.fillRect(0, i * 9 + seed % 3, TILE_SIZE, 9) } }
}
const stylePatterns = {
	cyberpunk: { outdoorGround: ['neon', 'circuit', 'grid', 'metal', 'glass'], indoorFloor: ['neon', 'circuit', 'grid', 'metal', 'hex'], outdoorWall: ['neon', 'circuit', 'metal', 'glass', 'grid'], indoorWall: ['neon', 'circuit', 'metal', 'glass', 'hex'] },
	modern: { outdoorGround: ['concrete', 'tile', 'stone', 'brick', 'plank'], indoorFloor: ['plank', 'tile', 'carpet', 'concrete', 'stone'], outdoorWall: ['glass', 'concrete', 'metal', 'brick', 'tile'], indoorWall: ['concrete', 'tile', 'carpet', 'glass', 'plank'] },
	medieval: { outdoorGround: ['stone', 'brick', 'crack', 'plank', 'dots'], indoorFloor: ['plank', 'stone', 'brick', 'carpet', 'tile'], outdoorWall: ['stone', 'brick', 'plank', 'crack', 'dots'], indoorWall: ['stone', 'plank', 'brick', 'carpet', 'crack'] },
	chinese: { outdoorGround: ['tile', 'stone', 'brick', 'plank', 'cloud'], indoorFloor: ['plank', 'tile', 'carpet', 'cloud', 'stone'], outdoorWall: ['tile', 'brick', 'cloud', 'plank', 'stone'], indoorWall: ['plank', 'cloud', 'tile', 'carpet', 'wave'] },
	industrial: { outdoorGround: ['brick', 'metal', 'concrete', 'rivet', 'gear'], indoorFloor: ['metal', 'plank', 'concrete', 'rivet', 'gear'], outdoorWall: ['brick', 'metal', 'rivet', 'gear', 'concrete'], indoorWall: ['brick', 'metal', 'rivet', 'gear', 'plank'] },
	steampunk: { outdoorGround: ['metal', 'gear', 'brick', 'rivet', 'tile'], indoorFloor: ['gear', 'metal', 'plank', 'rivet', 'carpet'], outdoorWall: ['metal', 'gear', 'brick', 'rivet', 'glass'], indoorWall: ['gear', 'metal', 'carpet', 'rivet', 'plank'] },
	space: { outdoorGround: ['metal', 'grid', 'hex', 'rivet', 'neon'], indoorFloor: ['metal', 'grid', 'hex', 'tile', 'neon'], outdoorWall: ['metal', 'grid', 'hex', 'rivet', 'neon'], indoorWall: ['metal', 'grid', 'hex', 'tile', 'neon'] },
	cartoon: { outdoorGround: ['rainbow', 'cloud', 'star', 'checker', 'dots'], indoorFloor: ['rainbow', 'cloud', 'star', 'checker', 'carpet'], outdoorWall: ['rainbow', 'cloud', 'star', 'stripe', 'dots'], indoorWall: ['rainbow', 'cloud', 'star', 'checker', 'stripe'] }
}
function genStyleTexture(styleKey, category, id, index) {
	const canvas = createTileCanvas()
	const ctx = canvas.getContext('2d')
	const style = styles[styleKey]
	const patterns = stylePatterns[styleKey][category]
	const seed = hashString(styleKey + category + id)
	const patternType = patterns[index % patterns.length]
	textureTypes[patternType](ctx, style.colors, seed)
	return canvas
}
async function main() {
	const baseDir = path.join(__dirname, 'src', 'texture')
	console.log('Generating textures...\n')
	console.log('=== Natural Ground ===')
	for (const ground of naturalGrounds) {
		const canvas = genNatural(ground.id, hashString(ground.id))
		saveCanvas(canvas, path.join(baseDir, 'natural', `${ground.id}.png`))
		console.log(`  natural/${ground.id}.png`)
	}
	console.log('\n=== Transitions ===')
	for (const [fromId, toId] of transitionPairs) {
		for (const dir of directions) {
			const canvas = genTransition(fromId, toId, dir)
			saveCanvas(canvas, path.join(baseDir, 'natural-transitions', `${fromId}-${toId}-${dir}.png`))
			console.log(`  natural-transitions/${fromId}-${toId}-${dir}.png`)
		}
	}
	console.log('\n=== Style Textures ===')
	const categories = [
		{ key: 'outdoorGround', folder: 'outdoor-ground' },
		{ key: 'indoorFloor', folder: 'indoor-floor' },
		{ key: 'outdoorWall', folder: 'outdoor-wall' },
		{ key: 'indoorWall', folder: 'indoor-wall' }
	]
	for (const [styleKey, style] of Object.entries(styles)) {
		console.log(`\n--- ${styleKey} ---`)
		for (const cat of categories) {
			const textures = style[cat.key]
			for (let i = 0; i < textures.length; i++) {
				const canvas = genStyleTexture(styleKey, cat.key, textures[i], i)
				saveCanvas(canvas, path.join(baseDir, styleKey, cat.folder, `${textures[i]}.png`))
				console.log(`  ${styleKey}/${cat.folder}/${textures[i]}.png`)
			}
		}
	}
	let total = naturalGrounds.length + transitionPairs.length * directions.length
	for (const style of Object.values(styles)) {
		total += style.outdoorGround.length + style.indoorFloor.length + style.outdoorWall.length + style.indoorWall.length
	}
	console.log(`\n=== Done: ${total} files ===`)
}
main().catch(console.error)
