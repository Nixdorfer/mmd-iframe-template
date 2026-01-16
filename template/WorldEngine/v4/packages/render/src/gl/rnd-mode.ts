import type { Vec3 } from '@engine/common'

export enum RndMode {
	REALISTIC = 0,
	ACRYLIC = 1,
	ANIME = 2
}

export interface RndCfg {
	mode: RndMode
	shadowIntensity: number
	aoStrength: number
	specularPower: number
	rimPower: number
	smoothness: number
	steps: number
	outlineWidth: number
	outlineClr: Vec3
	outlineTerrain: boolean
	outlineEntity: boolean
	shadowEab: boolean
	shadowRes: number
	shadowBias: number
	ppEab: boolean
	bloomEab: boolean
	bloomThreshold: number
	bloomIntensity: number
	tonemapEab: boolean
	tonemapExposure: number
	tonemapGamma: number
	ssaoEab: boolean
	ssaoRadius: number
	ssaoBias: number
	ssaoIntensity: number
}

export function defRndCfg(): RndCfg {
	return {
		mode: RndMode.REALISTIC,
		shadowIntensity: 0.5,
		aoStrength: 1.0,
		specularPower: 32.0,
		rimPower: 3.0,
		smoothness: 0.5,
		steps: 2,
		outlineWidth: 0.02,
		outlineClr: { x: 0.1, y: 0.1, z: 0.1 },
		outlineTerrain: false,
		outlineEntity: true,
		shadowEab: true,
		shadowRes: 2048,
		shadowBias: 0.002,
		ppEab: false,
		bloomEab: false,
		bloomThreshold: 0.8,
		bloomIntensity: 1.0,
		tonemapEab: false,
		tonemapExposure: 1.0,
		tonemapGamma: 2.2,
		ssaoEab: false,
		ssaoRadius: 0.5,
		ssaoBias: 0.025,
		ssaoIntensity: 1.0
	}
}
