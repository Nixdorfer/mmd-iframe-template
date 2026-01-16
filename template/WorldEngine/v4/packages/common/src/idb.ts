export interface IDBCfg {
	dbName: string
	dbVer: number
	stores: IDBStoreCfg[]
}

export interface IDBStoreCfg {
	name: string
	keyPath: string
	autoIncrement?: boolean
	indexes?: IDBIdxCfg[]
}

export interface IDBIdxCfg {
	name: string
	keyPath: string | string[]
	unique?: boolean
}

export class IDBStorage {
	db: IDBDatabase | null
	cfg: IDBCfg
	ready: Promise<boolean>

	constructor(cfg: IDBCfg) {
		this.db = null
		this.cfg = cfg
		this.ready = this.ini()
	}

	private ini(): Promise<boolean> {
		return new Promise((resolve) => {
			if (typeof indexedDB === 'undefined') {
				resolve(false)
				return
			}
			this.openDB().then(db => {
				this.db = db
				resolve(true)
			}).catch(() => {
				resolve(false)
			})
		})
	}

	private openDB(): Promise<IDBDatabase> {
		return new Promise((resolve, reject) => {
			const req = indexedDB.open(this.cfg.dbName, this.cfg.dbVer)
			req.onerror = () => reject(req.error)
			req.onsuccess = () => resolve(req.result)
			req.onupgradeneeded = (evt) => {
				const db = (evt.target as IDBOpenDBRequest).result
				this.upgrade(db, evt.oldVersion, evt.newVersion ?? this.cfg.dbVer)
			}
		})
	}

	private upgrade(db: IDBDatabase, _oldVer: number, _newVer: number) {
		for (const storeCfg of this.cfg.stores) {
			if (!db.objectStoreNames.contains(storeCfg.name)) {
				const store = db.createObjectStore(storeCfg.name, {
					keyPath: storeCfg.keyPath,
					autoIncrement: storeCfg.autoIncrement
				})
				if (storeCfg.indexes) {
					for (const idx of storeCfg.indexes) {
						store.createIndex(idx.name, idx.keyPath, { unique: idx.unique })
					}
				}
			}
		}
	}

	async put<T>(store: string, data: T): Promise<boolean> {
		if (!this.db) return false
		return new Promise((resolve) => {
			const tx = this.db!.transaction(store, 'readwrite')
			const st = tx.objectStore(store)
			const req = st.put(data)
			req.onsuccess = () => resolve(true)
			req.onerror = () => resolve(false)
		})
	}

	async get<T>(store: string, key: IDBValidKey): Promise<T | null> {
		if (!this.db) return null
		return new Promise((resolve) => {
			const tx = this.db!.transaction(store, 'readonly')
			const st = tx.objectStore(store)
			const req = st.get(key)
			req.onsuccess = () => resolve(req.result ?? null)
			req.onerror = () => resolve(null)
		})
	}

	async del(store: string, key: IDBValidKey): Promise<boolean> {
		if (!this.db) return false
		return new Promise((resolve) => {
			const tx = this.db!.transaction(store, 'readwrite')
			const st = tx.objectStore(store)
			const req = st.delete(key)
			req.onsuccess = () => resolve(true)
			req.onerror = () => resolve(false)
		})
	}

	async getAll<T>(store: string): Promise<T[]> {
		if (!this.db) return []
		return new Promise((resolve) => {
			const tx = this.db!.transaction(store, 'readonly')
			const st = tx.objectStore(store)
			const req = st.getAll()
			req.onsuccess = () => resolve(req.result ?? [])
			req.onerror = () => resolve([])
		})
	}

	async clr(store: string): Promise<boolean> {
		if (!this.db) return false
		return new Promise((resolve) => {
			const tx = this.db!.transaction(store, 'readwrite')
			const st = tx.objectStore(store)
			const req = st.clear()
			req.onsuccess = () => resolve(true)
			req.onerror = () => resolve(false)
		})
	}

	async cnt(store: string): Promise<number> {
		if (!this.db) return 0
		return new Promise((resolve) => {
			const tx = this.db!.transaction(store, 'readonly')
			const st = tx.objectStore(store)
			const req = st.count()
			req.onsuccess = () => resolve(req.result)
			req.onerror = () => resolve(0)
		})
	}

	async getByIdx<T>(store: string, idx: string, val: IDBValidKey): Promise<T[]> {
		if (!this.db) return []
		return new Promise((resolve) => {
			const tx = this.db!.transaction(store, 'readonly')
			const st = tx.objectStore(store)
			const index = st.index(idx)
			const req = index.getAll(val)
			req.onsuccess = () => resolve(req.result ?? [])
			req.onerror = () => resolve([])
		})
	}

	async keys(store: string): Promise<IDBValidKey[]> {
		if (!this.db) return []
		return new Promise((resolve) => {
			const tx = this.db!.transaction(store, 'readonly')
			const st = tx.objectStore(store)
			const req = st.getAllKeys()
			req.onsuccess = () => resolve(req.result ?? [])
			req.onerror = () => resolve([])
		})
	}

	close() {
		if (this.db) {
			this.db.close()
			this.db = null
		}
	}
}

export const defaultSavesIDBCfg: IDBCfg = {
	dbName: 'game_saves',
	dbVer: 1,
	stores: [
		{
			name: 'saves',
			keyPath: 'slot',
			indexes: [
				{ name: 'updatedAt', keyPath: 'header.updatedAt' }
			]
		},
		{
			name: 'chunks',
			keyPath: 'id',
			indexes: [
				{ name: 'slot', keyPath: 'slot' }
			]
		}
	]
}
