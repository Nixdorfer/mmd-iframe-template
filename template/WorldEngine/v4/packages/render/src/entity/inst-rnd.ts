import { GLContext } from '../gl/context'
import { VAO } from '../gl/buf'
import { Shader } from '../gl/shd'
import { Texture } from '../gl/tex'
import { ENTITY_STRIDE, entityVertexLayout } from '../shaders/entity'
import { INSTANCE_DATA_SIZE } from '../shaders/instanced'
import { type EntityId, type Transform } from '@engine/common'
import { type RndCfg } from '../gl/rnd-mode'
import { type LitManager } from '../gl/lit'
import { type ShadowMap } from '../gl/fbo'

export interface InstancedMeshData {
	verts: Float32Array
	indices: Uint16Array
}

export interface InstancedMesh {
	id: string
	vao: VAO
	vertCnt: number
	tex: Texture | null
	instanceBuf: WebGLBuffer
	instanceData: Float32Array
	instanceCnt: number
	maxInstances: number
	dirty: boolean
}

export interface InstanceData {
	entityId: EntityId
	transform: Transform
	tint: [number, number, number, number]
	visible: boolean
}

export class InstancedRenderer {
	ctx: GLContext
	meshes: Map<string, InstancedMesh>
	instances: Map<string, Map<EntityId, InstanceData>>
	shader: Shader | null

	constructor(ctx: GLContext) {
		this.ctx = ctx
		this.meshes = new Map()
		this.instances = new Map()
		this.shader = null
	}

	setShader(shd: Shader) {
		this.shader = shd
	}

	loadMesh(id: string, data: InstancedMeshData, tex: Texture | null = null, maxInstances: number = 1000) {
		const old = this.meshes.get(id)
		if (old) {
			old.vao.dispose()
			this.ctx.gl.deleteBuffer(old.instanceBuf)
		}
		const vao = new VAO(this.ctx.gl)
		vao.setVerts(data.verts)
		vao.setIndices(data.indices)
		vao.setLayout(entityVertexLayout(this.ctx.gl), ENTITY_STRIDE)
		if (this.shader) {
			vao.setup(name => this.shader!.attr(name))
		}
		const instanceBuf = this.ctx.gl.createBuffer()!
		const instanceData = new Float32Array(maxInstances * INSTANCE_DATA_SIZE)
		this.ctx.gl.bindBuffer(this.ctx.gl.ARRAY_BUFFER, instanceBuf)
		this.ctx.gl.bufferData(this.ctx.gl.ARRAY_BUFFER, instanceData.byteLength, this.ctx.gl.DYNAMIC_DRAW)
		this.meshes.set(id, {
			id,
			vao,
			vertCnt: data.indices.length,
			tex,
			instanceBuf,
			instanceData,
			instanceCnt: 0,
			maxInstances,
			dirty: true
		})
		this.instances.set(id, new Map())
	}

	unloadMesh(id: string) {
		const mesh = this.meshes.get(id)
		if (mesh) {
			mesh.vao.dispose()
			this.ctx.gl.deleteBuffer(mesh.instanceBuf)
			this.meshes.delete(id)
			this.instances.delete(id)
		}
	}

	hasMesh(id: string): boolean {
		return this.meshes.has(id)
	}

	addInstance(meshId: string, entityId: EntityId, transform: Transform, tint: [number, number, number, number] = [1, 1, 1, 1]) {
		const instMap = this.instances.get(meshId)
		const mesh = this.meshes.get(meshId)
		if (!instMap || !mesh) return
		if (instMap.size >= mesh.maxInstances) return
		instMap.set(entityId, {
			entityId,
			transform: { ...transform },
			tint,
			visible: true
		})
		mesh.dirty = true
	}

	updInstance(meshId: string, entityId: EntityId, transform: Transform) {
		const instMap = this.instances.get(meshId)
		const mesh = this.meshes.get(meshId)
		if (!instMap || !mesh) return
		const inst = instMap.get(entityId)
		if (inst) {
			inst.transform = { ...transform }
			mesh.dirty = true
		}
	}

	setInstanceTint(meshId: string, entityId: EntityId, tint: [number, number, number, number]) {
		const instMap = this.instances.get(meshId)
		const mesh = this.meshes.get(meshId)
		if (!instMap || !mesh) return
		const inst = instMap.get(entityId)
		if (inst) {
			inst.tint = tint
			mesh.dirty = true
		}
	}

	setInstanceVisible(meshId: string, entityId: EntityId, visible: boolean) {
		const instMap = this.instances.get(meshId)
		const mesh = this.meshes.get(meshId)
		if (!instMap || !mesh) return
		const inst = instMap.get(entityId)
		if (inst) {
			inst.visible = visible
			mesh.dirty = true
		}
	}

	removeInstance(meshId: string, entityId: EntityId) {
		const instMap = this.instances.get(meshId)
		const mesh = this.meshes.get(meshId)
		if (!instMap || !mesh) return
		instMap.delete(entityId)
		mesh.dirty = true
	}

	private updInstanceBuf(mesh: InstancedMesh, instMap: Map<EntityId, InstanceData>) {
		if (!mesh.dirty) return
		let idx = 0
		for (const inst of instMap.values()) {
			if (!inst.visible) continue
			const mtx = this.buildMtx(inst.transform)
			const offset = idx * INSTANCE_DATA_SIZE
			for (let i = 0; i < 16; i++) {
				mesh.instanceData[offset + i] = mtx[i]
			}
			mesh.instanceData[offset + 16] = inst.tint[0]
			mesh.instanceData[offset + 17] = inst.tint[1]
			mesh.instanceData[offset + 18] = inst.tint[2]
			mesh.instanceData[offset + 19] = inst.tint[3]
			idx++
		}
		mesh.instanceCnt = idx
		const { gl } = this.ctx
		gl.bindBuffer(gl.ARRAY_BUFFER, mesh.instanceBuf)
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, mesh.instanceData.subarray(0, idx * INSTANCE_DATA_SIZE))
		mesh.dirty = false
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
		for (const [meshId, mesh] of this.meshes) {
			const instMap = this.instances.get(meshId)
			if (!instMap || instMap.size === 0) continue
			this.updInstanceBuf(mesh, instMap)
			if (mesh.instanceCnt === 0) continue
			if (mesh.tex) {
				mesh.tex.bind(0)
				this.shader.setFloat('uUseTex', 1)
				this.shader.setInt('uTex', 0)
			} else {
				this.shader.setFloat('uUseTex', 0)
			}
			mesh.vao.bind()
			gl.bindBuffer(gl.ARRAY_BUFFER, mesh.instanceBuf)
			const modelLoc = this.shader.attr('aModel')
			const tintLoc = this.shader.attr('aTint')
			if (modelLoc >= 0) {
				for (let i = 0; i < 4; i++) {
					gl.enableVertexAttribArray(modelLoc + i)
					gl.vertexAttribPointer(modelLoc + i, 4, gl.FLOAT, false, INSTANCE_DATA_SIZE * 4, i * 16)
					gl.vertexAttribDivisor(modelLoc + i, 1)
				}
			}
			if (tintLoc >= 0) {
				gl.enableVertexAttribArray(tintLoc)
				gl.vertexAttribPointer(tintLoc, 4, gl.FLOAT, false, INSTANCE_DATA_SIZE * 4, 64)
				gl.vertexAttribDivisor(tintLoc, 1)
			}
			gl.drawElementsInstanced(gl.TRIANGLES, mesh.vertCnt, gl.UNSIGNED_SHORT, 0, mesh.instanceCnt)
			if (modelLoc >= 0) {
				for (let i = 0; i < 4; i++) {
					gl.vertexAttribDivisor(modelLoc + i, 0)
				}
			}
			if (tintLoc >= 0) {
				gl.vertexAttribDivisor(tintLoc, 0)
			}
			mesh.vao.unbind()
		}
	}

	dispose() {
		for (const mesh of this.meshes.values()) {
			mesh.vao.dispose()
			this.ctx.gl.deleteBuffer(mesh.instanceBuf)
		}
		this.meshes.clear()
		this.instances.clear()
	}
}
