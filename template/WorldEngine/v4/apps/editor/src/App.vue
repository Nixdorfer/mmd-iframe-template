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

const store = useConfigStore()

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
		<component :is="currentView" />
	</div>
</template>
