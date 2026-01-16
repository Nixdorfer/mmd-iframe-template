import { WorldviewType } from '@engine/common'

export enum TechLevel {
	Primitive = 0,
	Ancient = 1,
	Medieval = 2,
	Renaissance = 3,
	Industrial = 4,
	Modern = 5,
	Future = 6,
	SciFi = 7
}

export interface EraDef {
	id: string
	name: string
	techLevel: TechLevel
	worldviews: WorldviewType[]
	modules: string[]
	restrictions: string[]
	startYear: number
	endYear: number
}

export class EraLayer {
	eras: Map<string, EraDef>
	cur: EraDef | null

	constructor() {
		this.eras = new Map()
		this.cur = null
		this.iniDefEras()
	}

	private iniDefEras() {
		this.addEra({
			id: 'ancient',
			name: '上古时代',
			techLevel: TechLevel.Ancient,
			worldviews: [WorldviewType.Xianxia, WorldviewType.Wuxia],
			modules: ['qi', 'martial', 'magic'],
			restrictions: ['tech', 'hacking'],
			startYear: -10000,
			endYear: -1000
		})
		this.addEra({
			id: 'medieval',
			name: '中世纪',
			techLevel: TechLevel.Medieval,
			worldviews: [WorldviewType.HarryPotter, WorldviewType.Fate],
			modules: ['magic', 'magecraft', 'servant'],
			restrictions: ['tech', 'hacking', 'esper'],
			startYear: 500,
			endYear: 1500
		})
		this.addEra({
			id: 'modern',
			name: '现代',
			techLevel: TechLevel.Modern,
			worldviews: [
				WorldviewType.Naruto, WorldviewType.OnePiece, WorldviewType.JujutsuKaisen,
				WorldviewType.DemonSlayer, WorldviewType.Jojo, WorldviewType.HunterXHunter, WorldviewType.Fma
			],
			modules: [
				'ninjutsu', 'haki', 'jujutsu', 'breath', 'stand', 'nen', 'alchemy',
				'combat', 'equipment'
			],
			restrictions: [],
			startYear: 1900,
			endYear: 2100
		})
		this.addEra({
			id: 'future',
			name: '未来',
			techLevel: TechLevel.Future,
			worldviews: [WorldviewType.Cyberpunk, WorldviewType.Toaru, WorldviewType.StarWars],
			modules: ['hacking', 'esper', 'force', 'tech'],
			restrictions: [],
			startYear: 2100,
			endYear: 3000
		})
		this.addEra({
			id: 'scifi',
			name: '科幻纪元',
			techLevel: TechLevel.SciFi,
			worldviews: [WorldviewType.Pokemon],
			modules: ['companion', 'tech', 'hacking'],
			restrictions: [],
			startYear: 3000,
			endYear: 10000
		})
	}

	addEra(era: EraDef) {
		this.eras.set(era.id, era)
	}

	getEra(id: string): EraDef | undefined {
		return this.eras.get(id)
	}

	setEra(id: string) {
		const era = this.eras.get(id)
		if (era) this.cur = era
	}

	isModuleAvailable(_moduleId: string): boolean {
		return true
	}

	isWorldviewAvailable(_wv: WorldviewType): boolean {
		return true
	}

	getTechLevel(): TechLevel {
		return this.cur?.techLevel ?? TechLevel.Modern
	}

	getAvailableModules(): string[] {
		return this.cur?.modules ?? []
	}

	getRestrictions(): string[] {
		return this.cur?.restrictions ?? []
	}
}
