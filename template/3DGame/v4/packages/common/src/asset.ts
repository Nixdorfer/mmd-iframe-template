import { AssetType, type AssetEntry } from './types'
import { globalAudio } from './audio'

export interface AssetManifest {
	version: number
	baseUrl: string
	assets: AssetEntry[]
}

export interface LoadProgress {
	loaded: number
	total: number
	current: string
	percent: number
}

export type ProgressCallback = (progress: LoadProgress) => void

export interface LoadedAsset {
	id: string
	typ: AssetType
	data: any
	size: number
	loadTime: number
}

export class AssetLoader {
	manifest: AssetManifest | null
	cache: Map<string, LoadedAsset>
	loading: Map<string, Promise<LoadedAsset>>
	baseUrl: string
	maxConcurrent: number
	retryCount: number
	retryDelay: number

	constructor(baseUrl: string = '') {
		this.manifest = null
		this.cache = new Map()
		this.loading = new Map()
		this.baseUrl = baseUrl
		this.maxConcurrent = 4
		this.retryCount = 3
		this.retryDelay = 1000
	}

	async loadManifest(url: string): Promise<AssetManifest> {
		const response = await fetch(url)
		const manifest = await response.json() as AssetManifest
		this.manifest = manifest
		this.baseUrl = manifest.baseUrl
		return manifest
	}

	async load(id: string, onProgress?: ProgressCallback): Promise<LoadedAsset> {
		if (this.cache.has(id)) {
			return this.cache.get(id)!
		}
		if (this.loading.has(id)) {
			return this.loading.get(id)!
		}
		const entry = this.manifest?.assets.find(a => a.id === id)
		if (!entry) {
			throw new Error(`Asset not found: ${id}`)
		}
		const promise = this.loadAsset(entry, onProgress)
		this.loading.set(id, promise)
		try {
			const asset = await promise
			this.cache.set(id, asset)
			return asset
		} finally {
			this.loading.delete(id)
		}
	}

	private async loadAsset(entry: AssetEntry, onProgress?: ProgressCallback): Promise<LoadedAsset> {
		const startTime = performance.now()
		const url = `${this.baseUrl}/${entry.path}`
		let data: any
		for (let attempt = 0; attempt < this.retryCount; attempt++) {
			try {
				data = await this.fetchAsset(url, entry.typ, onProgress)
				break
			} catch (e) {
				if (attempt === this.retryCount - 1) throw e
				await this.delay(this.retryDelay * (attempt + 1))
			}
		}
		return {
			id: entry.id,
			typ: entry.typ,
			data,
			size: entry.size,
			loadTime: performance.now() - startTime
		}
	}

	private async fetchAsset(url: string, typ: AssetType, onProgress?: ProgressCallback): Promise<any> {
		const response = await fetch(url)
		if (!response.ok) {
			throw new Error(`Failed to load: ${url}`)
		}
		const total = parseInt(response.headers.get('content-length') ?? '0')
		if (onProgress && total > 0 && response.body) {
			const reader = response.body.getReader()
			const chunks: Uint8Array[] = []
			let loaded = 0
			while (true) {
				const { done, value } = await reader.read()
				if (done) break
				chunks.push(value)
				loaded += value.length
				onProgress({
					loaded,
					total,
					current: url,
					percent: (loaded / total) * 100
				})
			}
			const blob = new Blob(chunks as BlobPart[])
			return this.parseAsset(blob, typ)
		}
		const blob = await response.blob()
		return this.parseAsset(blob, typ)
	}

	private async parseAsset(blob: Blob, typ: AssetType): Promise<any> {
		switch (typ) {
			case AssetType.Texture:
				return this.loadTexture(blob)
			case AssetType.Model:
				return this.loadModel(blob)
			case AssetType.Animation:
				return this.loadAnimation(blob)
			case AssetType.Sound:
				return this.loadSound(blob)
			case AssetType.Config:
				return this.loadConfig(blob)
			default:
				return blob
		}
	}

	private async loadTexture(blob: Blob): Promise<HTMLImageElement> {
		return new Promise((resolve, reject) => {
			const img = new Image()
			img.onload = () => {
				URL.revokeObjectURL(img.src)
				resolve(img)
			}
			img.onerror = reject
			img.src = URL.createObjectURL(blob)
		})
	}

	private async loadModel(blob: Blob): Promise<ArrayBuffer> {
		return blob.arrayBuffer()
	}

	private async loadAnimation(blob: Blob): Promise<ArrayBuffer> {
		return blob.arrayBuffer()
	}

	private async loadSound(blob: Blob): Promise<AudioBuffer | Blob> {
		const arrayBuffer = await blob.arrayBuffer()
		const buffer = await globalAudio.decodeBuffer(arrayBuffer)
		return buffer ?? blob
	}

	private async loadConfig(blob: Blob): Promise<any> {
		const text = await blob.text()
		return JSON.parse(text)
	}

	private delay(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms))
	}

	async loadMultiple(ids: string[], onProgress?: ProgressCallback): Promise<LoadedAsset[]> {
		const results: LoadedAsset[] = []
		const total = ids.length
		let loaded = 0
		const queue = [...ids]
		const workers: Promise<void>[] = []
		for (let i = 0; i < Math.min(this.maxConcurrent, queue.length); i++) {
			workers.push(this.worker(queue, results, () => {
				loaded++
				if (onProgress) {
					onProgress({
						loaded,
						total,
						current: ids[loaded - 1],
						percent: (loaded / total) * 100
					})
				}
			}))
		}
		await Promise.all(workers)
		return results
	}

	private async worker(
		queue: string[],
		results: LoadedAsset[],
		onComplete: () => void
	): Promise<void> {
		while (queue.length > 0) {
			const id = queue.shift()!
			try {
				const asset = await this.load(id)
				results.push(asset)
				onComplete()
			} catch (e) {
				console.error(`Failed to load asset: ${id}`, e)
				onComplete()
			}
		}
	}

	async preload(priority: AssetEntry['priority'], onProgress?: ProgressCallback): Promise<void> {
		if (!this.manifest) return
		const ids = this.manifest.assets
			.filter(a => a.priority === priority)
			.map(a => a.id)
		await this.loadMultiple(ids, onProgress)
	}

	get(id: string): LoadedAsset | undefined {
		return this.cache.get(id)
	}

	has(id: string): boolean {
		return this.cache.has(id)
	}

	unload(id: string) {
		this.cache.delete(id)
	}

	unloadAll() {
		this.cache.clear()
	}

	getSize(): number {
		let total = 0
		for (const asset of this.cache.values()) {
			total += asset.size
		}
		return total
	}

	getStats(): { count: number; size: number; loadTime: number } {
		let size = 0
		let loadTime = 0
		for (const asset of this.cache.values()) {
			size += asset.size
			loadTime += asset.loadTime
		}
		return {
			count: this.cache.size,
			size,
			loadTime
		}
	}
}

export class AssetBundler {
	bundles: Map<string, string[]>

	constructor() {
		this.bundles = new Map()
	}

	define(name: string, assetIds: string[]) {
		this.bundles.set(name, assetIds)
	}

	get(name: string): string[] {
		return this.bundles.get(name) ?? []
	}

	async loadBundle(loader: AssetLoader, name: string, onProgress?: ProgressCallback): Promise<LoadedAsset[]> {
		const ids = this.get(name)
		return loader.loadMultiple(ids, onProgress)
	}
}

export class StreamingLoader {
	loader: AssetLoader
	loadRadius: number
	unloadRadius: number
	loadQueue: Set<string>
	loading: boolean

	constructor(loader: AssetLoader, loadRadius: number = 100, unloadRadius: number = 150) {
		this.loader = loader
		this.loadRadius = loadRadius
		this.unloadRadius = unloadRadius
		this.loadQueue = new Set()
		this.loading = false
	}

	async upd(playerPos: { x: number; y: number }, getAssetPos: (id: string) => { x: number; y: number } | null) {
		if (!this.loader.manifest || this.loading) return
		this.loading = true
		const toLoad: string[] = []
		const toUnload: string[] = []
		for (const entry of this.loader.manifest.assets) {
			const pos = getAssetPos(entry.id)
			if (!pos) continue
			const dx = pos.x - playerPos.x
			const dy = pos.y - playerPos.y
			const distSq = dx * dx + dy * dy
			if (distSq <= this.loadRadius * this.loadRadius) {
				if (!this.loader.has(entry.id) && !this.loadQueue.has(entry.id)) {
					toLoad.push(entry.id)
					this.loadQueue.add(entry.id)
				}
			} else if (distSq > this.unloadRadius * this.unloadRadius) {
				if (this.loader.has(entry.id)) {
					toUnload.push(entry.id)
				}
			}
		}
		for (const id of toUnload) {
			this.loader.unload(id)
		}
		if (toLoad.length > 0) {
			await this.loader.loadMultiple(toLoad)
			for (const id of toLoad) {
				this.loadQueue.delete(id)
			}
		}
		this.loading = false
	}
}

export const globalAssetLoader = new AssetLoader()
