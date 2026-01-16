import { GLContext } from '../gl/context'
import { VAO } from '../gl/buf'
import { Shader } from '../gl/shd'
import { Texture } from '../gl/tex'
import { SKELETAL_STRIDE, skeletalVertexLayout, MAX_BONES } from '../shaders/skeletal'
import { type EntityId, type Transform } from '@engine/common'
import { RndMode, type RndCfg } from '../gl/rnd-mode'
import { type LitManager } from '../gl/lit'
import { type ShadowMap } from '../gl/fbo'

export interface SkeletalMeshData {
	verts: Float32Array
	indices: Uint16Array
}

export interface BoneDef {
	name: string
	parent: number
	invBindMtx: Float32Array
}

export interface SkeletalMesh {
	id: string
	vao: VAO
	vertCnt: number
	tex: Texture | null
	bones: BoneDef[]
}

export interface AnimState {
	curAnim: string
	time: number
	blendAnim: string | null
	blendFactor: number
	speed: number
}

export interface SkeletalInstance {
	entityId: EntityId
	meshId: string
	transform: Transform
	tint: [number, number, number, number]
	visible: boolean
	animState: AnimState
	boneMtx: Float32Array
}

export interface AnimFrame {
	boneTransforms: Float32Array[]
}

export interface AnimClip {
	name: string
	frames: AnimFrame[]
	duration: number
	loop: boolean
}

export class SkeletalRenderer {
	ctx: GLContext
	meshes: Map<string, SkeletalMesh>
	instances: Map<EntityId, SkeletalInstance>
	anims: Map<string, AnimClip>
	shader: Shader | null
	outlineShader: Shader | null
	boneMtxBuf: Float32Array
	identityMtx: Float32Array

	constructor(ctx: GLContext) {
		this.ctx = ctx
		this.meshes = new Map()
		this.instances = new Map()
		this.anims = new Map()
		this.shader = null
		this.outlineShader = null
		this.boneMtxBuf = new Float32Array(MAX_BONES * 16)
		this.identityMtx = new Float32Array([
			1, 0, 0, 0,
			0, 1, 0, 0,
			0, 0, 1, 0,
			0, 0, 0, 1
		])
		this.iniIdentityBones()
	}

	private iniIdentityBones() {
		for (let i = 0; i < MAX_BONES; i++) {
			for (let j = 0; j < 16; j++) {
				this.boneMtxBuf[i * 16 + j] = this.identityMtx[j]
			}
		}
	}

	setShader(shd: Shader) {
		this.shader = shd
	}

	setOutlineShader(shd: Shader) {
		this.outlineShader = shd
	}

	loadMesh(id: string, data: SkeletalMeshData, bones: BoneDef[], tex: Texture | null = null) {
		const old = this.meshes.get(id)
		if (old) old.vao.dispose()
		const vao = new VAO(this.ctx.gl)
		vao.setVerts(data.verts)
		vao.setIndices(data.indices)
		vao.setLayout(skeletalVertexLayout(this.ctx.gl), SKELETAL_STRIDE)
		if (this.shader) {
			vao.setup(name => this.shader!.attr(name))
		}
		this.meshes.set(id, { id, vao, vertCnt: data.indices.length, tex, bones })
	}

	unloadMesh(id: string) {
		const mesh = this.meshes.get(id)
		if (mesh) {
			mesh.vao.dispose()
			this.meshes.delete(id)
		}
	}

	hasMesh(id: string): boolean {
		return this.meshes.has(id)
	}

	loadAnim(name: string, clip: AnimClip) {
		this.anims.set(name, clip)
	}

	unloadAnim(name: string) {
		this.anims.delete(name)
	}

	addInstance(
		entityId: EntityId,
		meshId: string,
		transform: Transform,
		tint: [number, number, number, number] = [1, 1, 1, 1]
	) {
		const mesh = this.meshes.get(meshId)
		const boneCnt = mesh ? mesh.bones.length : MAX_BONES
		this.instances.set(entityId, {
			entityId,
			meshId,
			transform: { ...transform },
			tint,
			visible: true,
			animState: {
				curAnim: '',
				time: 0,
				blendAnim: null,
				blendFactor: 0,
				speed: 1
			},
			boneMtx: new Float32Array(boneCnt * 16)
		})
		this.iniBoneMtx(entityId)
	}

	private iniBoneMtx(entityId: EntityId) {
		const inst = this.instances.get(entityId)
		if (!inst) return
		for (let i = 0; i < inst.boneMtx.length / 16; i++) {
			for (let j = 0; j < 16; j++) {
				inst.boneMtx[i * 16 + j] = this.identityMtx[j]
			}
		}
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

	playAnim(entityId: EntityId, animName: string, speed: number = 1) {
		const inst = this.instances.get(entityId)
		if (!inst) return
		inst.animState.curAnim = animName
		inst.animState.time = 0
		inst.animState.speed = speed
		inst.animState.blendAnim = null
		inst.animState.blendFactor = 0
	}

	blendTo(entityId: EntityId, animName: string, _blendTime: number, speed: number = 1) {
		const inst = this.instances.get(entityId)
		if (!inst) return
		inst.animState.blendAnim = animName
		inst.animState.blendFactor = 0
		inst.animState.speed = speed
	}

	removeInstance(entityId: EntityId) {
		this.instances.delete(entityId)
	}

	upd(dt: number) {
		for (const inst of this.instances.values()) {
			this.updAnimState(inst, dt)
		}
	}

	private updAnimState(inst: SkeletalInstance, dt: number) {
		const { animState } = inst
		const clip = this.anims.get(animState.curAnim)
		if (!clip) return
		animState.time += dt * animState.speed
		if (clip.loop) {
			while (animState.time >= clip.duration) {
				animState.time -= clip.duration
			}
		} else {
			if (animState.time >= clip.duration) {
				animState.time = clip.duration
			}
		}
		if (animState.blendAnim) {
			animState.blendFactor = Math.min(1, animState.blendFactor + dt * animState.speed)
			if (animState.blendFactor >= 1) {
				animState.curAnim = animState.blendAnim
				animState.blendAnim = null
				animState.blendFactor = 0
				animState.time = 0
			}
		}
		this.calBoneMtx(inst)
	}

	private calBoneMtx(inst: SkeletalInstance) {
		const mesh = this.meshes.get(inst.meshId)
		if (!mesh) return
		const clip = this.anims.get(inst.animState.curAnim)
		if (!clip || clip.frames.length === 0) {
			this.iniBoneMtx(inst.entityId)
			return
		}
		const frameIdx = Math.min(
			Math.floor((inst.animState.time / clip.duration) * clip.frames.length),
			clip.frames.length - 1
		)
		const frame = clip.frames[frameIdx]
		for (let i = 0; i < mesh.bones.length && i < frame.boneTransforms.length; i++) {
			const boneTrans = frame.boneTransforms[i]
			const invBind = mesh.bones[i].invBindMtx
			this.mulMtx(boneTrans, invBind, inst.boneMtx, i * 16)
		}
	}

	private mulMtx(a: Float32Array, b: Float32Array, out: Float32Array, offset: number) {
		for (let i = 0; i < 4; i++) {
			for (let j = 0; j < 4; j++) {
				let sum = 0
				for (let k = 0; k < 4; k++) {
					sum += a[i * 4 + k] * b[k * 4 + j]
				}
				out[offset + i * 4 + j] = sum
			}
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
			if (!inst.visible) continue
			const mesh = this.meshes.get(inst.meshId)
			if (!mesh) continue
			this.outlineShader.setMat4('uModel', this.buildMtx(inst.transform))
			this.outlineShader.setMat4Arr('uBoneMtx', inst.boneMtx, mesh.bones.length)
			mesh.vao.bind()
			gl.drawElements(gl.TRIANGLES, mesh.vertCnt, gl.UNSIGNED_SHORT, 0)
			mesh.vao.unbind()
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
			if (!inst.visible) continue
			const mesh = this.meshes.get(inst.meshId)
			if (!mesh) continue
			this.shader.setMat4('uModel', this.buildMtx(inst.transform))
			this.shader.setMat4Arr('uBoneMtx', inst.boneMtx, mesh.bones.length)
			this.shader.setVec4('uTint', ...inst.tint)
			if (mesh.tex) {
				mesh.tex.bind(0)
				this.shader.setFloat('uUseTex', 1)
				this.shader.setInt('uTex', 0)
			} else {
				this.shader.setFloat('uUseTex', 0)
			}
			mesh.vao.bind()
			gl.drawElements(gl.TRIANGLES, mesh.vertCnt, gl.UNSIGNED_SHORT, 0)
			mesh.vao.unbind()
		}
	}

	dispose() {
		for (const mesh of this.meshes.values()) {
			mesh.vao.dispose()
		}
		this.meshes.clear()
		this.instances.clear()
		this.anims.clear()
	}
}
