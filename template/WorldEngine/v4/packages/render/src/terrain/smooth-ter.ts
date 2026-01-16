import { GLContext } from '../gl/context'
import { VAO } from '../gl/buf'
import { Shader } from '../gl/shd'
import { TERRAIN_STRIDE, terrainVertexLayout } from '../shaders/terrain'
import { CHUNK_SIZE, type ChunkPos } from '@engine/common'
import { type RndCfg } from '../gl/rnd-mode'

export interface SmoothTerrainMesh {
	pos: ChunkPos
	solidVao: VAO
	solidCnt: number
	waterVao: VAO | null
	waterCnt: number
}

export interface HeightSampler {
	getHeight(wx: number, wy: number): number
	isWater(wx: number, wy: number): boolean
	getColor(wx: number, wy: number): [number, number, number]
}

export class SmoothTerrainRenderer {
	ctx: GLContext
	meshes: Map<string, SmoothTerrainMesh>
	terrainShd: Shader | null
	waterShd: Shader | null
	resolution: number

	constructor(ctx: GLContext, resolution: number = 4) {
		this.ctx = ctx
		this.meshes = new Map()
		this.terrainShd = null
		this.waterShd = null
		this.resolution = resolution
	}

	setTerrainShader(shd: Shader) {
		this.terrainShd = shd
	}

	setWaterShader(shd: Shader) {
		this.waterShd = shd
	}

	private key(pos: ChunkPos): string {
		return `${pos.x},${pos.y},${pos.z}`
	}

	private bicubic(p: number[][], x: number, y: number): number {
		const cubic = (a: number, b: number, c: number, d: number, t: number): number => {
			return b + 0.5 * t * (c - a + t * (2 * a - 5 * b + 4 * c - d + t * (3 * (b - c) + d - a)))
		}
		const col = [
			cubic(p[0][0], p[1][0], p[2][0], p[3][0], y),
			cubic(p[0][1], p[1][1], p[2][1], p[3][1], y),
			cubic(p[0][2], p[1][2], p[2][2], p[3][2], y),
			cubic(p[0][3], p[1][3], p[2][3], p[3][3], y)
		]
		return cubic(col[0], col[1], col[2], col[3], x)
	}

	buildMesh(pos: ChunkPos, sampler: HeightSampler) {
		const key = this.key(pos)
		const old = this.meshes.get(key)
		if (old) {
			old.solidVao.dispose()
			if (old.waterVao) old.waterVao.dispose()
		}
		const wx = pos.x * CHUNK_SIZE
		const wy = pos.y * CHUNK_SIZE
		const _wz = pos.z
		const step = 1 / this.resolution
		const _gridSize = CHUNK_SIZE * this.resolution + 1
		const heights: number[][] = []
		const colors: [number, number, number][][] = []
		const waters: boolean[][] = []
		for (let gy = -1; gy <= CHUNK_SIZE + 2; gy++) {
			heights[gy + 1] = []
			colors[gy + 1] = []
			waters[gy + 1] = []
			for (let gx = -1; gx <= CHUNK_SIZE + 2; gx++) {
				heights[gy + 1][gx + 1] = sampler.getHeight(wx + gx, wy + gy)
				colors[gy + 1][gx + 1] = sampler.getColor(wx + gx, wy + gy)
				waters[gy + 1][gx + 1] = sampler.isWater(wx + gx, wy + gy)
			}
		}
		const getH = (gx: number, gy: number): number => heights[gy + 1][gx + 1]
		const getClr = (gx: number, gy: number): [number, number, number] => colors[gy + 1][gx + 1]
		const isWat = (gx: number, gy: number): boolean => waters[gy + 1][gx + 1]
		const smoothH = (fx: number, fy: number): number => {
			const ix = Math.floor(fx)
			const iy = Math.floor(fy)
			const tx = fx - ix
			const ty = fy - iy
			const p = [
				[getH(ix - 1, iy - 1), getH(ix, iy - 1), getH(ix + 1, iy - 1), getH(ix + 2, iy - 1)],
				[getH(ix - 1, iy), getH(ix, iy), getH(ix + 1, iy), getH(ix + 2, iy)],
				[getH(ix - 1, iy + 1), getH(ix, iy + 1), getH(ix + 1, iy + 1), getH(ix + 2, iy + 1)],
				[getH(ix - 1, iy + 2), getH(ix, iy + 2), getH(ix + 1, iy + 2), getH(ix + 2, iy + 2)]
			]
			return this.bicubic(p, tx, ty)
		}
		const calNom = (fx: number, fy: number): [number, number, number] => {
			const eps = 0.1
			const hL = smoothH(fx - eps, fy)
			const hR = smoothH(fx + eps, fy)
			const hD = smoothH(fx, fy - eps)
			const hU = smoothH(fx, fy + eps)
			const dx = (hR - hL) / (2 * eps)
			const dy = (hU - hD) / (2 * eps)
			const len = Math.sqrt(dx * dx + dy * dy + 1)
			return [-dx / len, -dy / len, 1 / len]
		}
		const solidVerts: number[] = []
		const solidIdx: number[] = []
		const waterVerts: number[] = []
		const waterIdx: number[] = []
		let solidVi = 0
		let waterVi = 0
		for (let gy = 0; gy < CHUNK_SIZE; gy++) {
			for (let gx = 0; gx < CHUNK_SIZE; gx++) {
				const clr = getClr(gx, gy)
				const water = isWat(gx, gy)
				for (let sy = 0; sy < this.resolution; sy++) {
					for (let sx = 0; sx < this.resolution; sx++) {
						const fx0 = gx + sx * step
						const fy0 = gy + sy * step
						const fx1 = gx + (sx + 1) * step
						const fy1 = gy + (sy + 1) * step
						const h00 = smoothH(fx0, fy0)
						const h10 = smoothH(fx1, fy0)
						const h01 = smoothH(fx0, fy1)
						const h11 = smoothH(fx1, fy1)
						const n00 = calNom(fx0, fy0)
						const n10 = calNom(fx1, fy0)
						const n01 = calNom(fx0, fy1)
						const n11 = calNom(fx1, fy1)
						const verts = water ? waterVerts : solidVerts
						const idx = water ? waterIdx : solidIdx
						const vi = water ? waterVi : solidVi
						verts.push(
							wx + fx0, wy + fy0, h00,
							n00[0], n00[1], n00[2],
							sx * step, sy * step,
							clr[0], clr[1], clr[2], 1.0,
							wx + fx1, wy + fy0, h10,
							n10[0], n10[1], n10[2],
							(sx + 1) * step, sy * step,
							clr[0], clr[1], clr[2], 1.0,
							wx + fx1, wy + fy1, h11,
							n11[0], n11[1], n11[2],
							(sx + 1) * step, (sy + 1) * step,
							clr[0], clr[1], clr[2], 1.0,
							wx + fx0, wy + fy1, h01,
							n01[0], n01[1], n01[2],
							sx * step, (sy + 1) * step,
							clr[0], clr[1], clr[2], 1.0
						)
						idx.push(vi, vi + 1, vi + 2, vi, vi + 2, vi + 3)
						if (water) waterVi += 4
						else solidVi += 4
					}
				}
			}
		}
		let solidVao: VAO | null = null
		if (solidVerts.length > 0) {
			solidVao = new VAO(this.ctx.gl)
			solidVao.setVerts(new Float32Array(solidVerts))
			solidVao.setIndices(new Uint32Array(solidIdx))
			solidVao.setLayout(terrainVertexLayout(this.ctx.gl), TERRAIN_STRIDE)
			if (this.terrainShd) {
				solidVao.setup(name => this.terrainShd!.attr(name))
			}
		}
		let waterVao: VAO | null = null
		if (waterVerts.length > 0) {
			waterVao = new VAO(this.ctx.gl)
			waterVao.setVerts(new Float32Array(waterVerts))
			waterVao.setIndices(new Uint32Array(waterIdx))
			waterVao.setLayout(terrainVertexLayout(this.ctx.gl), TERRAIN_STRIDE)
			if (this.waterShd) {
				waterVao.setup(name => this.waterShd!.attr(name))
			}
		}
		if (solidVao) {
			this.meshes.set(key, {
				pos,
				solidVao,
				solidCnt: solidIdx.length,
				waterVao,
				waterCnt: waterIdx.length
			})
		}
	}

	render(
		viewProj: Float32Array,
		ambient: [number, number, number],
		sunDir: [number, number, number],
		sunClr: [number, number, number],
		camPos: [number, number, number],
		time: number,
		rndCfg: RndCfg
	) {
		const { gl } = this.ctx
		if (this.terrainShd) {
			this.terrainShd.use()
			this.terrainShd.setMat4('uViewProj', viewProj)
			this.terrainShd.setMat4('uModel', new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]))
			this.terrainShd.setVec3('uAmbient', ...ambient)
			this.terrainShd.setVec3('uSunDir', ...sunDir)
			this.terrainShd.setVec3('uSunClr', ...sunClr)
			this.terrainShd.setFloat('uUseTex', 0)
			this.terrainShd.setVec3('uCamPos', ...camPos)
			this.terrainShd.setInt('uRndMode', rndCfg.mode)
			this.terrainShd.setFloat('uAoStr', rndCfg.aoStrength)
			this.terrainShd.setFloat('uSpecPower', rndCfg.specularPower)
			this.terrainShd.setFloat('uRimPower', rndCfg.rimPower)
			this.terrainShd.setFloat('uSmoothness', rndCfg.smoothness)
			this.terrainShd.setFloat('uSteps', rndCfg.steps)
			for (const mesh of this.meshes.values()) {
				mesh.solidVao.bind()
				gl.drawElements(gl.TRIANGLES, mesh.solidCnt, gl.UNSIGNED_INT, 0)
				mesh.solidVao.unbind()
			}
		}
		if (this.waterShd) {
			gl.enable(gl.BLEND)
			gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
			this.waterShd.use()
			this.waterShd.setMat4('uViewProj', viewProj)
			this.waterShd.setMat4('uModel', new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]))
			this.waterShd.setVec3('uAmbient', ...ambient)
			this.waterShd.setVec3('uSunDir', ...sunDir)
			this.waterShd.setVec3('uSunClr', ...sunClr)
			this.waterShd.setVec3('uCamPos', ...camPos)
			this.waterShd.setFloat('uTime', time)
			this.waterShd.setInt('uRndMode', rndCfg.mode)
			this.waterShd.setFloat('uSpecPower', rndCfg.specularPower)
			this.waterShd.setFloat('uRimPower', rndCfg.rimPower)
			this.waterShd.setFloat('uSmoothness', rndCfg.smoothness)
			this.waterShd.setFloat('uSteps', rndCfg.steps)
			for (const mesh of this.meshes.values()) {
				if (mesh.waterVao) {
					mesh.waterVao.bind()
					gl.drawElements(gl.TRIANGLES, mesh.waterCnt, gl.UNSIGNED_INT, 0)
					mesh.waterVao.unbind()
				}
			}
			gl.disable(gl.BLEND)
		}
	}

	unload(pos: ChunkPos) {
		const key = this.key(pos)
		const mesh = this.meshes.get(key)
		if (mesh) {
			mesh.solidVao.dispose()
			if (mesh.waterVao) mesh.waterVao.dispose()
			this.meshes.delete(key)
		}
	}

	dispose() {
		for (const mesh of this.meshes.values()) {
			mesh.solidVao.dispose()
			if (mesh.waterVao) mesh.waterVao.dispose()
		}
		this.meshes.clear()
	}
}
