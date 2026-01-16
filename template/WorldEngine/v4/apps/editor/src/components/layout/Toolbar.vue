<script setup lang="ts">
import { useConfigIO } from '@/composables/useConfigIO'
import { useConfigStore } from '@/stores/useConfig'

const { saveConfig, loadConfig, newConfig } = useConfigIO()
const store = useConfigStore()
</script>

<template>
	<div class="toolbar">
		<div class="pro-mode-swt">
			<span class="pro-mode-lbl">{{ store.proMode ? '专业' : '简易' }}</span>
			<label class="swt">
				<input type="checkbox" v-model="store.proMode">
				<span class="swt-trk"></span>
			</label>
		</div>
		<div class="file-buttons">
			<button class="file-btn" @click="newConfig">
				<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
				新建
			</button>
			<button class="file-btn" @click="loadConfig">
				<svg viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
				打开
			</button>
			<button class="file-btn primary" @click="saveConfig">
				<svg viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
				保存
			</button>
			<button class="prv-btn">
				<svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
				预览
			</button>
		</div>
	</div>
</template>

<style scoped>
.pro-mode-swt {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 0 12px;
	border-right: 1px solid #333;
}

.pro-mode-lbl {
	font-size: 12px;
	color: #888;
	min-width: 32px;
}
</style>
