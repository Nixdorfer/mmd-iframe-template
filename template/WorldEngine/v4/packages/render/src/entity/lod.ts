import { GLContext } from '../gl/context'
import { VAO } from '../gl/buf'
import { Shader } from '../gl/shd'
import { Texture } from '../gl/tex'
import { ENTITY_STRIDE, entityVertexLayout } from '../shaders/entity'
import { type EntityId, type Transform } from '@engine/common'
import { RndMode, type RndCfg } from '../gl/rnd-mode'
import { type LitManager } from '../gl/lit'
import { type ShadowMap } from '../gl/fbo'

export interface LODLevel {
	vao: VAO
	vertCnt: number
	maxDist: number
}

export interface LODMesh {
	id: string
	levels: LODLevel[]
	tex: Texture | null
}

export interface LODInstance {
	entityId: EntityId
	meshId: string
	transform: Transform
	tint: [number, number, number, number]
	visible: boolean
	curLOD: number
}

export interface LODMeshData {
	verts: Float32Array
	indices: Uint16Array
	maxDist: number
}

export type DeviceTier = 'low' | 'mid' | 'high'

export interface LODCfg {
	tier: DeviceTier
	distMul: number
	maxInstances: number
	cullDist: number
}

const LOD_PRESETS: Record<DeviceTier, LODCfg> = {
	low: { tier: 'low', distMul: 0.5, maxInstances: 500, cullDist: 50 },
	mid: { tier: 'mid', distMul: 0.75, maxInstances: 2000, cullDist: 100 },
	high: { tier: 'high', distMul: 1.0, maxInstances: 10000, cullDist: 200 }
}

function detectTier(): DeviceTier {
	if (typeof navigator === 'undefined') return 'mid'
	const ua = navigator.userAgent.toLowerCase()
	const isMobile = /android|iphone|ipad|mobile/i.test(ua)
	const mem = (navigator as any).deviceMemory ?? 4
	const cores = navigator.hardwareConcurrency ?? 4
	if (isMobile) {
		if (mem <= 2 || cores <= 4) return 'low'
		if (mem <= 4) return 'mid'
		return 'high'
	}
	if (mem <= 4 || cores <= 4) return 'mid'
	return 'high'
}

export class LODManager {
	ctx: GLContext
	meshes: Map<string, LODMesh>
	instances: Map<EntityId, LODInstance>
	shader: Shader | null
	outlineShader: Shader | null
	camPos: [number, number, number]
	cfg: LODCfg
	visCnt: number

	constructor(ctx: GLContext, tier?: DeviceTier) {
		this.ctx = ctx
		this.meshes = new Map()
		this.instances = new Map()
		this.shader = null
		this.outlineShader = null
		this.camPos = [0, 0, 0]
		this.cfg = LOD_PRESETS[tier ?? detectTier()]
		this.visCnt = 0
	}

	setTier(tier: DeviceTier) {
		this.cfg = LOD_PRESETS[tier]
	}

	setDistMul(mul: number) {
		this.cfg.distMul = Math.max(0.1, Math.min(2.0, mul))
	}

	setCullDist(dist: number) {
		this.cfg.cullDist = Math.max(10, dist)
	}

	setShader(shd: Shader) {
		this.shader = shd
	}

	setOutlineShader(shd: Shader) {
		this.outlineShader = shd
	}

	loadMesh(id: string, levels: LODMeshData[], tex: Texture | null = null) {
		const old = this.meshes.get(id)
		if (old) {
			for (const level of old.levels) {
				level.vao.dispose()
			}
		}
		const lodLevels: LODLevel[] = []
		levels.sort((a, b) => a.maxDist - b.maxDist)
		for (const level of levels) {
			const vao = new VAO(this.ctx.gl)
			vao.setVerts(level.verts)
			vao.setIndices(level.indices)
			vao.setLayout(entityVertexLayout(this.ctx.gl), ENTITY_STRIDE)
			if (this.shader) {
				vao.setup(name => this.shader!.attr(name))
			}
			lodLevels.push({
				vao,
				vertCnt: level.indices.length,
				maxDist: level.maxDist
			})
		}
		this.meshes.set(id, { id, levels: lodLevels, tex })
	}

	unloadMesh(id: string) {
		const mesh = this.meshes.get(id)
		if (mesh) {
			for (const level of mesh.levels) {
				level.vao.dispose()
			}
			this.meshes.delete(id)
		}
	}

	hasMesh(id: string): boolean {
		return this.meshes.has(id)
	}

	addInstance(entityId: EntityId, meshId: string, transform: Transform, tint: [number, number, number, number] = [1, 1, 1, 1]) {
		this.instances.set(entityId, {
			entityId,
			meshId,
			transform: { ...transform },
			tint,
			visible: true,
			curLOD: 0
		})
	}

	updInstance(entityId: EntityId, transform: Transform) {
		const inst = this.instances.get(entityId)
		if (inst) {
			inst.transform = { ...transform }
		}
	}

	setInstanceTint(entityId: EntityId, tint: [number, number, number, number]) {
		const inst = this.instances.get(entityId)
		if (inst) {
			inst.tint = tint
		}
	}

	setInstanceVisible(entityId: EntityId, visible: boolean) {
		const inst = this.instances.get(entityId)
		if (inst) {
			inst.visible = visible
		}
	}

	removeInstance(entityId: EntityId) {
		this.instances.delete(entityId)
	}

	private calDist(pos: { x: number; y: number; z: number }): number {
		const dx = pos.x - this.camPos[0]
		const dy = pos.y - this.camPos[1]
		const dz = pos.z - this.camPos[2]
		return Math.sqrt(dx * dx + dy * dy + dz * dz)
	}

	private selectLOD(mesh: LODMesh, dist: number): number {
		const adjDist = dist / this.cfg.distMul
		for (let i = 0; i < mesh.levels.length; i++) {
			if (adjDist <= mesh.levels[i].maxDist) {
				return i
			}
		}
		return mesh.levels.length - 1
	}

	updLODs() {
		this.visCnt = 0
		const cullDist = this.cfg.cullDist
		const maxInst = this.cfg.maxInstances
		for (const inst of this.instances.values()) {
			if (!inst.visible) continue
			const mesh = this.meshes.get(inst.meshId)
			if (!mesh) continue
			const dist = this.calDist(inst.transform.pos)
			if (dist > cullDist || this.visCnt >= maxInst) {
				inst.curLOD = -1
				continue
			}
			inst.curLOD = this.selectLOD(mesh, dist)
			this.visCnt++
		}
	}

	private buildMtx(t: Transform): Float32Array {
		const { pos, rot, scl } = t
		const cx = Math.cos(rot.x), sx = Math.sin(rot.x)
		const cy = Math.cos(rot.y), sy = Math.sin(rot.y)
		const cz = Math.cos(rot.z), sz = Math.sin(rot.z)
		return new Float32Array([
			scl.x * (cy * cz), scl.x * (cy * sz), scl.x * (-sy), 0,
			scl.y * (sx * sy * cz - cx * sz), scl.y * (sx * sy * sz + cx * cz), scl.y * (sx * cy), 0,
			scl.z * (cx * sy * cz + sx * sz), scl.z * (cx * sy * sz - sx * cz), scl.z * (cx * cy), 0,
			pos.x, pos.y, pos.z, 1
		])
	}

	render(
		viewProj: Float32Array,
		ambient: [number, number, number],
		sunDir: [number, number, number],
		sunClr: [number, number, number],
		camPos: [number, number, number],
		rndCfg: RndCfg,
		litMgr: LitManager | null = null,
		shadowMap: ShadowMap | null = null,
		litMtx: Float32Array | null = null
	) {
		this.camPos = camPos
		this.updLODs()
		if (rndCfg.mode === RndMode.ANIME && rndCfg.outlineEntity) {
			this.renderOutline(viewProj, rndCfg)
		}
		this.renderEntities(viewProj, ambient, sunDir, sunClr, camPos, rndCfg, litMgr, shadowMap, litMtx)
	}

	private renderOutline(viewProj: Float32Array, rndCfg: RndCfg) {
		if (!this.outlineShader) return
		const { gl } = this.ctx
		gl.cullFace(gl.FRONT)
		this.outlineShader.use()
		this.outlineShader.setMat4('uViewProj', viewProj)
		this.outlineShader.setFloat('uOutlineWidth', rndCfg.outlineWidth)
		this.outlineShader.setVec3('uOutlineClr', rndCfg.outlineClr.x, rndCfg.outlineClr.y, rndCfg.outlineClr.z)
		for (const inst of this.instances.values()) {
			if (!inst.visible || inst.curLOD < 0) continue
			const mesh = this.meshes.get(inst.meshId)
			if (!mesh || mesh.levels.length === 0) continue
			const level = mesh.levels[inst.curLOD]
			this.outlineShader.setMat4('uModel', this.buildMtx(inst.transform))
			level.vao.bind()
			gl.drawElements(gl.TRIANGLES, level.vertCnt, gl.UNSIGNED_SHORT, 0)
			level.vao.unbind()
		}
		gl.cullFace(gl.BACK)
	}

	private renderEntities(
		viewProj: Float32Array,
		ambient: [number, number, number],
		sunDir: [number, number, number],
		sunClr: [number, number, number],
		camPos: [number, number, number],
		rndCfg: RndCfg,
		litMgr: LitManager | null,
		shadowMap: ShadowMap | null,
		litMtx: Float32Array | null
	) {
		if (!this.shader) return
		const { gl } = this.ctx
		this.shader.use()
		this.shader.setMat4('uViewProj', viewProj)
		this.shader.setVec3('uAmbient', ...ambient)
		this.shader.setVec3('uSunDir', ...sunDir)
		this.shader.setVec3('uSunClr', ...sunClr)
		this.shader.setVec3('uCamPos', ...camPos)
		this.shader.setInt('uRndMode', rndCfg.mode)
		this.shader.setFloat('uSpecPower', rndCfg.specularPower)
		this.shader.setFloat('uRimPower', rndCfg.rimPower)
		this.shader.setFloat('uSmoothness', rndCfg.smoothness)
		this.shader.setFloat('uSteps', rndCfg.steps)
		if (litMtx) {
			this.shader.setMat4('uLitMtx', litMtx)
		}
		if (rndCfg.shadowEab && shadowMap) {
			this.shader.setInt('uShadowEab', 1)
			shadowMap.bindTex(1)
			this.shader.setInt('uShadowMap', 1)
			this.shader.setFloat('uShadowBias', rndCfg.shadowBias)
			this.shader.setFloat('uShadowStr', rndCfg.shadowIntensity)
		} else {
			this.shader.setInt('uShadowEab', 0)
		}
		if (litMgr) {
			this.shader.setInt('uPntLitCnt', litMgr.pntCnt())
			this.shader.setVec3Arr('uPntLitPos[0]', litMgr.pntPosArr)
			this.shader.setVec3Arr('uPntLitClr[0]', litMgr.pntClrArr)
			this.shader.setFloatArr('uPntLitRange[0]', litMgr.pntRangeArr)
			this.shader.setFloatArr('uPntLitIntensity[0]', litMgr.pntIntensityArr)
			this.shader.setInt('uSptLitCnt', litMgr.sptCnt())
			this.shader.setVec3Arr('uSptLitPos[0]', litMgr.sptPosArr)
			this.shader.setVec3Arr('uSptLitDir[0]', litMgr.sptDirArr)
			this.shader.setVec3Arr('uSptLitClr[0]', litMgr.sptClrArr)
			this.shader.setFloatArr('uSptLitRange[0]', litMgr.sptRangeArr)
			this.shader.setFloatArr('uSptLitAngle[0]', litMgr.sptAngleArr)
			this.shader.setFloatArr('uSptLitPenumbra[0]', litMgr.sptPenumbraArr)
		} else {
			this.shader.setInt('uPntLitCnt', 0)
			this.shader.setInt('uSptLitCnt', 0)
		}
		for (const inst of this.instances.values()) {
			if (!inst.visible || inst.curLOD < 0) continue
			const mesh = this.meshes.get(inst.meshId)
			if (!mesh || mesh.levels.length === 0) continue
			const level = mesh.levels[inst.curLOD]
			this.shader.setMat4('uModel', this.buildMtx(inst.transform))
			this.shader.setVec4('uTint', ...inst.tint)
			this.shader.setFloat('uUseNomTex', 0)
			if (mesh.tex) {
				mesh.tex.bind(0)
				this.shader.setFloat('uUseTex', 1)
				this.shader.setInt('uTex', 0)
			} else {
				this.shader.setFloat('uUseTex', 0)
			}
			level.vao.bind()
			gl.drawElements(gl.TRIANGLES, level.vertCnt, gl.UNSIGNED_SHORT, 0)
			level.vao.unbind()
		}
	}

	getLODStats(): { total: number; perLevel: number[]; culled: number } {
		const stats = { total: 0, perLevel: [] as number[], culled: 0 }
		for (const inst of this.instances.values()) {
			if (!inst.visible) continue
			if (inst.curLOD < 0) {
				stats.culled++
				continue
			}
			stats.total++
			while (stats.perLevel.length <= inst.curLOD) {
				stats.perLevel.push(0)
			}
			stats.perLevel[inst.curLOD]++
		}
		return stats
	}

	dispose() {
		for (const mesh of this.meshes.values()) {
			for (const level of mesh.levels) {
				level.vao.dispose()
			}
		}
		this.meshes.clear()
		this.instances.clear()
	}
}

export function genLODMesh(
	verts: Float32Array,
	indices: Uint16Array,
	targetRatio: number
): { verts: Float32Array; indices: Uint16Array } {
	const _vertCount = verts.length / 11
	const triCount = indices.length / 3
	const targetTris = Math.max(1, Math.floor(triCount * targetRatio))
	if (targetTris >= triCount) {
		return { verts: new Float32Array(verts), indices: new Uint16Array(indices) }
	}
	const usedVerts = new Set<number>()
	const newIndices: number[] = []
	const step = Math.ceil(triCount / targetTris)
	for (let i = 0; i < indices.length; i += 3 * step) {
		if (i + 2 < indices.length) {
			newIndices.push(indices[i], indices[i + 1], indices[i + 2])
			usedVerts.add(indices[i])
			usedVerts.add(indices[i + 1])
			usedVerts.add(indices[i + 2])
		}
	}
	const vertMap = new Map<number, number>()
	let newVertIdx = 0
	for (const v of usedVerts) {
		vertMap.set(v, newVertIdx++)
	}
	const newVerts = new Float32Array(usedVerts.size * 11)
	for (const [oldIdx, newIdx] of vertMap) {
		for (let i = 0; i < 11; i++) {
			newVerts[newIdx * 11 + i] = verts[oldIdx * 11 + i]
		}
	}
	const remappedIndices = new Uint16Array(newIndices.length)
	for (let i = 0; i < newIndices.length; i++) {
		remappedIndices[i] = vertMap.get(newIndices[i])!
	}
	return { verts: newVerts, indices: remappedIndices }
}
