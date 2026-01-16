import { IDBStorage, defaultSavesIDBCfg } from './idb'

export type StorageBackend = 'localStorage' | 'indexedDB' | 'auto'

export interface SaveManagerCfg {
	maxSlots?: number
	backend?: StorageBackend
	dbName?: string
	chunkSize?: number
}

export interface SaveHeader {
	version: number
	name: string
	createdAt: number
	updatedAt: number
	playTime: number
	thumbnail?: string
}

export interface IDBSaveEntry {
	slot: string
	header: SaveHeader
	data: string
	chunkCnt?: number
}

export interface IDBChunkEntry {
	id: string
	slot: string
	idx: number
	data: string
}

export interface SaveData {
	header: SaveHeader
	world: WorldState
	player: PlayerState
	quests: QuestState[]
	inventory: InventoryState
	flags: Record<string, any>
}

export interface WorldState {
	seed: number
	tick: number
	time: number
	era: string
	plane: string
	weather: string
	chunks: ChunkState[]
	entities: EntitySaveData[]
	factions: FactionSaveData[]
	pockets: PocketSaveData[]
}

export interface ChunkState {
	x: number
	y: number
	modified: BlockMod[]
}

export interface BlockMod {
	x: number
	y: number
	z: number
	block: number
}

export interface EntitySaveData {
	id: number
	defId: string
	name: string
	pos: { x: number; y: number; z: number }
	hp: number
	level: number
	exp: number
	buffs: BuffSaveData[]
	state: Record<string, any>
}

export interface BuffSaveData {
	id: string
	remaining: number
	stacks: number
}

export interface FactionSaveData {
	id: string
	relations: { target: string; value: number }[]
	wars: string[]
}

export interface PocketSaveData {
	id: string
	owner: number
	name: string
	size: { x: number; y: number; z: number }
	blocks: BlockMod[]
}

export interface PlayerState {
	id: number
	name: string
	pos: { x: number; y: number; z: number }
	hp: number
	maxHp: number
	level: number
	exp: number
	stats: Record<string, number>
	skills: SkillSaveData[]
	equipment: EquipmentSaveData
	respawnPoint: { x: number; y: number; z: number }
	faction: string | null
}

export interface SkillSaveData {
	id: string
	level: number
	exp: number
	unlocked: boolean
}

export interface EquipmentSaveData {
	weapon: string | null
	armor: string | null
	helmet: string | null
	boots: string | null
	accessory1: string | null
	accessory2: string | null
}

export interface InventoryState {
	gold: number
	items: ItemStack[]
	capacity: number
}

export interface ItemStack {
	id: string
	cnt: number
	meta?: Record<string, any>
}

export interface QuestState {
	id: string
	status: 'active' | 'completed' | 'failed' | 'abandoned'
	progress: Record<string, number>
	startTime: number
	endTime?: number
}

export class SaveManager {
	saves: Map<string, SaveHeader>
	curSave: SaveData | null
	autoSaveSlot: string
	maxSlots: number
	backend: StorageBackend
	localStorage: Storage | null
	idb: IDBStorage | null
	ready: Promise<boolean>
	chunkSize: number
	useIDB: boolean

	constructor(cfg?: SaveManagerCfg) {
		this.saves = new Map()
		this.curSave = null
		this.autoSaveSlot = 'autosave'
		this.maxSlots = cfg?.maxSlots ?? 10
		this.backend = cfg?.backend ?? 'auto'
		this.chunkSize = cfg?.chunkSize ?? 1024 * 1024
		this.localStorage = typeof localStorage !== 'undefined' ? localStorage : null
		this.idb = null
		this.useIDB = false
		this.ready = this.ini(cfg?.dbName)
	}

	private async ini(dbName?: string): Promise<boolean> {
		if (this.backend === 'indexedDB' || this.backend === 'auto') {
			const idbCfg = { ...defaultSavesIDBCfg }
			if (dbName) idbCfg.dbName = dbName
			this.idb = new IDBStorage(idbCfg)
			const idbReady = await this.idb.ready
			if (idbReady) {
				this.useIDB = true
				await this.lodIdxFromIDB()
				return true
			}
		}
		if (this.backend === 'localStorage' || this.backend === 'auto') {
			this.lodIdxFromLS()
			return true
		}
		return false
	}

	private lodIdxFromLS() {
		if (!this.localStorage) return
		const indexStr = this.localStorage.getItem('saves_index')
		if (indexStr) {
			try {
				const index = JSON.parse(indexStr) as SaveHeader[]
				for (const header of index) {
					this.saves.set(header.name, header)
				}
			} catch (e) {}
		}
	}

	private async lodIdxFromIDB() {
		if (!this.idb) return
		const entries = await this.idb.getAll<IDBSaveEntry>('saves')
		for (const entry of entries) {
			this.saves.set(entry.slot, entry.header)
		}
	}

	private savIdxToLS() {
		if (!this.localStorage) return
		const index = Array.from(this.saves.values())
		this.localStorage.setItem('saves_index', JSON.stringify(index))
	}

	private getSlotKey(slot: string): string {
		return `save_${slot}`
	}

	private async savToLS(slot: string, data: SaveData): Promise<boolean> {
		if (!this.localStorage) return false
		try {
			const serialized = JSON.stringify(data)
			this.localStorage.setItem(this.getSlotKey(slot), serialized)
			this.saves.set(slot, data.header)
			this.savIdxToLS()
			return true
		} catch (e) {
			return false
		}
	}

	private async lodFromLS(slot: string): Promise<SaveData | null> {
		if (!this.localStorage) return null
		try {
			const serialized = this.localStorage.getItem(this.getSlotKey(slot))
			if (!serialized) return null
			return JSON.parse(serialized) as SaveData
		} catch (e) {
			return null
		}
	}

	private async delFromLS(slot: string): Promise<boolean> {
		if (!this.localStorage) return false
		try {
			this.localStorage.removeItem(this.getSlotKey(slot))
			this.saves.delete(slot)
			this.savIdxToLS()
			return true
		} catch (e) {
			return false
		}
	}

	private async savToIDB(slot: string, data: SaveData): Promise<boolean> {
		if (!this.idb) return false
		try {
			const serialized = JSON.stringify(data)
			if (serialized.length > this.chunkSize) {
				const chunks = this.splitStr(serialized, this.chunkSize)
				for (let i = 0; i < chunks.length; i++) {
					const chunkEntry: IDBChunkEntry = {
						id: `${slot}_${i}`,
						slot,
						idx: i,
						data: chunks[i]
					}
					await this.idb.put('chunks', chunkEntry)
				}
				const entry: IDBSaveEntry = {
					slot,
					header: data.header,
					data: '',
					chunkCnt: chunks.length
				}
				await this.idb.put('saves', entry)
			} else {
				const entry: IDBSaveEntry = {
					slot,
					header: data.header,
					data: serialized
				}
				await this.idb.put('saves', entry)
			}
			this.saves.set(slot, data.header)
			return true
		} catch (e) {
			return false
		}
	}

	private async lodFromIDB(slot: string): Promise<SaveData | null> {
		if (!this.idb) return null
		try {
			const entry = await this.idb.get<IDBSaveEntry>('saves', slot)
			if (!entry) return null
			let serialized: string
			if (entry.chunkCnt && entry.chunkCnt > 0) {
				const chunks: string[] = []
				for (let i = 0; i < entry.chunkCnt; i++) {
					const chunk = await this.idb.get<IDBChunkEntry>('chunks', `${slot}_${i}`)
					if (chunk) chunks.push(chunk.data)
				}
				serialized = chunks.join('')
			} else {
				serialized = entry.data
			}
			return JSON.parse(serialized) as SaveData
		} catch (e) {
			return null
		}
	}

	private async delFromIDB(slot: string): Promise<boolean> {
		if (!this.idb) return false
		try {
			const entry = await this.idb.get<IDBSaveEntry>('saves', slot)
			if (entry?.chunkCnt) {
				for (let i = 0; i < entry.chunkCnt; i++) {
					await this.idb.del('chunks', `${slot}_${i}`)
				}
			}
			await this.idb.del('saves', slot)
			this.saves.delete(slot)
			return true
		} catch (e) {
			return false
		}
	}

	private splitStr(str: string, size: number): string[] {
		const chunks: string[] = []
		for (let i = 0; i < str.length; i += size) {
			chunks.push(str.slice(i, i + size))
		}
		return chunks
	}

	async save(slot: string, data: Omit<SaveData, 'header'>, name?: string): Promise<boolean> {
		await this.ready
		const existing = this.saves.get(slot)
		const header: SaveHeader = {
			version: 1,
			name: name ?? slot,
			createdAt: existing?.createdAt ?? Date.now(),
			updatedAt: Date.now(),
			playTime: (existing?.playTime ?? 0) + (Date.now() - (this.curSave?.header.updatedAt ?? Date.now()))
		}
		const saveData: SaveData = { header, ...data }
		this.curSave = saveData
		if (this.useIDB) {
			return this.savToIDB(slot, saveData)
		}
		return this.savToLS(slot, saveData)
	}

	async load(slot: string): Promise<SaveData | null> {
		await this.ready
		let data: SaveData | null = null
		if (this.useIDB) {
			data = await this.lodFromIDB(slot)
		} else {
			data = await this.lodFromLS(slot)
		}
		if (data) this.curSave = data
		return data
	}

	async del(slot: string): Promise<boolean> {
		await this.ready
		if (this.curSave?.header.name === slot) {
			this.curSave = null
		}
		if (this.useIDB) {
			return this.delFromIDB(slot)
		}
		return this.delFromLS(slot)
	}

	list(): SaveHeader[] {
		return Array.from(this.saves.values()).sort((a, b) => b.updatedAt - a.updatedAt)
	}

	has(slot: string): boolean {
		return this.saves.has(slot)
	}

	async autoSave(data: Omit<SaveData, 'header'>): Promise<boolean> {
		return this.save(this.autoSaveSlot, data, '自动存档')
	}

	async export(slot: string): Promise<Blob | null> {
		const data = await this.load(slot)
		if (!data) return null
		const json = JSON.stringify(data)
		return new Blob([json], { type: 'application/json' })
	}

	async import(file: File): Promise<SaveData | null> {
		try {
			const text = await file.text()
			const data = JSON.parse(text) as SaveData
			return data
		} catch (e) {
			return null
		}
	}

	async importAndSave(file: File, slot?: string): Promise<boolean> {
		const data = await this.import(file)
		if (!data) return false
		const targetSlot = slot ?? data.header.name
		return this.save(targetSlot, {
			world: data.world,
			player: data.player,
			quests: data.quests,
			inventory: data.inventory,
			flags: data.flags
		}, data.header.name)
	}

	getCurrent(): SaveData | null {
		return this.curSave
	}

	getPlayTime(slot: string): number {
		return this.saves.get(slot)?.playTime ?? 0
	}

	formatPlayTime(ms: number): string {
		const seconds = Math.floor(ms / 1000)
		const minutes = Math.floor(seconds / 60)
		const hours = Math.floor(minutes / 60)
		if (hours > 0) {
			return `${hours}h ${minutes % 60}m`
		}
		return `${minutes}m ${seconds % 60}s`
	}

	async getSize(slot: string): Promise<number> {
		await this.ready
		if (this.useIDB && this.idb) {
			const entry = await this.idb.get<IDBSaveEntry>('saves', slot)
			if (!entry) return 0
			if (entry.chunkCnt) {
				let total = 0
				for (let i = 0; i < entry.chunkCnt; i++) {
					const chunk = await this.idb.get<IDBChunkEntry>('chunks', `${slot}_${i}`)
					if (chunk) total += chunk.data.length
				}
				return total
			}
			return entry.data.length
		}
		if (this.localStorage) {
			const data = this.localStorage.getItem(this.getSlotKey(slot))
			return data?.length ?? 0
		}
		return 0
	}

	async getTotalSize(): Promise<number> {
		await this.ready
		let total = 0
		for (const slot of this.saves.keys()) {
			total += await this.getSize(slot)
		}
		return total
	}

	async migrate(to: StorageBackend): Promise<boolean> {
		await this.ready
		const slots = Array.from(this.saves.keys())
		const backups: { slot: string; data: SaveData }[] = []
		for (const slot of slots) {
			const data = await this.load(slot)
			if (data) backups.push({ slot, data })
		}
		if (to === 'indexedDB' && !this.useIDB) {
			const idbCfg = { ...defaultSavesIDBCfg }
			this.idb = new IDBStorage(idbCfg)
			const idbReady = await this.idb.ready
			if (!idbReady) return false
			this.useIDB = true
		} else if (to === 'localStorage') {
			this.useIDB = false
		}
		for (const backup of backups) {
			await this.save(backup.slot, {
				world: backup.data.world,
				player: backup.data.player,
				quests: backup.data.quests,
				inventory: backup.data.inventory,
				flags: backup.data.flags
			}, backup.data.header.name)
		}
		return true
	}

	getBackend(): StorageBackend {
		return this.useIDB ? 'indexedDB' : 'localStorage'
	}
}

export class CheckpointManager {
	checkpoints: Map<string, { pos: { x: number; y: number; z: number }; plane: string }>
	activeCheckpoint: string | null

	constructor() {
		this.checkpoints = new Map()
		this.activeCheckpoint = null
	}

	register(id: string, pos: { x: number; y: number; z: number }, plane: string) {
		this.checkpoints.set(id, { pos, plane })
	}

	activate(id: string): boolean {
		if (!this.checkpoints.has(id)) return false
		this.activeCheckpoint = id
		return true
	}

	getActive(): { pos: { x: number; y: number; z: number }; plane: string } | null {
		if (!this.activeCheckpoint) return null
		return this.checkpoints.get(this.activeCheckpoint) ?? null
	}

	clr() {
		this.checkpoints.clear()
		this.activeCheckpoint = null
	}
}
