import type { Vec3 } from '@engine/common'

export enum LitType {
	DIR = 0,
	PNT = 1,
	SPT = 2
}

export interface DirLit {
	dir: Vec3
	clr: Vec3
	intensity: number
}

export interface PntLit {
	id: number
	pos: Vec3
	clr: Vec3
	intensity: number
	range: number
}

export interface SptLit extends PntLit {
	dir: Vec3
	angle: number
	penumbra: number
}

export const MAX_PNT_LITS = 8
export const MAX_SPT_LITS = 4

export class LitManager {
	sunDir: Vec3
	sunClr: Vec3
	sunIntensity: number
	ambient: Vec3
	pntLits: PntLit[]
	sptLits: SptLit[]
	private nextId: number
	pntPosArr: Float32Array
	pntClrArr: Float32Array
	pntRangeArr: Float32Array
	pntIntensityArr: Float32Array
	sptPosArr: Float32Array
	sptDirArr: Float32Array
	sptClrArr: Float32Array
	sptRangeArr: Float32Array
	sptAngleArr: Float32Array
	sptPenumbraArr: Float32Array

	constructor() {
		this.sunDir = { x: 0.5, y: 0.5, z: -0.7 }
		this.sunClr = { x: 1, y: 0.98, z: 0.9 }
		this.sunIntensity = 0.8
		this.ambient = { x: 0.25, y: 0.25, z: 0.25 }
		this.pntLits = []
		this.sptLits = []
		this.nextId = 1
		this.pntPosArr = new Float32Array(MAX_PNT_LITS * 3)
		this.pntClrArr = new Float32Array(MAX_PNT_LITS * 3)
		this.pntRangeArr = new Float32Array(MAX_PNT_LITS)
		this.pntIntensityArr = new Float32Array(MAX_PNT_LITS)
		this.sptPosArr = new Float32Array(MAX_SPT_LITS * 3)
		this.sptDirArr = new Float32Array(MAX_SPT_LITS * 3)
		this.sptClrArr = new Float32Array(MAX_SPT_LITS * 3)
		this.sptRangeArr = new Float32Array(MAX_SPT_LITS)
		this.sptAngleArr = new Float32Array(MAX_SPT_LITS)
		this.sptPenumbraArr = new Float32Array(MAX_SPT_LITS)
	}

	setSun(dir: Vec3, clr: Vec3, intensity: number) {
		this.sunDir = dir
		this.sunClr = clr
		this.sunIntensity = intensity
	}

	setAmbient(clr: Vec3) {
		this.ambient = clr
	}

	addPntLit(pos: Vec3, clr: Vec3, intensity: number, range: number): number {
		if (this.pntLits.length >= MAX_PNT_LITS) return -1
		const id = this.nextId++
		this.pntLits.push({ id, pos, clr, intensity, range })
		this.updPntArrs()
		return id
	}

	addSptLit(pos: Vec3, dir: Vec3, clr: Vec3, intensity: number, range: number, angle: number, penumbra: number): number {
		if (this.sptLits.length >= MAX_SPT_LITS) return -1
		const id = this.nextId++
		this.sptLits.push({ id, pos, dir, clr, intensity, range, angle, penumbra })
		this.updSptArrs()
		return id
	}

	updPntLit(id: number, pos?: Vec3, clr?: Vec3, intensity?: number, range?: number) {
		const lit = this.pntLits.find(l => l.id === id)
		if (!lit) return
		if (pos) lit.pos = pos
		if (clr) lit.clr = clr
		if (intensity !== undefined) lit.intensity = intensity
		if (range !== undefined) lit.range = range
		this.updPntArrs()
	}

	updSptLit(id: number, pos?: Vec3, dir?: Vec3, clr?: Vec3, intensity?: number, range?: number, angle?: number, penumbra?: number) {
		const lit = this.sptLits.find(l => l.id === id)
		if (!lit) return
		if (pos) lit.pos = pos
		if (dir) lit.dir = dir
		if (clr) lit.clr = clr
		if (intensity !== undefined) lit.intensity = intensity
		if (range !== undefined) lit.range = range
		if (angle !== undefined) lit.angle = angle
		if (penumbra !== undefined) lit.penumbra = penumbra
		this.updSptArrs()
	}

	delLit(id: number) {
		const pIdx = this.pntLits.findIndex(l => l.id === id)
		if (pIdx >= 0) {
			this.pntLits.splice(pIdx, 1)
			this.updPntArrs()
			return
		}
		const sIdx = this.sptLits.findIndex(l => l.id === id)
		if (sIdx >= 0) {
			this.sptLits.splice(sIdx, 1)
			this.updSptArrs()
		}
	}

	clrAll() {
		this.pntLits = []
		this.sptLits = []
		this.updPntArrs()
		this.updSptArrs()
	}

	private updPntArrs() {
		for (let i = 0; i < MAX_PNT_LITS; i++) {
			const lit = this.pntLits[i]
			if (lit) {
				this.pntPosArr[i * 3] = lit.pos.x
				this.pntPosArr[i * 3 + 1] = lit.pos.y
				this.pntPosArr[i * 3 + 2] = lit.pos.z
				this.pntClrArr[i * 3] = lit.clr.x
				this.pntClrArr[i * 3 + 1] = lit.clr.y
				this.pntClrArr[i * 3 + 2] = lit.clr.z
				this.pntRangeArr[i] = lit.range
				this.pntIntensityArr[i] = lit.intensity
			} else {
				this.pntPosArr[i * 3] = 0
				this.pntPosArr[i * 3 + 1] = 0
				this.pntPosArr[i * 3 + 2] = 0
				this.pntClrArr[i * 3] = 0
				this.pntClrArr[i * 3 + 1] = 0
				this.pntClrArr[i * 3 + 2] = 0
				this.pntRangeArr[i] = 0
				this.pntIntensityArr[i] = 0
			}
		}
	}

	private updSptArrs() {
		for (let i = 0; i < MAX_SPT_LITS; i++) {
			const lit = this.sptLits[i]
			if (lit) {
				this.sptPosArr[i * 3] = lit.pos.x
				this.sptPosArr[i * 3 + 1] = lit.pos.y
				this.sptPosArr[i * 3 + 2] = lit.pos.z
				this.sptDirArr[i * 3] = lit.dir.x
				this.sptDirArr[i * 3 + 1] = lit.dir.y
				this.sptDirArr[i * 3 + 2] = lit.dir.z
				this.sptClrArr[i * 3] = lit.clr.x
				this.sptClrArr[i * 3 + 1] = lit.clr.y
				this.sptClrArr[i * 3 + 2] = lit.clr.z
				this.sptRangeArr[i] = lit.range
				this.sptAngleArr[i] = lit.angle
				this.sptPenumbraArr[i] = lit.penumbra
			} else {
				this.sptPosArr[i * 3] = 0
				this.sptPosArr[i * 3 + 1] = 0
				this.sptPosArr[i * 3 + 2] = 0
				this.sptDirArr[i * 3] = 0
				this.sptDirArr[i * 3 + 1] = 0
				this.sptDirArr[i * 3 + 2] = 0
				this.sptClrArr[i * 3] = 0
				this.sptClrArr[i * 3 + 1] = 0
				this.sptClrArr[i * 3 + 2] = 0
				this.sptRangeArr[i] = 0
				this.sptAngleArr[i] = 0
				this.sptPenumbraArr[i] = 0
			}
		}
	}

	pntCnt(): number {
		return this.pntLits.length
	}

	sptCnt(): number {
		return this.sptLits.length
	}
}
