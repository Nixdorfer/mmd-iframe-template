<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useConfigStore } from '@/stores/useConfig'
import Toolbar from './components/layout/Toolbar.vue'
import TabBar from './components/layout/TabBar.vue'
import TabLaw from './views/TabLaw.vue'
import TabRules from './views/TabRules.vue'
import TabWorld from './views/TabWorld.vue'
import TabMap from './views/TabMap.vue'
import TabEntity from './views/TabEntity.vue'
import TabSystem from './views/TabSystem.vue'
import TabAssets from './views/TabAssets.vue'
import TabPreview from './views/TabPreview.vue'
import TabBuildingEditor from './views/TabBuildingEditor.vue'

interface BuildingPresetBlock {
	x: number
	y: number
	z: number
	blockType: string
}

interface BuildingPresetData {
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

interface AssetItem {
	id: string
	name: string
	isFolder: boolean
	type: string
	data: BuildingPresetData
}

const store = useConfigStore()
const bldEdtItem = ref<AssetItem | null>(null)
const showBldEdt = ref(false)

function openBldEdt(item: AssetItem) {
	bldEdtItem.value = item
	showBldEdt.value = true
}

function closeBldEdt() {
	showBldEdt.value = false
	bldEdtItem.value = null
}

function savBldEdt(blocks: BuildingPresetBlock[]) {
	if (bldEdtItem.value && bldEdtItem.value.data) {
		bldEdtItem.value.data.blocks = blocks
		bldEdtItem.value.data.updatedAt = Date.now()
	}
}

const allTabs = [
	{ id: 'law', label: '法则', pro: false },
	{ id: 'rules', label: '规则', pro: false },
	{ id: 'world', label: '世界', pro: false },
	{ id: 'map', label: '地图', pro: false },
	{ id: 'entity', label: '实体', pro: false },
	{ id: 'system', label: '系统', pro: true },
	{ id: 'assets', label: '资产', pro: false },
	{ id: 'preview', label: '预览', pro: false }
]

const tabs = computed(() => {
	if (store.proMode) return allTabs
	return allTabs.filter(t => !t.pro)
})

const activeTab = ref('law')

watch(() => store.proMode, (isPro) => {
	if (!isPro && allTabs.find(t => t.id === activeTab.value)?.pro) {
		activeTab.value = 'law'
	}
})

const viewMap: Record<string, any> = {
	law: TabLaw,
	rules: TabRules,
	world: TabWorld,
	map: TabMap,
	entity: TabEntity,
	system: TabSystem,
	assets: TabAssets,
	preview: TabPreview
}

const currentView = computed(() => viewMap[activeTab.value])
</script>

<template>
	<div class="app">
		<Toolbar />
		<TabBar v-model="activeTab" :tabs="tabs" />
		<TabAssets v-if="activeTab === 'assets'" @openBldEditor="openBldEdt" />
		<component v-else :is="currentView" />
		<div v-if="showBldEdt" class="bld-edt-overlay">
			<TabBuildingEditor :item="bldEdtItem" @close="closeBldEdt" @save="savBldEdt" />
		</div>
	</div>
</template>

<style scoped>
.app {
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 100vh;
	background: #1a1a1a;
	color: #ddd;
	overflow: hidden;
}

.bld-edt-overlay {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 1000;
	background: #1a1a1a;
}
</style>
