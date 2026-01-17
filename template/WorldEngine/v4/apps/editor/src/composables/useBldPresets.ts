import { ref, watch } from 'vue'

export interface BuildingPresetBlock {
	x: number
	y: number
	z: number
	blockType: string
}

export interface BuildingPreset {
	id: string
	name: string
	desc: string
	tags: string[]
	sizeX: number
	sizeY: number
	sizeZ: number
	blocks: BuildingPresetBlock[]
	createdAt: number
	updatedAt: number
}

export interface BldPresetsStore {
	ver: number
	presets: BuildingPreset[]
}

const STORAGE_KEY = 'we4_user_bld_presets'

function lodFromStorage(): BldPresetsStore {
	const raw = localStorage.getItem(STORAGE_KEY)
	if (!raw) return { ver: 1, presets: [] }
	try {
		return JSON.parse(raw)
	} catch {
		return { ver: 1, presets: [] }
	}
}

function savToStorage(data: BldPresetsStore) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

const presetsStore = ref<BldPresetsStore>(lodFromStorage())

watch(presetsStore, (newVal) => {
	savToStorage(newVal)
}, { deep: true })

export function useBldPresets() {
	function getPresets(): BuildingPreset[] {
		return presetsStore.value.presets
	}

	function addPreset(preset: Omit<BuildingPreset, 'id' | 'createdAt' | 'updatedAt'>): BuildingPreset {
		const newPreset: BuildingPreset = {
			...preset,
			id: 'user_bld_' + Date.now(),
			createdAt: Date.now(),
			updatedAt: Date.now()
		}
		presetsStore.value.presets.push(newPreset)
		return newPreset
	}

	function updPreset(id: string, data: Partial<BuildingPreset>) {
		const idx = presetsStore.value.presets.findIndex(p => p.id === id)
		if (idx >= 0) {
			presetsStore.value.presets[idx] = {
				...presetsStore.value.presets[idx],
				...data,
				updatedAt: Date.now()
			}
		}
	}

	function delPreset(id: string) {
		const idx = presetsStore.value.presets.findIndex(p => p.id === id)
		if (idx >= 0) {
			presetsStore.value.presets.splice(idx, 1)
		}
	}

	function getPreset(id: string): BuildingPreset | undefined {
		return presetsStore.value.presets.find(p => p.id === id)
	}

	function reload() {
		presetsStore.value = lodFromStorage()
	}

	return {
		presets: presetsStore,
		getPresets,
		addPreset,
		updPreset,
		delPreset,
		getPreset,
		reload
	}
}
