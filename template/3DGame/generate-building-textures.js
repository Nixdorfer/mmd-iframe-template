const { createCanvas } = require('canvas')
const fs = require('fs')
const path = require('path')
const TEXTURE_SIZE = 64
const walls = [
	{ id: 'brick-red', name: '红砖墙', base: '#8b4513' },
	{ id: 'brick-brown', name: '棕砖墙', base: '#6b4423' },
	{ id: 'brick-gray', name: '灰砖墙', base: '#707070' },
	{ id: 'brick-white', name: '白砖墙', base: '#e8e8e8' },
	{ id: 'stone-rough', name: '粗石墙', base: '#808080' },
	{ id: 'stone-smooth', name: '光滑石墙', base: '#a0a0a0' },
	{ id: 'stone-cobble', name: '卵石墙', base: '#696969' },
	{ id: 'wood-plank', name: '木板墙', base: '#8b6914' },
	{ id: 'wood-log', name: '原木墙', base: '#6b4914' },
	{ id: 'wood-dark', name: '深色木墙', base: '#4a3010' },
	{ id: 'concrete', name: '混凝土墙', base: '#b0b0b0' },
	{ id: 'stucco-white', name: '白色灰泥墙', base: '#f5f5f0' },
	{ id: 'stucco-cream', name: '奶油灰泥墙', base: '#f5e6c8' },
	{ id: 'stucco-pink', name: '粉色灰泥墙', base: '#e8c8c8' },
	{ id: 'metal-corrugated', name: '波纹铁皮', base: '#7a8a8a' },
	{ id: 'metal-rust', name: '锈蚀金属', base: '#8b5a2b' },
	{ id: 'adobe', name: '土坯墙', base: '#c4a882' },
	{ id: 'bamboo', name: '竹墙', base: '#9acd32' },
	{ id: 'glass', name: '玻璃幕墙', base: '#a0d8e8' },
	{ id: 'tile-ceramic', name: '瓷砖墙', base: '#f0f0f0' }
]
const roofs = [
	{ id: 'tile-red', name: '红色瓦片', base: '#b22222' },
	{ id: 'tile-orange', name: '橙色瓦片', base: '#cc5500' },
	{ id: 'tile-brown', name: '棕色瓦片', base: '#8b4513' },
	{ id: 'tile-gray', name: '灰色瓦片', base: '#606060' },
	{ id: 'tile-blue', name: '蓝色瓦片', base: '#2e4a6e' },
	{ id: 'tile-green', name: '绿色瓦片', base: '#2e5a2e' },
	{ id: 'shingle-black', name: '黑色沥青瓦', base: '#2a2a2a' },
	{ id: 'shingle-gray', name: '灰色沥青瓦', base: '#4a4a4a' },
	{ id: 'shingle-brown', name: '棕色沥青瓦', base: '#5a4030' },
	{ id: 'metal-silver', name: '银色金属屋顶', base: '#a8a8a8' },
	{ id: 'metal-blue', name: '蓝色金属屋顶', base: '#4a6a8a' },
	{ id: 'metal-green', name: '绿色金属屋顶', base: '#4a6a4a' },
	{ id: 'metal-rust', name: '锈蚀金属屋顶', base: '#8b5a2b' },
	{ id: 'thatch', name: '茅草屋顶', base: '#c4a860' },
	{ id: 'thatch-dark', name: '深色茅草', base: '#8a7840' },
	{ id: 'wood-shingle', name: '木瓦屋顶', base: '#6b5a3a' },
	{ id: 'slate-gray', name: '灰色石板', base: '#505050' },
	{ id: 'slate-blue', name: '蓝色石板', base: '#3a4a5a' },
	{ id: 'copper', name: '铜屋顶', base: '#b87333' },
	{ id: 'copper-patina', name: '铜绿屋顶', base: '#4a8a6a' }
]
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
	return {
		r: c1.r + (c2.r - c1.r) * t,
		g: c1.g + (c2.g - c1.g) * t,
		b: c1.b + (c2.b - c1.b) * t
	}
}
function createTextureCanvas() {
	return createCanvas(TEXTURE_SIZE, TEXTURE_SIZE)
}
function genBrickWall(ctx, baseColor, brickW = 16, brickH = 8) {
	const base = hexToRgb(baseColor)
	ctx.fillStyle = baseColor
	ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE)
	for (let row = 0; row < Math.ceil(TEXTURE_SIZE / brickH); row++) {
		const offset = (row % 2) * (brickW / 2)
		for (let col = -1; col < Math.ceil(TEXTURE_SIZE / brickW) + 1; col++) {
			const bx = col * brickW + offset
			const by = row * brickH
			const shade = 0.85 + seededRandom(row * 17 + col * 13) * 0.3
			const r = Math.min(255, base.r * shade)
			const g = Math.min(255, base.g * shade)
			const b = Math.min(255, base.b * shade)
			ctx.fillStyle = rgbToHex(r, g, b)
			ctx.fillRect(bx + 1, by + 1, brickW - 2, brickH - 2)
		}
	}
	ctx.strokeStyle = rgbToHex(base.r * 0.5, base.g * 0.5, base.b * 0.5)
	ctx.lineWidth = 1
	for (let row = 1; row < Math.ceil(TEXTURE_SIZE / brickH); row++) {
		ctx.beginPath()
		ctx.moveTo(0, row * brickH)
		ctx.lineTo(TEXTURE_SIZE, row * brickH)
		ctx.stroke()
	}
}
function genStoneWall(ctx, baseColor, stoneSize = 12) {
	const base = hexToRgb(baseColor)
	ctx.fillStyle = baseColor
	ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE)
	for (let i = 0; i < 30; i++) {
		const x = seededRandom(i * 3.1) * TEXTURE_SIZE
		const y = seededRandom(i * 4.7) * TEXTURE_SIZE
		const w = stoneSize * (0.6 + seededRandom(i * 5.3) * 0.8)
		const h = stoneSize * (0.5 + seededRandom(i * 6.1) * 0.6)
		const shade = 0.8 + seededRandom(i * 7.9) * 0.4
		ctx.fillStyle = rgbToHex(base.r * shade, base.g * shade, base.b * shade)
		ctx.beginPath()
		ctx.ellipse(x, y, w / 2, h / 2, seededRandom(i * 8.3) * Math.PI, 0, Math.PI * 2)
		ctx.fill()
		ctx.strokeStyle = rgbToHex(base.r * 0.6, base.g * 0.6, base.b * 0.6)
		ctx.lineWidth = 1
		ctx.stroke()
	}
}
function genWoodPlankWall(ctx, baseColor) {
	const base = hexToRgb(baseColor)
	ctx.fillStyle = baseColor
	ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE)
	const plankW = TEXTURE_SIZE / 4
	for (let col = 0; col < 4; col++) {
		const shade = 0.9 + seededRandom(col * 11) * 0.2
		ctx.fillStyle = rgbToHex(base.r * shade, base.g * shade, base.b * shade)
		ctx.fillRect(col * plankW, 0, plankW - 1, TEXTURE_SIZE)
		ctx.strokeStyle = rgbToHex(base.r * 0.6, base.g * 0.6, base.b * 0.6)
		ctx.lineWidth = 0.5
		for (let i = 0; i < 8; i++) {
			const lx = col * plankW + seededRandom(col * 13 + i * 7) * plankW
			ctx.beginPath()
			ctx.moveTo(lx, 0)
			ctx.lineTo(lx + (seededRandom(col * 17 + i * 9) - 0.5) * 4, TEXTURE_SIZE)
			ctx.stroke()
		}
	}
}
function genWoodLogWall(ctx, baseColor) {
	const base = hexToRgb(baseColor)
	ctx.fillStyle = baseColor
	ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE)
	const logH = TEXTURE_SIZE / 4
	for (let row = 0; row < 4; row++) {
		const shade = 0.85 + seededRandom(row * 19) * 0.3
		ctx.fillStyle = rgbToHex(base.r * shade, base.g * shade, base.b * shade)
		ctx.fillRect(0, row * logH, TEXTURE_SIZE, logH - 2)
		ctx.fillStyle = rgbToHex(base.r * shade * 1.1, base.g * shade * 1.1, base.b * shade * 1.1)
		ctx.fillRect(0, row * logH, TEXTURE_SIZE, 3)
		ctx.fillStyle = rgbToHex(base.r * shade * 0.7, base.g * shade * 0.7, base.b * shade * 0.7)
		ctx.fillRect(0, row * logH + logH - 4, TEXTURE_SIZE, 2)
	}
}
function genConcreteWall(ctx, baseColor) {
	const base = hexToRgb(baseColor)
	ctx.fillStyle = baseColor
	ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE)
	const imgData = ctx.getImageData(0, 0, TEXTURE_SIZE, TEXTURE_SIZE)
	const data = imgData.data
	for (let y = 0; y < TEXTURE_SIZE; y++) {
		for (let x = 0; x < TEXTURE_SIZE; x++) {
			const idx = (y * TEXTURE_SIZE + x) * 4
			const n = noise2D(x, y, 200) * 20 - 10
			data[idx] = Math.max(0, Math.min(255, base.r + n))
			data[idx + 1] = Math.max(0, Math.min(255, base.g + n))
			data[idx + 2] = Math.max(0, Math.min(255, base.b + n))
		}
	}
	ctx.putImageData(imgData, 0, 0)
}
function genStuccoWall(ctx, baseColor) {
	const base = hexToRgb(baseColor)
	ctx.fillStyle = baseColor
	ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE)
	const imgData = ctx.getImageData(0, 0, TEXTURE_SIZE, TEXTURE_SIZE)
	const data = imgData.data
	for (let y = 0; y < TEXTURE_SIZE; y++) {
		for (let x = 0; x < TEXTURE_SIZE; x++) {
			const idx = (y * TEXTURE_SIZE + x) * 4
			const n = smoothNoise(x, y, 4, 210) * 15 - 7.5
			data[idx] = Math.max(0, Math.min(255, base.r + n))
			data[idx + 1] = Math.max(0, Math.min(255, base.g + n))
			data[idx + 2] = Math.max(0, Math.min(255, base.b + n))
		}
	}
	ctx.putImageData(imgData, 0, 0)
}
function genMetalCorrugated(ctx, baseColor) {
	const base = hexToRgb(baseColor)
	ctx.fillStyle = baseColor
	ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE)
	const waveW = 8
	for (let x = 0; x < TEXTURE_SIZE; x++) {
		const phase = (x % waveW) / waveW
		const brightness = 0.7 + Math.sin(phase * Math.PI) * 0.3
		ctx.fillStyle = rgbToHex(base.r * brightness, base.g * brightness, base.b * brightness)
		ctx.fillRect(x, 0, 1, TEXTURE_SIZE)
	}
	for (let i = 0; i < 5; i++) {
		const y = seededRandom(i * 23) * TEXTURE_SIZE
		ctx.strokeStyle = rgbToHex(base.r * 0.5, base.g * 0.5, base.b * 0.5)
		ctx.lineWidth = 2
		ctx.beginPath()
		ctx.moveTo(0, y)
		ctx.lineTo(TEXTURE_SIZE, y)
		ctx.stroke()
	}
}
function genAdobeWall(ctx, baseColor) {
	const base = hexToRgb(baseColor)
	ctx.fillStyle = baseColor
	ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE)
	const imgData = ctx.getImageData(0, 0, TEXTURE_SIZE, TEXTURE_SIZE)
	const data = imgData.data
	for (let y = 0; y < TEXTURE_SIZE; y++) {
		for (let x = 0; x < TEXTURE_SIZE; x++) {
			const idx = (y * TEXTURE_SIZE + x) * 4
			const n = smoothNoise(x, y, 8, 220) * 0.5 + smoothNoise(x, y, 16, 221) * 0.5
			const variation = (n - 0.5) * 30
			data[idx] = Math.max(0, Math.min(255, base.r + variation))
			data[idx + 1] = Math.max(0, Math.min(255, base.g + variation))
			data[idx + 2] = Math.max(0, Math.min(255, base.b + variation))
		}
	}
	ctx.putImageData(imgData, 0, 0)
	ctx.strokeStyle = rgbToHex(base.r * 0.7, base.g * 0.7, base.b * 0.7)
	ctx.lineWidth = 0.5
	for (let i = 0; i < 8; i++) {
		const sx = seededRandom(i * 31) * TEXTURE_SIZE
		const sy = seededRandom(i * 37) * TEXTURE_SIZE
		ctx.beginPath()
		ctx.moveTo(sx, sy)
		ctx.lineTo(sx + (seededRandom(i * 41) - 0.5) * 20, sy + seededRandom(i * 43) * 15)
		ctx.stroke()
	}
}
function genBambooWall(ctx, baseColor) {
	const base = hexToRgb(baseColor)
	ctx.fillStyle = '#2a2a1a'
	ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE)
	const bambooW = 8
	for (let col = 0; col < Math.ceil(TEXTURE_SIZE / bambooW); col++) {
		const shade = 0.85 + seededRandom(col * 47) * 0.3
		ctx.fillStyle = rgbToHex(base.r * shade, base.g * shade, base.b * shade)
		ctx.fillRect(col * bambooW + 1, 0, bambooW - 2, TEXTURE_SIZE)
		ctx.fillStyle = rgbToHex(base.r * shade * 0.8, base.g * shade * 0.8, base.b * shade * 0.8)
		for (let node = 0; node < 5; node++) {
			const ny = node * 14 + seededRandom(col * 51 + node * 53) * 6
			ctx.fillRect(col * bambooW, ny, bambooW, 3)
		}
	}
}
function genGlassWall(ctx, baseColor) {
	const base = hexToRgb(baseColor)
	ctx.fillStyle = baseColor
	ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE)
	const imgData = ctx.getImageData(0, 0, TEXTURE_SIZE, TEXTURE_SIZE)
	const data = imgData.data
	for (let y = 0; y < TEXTURE_SIZE; y++) {
		for (let x = 0; x < TEXTURE_SIZE; x++) {
			const idx = (y * TEXTURE_SIZE + x) * 4
			const reflection = Math.sin((x + y) * 0.1) * 10 + 5
			data[idx] = Math.max(0, Math.min(255, base.r + reflection))
			data[idx + 1] = Math.max(0, Math.min(255, base.g + reflection))
			data[idx + 2] = Math.max(0, Math.min(255, base.b + reflection))
			data[idx + 3] = 220
		}
	}
	ctx.putImageData(imgData, 0, 0)
	ctx.strokeStyle = '#505050'
	ctx.lineWidth = 2
	const gridSize = TEXTURE_SIZE / 2
	ctx.beginPath()
	ctx.moveTo(gridSize, 0)
	ctx.lineTo(gridSize, TEXTURE_SIZE)
	ctx.moveTo(0, gridSize)
	ctx.lineTo(TEXTURE_SIZE, gridSize)
	ctx.stroke()
}
function genTileCeramicWall(ctx, baseColor) {
	const base = hexToRgb(baseColor)
	ctx.fillStyle = '#d0d0d0'
	ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE)
	const tileSize = 16
	for (let row = 0; row < 4; row++) {
		for (let col = 0; col < 4; col++) {
			const shade = 0.95 + seededRandom(row * 59 + col * 61) * 0.1
			ctx.fillStyle = rgbToHex(base.r * shade, base.g * shade, base.b * shade)
			ctx.fillRect(col * tileSize + 1, row * tileSize + 1, tileSize - 2, tileSize - 2)
		}
	}
}
function genTileRoof(ctx, baseColor) {
	const base = hexToRgb(baseColor)
	ctx.fillStyle = baseColor
	ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE)
	const tileH = 10
	const tileW = 16
	for (let row = 0; row < Math.ceil(TEXTURE_SIZE / tileH); row++) {
		const offset = (row % 2) * (tileW / 2)
		for (let col = -1; col < Math.ceil(TEXTURE_SIZE / tileW) + 1; col++) {
			const tx = col * tileW + offset
			const ty = row * tileH
			const shade = 0.8 + seededRandom(row * 67 + col * 71) * 0.4
			ctx.fillStyle = rgbToHex(base.r * shade, base.g * shade, base.b * shade)
			ctx.beginPath()
			ctx.moveTo(tx, ty + tileH)
			ctx.lineTo(tx + tileW / 2, ty)
			ctx.lineTo(tx + tileW, ty + tileH)
			ctx.closePath()
			ctx.fill()
			ctx.strokeStyle = rgbToHex(base.r * 0.6, base.g * 0.6, base.b * 0.6)
			ctx.lineWidth = 0.5
			ctx.stroke()
		}
	}
}
function genShingleRoof(ctx, baseColor) {
	const base = hexToRgb(baseColor)
	ctx.fillStyle = baseColor
	ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE)
	const shingleH = 8
	const shingleW = 10
	for (let row = 0; row < Math.ceil(TEXTURE_SIZE / shingleH); row++) {
		const offset = (row % 2) * (shingleW / 2)
		for (let col = -1; col < Math.ceil(TEXTURE_SIZE / shingleW) + 1; col++) {
			const sx = col * shingleW + offset
			const sy = row * shingleH
			const shade = 0.85 + seededRandom(row * 73 + col * 79) * 0.3
			ctx.fillStyle = rgbToHex(base.r * shade, base.g * shade, base.b * shade)
			ctx.fillRect(sx, sy, shingleW - 1, shingleH - 1)
			ctx.fillStyle = rgbToHex(base.r * shade * 0.8, base.g * shade * 0.8, base.b * shade * 0.8)
			ctx.fillRect(sx, sy + shingleH - 2, shingleW - 1, 2)
		}
	}
}
function genMetalRoof(ctx, baseColor) {
	const base = hexToRgb(baseColor)
	ctx.fillStyle = baseColor
	ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE)
	const ribW = 16
	for (let col = 0; col < Math.ceil(TEXTURE_SIZE / ribW); col++) {
		const x = col * ribW
		ctx.fillStyle = rgbToHex(base.r * 0.9, base.g * 0.9, base.b * 0.9)
		ctx.fillRect(x, 0, ribW - 2, TEXTURE_SIZE)
		ctx.fillStyle = rgbToHex(base.r * 1.1, base.g * 1.1, base.b * 1.1)
		ctx.fillRect(x, 0, 2, TEXTURE_SIZE)
		ctx.fillStyle = rgbToHex(base.r * 0.7, base.g * 0.7, base.b * 0.7)
		ctx.fillRect(x + ribW - 2, 0, 2, TEXTURE_SIZE)
	}
	for (let i = 0; i < 3; i++) {
		const y = seededRandom(i * 83) * TEXTURE_SIZE
		ctx.strokeStyle = rgbToHex(base.r * 0.6, base.g * 0.6, base.b * 0.6)
		ctx.lineWidth = 1
		ctx.beginPath()
		ctx.moveTo(0, y)
		ctx.lineTo(TEXTURE_SIZE, y)
		ctx.stroke()
	}
}
function genThatchRoof(ctx, baseColor) {
	const base = hexToRgb(baseColor)
	ctx.fillStyle = baseColor
	ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE)
	const imgData = ctx.getImageData(0, 0, TEXTURE_SIZE, TEXTURE_SIZE)
	const data = imgData.data
	for (let y = 0; y < TEXTURE_SIZE; y++) {
		for (let x = 0; x < TEXTURE_SIZE; x++) {
			const idx = (y * TEXTURE_SIZE + x) * 4
			const n = noise2D(x, y, 230) * 0.4 + smoothNoise(x, y, 4, 231) * 0.6
			const variation = (n - 0.5) * 40
			data[idx] = Math.max(0, Math.min(255, base.r + variation))
			data[idx + 1] = Math.max(0, Math.min(255, base.g + variation))
			data[idx + 2] = Math.max(0, Math.min(255, base.b + variation))
		}
	}
	ctx.putImageData(imgData, 0, 0)
	for (let i = 0; i < 80; i++) {
		const sx = seededRandom(i * 2.3) * TEXTURE_SIZE
		const sy = seededRandom(i * 3.7) * TEXTURE_SIZE
		const length = 5 + seededRandom(i * 4.1) * 10
		const shade = 0.7 + seededRandom(i * 5.3) * 0.6
		ctx.strokeStyle = rgbToHex(base.r * shade, base.g * shade, base.b * shade)
		ctx.lineWidth = 1
		ctx.beginPath()
		ctx.moveTo(sx, sy)
		ctx.lineTo(sx + (seededRandom(i * 6.7) - 0.3) * 3, sy + length)
		ctx.stroke()
	}
}
function genWoodShingleRoof(ctx, baseColor) {
	const base = hexToRgb(baseColor)
	ctx.fillStyle = baseColor
	ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE)
	const shingleH = 12
	const shingleW = 8
	for (let row = 0; row < Math.ceil(TEXTURE_SIZE / shingleH); row++) {
		const offset = (row % 2) * (shingleW / 2)
		for (let col = -1; col < Math.ceil(TEXTURE_SIZE / shingleW) + 1; col++) {
			const sx = col * shingleW + offset + (seededRandom(row * 89 + col * 97) - 0.5) * 2
			const sy = row * shingleH
			const shade = 0.8 + seededRandom(row * 101 + col * 103) * 0.4
			ctx.fillStyle = rgbToHex(base.r * shade, base.g * shade, base.b * shade)
			ctx.fillRect(sx, sy, shingleW - 1, shingleH)
			ctx.strokeStyle = rgbToHex(base.r * 0.5, base.g * 0.5, base.b * 0.5)
			ctx.lineWidth = 0.5
			for (let k = 0; k < 2; k++) {
				const lx = sx + seededRandom(row * 107 + col * 109 + k * 111) * shingleW
				ctx.beginPath()
				ctx.moveTo(lx, sy)
				ctx.lineTo(lx, sy + shingleH)
				ctx.stroke()
			}
		}
	}
}
function genSlateRoof(ctx, baseColor) {
	const base = hexToRgb(baseColor)
	ctx.fillStyle = baseColor
	ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE)
	const slateH = 10
	const slateW = 12
	for (let row = 0; row < Math.ceil(TEXTURE_SIZE / slateH); row++) {
		const offset = (row % 2) * (slateW / 2)
		for (let col = -1; col < Math.ceil(TEXTURE_SIZE / slateW) + 1; col++) {
			const sx = col * slateW + offset
			const sy = row * slateH
			const shade = 0.85 + seededRandom(row * 113 + col * 127) * 0.3
			ctx.fillStyle = rgbToHex(base.r * shade, base.g * shade, base.b * shade)
			ctx.fillRect(sx + 1, sy + 1, slateW - 2, slateH - 2)
			ctx.strokeStyle = rgbToHex(base.r * 0.6, base.g * 0.6, base.b * 0.6)
			ctx.lineWidth = 1
			ctx.strokeRect(sx + 1, sy + 1, slateW - 2, slateH - 2)
		}
	}
}
function genCopperRoof(ctx, baseColor) {
	const base = hexToRgb(baseColor)
	ctx.fillStyle = baseColor
	ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE)
	const panelW = TEXTURE_SIZE / 2
	const panelH = TEXTURE_SIZE / 2
	for (let row = 0; row < 2; row++) {
		for (let col = 0; col < 2; col++) {
			const shade = 0.9 + seededRandom(row * 131 + col * 137) * 0.2
			ctx.fillStyle = rgbToHex(base.r * shade, base.g * shade, base.b * shade)
			ctx.fillRect(col * panelW + 1, row * panelH + 1, panelW - 2, panelH - 2)
		}
	}
	ctx.strokeStyle = rgbToHex(base.r * 0.7, base.g * 0.7, base.b * 0.7)
	ctx.lineWidth = 2
	ctx.beginPath()
	ctx.moveTo(panelW, 0)
	ctx.lineTo(panelW, TEXTURE_SIZE)
	ctx.moveTo(0, panelH)
	ctx.lineTo(TEXTURE_SIZE, panelH)
	ctx.stroke()
}
const wallGenerators = {
	'brick-red': ctx => genBrickWall(ctx, '#8b4513'),
	'brick-brown': ctx => genBrickWall(ctx, '#6b4423'),
	'brick-gray': ctx => genBrickWall(ctx, '#707070'),
	'brick-white': ctx => genBrickWall(ctx, '#e8e8e8'),
	'stone-rough': ctx => genStoneWall(ctx, '#808080'),
	'stone-smooth': ctx => genStoneWall(ctx, '#a0a0a0', 16),
	'stone-cobble': ctx => genStoneWall(ctx, '#696969', 8),
	'wood-plank': ctx => genWoodPlankWall(ctx, '#8b6914'),
	'wood-log': ctx => genWoodLogWall(ctx, '#6b4914'),
	'wood-dark': ctx => genWoodPlankWall(ctx, '#4a3010'),
	'concrete': ctx => genConcreteWall(ctx, '#b0b0b0'),
	'stucco-white': ctx => genStuccoWall(ctx, '#f5f5f0'),
	'stucco-cream': ctx => genStuccoWall(ctx, '#f5e6c8'),
	'stucco-pink': ctx => genStuccoWall(ctx, '#e8c8c8'),
	'metal-corrugated': ctx => genMetalCorrugated(ctx, '#7a8a8a'),
	'metal-rust': ctx => genMetalCorrugated(ctx, '#8b5a2b'),
	'adobe': ctx => genAdobeWall(ctx, '#c4a882'),
	'bamboo': ctx => genBambooWall(ctx, '#9acd32'),
	'glass': ctx => genGlassWall(ctx, '#a0d8e8'),
	'tile-ceramic': ctx => genTileCeramicWall(ctx, '#f0f0f0')
}
const roofGenerators = {
	'tile-red': ctx => genTileRoof(ctx, '#b22222'),
	'tile-orange': ctx => genTileRoof(ctx, '#cc5500'),
	'tile-brown': ctx => genTileRoof(ctx, '#8b4513'),
	'tile-gray': ctx => genTileRoof(ctx, '#606060'),
	'tile-blue': ctx => genTileRoof(ctx, '#2e4a6e'),
	'tile-green': ctx => genTileRoof(ctx, '#2e5a2e'),
	'shingle-black': ctx => genShingleRoof(ctx, '#2a2a2a'),
	'shingle-gray': ctx => genShingleRoof(ctx, '#4a4a4a'),
	'shingle-brown': ctx => genShingleRoof(ctx, '#5a4030'),
	'metal-silver': ctx => genMetalRoof(ctx, '#a8a8a8'),
	'metal-blue': ctx => genMetalRoof(ctx, '#4a6a8a'),
	'metal-green': ctx => genMetalRoof(ctx, '#4a6a4a'),
	'metal-rust': ctx => genMetalRoof(ctx, '#8b5a2b'),
	'thatch': ctx => genThatchRoof(ctx, '#c4a860'),
	'thatch-dark': ctx => genThatchRoof(ctx, '#8a7840'),
	'wood-shingle': ctx => genWoodShingleRoof(ctx, '#6b5a3a'),
	'slate-gray': ctx => genSlateRoof(ctx, '#505050'),
	'slate-blue': ctx => genSlateRoof(ctx, '#3a4a5a'),
	'copper': ctx => genCopperRoof(ctx, '#b87333'),
	'copper-patina': ctx => genCopperRoof(ctx, '#4a8a6a')
}
function saveCanvas(canvas, filePath) {
	const buffer = canvas.toBuffer('image/png')
	fs.writeFileSync(filePath, buffer)
}
async function main() {
	const wallsDir = path.join(__dirname, 'src', 'walls')
	const roofsDir = path.join(__dirname, 'src', 'roofs')
	if (!fs.existsSync(wallsDir)) {
		fs.mkdirSync(wallsDir, { recursive: true })
	}
	if (!fs.existsSync(roofsDir)) {
		fs.mkdirSync(roofsDir, { recursive: true })
	}
	console.log('Generating wall textures...')
	for (const wall of walls) {
		const canvas = createTextureCanvas()
		const ctx = canvas.getContext('2d')
		if (wallGenerators[wall.id]) {
			wallGenerators[wall.id](ctx)
		}
		const filePath = path.join(wallsDir, `${wall.id}.png`)
		saveCanvas(canvas, filePath)
		console.log(`  Created: ${wall.id}.png`)
	}
	console.log('\nGenerating roof textures...')
	for (const roof of roofs) {
		const canvas = createTextureCanvas()
		const ctx = canvas.getContext('2d')
		if (roofGenerators[roof.id]) {
			roofGenerators[roof.id](ctx)
		}
		const filePath = path.join(roofsDir, `${roof.id}.png`)
		saveCanvas(canvas, filePath)
		console.log(`  Created: ${roof.id}.png`)
	}
	console.log('\nDone!')
}
main()
