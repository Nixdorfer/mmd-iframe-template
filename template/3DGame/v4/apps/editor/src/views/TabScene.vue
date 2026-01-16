<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSceneStore } from '@/stores/useScene'
import SceneToolbar from '@/components/scene/SceneToolbar.vue'
import SceneViewport from '@/components/scene/SceneViewport.vue'
import HierarchyPanel from '@/components/scene/HierarchyPanel.vue'
import InspectorPanel from '@/components/scene/InspectorPanel.vue'

const store = useSceneStore()
const leftWidth = ref(220)
const rightWidth = ref(280)
const isDraggingLeft = ref(false)
const isDraggingRight = ref(false)

function onLeftDragStart() {
	isDraggingLeft.value = true
}

function onRightDragStart() {
	isDraggingRight.value = true
}

function onMouseMove(e: MouseEvent) {
	if (isDraggingLeft.value) {
		leftWidth.value = Math.max(160, Math.min(400, e.clientX))
	}
	if (isDraggingRight.value) {
		rightWidth.value = Math.max(200, Math.min(450, window.innerWidth - e.clientX))
	}
}

function onMouseUp() {
	isDraggingLeft.value = false
	isDraggingRight.value = false
}

function onNewScene() {
	if (store.dirty) {
		if (!confirm('当前场景未保存，确定要创建新场景吗？')) {
			return
		}
	}
	store.clearScene()
}

onMounted(() => {
	if (store.nodeCount === 0) {
		const floor = store.createNode('mesh', '地面')
		floor.transform.scl = { x: 20, y: 0.1, z: 20 }
		floor.transform.pos = { x: 0, y: -0.05, z: 0 }
		store.addNode(floor)
		const light = store.createNode('light', '主光源')
		light.transform.pos = { x: 5, y: 10, z: 5 }
		light.data = { lightType: 'directional', color: '#fffaed', intensity: 1, range: 50 }
		store.addNode(light)
		const camera = store.createNode('camera', '主相机')
		camera.transform.pos = { x: 0, y: 5, z: 10 }
		store.addNode(camera)
		const spawn = store.createNode('spawn', '出生点')
		spawn.transform.pos = { x: 0, y: 1, z: 0 }
		store.addNode(spawn)
		store.dirty = false
	}
})
</script>

<template>
	<div
		class="tab-scene"
		@mousemove="onMouseMove"
		@mouseup="onMouseUp"
		@mouseleave="onMouseUp"
	>
		<SceneToolbar @newScene="onNewScene" />
		<div class="scene-main">
			<div class="pn-le" :style="{ width: leftWidth + 'px' }">
				<HierarchyPanel />
			</div>
			<div class="pn-rz pn-rz-le" @mousedown.prevent="onLeftDragStart"></div>
			<div class="vp-ctn">
				<SceneViewport />
			</div>
			<div class="pn-rz pn-rz-ri" @mousedown.prevent="onRightDragStart"></div>
			<div class="pn-ri" :style="{ width: rightWidth + 'px' }">
				<InspectorPanel />
			</div>
		</div>
		<div class="scene-stb">
			<span class="stb-itm">
				{{ store.sceneName }}
				<span v-if="store.dirty" class="stb-dirty">*</span>
			</span>
			<span class="stb-spr"></span>
			<span class="stb-itm">节点: {{ store.nodeCount }}</span>
			<span class="stb-itm">选中: {{ store.selectedIds.length }}</span>
		</div>
	</div>
</template>

<style scoped>
.tab-scene {
	display: flex;
	flex-direction: column;
	height: 100%;
	background: #1e1e1e;
	overflow: hidden;
}

.scene-main {
	flex: 1;
	display: flex;
	overflow: hidden;
}

.pn-le,
.pn-ri {
	flex-shrink: 0;
	overflow: hidden;
}

.pn-rz {
	width: 4px;
	background: transparent;
	cursor: col-resize;
	transition: background 0.15s;
}

.pn-rz:hover {
	background: #0e639c;
}

.vp-ctn {
	flex: 1;
	min-width: 200px;
	overflow: hidden;
}

.scene-stb {
	display: flex;
	align-items: center;
	padding: 4px 12px;
	background: #007acc;
	font-size: 11px;
	color: #fff;
	gap: 16px;
}

.stb-itm {
	display: flex;
	align-items: center;
	gap: 4px;
}

.stb-dirty {
	color: #ffc107;
}

.stb-spr {
	flex: 1;
}
</style>
