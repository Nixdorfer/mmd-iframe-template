<script setup lang="ts">
import { useSceneStore } from '@/stores/useScene'

const store = useSceneStore()

const emit = defineEmits<{
	save: []
	load: []
	newScene: []
}>()

function setGizmoMode(mode: 'translate' | 'rotate' | 'scale') {
	store.gizmoMode = mode
}

function setGizmoSpace(space: 'world' | 'local') {
	store.gizmoSpace = space
}

function setSnapMode(mode: 'none' | 'grid' | 'vertex') {
	store.snapMode = mode
}

function exportScene() {
	const json = store.exportScene()
	const blob = new Blob([json], { type: 'application/json' })
	const url = URL.createObjectURL(blob)
	const a = document.createElement('a')
	a.href = url
	a.download = `${store.sceneName}.json`
	a.click()
	URL.revokeObjectURL(url)
}

function importScene() {
	const input = document.createElement('input')
	input.type = 'file'
	input.accept = '.json'
	input.onchange = async () => {
		const file = input.files?.[0]
		if (file) {
			const text = await file.text()
			store.importScene(text)
		}
	}
	input.click()
}
</script>

<template>
	<div class="scene-tlb">
		<div class="tlb-grp">
			<button class="tlb-btn" @click="emit('newScene')" title="新建场景">
				<span class="btn-ico">◇</span>
			</button>
			<button class="tlb-btn" @click="importScene" title="导入场景">
				<span class="btn-ico">◫</span>
			</button>
			<button class="tlb-btn" @click="exportScene" title="导出场景">
				<span class="btn-ico">◨</span>
			</button>
		</div>
		<div class="tlb-spr"></div>
		<div class="tlb-grp">
			<button class="tlb-btn" :class="{ 'btn-act': !store.canUndo }" :disabled="!store.canUndo" @click="store.undo()" title="撤销 (Ctrl+Z)">
				<span class="btn-ico">↶</span>
			</button>
			<button class="tlb-btn" :class="{ 'btn-act': !store.canRedo }" :disabled="!store.canRedo" @click="store.redo()" title="重做 (Ctrl+Y)">
				<span class="btn-ico">↷</span>
			</button>
		</div>
		<div class="tlb-spr"></div>
		<div class="tlb-grp">
			<button class="tlb-btn" :class="{ 'btn-act': store.gizmoMode === 'translate' }" @click="setGizmoMode('translate')" title="移动 (W)">
				<span class="btn-ico">✥</span>
			</button>
			<button class="tlb-btn" :class="{ 'btn-act': store.gizmoMode === 'rotate' }" @click="setGizmoMode('rotate')" title="旋转 (E)">
				<span class="btn-ico">↻</span>
			</button>
			<button class="tlb-btn" :class="{ 'btn-act': store.gizmoMode === 'scale' }" @click="setGizmoMode('scale')" title="缩放 (R)">
				<span class="btn-ico">⤢</span>
			</button>
		</div>
		<div class="tlb-spr"></div>
		<div class="tlb-grp">
			<button class="tlb-btn" :class="{ 'btn-act': store.gizmoSpace === 'world' }" @click="setGizmoSpace('world')" title="世界坐标">
				<span class="btn-txt">世界</span>
			</button>
			<button class="tlb-btn" :class="{ 'btn-act': store.gizmoSpace === 'local' }" @click="setGizmoSpace('local')" title="本地坐标">
				<span class="btn-txt">本地</span>
			</button>
		</div>
		<div class="tlb-spr"></div>
		<div class="tlb-grp">
			<button class="tlb-btn" :class="{ 'btn-act': store.snapMode === 'none' }" @click="setSnapMode('none')" title="无吸附">
				<span class="btn-txt">无</span>
			</button>
			<button class="tlb-btn" :class="{ 'btn-act': store.snapMode === 'grid' }" @click="setSnapMode('grid')" title="网格吸附">
				<span class="btn-txt">网格</span>
			</button>
		</div>
		<div class="tlb-spr"></div>
		<div class="tlb-grp">
			<button class="tlb-btn" :class="{ 'btn-act': store.showGrid }" @click="store.showGrid = !store.showGrid" title="显示网格">
				<span class="btn-ico">▦</span>
			</button>
			<button class="tlb-btn" :class="{ 'btn-act': store.showAxis }" @click="store.showAxis = !store.showAxis" title="显示坐标轴">
				<span class="btn-ico">╳</span>
			</button>
			<button class="tlb-btn" :class="{ 'btn-act': store.showBounds }" @click="store.showBounds = !store.showBounds" title="显示边界">
				<span class="btn-ico">▢</span>
			</button>
			<button class="tlb-btn" :class="{ 'btn-act': store.showWireframe }" @click="store.showWireframe = !store.showWireframe" title="线框模式">
				<span class="btn-ico">▤</span>
			</button>
		</div>
		<div class="tlb-fsp"></div>
		<div class="tlb-grp">
			<div class="tlb-info">
				<span class="info-lbl">网格:</span>
				<input type="number" class="info-ipt" v-model.number="store.gridSize" min="0.1" max="10" step="0.1" />
			</div>
		</div>
		<div class="tlb-grp">
			<div class="tlb-info">
				<span class="info-lbl">旋转:</span>
				<input type="number" class="info-ipt" v-model.number="store.rotSnap" min="1" max="90" step="1" />
				<span class="info-unit">°</span>
			</div>
		</div>
	</div>
</template>

<style scoped>
.scene-tlb {
	display: flex;
	align-items: center;
	padding: 4px 8px;
	background: #2d2d2d;
	border-bottom: 1px solid #444;
	gap: 4px;
}

.tlb-grp {
	display: flex;
	gap: 2px;
}

.tlb-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	min-width: 28px;
	height: 28px;
	padding: 0 6px;
	background: transparent;
	border: 1px solid transparent;
	border-radius: 4px;
	color: #ccc;
	cursor: pointer;
	transition: all 0.15s;
}

.tlb-btn:hover {
	background: #3c3c3c;
	border-color: #555;
}

.tlb-btn:disabled {
	opacity: 0.4;
	cursor: not-allowed;
}

.btn-act {
	background: #094771;
	border-color: #0e639c;
}

.btn-ico {
	font-size: 14px;
}

.btn-txt {
	font-size: 11px;
}

.tlb-spr {
	width: 1px;
	height: 20px;
	background: #444;
	margin: 0 4px;
}

.tlb-fsp {
	flex: 1;
}

.tlb-info {
	display: flex;
	align-items: center;
	gap: 4px;
	font-size: 11px;
	color: #999;
}

.info-lbl {
	white-space: nowrap;
}

.info-ipt {
	width: 50px;
	padding: 2px 4px;
	background: #3c3c3c;
	border: 1px solid #444;
	border-radius: 4px;
	color: #fff;
	font-size: 11px;
	text-align: center;
}

.info-ipt:focus {
	outline: none;
	border-color: #0e639c;
}

.info-ipt::-webkit-inner-spin-button,
.info-ipt::-webkit-outer-spin-button {
	-webkit-appearance: none;
	margin: 0;
}

.info-unit {
	color: #666;
}
</style>
