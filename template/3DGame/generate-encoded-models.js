const { createCanvas } = require('canvas')
const fs = require('fs')
const path = require('path')
const OUTPUT_DIR = path.join(__dirname, 'src/model')
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
function clamp(v, min = 0, max = 255) {
	return Math.max(min, Math.min(max, Math.round(v)))
}
function crc32(data) {
	let crc = 0xffffffff
	const table = []
	for (let i = 0; i < 256; i++) {
		let c = i
		for (let j = 0; j < 8; j++) {
			c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
		}
		table[i] = c
	}
	for (let i = 0; i < data.length; i++) {
		crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8)
	}
	return (crc ^ 0xffffffff) >>> 0
}
function createPngWithMetadata(canvas, modelData) {
	const pngBuffer = canvas.toBuffer('image/png')
	const modelJson = JSON.stringify(modelData)
	const keyword = 'modelData'
	const textData = Buffer.concat([
		Buffer.from(keyword, 'latin1'),
		Buffer.from([0]),
		Buffer.from(modelJson, 'utf8')
	])
	const length = Buffer.alloc(4)
	length.writeUInt32BE(textData.length, 0)
	const type = Buffer.from('tEXt', 'latin1')
	const crcData = Buffer.concat([type, textData])
	const crcValue = crc32(crcData)
	const crcBuffer = Buffer.alloc(4)
	crcBuffer.writeUInt32BE(crcValue, 0)
	const textChunk = Buffer.concat([length, type, textData, crcBuffer])
	const iendPos = pngBuffer.length - 12
	const beforeIend = pngBuffer.slice(0, iendPos)
	const iendChunk = pngBuffer.slice(iendPos)
	return Buffer.concat([beforeIend, textChunk, iendChunk])
}
function saveModel(canvas, modelData, folder, filename) {
	const dir = path.join(OUTPUT_DIR, folder)
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
	const buffer = createPngWithMetadata(canvas, modelData)
	fs.writeFileSync(path.join(dir, filename), buffer)
	console.log(`Generated: ${folder}/${filename}`)
}
function generatePineTree(variant) {
	const seed = variant * 1000
	const height = 2.0 + seededRandom(seed) * 1.5
	const baseWidth = 0.8 + seededRandom(seed + 1) * 0.4
	const layers = 3 + Math.floor(seededRandom(seed + 2) * 3)
	const trunkHeight = height * 0.25
	const trunkWidth = 0.15 + seededRandom(seed + 3) * 0.1
	const vertices = []
	const faces = []
	const sides = 6
	for (let i = 0; i < sides; i++) {
		const angle = (i / sides) * Math.PI * 2
		vertices.push([Math.cos(angle) * trunkWidth, Math.sin(angle) * trunkWidth, 0])
	}
	for (let i = 0; i < sides; i++) {
		const angle = (i / sides) * Math.PI * 2
		vertices.push([Math.cos(angle) * trunkWidth, Math.sin(angle) * trunkWidth, trunkHeight])
	}
	for (let i = 0; i < sides; i++) {
		const next = (i + 1) % sides
		faces.push({ v: [i, next, next + sides, i + sides], color: '#5a4030' })
	}
	let vertexOffset = vertices.length
	for (let layer = 0; layer < layers; layer++) {
		const layerRatio = layer / layers
		const layerZ = trunkHeight + (height - trunkHeight) * layerRatio * 0.8
		const layerWidth = baseWidth * (1 - layerRatio * 0.7)
		const nextZ = trunkHeight + (height - trunkHeight) * ((layer + 1) / layers) * 0.8
		const coneSides = 8
		const baseIdx = vertexOffset
		for (let i = 0; i < coneSides; i++) {
			const angle = (i / coneSides) * Math.PI * 2
			vertices.push([Math.cos(angle) * layerWidth, Math.sin(angle) * layerWidth, layerZ])
		}
		vertexOffset += coneSides
		const tipIdx = vertexOffset
		vertices.push([0, 0, layerZ + (nextZ - layerZ) * 1.5])
		vertexOffset += 1
		for (let i = 0; i < coneSides; i++) {
			const next = (i + 1) % coneSides
			const shade = 0.7 + seededRandom(seed + layer * 10 + i) * 0.3
			const g = Math.floor(80 + shade * 60)
			faces.push({ v: [baseIdx + i, baseIdx + next, tipIdx], color: `#2a${g.toString(16).padStart(2, '0')}30` })
		}
	}
	const canvas = createCanvas(64, 64)
	const ctx = canvas.getContext('2d')
	ctx.fillStyle = '#2a5030'
	ctx.fillRect(0, 0, 64, 64)
	for (let y = 0; y < 64; y++) {
		for (let x = 0; x < 64; x++) {
			const n = smoothNoise(x, y, 8, seed) * 40 - 20
			const base = hexToRgb('#2a5030')
			ctx.fillStyle = rgbToHex(clamp(base.r + n), clamp(base.g + n), clamp(base.b + n))
			ctx.fillRect(x, y, 1, 1)
		}
	}
	for (let i = 0; i < 20; i++) {
		const px = seededRandom(seed + i * 3) * 64
		const py = seededRandom(seed + i * 4) * 64
		ctx.fillStyle = '#1a3020'
		ctx.fillRect(px, py, 2, 2)
	}
	return {
		canvas,
		data: {
			name: `pine-${variant}`,
			vertices,
			faces,
			origin: [0, 0, 0],
			scale: 1,
			bounds: [Math.round(baseWidth * 100), Math.round(baseWidth * 100), Math.round(height * 100)],
			passable: false,
			passEffect: 0,
			climbable: false,
			solid: true,
			cover: 'full',
			destructible: true,
			mass: Math.round(50 + height * 30),
			flammable: true,
			harvestable: 'wood'
		}
	}
}
function generateBirchTree(variant) {
	const seed = variant * 1000 + 100
	const height = 2.5 + seededRandom(seed) * 1.5
	const crownWidth = 0.9 + seededRandom(seed + 1) * 0.5
	const crownHeight = height * 0.6
	const trunkHeight = height * 0.5
	const trunkWidth = 0.12 + seededRandom(seed + 2) * 0.06
	const vertices = []
	const faces = []
	const sides = 6
	for (let i = 0; i < sides; i++) {
		const angle = (i / sides) * Math.PI * 2
		vertices.push([Math.cos(angle) * trunkWidth, Math.sin(angle) * trunkWidth, 0])
	}
	for (let i = 0; i < sides; i++) {
		const angle = (i / sides) * Math.PI * 2
		vertices.push([Math.cos(angle) * trunkWidth, Math.sin(angle) * trunkWidth, trunkHeight])
	}
	for (let i = 0; i < sides; i++) {
		const next = (i + 1) % sides
		faces.push({ v: [i, next, next + sides, i + sides], color: '#e8e0d8' })
	}
	let vertexOffset = vertices.length
	const crownLayers = 3
	const crownBaseZ = trunkHeight * 0.7
	for (let layer = 0; layer < crownLayers; layer++) {
		const t = layer / (crownLayers - 1)
		const layerZ = crownBaseZ + crownHeight * t
		const widthFactor = Math.sin(t * Math.PI) * 0.8 + 0.2
		const layerWidth = crownWidth * widthFactor
		const crownSides = 8
		const baseIdx = vertexOffset
		for (let i = 0; i < crownSides; i++) {
			const angle = (i / crownSides) * Math.PI * 2
			const wobble = 1 + seededRandom(seed + layer * 20 + i) * 0.2 - 0.1
			vertices.push([Math.cos(angle) * layerWidth * wobble, Math.sin(angle) * layerWidth * wobble, layerZ])
		}
		vertexOffset += crownSides
		if (layer > 0) {
			const prevBaseIdx = baseIdx - crownSides
			for (let i = 0; i < crownSides; i++) {
				const next = (i + 1) % crownSides
				const shade = 0.8 + seededRandom(seed + layer * 10 + i) * 0.2
				const g = Math.floor(120 + shade * 50)
				faces.push({ v: [prevBaseIdx + i, prevBaseIdx + next, baseIdx + next, baseIdx + i], color: `#50${g.toString(16).padStart(2, '0')}40` })
			}
		}
	}
	const topIdx = vertexOffset
	vertices.push([0, 0, crownBaseZ + crownHeight])
	const lastRingIdx = vertexOffset - 8 - 1
	for (let i = 0; i < 8; i++) {
		const next = (i + 1) % 8
		const shade = 0.8 + seededRandom(seed + 100 + i) * 0.2
		const g = Math.floor(130 + shade * 40)
		faces.push({ v: [lastRingIdx + 1 + i, lastRingIdx + 1 + next, topIdx], color: `#50${g.toString(16).padStart(2, '0')}40` })
	}
	const canvas = createCanvas(64, 64)
	const ctx = canvas.getContext('2d')
	ctx.fillStyle = '#60a050'
	ctx.fillRect(0, 0, 64, 48)
	ctx.fillStyle = '#e8e0d8'
	ctx.fillRect(0, 48, 64, 16)
	for (let y = 0; y < 48; y++) {
		for (let x = 0; x < 64; x++) {
			const n = smoothNoise(x, y, 6, seed) * 30 - 15
			const base = hexToRgb('#60a050')
			ctx.fillStyle = rgbToHex(clamp(base.r + n), clamp(base.g + n), clamp(base.b + n))
			ctx.fillRect(x, y, 1, 1)
		}
	}
	for (let i = 0; i < 8; i++) {
		const px = seededRandom(seed + i * 5) * 60 + 2
		const py = 50 + seededRandom(seed + i * 6) * 12
		const w = 3 + seededRandom(seed + i * 7) * 4
		ctx.fillStyle = '#303030'
		ctx.fillRect(px, py, w, 2)
	}
	return {
		canvas,
		data: {
			name: `birch-${variant}`,
			vertices,
			faces,
			origin: [0, 0, 0],
			scale: 1,
			bounds: [Math.round(crownWidth * 100), Math.round(crownWidth * 100), Math.round(height * 100)],
			passable: false,
			passEffect: 0,
			climbable: false,
			solid: true,
			cover: 'full',
			destructible: true,
			mass: Math.round(40 + height * 25),
			flammable: true,
			harvestable: 'wood'
		}
	}
}
function generateWillowTree(variant) {
	const seed = variant * 1000 + 200
	const height = 2.2 + seededRandom(seed) * 1.0
	const crownWidth = 1.2 + seededRandom(seed + 1) * 0.6
	const trunkHeight = height * 0.35
	const trunkWidth = 0.18 + seededRandom(seed + 2) * 0.08
	const vertices = []
	const faces = []
	const sides = 6
	for (let i = 0; i < sides; i++) {
		const angle = (i / sides) * Math.PI * 2
		vertices.push([Math.cos(angle) * trunkWidth, Math.sin(angle) * trunkWidth, 0])
	}
	for (let i = 0; i < sides; i++) {
		const angle = (i / sides) * Math.PI * 2
		vertices.push([Math.cos(angle) * trunkWidth * 0.8, Math.sin(angle) * trunkWidth * 0.8, trunkHeight])
	}
	for (let i = 0; i < sides; i++) {
		const next = (i + 1) % sides
		faces.push({ v: [i, next, next + sides, i + sides], color: '#4a3828' })
	}
	let vertexOffset = vertices.length
	const branches = 8 + Math.floor(seededRandom(seed + 3) * 4)
	for (let b = 0; b < branches; b++) {
		const angle = (b / branches) * Math.PI * 2 + seededRandom(seed + b * 10) * 0.3
		const branchLen = crownWidth * (0.7 + seededRandom(seed + b * 11) * 0.5)
		const droopAmount = 0.6 + seededRandom(seed + b * 12) * 0.4
		const segments = 4
		const branchWidth = 0.15
		const startIdx = vertexOffset
		for (let s = 0; s <= segments; s++) {
			const t = s / segments
			const x = Math.cos(angle) * branchLen * t
			const y = Math.sin(angle) * branchLen * t
			const z = trunkHeight + (height - trunkHeight) * 0.5 * (1 - t) - droopAmount * t * t * branchLen
			const w = branchWidth * (1 - t * 0.7)
			const perpAngle = angle + Math.PI / 2
			vertices.push([x + Math.cos(perpAngle) * w, y + Math.sin(perpAngle) * w, z])
			vertices.push([x - Math.cos(perpAngle) * w, y - Math.sin(perpAngle) * w, z])
		}
		vertexOffset += (segments + 1) * 2
		for (let s = 0; s < segments; s++) {
			const i0 = startIdx + s * 2
			const shade = 0.6 + seededRandom(seed + b * 20 + s) * 0.4
			const g = Math.floor(100 + shade * 80)
			faces.push({ v: [i0, i0 + 2, i0 + 3, i0 + 1], color: `#40${g.toString(16).padStart(2, '0')}50` })
		}
	}
	const canvas = createCanvas(64, 64)
	const ctx = canvas.getContext('2d')
	ctx.fillStyle = '#50a060'
	ctx.fillRect(0, 0, 64, 48)
	ctx.fillStyle = '#4a3828'
	ctx.fillRect(0, 48, 64, 16)
	for (let y = 0; y < 48; y++) {
		for (let x = 0; x < 64; x++) {
			const n = smoothNoise(x, y, 5, seed) * 35 - 17
			const base = hexToRgb('#50a060')
			ctx.fillStyle = rgbToHex(clamp(base.r + n), clamp(base.g + n), clamp(base.b + n))
			ctx.fillRect(x, y, 1, 1)
		}
	}
	for (let i = 0; i < 30; i++) {
		const px = seededRandom(seed + i * 3) * 64
		const py = seededRandom(seed + i * 4) * 40
		ctx.fillStyle = '#408050'
		ctx.fillRect(px, py, 1, 3 + seededRandom(seed + i) * 5)
	}
	return {
		canvas,
		data: {
			name: `willow-${variant}`,
			vertices,
			faces,
			origin: [0, 0, 0],
			scale: 1,
			bounds: [Math.round(crownWidth * 100), Math.round(crownWidth * 100), Math.round(height * 100)],
			passable: false,
			passEffect: 0,
			climbable: false,
			solid: true,
			cover: 'full',
			destructible: true,
			mass: Math.round(45 + height * 28),
			flammable: true,
			harvestable: 'wood'
		}
	}
}
function generateCypressTree(variant) {
	const seed = variant * 1000 + 300
	const height = 3.0 + seededRandom(seed) * 1.5
	const baseWidth = 0.4 + seededRandom(seed + 1) * 0.2
	const trunkHeight = height * 0.15
	const trunkWidth = 0.1 + seededRandom(seed + 2) * 0.05
	const vertices = []
	const faces = []
	const sides = 6
	for (let i = 0; i < sides; i++) {
		const angle = (i / sides) * Math.PI * 2
		vertices.push([Math.cos(angle) * trunkWidth, Math.sin(angle) * trunkWidth, 0])
	}
	for (let i = 0; i < sides; i++) {
		const angle = (i / sides) * Math.PI * 2
		vertices.push([Math.cos(angle) * trunkWidth, Math.sin(angle) * trunkWidth, trunkHeight])
	}
	for (let i = 0; i < sides; i++) {
		const next = (i + 1) % sides
		faces.push({ v: [i, next, next + sides, i + sides], color: '#3a2820' })
	}
	let vertexOffset = vertices.length
	const coneLayers = 6 + Math.floor(seededRandom(seed + 3) * 3)
	for (let layer = 0; layer < coneLayers; layer++) {
		const t = layer / coneLayers
		const layerZ = trunkHeight + (height - trunkHeight) * t
		const layerWidth = baseWidth * (1 - t * 0.95)
		const coneSides = 8
		const baseIdx = vertexOffset
		for (let i = 0; i < coneSides; i++) {
			const angle = (i / coneSides) * Math.PI * 2
			const wobble = 1 + seededRandom(seed + layer * 10 + i) * 0.15 - 0.075
			vertices.push([Math.cos(angle) * layerWidth * wobble, Math.sin(angle) * layerWidth * wobble, layerZ])
		}
		vertexOffset += coneSides
		if (layer > 0) {
			const prevBaseIdx = baseIdx - coneSides
			for (let i = 0; i < coneSides; i++) {
				const next = (i + 1) % coneSides
				const shade = 0.7 + seededRandom(seed + layer * 15 + i) * 0.3
				const g = Math.floor(60 + shade * 40)
				faces.push({ v: [prevBaseIdx + i, prevBaseIdx + next, baseIdx + next, baseIdx + i], color: `#20${g.toString(16).padStart(2, '0')}30` })
			}
		}
	}
	const tipIdx = vertexOffset
	vertices.push([0, 0, height])
	const lastRingStart = vertexOffset - 8
	for (let i = 0; i < 8; i++) {
		const next = (i + 1) % 8
		faces.push({ v: [lastRingStart + i, lastRingStart + next, tipIdx], color: '#206030' })
	}
	const canvas = createCanvas(64, 64)
	const ctx = canvas.getContext('2d')
	ctx.fillStyle = '#1a4028'
	ctx.fillRect(0, 0, 64, 64)
	for (let y = 0; y < 64; y++) {
		for (let x = 0; x < 64; x++) {
			const n = smoothNoise(x, y, 6, seed) * 25 - 12
			const base = hexToRgb('#1a4028')
			ctx.fillStyle = rgbToHex(clamp(base.r + n), clamp(base.g + n), clamp(base.b + n))
			ctx.fillRect(x, y, 1, 1)
		}
	}
	return {
		canvas,
		data: {
			name: `cypress-${variant}`,
			vertices,
			faces,
			origin: [0, 0, 0],
			scale: 1,
			bounds: [Math.round(baseWidth * 100), Math.round(baseWidth * 100), Math.round(height * 100)],
			passable: false,
			passEffect: 0,
			climbable: false,
			solid: true,
			cover: 'full',
			destructible: true,
			mass: Math.round(35 + height * 20),
			flammable: true,
			harvestable: 'wood'
		}
	}
}
function generateSycamoreTree(variant) {
	const seed = variant * 1000 + 400
	const height = 2.8 + seededRandom(seed) * 1.2
	const crownWidth = 1.3 + seededRandom(seed + 1) * 0.6
	const trunkHeight = height * 0.4
	const trunkWidth = 0.2 + seededRandom(seed + 2) * 0.1
	const vertices = []
	const faces = []
	const sides = 8
	for (let i = 0; i < sides; i++) {
		const angle = (i / sides) * Math.PI * 2
		const wobble = 1 + seededRandom(seed + i) * 0.1
		vertices.push([Math.cos(angle) * trunkWidth * wobble, Math.sin(angle) * trunkWidth * wobble, 0])
	}
	for (let i = 0; i < sides; i++) {
		const angle = (i / sides) * Math.PI * 2
		const wobble = 1 + seededRandom(seed + i + 10) * 0.1
		vertices.push([Math.cos(angle) * trunkWidth * 0.85 * wobble, Math.sin(angle) * trunkWidth * 0.85 * wobble, trunkHeight])
	}
	for (let i = 0; i < sides; i++) {
		const next = (i + 1) % sides
		faces.push({ v: [i, next, next + sides, i + sides], color: '#6a5a48' })
	}
	let vertexOffset = vertices.length
	const crownLayers = 4
	const crownBaseZ = trunkHeight * 0.8
	for (let layer = 0; layer < crownLayers; layer++) {
		const t = layer / (crownLayers - 1)
		const layerZ = crownBaseZ + (height - crownBaseZ) * t
		const widthFactor = Math.sin(t * Math.PI * 0.9) * 0.9 + 0.3
		const layerWidth = crownWidth * widthFactor
		const crownSides = 10
		const baseIdx = vertexOffset
		for (let i = 0; i < crownSides; i++) {
			const angle = (i / crownSides) * Math.PI * 2
			const wobble = 1 + seededRandom(seed + layer * 30 + i) * 0.25 - 0.125
			vertices.push([Math.cos(angle) * layerWidth * wobble, Math.sin(angle) * layerWidth * wobble, layerZ])
		}
		vertexOffset += crownSides
		if (layer > 0) {
			const prevBaseIdx = baseIdx - crownSides
			for (let i = 0; i < crownSides; i++) {
				const next = (i + 1) % crownSides
				const shade = 0.7 + seededRandom(seed + layer * 20 + i) * 0.3
				const g = Math.floor(90 + shade * 60)
				faces.push({ v: [prevBaseIdx + i, prevBaseIdx + next, baseIdx + next, baseIdx + i], color: `#40${g.toString(16).padStart(2, '0')}35` })
			}
		}
	}
	const topIdx = vertexOffset
	vertices.push([0, 0, height * 0.95])
	const lastRingStart = vertexOffset - 10
	for (let i = 0; i < 10; i++) {
		const next = (i + 1) % 10
		const shade = 0.8 + seededRandom(seed + 200 + i) * 0.2
		const g = Math.floor(100 + shade * 50)
		faces.push({ v: [lastRingStart + i, lastRingStart + next, topIdx], color: `#40${g.toString(16).padStart(2, '0')}35` })
	}
	const canvas = createCanvas(64, 64)
	const ctx = canvas.getContext('2d')
	ctx.fillStyle = '#509045'
	ctx.fillRect(0, 0, 64, 48)
	ctx.fillStyle = '#6a5a48'
	ctx.fillRect(0, 48, 64, 16)
	for (let y = 0; y < 48; y++) {
		for (let x = 0; x < 64; x++) {
			const n = smoothNoise(x, y, 7, seed) * 35 - 17
			const base = hexToRgb('#509045')
			ctx.fillStyle = rgbToHex(clamp(base.r + n), clamp(base.g + n), clamp(base.b + n))
			ctx.fillRect(x, y, 1, 1)
		}
	}
	for (let i = 0; i < 15; i++) {
		const px = seededRandom(seed + i * 7) * 60 + 2
		const py = 50 + seededRandom(seed + i * 8) * 10
		ctx.fillStyle = '#887868'
		ctx.fillRect(px, py, 2, 1)
	}
	return {
		canvas,
		data: {
			name: `sycamore-${variant}`,
			vertices,
			faces,
			origin: [0, 0, 0],
			scale: 1,
			bounds: [Math.round(crownWidth * 100), Math.round(crownWidth * 100), Math.round(height * 100)],
			passable: false,
			passEffect: 0,
			climbable: false,
			solid: true,
			cover: 'full',
			destructible: true,
			mass: Math.round(60 + height * 35),
			flammable: true,
			harvestable: 'wood'
		}
	}
}
function generateSmallStone(variant) {
	const seed = variant * 1000 + 500
	const baseSize = 0.2 + seededRandom(seed) * 0.15
	const height = baseSize * (0.5 + seededRandom(seed + 1) * 0.5)
	const vertices = []
	const faces = []
	const bottomVerts = 5 + Math.floor(seededRandom(seed + 2) * 3)
	for (let i = 0; i < bottomVerts; i++) {
		const angle = (i / bottomVerts) * Math.PI * 2
		const r = baseSize * (0.7 + seededRandom(seed + i * 3) * 0.5)
		vertices.push([Math.cos(angle) * r, Math.sin(angle) * r, 0])
	}
	const topVerts = bottomVerts
	for (let i = 0; i < topVerts; i++) {
		const angle = (i / topVerts) * Math.PI * 2 + seededRandom(seed + 50) * 0.3
		const r = baseSize * (0.3 + seededRandom(seed + i * 4 + 100) * 0.4)
		const z = height * (0.6 + seededRandom(seed + i * 5) * 0.4)
		vertices.push([Math.cos(angle) * r, Math.sin(angle) * r, z])
	}
	for (let i = 0; i < bottomVerts; i++) {
		const next = (i + 1) % bottomVerts
		const shade = Math.floor(100 + seededRandom(seed + i * 10) * 55)
		faces.push({ v: [i, next, next + bottomVerts, i + bottomVerts], color: `#${shade.toString(16)}${shade.toString(16)}${shade.toString(16)}` })
	}
	const topCenterIdx = vertices.length
	let avgX = 0, avgY = 0, avgZ = 0
	for (let i = bottomVerts; i < bottomVerts + topVerts; i++) {
		avgX += vertices[i][0]
		avgY += vertices[i][1]
		avgZ += vertices[i][2]
	}
	vertices.push([avgX / topVerts, avgY / topVerts, avgZ / topVerts + height * 0.2])
	for (let i = 0; i < topVerts; i++) {
		const next = (i + 1) % topVerts
		const shade = Math.floor(110 + seededRandom(seed + i * 11) * 45)
		faces.push({ v: [bottomVerts + i, bottomVerts + next, topCenterIdx], color: `#${shade.toString(16)}${shade.toString(16)}${shade.toString(16)}` })
	}
	const canvas = createCanvas(32, 32)
	const ctx = canvas.getContext('2d')
	const baseGray = 100 + Math.floor(seededRandom(seed + 200) * 50)
	ctx.fillStyle = rgbToHex(baseGray, baseGray, baseGray)
	ctx.fillRect(0, 0, 32, 32)
	for (let y = 0; y < 32; y++) {
		for (let x = 0; x < 32; x++) {
			const n = noise2D(x, y, seed) * 40 - 20
			const g = clamp(baseGray + n)
			ctx.fillStyle = rgbToHex(g, g, g)
			ctx.fillRect(x, y, 1, 1)
		}
	}
	for (let i = 0; i < 5; i++) {
		const px = seededRandom(seed + i * 13) * 28 + 2
		const py = seededRandom(seed + i * 14) * 28 + 2
		ctx.fillStyle = `rgba(0,0,0,0.2)`
		ctx.fillRect(px, py, 2, 1)
	}
	return {
		canvas,
		data: {
			name: `stone-small-${variant}`,
			vertices,
			faces,
			origin: [0, 0, 0],
			scale: 1,
			bounds: [Math.round(baseSize * 100), Math.round(baseSize * 100), Math.round(height * 100)],
			passable: true,
			passEffect: -0.2,
			climbable: false,
			solid: false,
			cover: 'none',
			destructible: false,
			mass: Math.round(baseSize * 50),
			flammable: false,
			harvestable: 'stone'
		}
	}
}
function generateLargeStone(variant) {
	const seed = variant * 1000 + 600
	const baseSize = 0.6 + seededRandom(seed) * 0.4
	const height = baseSize * (0.6 + seededRandom(seed + 1) * 0.6)
	const vertices = []
	const faces = []
	const bottomVerts = 6 + Math.floor(seededRandom(seed + 2) * 4)
	for (let i = 0; i < bottomVerts; i++) {
		const angle = (i / bottomVerts) * Math.PI * 2
		const r = baseSize * (0.7 + seededRandom(seed + i * 3) * 0.5)
		vertices.push([Math.cos(angle) * r, Math.sin(angle) * r, 0])
	}
	const midVerts = bottomVerts
	for (let i = 0; i < midVerts; i++) {
		const angle = (i / midVerts) * Math.PI * 2 + seededRandom(seed + 60) * 0.2
		const r = baseSize * (0.8 + seededRandom(seed + i * 4 + 50) * 0.4)
		const z = height * (0.4 + seededRandom(seed + i * 5 + 50) * 0.2)
		vertices.push([Math.cos(angle) * r, Math.sin(angle) * r, z])
	}
	const topVerts = bottomVerts
	for (let i = 0; i < topVerts; i++) {
		const angle = (i / topVerts) * Math.PI * 2 + seededRandom(seed + 70) * 0.3
		const r = baseSize * (0.3 + seededRandom(seed + i * 4 + 100) * 0.35)
		const z = height * (0.7 + seededRandom(seed + i * 5 + 100) * 0.3)
		vertices.push([Math.cos(angle) * r, Math.sin(angle) * r, z])
	}
	for (let i = 0; i < bottomVerts; i++) {
		const next = (i + 1) % bottomVerts
		const shade = Math.floor(90 + seededRandom(seed + i * 10) * 50)
		faces.push({ v: [i, next, next + bottomVerts, i + bottomVerts], color: `#${shade.toString(16)}${shade.toString(16)}${shade.toString(16)}` })
	}
	for (let i = 0; i < midVerts; i++) {
		const next = (i + 1) % midVerts
		const shade = Math.floor(100 + seededRandom(seed + i * 11) * 50)
		faces.push({ v: [bottomVerts + i, bottomVerts + next, bottomVerts + midVerts + next, bottomVerts + midVerts + i], color: `#${shade.toString(16)}${shade.toString(16)}${shade.toString(16)}` })
	}
	const topCenterIdx = vertices.length
	let avgX = 0, avgY = 0, avgZ = 0
	const topStart = bottomVerts + midVerts
	for (let i = 0; i < topVerts; i++) {
		avgX += vertices[topStart + i][0]
		avgY += vertices[topStart + i][1]
		avgZ += vertices[topStart + i][2]
	}
	vertices.push([avgX / topVerts, avgY / topVerts, avgZ / topVerts + height * 0.15])
	for (let i = 0; i < topVerts; i++) {
		const next = (i + 1) % topVerts
		const shade = Math.floor(110 + seededRandom(seed + i * 12) * 45)
		faces.push({ v: [topStart + i, topStart + next, topCenterIdx], color: `#${shade.toString(16)}${shade.toString(16)}${shade.toString(16)}` })
	}
	const canvas = createCanvas(64, 64)
	const ctx = canvas.getContext('2d')
	const baseGray = 95 + Math.floor(seededRandom(seed + 200) * 45)
	ctx.fillStyle = rgbToHex(baseGray, baseGray, baseGray)
	ctx.fillRect(0, 0, 64, 64)
	for (let y = 0; y < 64; y++) {
		for (let x = 0; x < 64; x++) {
			const n = smoothNoise(x, y, 8, seed) * 35 - 17
			const g = clamp(baseGray + n)
			ctx.fillStyle = rgbToHex(g, g, g)
			ctx.fillRect(x, y, 1, 1)
		}
	}
	for (let i = 0; i < 15; i++) {
		const px = seededRandom(seed + i * 15) * 58 + 3
		const py = seededRandom(seed + i * 16) * 58 + 3
		const w = 2 + seededRandom(seed + i * 17) * 4
		ctx.fillStyle = `rgba(0,0,0,0.15)`
		ctx.fillRect(px, py, w, 1)
	}
	for (let i = 0; i < 8; i++) {
		const px = seededRandom(seed + i * 20) * 60 + 2
		const py = seededRandom(seed + i * 21) * 60 + 2
		ctx.fillStyle = `rgba(255,255,255,0.1)`
		ctx.fillRect(px, py, 2, 2)
	}
	return {
		canvas,
		data: {
			name: `stone-large-${variant}`,
			vertices,
			faces,
			origin: [0, 0, 0],
			scale: 1,
			bounds: [Math.round(baseSize * 100), Math.round(baseSize * 100), Math.round(height * 100)],
			passable: false,
			passEffect: 0,
			climbable: true,
			solid: true,
			cover: 'full',
			destructible: false,
			mass: Math.round(baseSize * 200),
			flammable: false,
			harvestable: 'stone'
		}
	}
}
const fenceMaterials = [
	{ id: 'wood', name: '木质', postColor: '#5a4030', railColor: '#6a5040', baseColor: '#5a4030' },
	{ id: 'iron', name: '铁艺', postColor: '#3a3a3a', railColor: '#4a4a4a', baseColor: '#2a2a2a' },
	{ id: 'bamboo', name: '竹子', postColor: '#8a9050', railColor: '#9aa060', baseColor: '#7a8040' },
	{ id: 'stone', name: '石头', postColor: '#808080', railColor: '#909090', baseColor: '#707070' },
	{ id: 'vine', name: '藤蔓', postColor: '#4a5530', railColor: '#5a6540', baseColor: '#3a4520' }
]
const fenceTypes = [
	{ id: 'end', name: '端头', dirs: [0] },
	{ id: 'straight', name: '直线', dirs: [0, 2] },
	{ id: 'corner', name: '转角', dirs: [0, 1] },
	{ id: 't', name: 'T形', dirs: [0, 1, 2] },
	{ id: 'cross', name: '十字', dirs: [0, 1, 2, 3] }
]
function generateFence(materialIdx, typeIdx, variantIdx) {
	const material = fenceMaterials[materialIdx]
	const fenceType = fenceTypes[typeIdx]
	const seed = materialIdx * 10000 + typeIdx * 1000 + variantIdx * 100 + 700
	const postHeight = 0.6 + seededRandom(seed) * 0.2
	const postWidth = 0.08 + seededRandom(seed + 1) * 0.03
	const railHeight = postHeight * 0.6
	const railWidth = 0.04
	const fenceLength = 0.5
	const vertices = []
	const faces = []
	function addPost(x, y) {
		const idx = vertices.length
		const hw = postWidth / 2
		vertices.push([x - hw, y - hw, 0])
		vertices.push([x + hw, y - hw, 0])
		vertices.push([x + hw, y + hw, 0])
		vertices.push([x - hw, y + hw, 0])
		vertices.push([x - hw, y - hw, postHeight])
		vertices.push([x + hw, y - hw, postHeight])
		vertices.push([x + hw, y + hw, postHeight])
		vertices.push([x - hw, y + hw, postHeight])
		faces.push({ v: [idx, idx + 1, idx + 5, idx + 4], color: material.postColor })
		faces.push({ v: [idx + 1, idx + 2, idx + 6, idx + 5], color: material.postColor })
		faces.push({ v: [idx + 2, idx + 3, idx + 7, idx + 6], color: material.postColor })
		faces.push({ v: [idx + 3, idx, idx + 4, idx + 7], color: material.postColor })
		faces.push({ v: [idx + 4, idx + 5, idx + 6, idx + 7], color: material.postColor })
	}
	function addRail(x1, y1, x2, y2, z) {
		const idx = vertices.length
		const dx = x2 - x1
		const dy = y2 - y1
		const len = Math.sqrt(dx * dx + dy * dy)
		const nx = -dy / len * railWidth
		const ny = dx / len * railWidth
		vertices.push([x1 + nx, y1 + ny, z])
		vertices.push([x1 - nx, y1 - ny, z])
		vertices.push([x2 - nx, y2 - ny, z])
		vertices.push([x2 + nx, y2 + ny, z])
		vertices.push([x1 + nx, y1 + ny, z + railWidth * 2])
		vertices.push([x1 - nx, y1 - ny, z + railWidth * 2])
		vertices.push([x2 - nx, y2 - ny, z + railWidth * 2])
		vertices.push([x2 + nx, y2 + ny, z + railWidth * 2])
		faces.push({ v: [idx, idx + 3, idx + 7, idx + 4], color: material.railColor })
		faces.push({ v: [idx + 1, idx + 5, idx + 6, idx + 2], color: material.railColor })
		faces.push({ v: [idx + 4, idx + 5, idx + 6, idx + 7], color: material.railColor })
		faces.push({ v: [idx, idx + 1, idx + 2, idx + 3], color: material.railColor })
	}
	addPost(0, 0)
	const dirVectors = [
		[0, -fenceLength],
		[fenceLength, 0],
		[0, fenceLength],
		[-fenceLength, 0]
	]
	for (const dir of fenceType.dirs) {
		const [dx, dy] = dirVectors[dir]
		addPost(dx, dy)
		addRail(0, 0, dx, dy, railHeight * 0.3)
		addRail(0, 0, dx, dy, railHeight * 0.7)
	}
	const canvas = createCanvas(64, 64)
	const ctx = canvas.getContext('2d')
	const baseRgb = hexToRgb(material.baseColor)
	ctx.fillStyle = material.baseColor
	ctx.fillRect(0, 0, 64, 64)
	for (let y = 0; y < 64; y++) {
		for (let x = 0; x < 64; x++) {
			const n = noise2D(x, y, seed) * 30 - 15
			ctx.fillStyle = rgbToHex(clamp(baseRgb.r + n), clamp(baseRgb.g + n), clamp(baseRgb.b + n))
			ctx.fillRect(x, y, 1, 1)
		}
	}
	if (material.id === 'wood') {
		for (let i = 0; i < 10; i++) {
			const py = seededRandom(seed + i * 5) * 64
			ctx.fillStyle = 'rgba(0,0,0,0.1)'
			ctx.fillRect(0, py, 64, 1)
		}
	} else if (material.id === 'bamboo') {
		for (let i = 0; i < 8; i++) {
			const py = i * 8 + 4
			ctx.fillStyle = 'rgba(0,0,0,0.15)'
			ctx.fillRect(0, py, 64, 2)
		}
	} else if (material.id === 'vine') {
		for (let i = 0; i < 20; i++) {
			const px = seededRandom(seed + i * 7) * 64
			const py = seededRandom(seed + i * 8) * 64
			ctx.fillStyle = '#3a5020'
			ctx.fillRect(px, py, 3, 2)
		}
	}
	const boundsW = fenceType.dirs.some(d => d === 1 || d === 3) ? Math.round(fenceLength * 200 + postWidth * 100) : Math.round(postWidth * 100)
	const boundsD = fenceType.dirs.some(d => d === 0 || d === 2) ? Math.round(fenceLength * 200 + postWidth * 100) : Math.round(postWidth * 100)
	const isOrganic = material.id === 'wood' || material.id === 'bamboo' || material.id === 'vine'
	return {
		canvas,
		data: {
			name: `fence-${material.id}-${fenceType.id}-${variantIdx + 1}`,
			vertices,
			faces,
			origin: [0, 0, 0],
			scale: 1,
			bounds: [boundsW, boundsD, Math.round(postHeight * 100)],
			passable: false,
			passEffect: 0,
			climbable: true,
			solid: false,
			cover: 'partial',
			destructible: isOrganic,
			mass: Math.round(postHeight * 15),
			flammable: isOrganic,
			harvestable: isOrganic ? 'wood' : null
		}
	}
}
function main() {
	console.log('Generating natural models...\n')
	console.log('=== Trees ===')
	for (let i = 1; i <= 10; i++) {
		const model = generatePineTree(i)
		saveModel(model.canvas, model.data, 'pine', `${i}.png`)
	}
	for (let i = 1; i <= 10; i++) {
		const model = generateBirchTree(i)
		saveModel(model.canvas, model.data, 'birch', `${i}.png`)
	}
	for (let i = 1; i <= 10; i++) {
		const model = generateWillowTree(i)
		saveModel(model.canvas, model.data, 'willow', `${i}.png`)
	}
	for (let i = 1; i <= 10; i++) {
		const model = generateCypressTree(i)
		saveModel(model.canvas, model.data, 'cypress', `${i}.png`)
	}
	for (let i = 1; i <= 10; i++) {
		const model = generateSycamoreTree(i)
		saveModel(model.canvas, model.data, 'sycamore', `${i}.png`)
	}
	console.log('\n=== Stones ===')
	for (let i = 1; i <= 20; i++) {
		const model = generateSmallStone(i)
		saveModel(model.canvas, model.data, 'stone-small', `${i}.png`)
	}
	for (let i = 1; i <= 20; i++) {
		const model = generateLargeStone(i)
		saveModel(model.canvas, model.data, 'stone-large', `${i}.png`)
	}
	console.log('\n=== Fences ===')
	for (let m = 0; m < fenceMaterials.length; m++) {
		for (let t = 0; t < fenceTypes.length; t++) {
			for (let v = 1; v <= 5; v++) {
				const model = generateFence(m, t, v)
				saveModel(model.canvas, model.data, `fence-${fenceMaterials[m].id}`, `${fenceTypes[t].id}-${v}.png`)
			}
		}
	}
	console.log('\n=== Complete ===')
	console.log('All models generated successfully!')
}
main()
