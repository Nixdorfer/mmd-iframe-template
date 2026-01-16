import { GLContext } from '../gl/context'
import { VAO } from '../gl/buf'
import { Shader } from '../gl/shd'
import { TERRAIN_STRIDE, terrainVertexLayout } from '../shaders/terrain'
import { CHUNK_SIZE, CHUNK_HEIGHT, type BlockId, type ChunkPos } from '@engine/common'
import { type RndCfg } from '../gl/rnd-mode'

export interface TerrainChunkMesh {
	pos: ChunkPos
	vao: VAO
	vertCnt: number
}

export class TerrainRenderer {
	ctx: GLContext
	meshes: Map<string, TerrainChunkMesh>
	shader: Shader | null

	constructor(ctx: GLContext) {
		this.ctx = ctx
		this.meshes = new Map()
		this.shader = null
	}

	setShader(shd: Shader) {
		this.shader = shd
	}

	private key(pos: ChunkPos): string {
		return `${pos.x},${pos.y},${pos.z}`
	}

	buildMesh(pos: ChunkPos, blocks: BlockId[], getBlockClr: (id: BlockId) => [number, number, number]) {
		const key = this.key(pos)
		const old = this.meshes.get(key)
		if (old) old.vao.dispose()
		const verts: number[] = []
		const indices: number[] = []
		let vertIdx = 0
		const wx = pos.x * CHUNK_SIZE
		const wy = pos.y * CHUNK_SIZE
		const wz = pos.z * CHUNK_HEIGHT
		const getBlock = (x: number, y: number, z: number): BlockId => {
			if (x < 0 || x >= CHUNK_SIZE || y < 0 || y >= CHUNK_SIZE || z < 0 || z >= CHUNK_HEIGHT) return 0
			return blocks[z * CHUNK_SIZE * CHUNK_SIZE + y * CHUNK_SIZE + x]
		}
		const addFace = (
			x: number, y: number, z: number,
			nom: [number, number, number],
			verts4: [number, number, number][],
			clr: [number, number, number],
			ao: [number, number, number, number]
		) => {
			const uvs: [number, number][] = [[0, 0], [1, 0], [1, 1], [0, 1]]
			for (let i = 0; i < 4; i++) {
				const [vx, vy, vz] = verts4[i]
				verts.push(
					wx + x + vx, wy + y + vy, wz + z + vz,
					nom[0], nom[1], nom[2],
					uvs[i][0], uvs[i][1],
					clr[0], clr[1], clr[2],
					ao[i]
				)
			}
			indices.push(vertIdx, vertIdx + 1, vertIdx + 2, vertIdx, vertIdx + 2, vertIdx + 3)
			vertIdx += 4
		}
		const calAO = (s1: boolean, s2: boolean, c: boolean): number => {
			if (s1 && s2) return 0.4
			return 1.0 - (Number(s1) + Number(s2) + Number(c)) * 0.15
		}
		for (let z = 0; z < CHUNK_HEIGHT; z++) {
			for (let y = 0; y < CHUNK_SIZE; y++) {
				for (let x = 0; x < CHUNK_SIZE; x++) {
					const block = getBlock(x, y, z)
					if (block === 0) continue
					const clr = getBlockClr(block)
					if (getBlock(x, y, z + 1) === 0) {
						const ao: [number, number, number, number] = [
							calAO(getBlock(x - 1, y, z + 1) !== 0, getBlock(x, y - 1, z + 1) !== 0, getBlock(x - 1, y - 1, z + 1) !== 0),
							calAO(getBlock(x + 1, y, z + 1) !== 0, getBlock(x, y - 1, z + 1) !== 0, getBlock(x + 1, y - 1, z + 1) !== 0),
							calAO(getBlock(x + 1, y, z + 1) !== 0, getBlock(x, y + 1, z + 1) !== 0, getBlock(x + 1, y + 1, z + 1) !== 0),
							calAO(getBlock(x - 1, y, z + 1) !== 0, getBlock(x, y + 1, z + 1) !== 0, getBlock(x - 1, y + 1, z + 1) !== 0)
						]
						addFace(x, y, z, [0, 0, 1], [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], clr, ao)
					}
					if (getBlock(x, y, z - 1) === 0) {
						addFace(x, y, z, [0, 0, -1], [[0, 1, 0], [1, 1, 0], [1, 0, 0], [0, 0, 0]], clr, [1, 1, 1, 1])
					}
					if (getBlock(x + 1, y, z) === 0) {
						addFace(x, y, z, [1, 0, 0], [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]], clr, [1, 1, 1, 1])
					}
					if (getBlock(x - 1, y, z) === 0) {
						addFace(x, y, z, [-1, 0, 0], [[0, 1, 0], [0, 0, 0], [0, 0, 1], [0, 1, 1]], clr, [1, 1, 1, 1])
					}
					if (getBlock(x, y + 1, z) === 0) {
						addFace(x, y, z, [0, 1, 0], [[1, 1, 0], [0, 1, 0], [0, 1, 1], [1, 1, 1]], clr, [1, 1, 1, 1])
					}
					if (getBlock(x, y - 1, z) === 0) {
						addFace(x, y, z, [0, -1, 0], [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], clr, [1, 1, 1, 1])
					}
				}
			}
		}
		if (verts.length === 0) {
			this.meshes.delete(key)
			return
		}
		const vao = new VAO(this.ctx.gl)
		vao.setVerts(new Float32Array(verts))
		vao.setIndices(new Uint16Array(indices))
		vao.setLayout(terrainVertexLayout(this.ctx.gl), TERRAIN_STRIDE)
		if (this.shader) {
			vao.setup(name => this.shader!.attr(name))
		}
		this.meshes.set(key, { pos, vao, vertCnt: indices.length })
	}

	render(
		viewProj: Float32Array,
		ambient: [number, number, number],
		sunDir: [number, number, number],
		sunClr: [number, number, number],
		camPos: [number, number, number],
		rndCfg: RndCfg
	) {
		if (!this.shader) return
		const { gl } = this.ctx
		this.shader.use()
		this.shader.setMat4('uViewProj', viewProj)
		this.shader.setMat4('uModel', new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]))
		this.shader.setVec3('uAmbient', ...ambient)
		this.shader.setVec3('uSunDir', ...sunDir)
		this.shader.setVec3('uSunClr', ...sunClr)
		this.shader.setFloat('uUseTex', 0)
		this.shader.setVec3('uCamPos', ...camPos)
		this.shader.setInt('uRndMode', rndCfg.mode)
		this.shader.setFloat('uAoStr', rndCfg.aoStrength)
		this.shader.setFloat('uSpecPower', rndCfg.specularPower)
		this.shader.setFloat('uRimPower', rndCfg.rimPower)
		this.shader.setFloat('uSmoothness', rndCfg.smoothness)
		this.shader.setFloat('uSteps', rndCfg.steps)
		for (const mesh of this.meshes.values()) {
			mesh.vao.bind()
			gl.drawElements(gl.TRIANGLES, mesh.vertCnt, gl.UNSIGNED_SHORT, 0)
			mesh.vao.unbind()
		}
	}

	unload(pos: ChunkPos) {
		const key = this.key(pos)
		const mesh = this.meshes.get(key)
		if (mesh) {
			mesh.vao.dispose()
			this.meshes.delete(key)
		}
	}

	dispose() {
		for (const mesh of this.meshes.values()) {
			mesh.vao.dispose()
		}
		this.meshes.clear()
	}
}
