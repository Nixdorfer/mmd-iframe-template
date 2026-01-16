<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useSceneStore, type SceneNode, type Vec3 } from '@/stores/useScene'

const store = useSceneStore()

const selectedNode = computed(() => {
	if (store.selectedIds.length === 1) {
		return store.getNode(store.selectedIds[0])
	}
	return null
})

const multiSelected = computed(() => store.selectedIds.length > 1)

const nodeTypeLabels: Record<SceneNode['type'], string> = {
	empty: '空节点',
	mesh: '网格',
	light: '光源',
	camera: '相机',
	trigger: '触发器',
	spawn: '出生点',
	waypoint: '路点',
	volume: '体积'
}

const pos = ref({ x: 0, y: 0, z: 0 })
const rot = ref({ x: 0, y: 0, z: 0 })
const scl = ref({ x: 1, y: 1, z: 1 })
const localName = ref('')

watch(selectedNode, (node) => {
	if (node) {
		pos.value = { ...node.transform.pos }
		rot.value = { ...node.transform.rot }
		scl.value = { ...node.transform.scl }
		localName.value = node.name
	}
}, { immediate: true })

function updatePos(axis: keyof Vec3, val: string) {
	const v = parseFloat(val) || 0
	pos.value[axis] = v
	if (selectedNode.value) {
		store.updateTransform(selectedNode.value.id, {
			pos: { ...pos.value }
		})
	}
}

function updateRot(axis: keyof Vec3, val: string) {
	const v = parseFloat(val) || 0
	rot.value[axis] = v
	if (selectedNode.value) {
		store.updateTransform(selectedNode.value.id, {
			rot: { ...rot.value }
		})
	}
}

function updateScl(axis: keyof Vec3, val: string) {
	const v = parseFloat(val) || 1
	scl.value[axis] = v
	if (selectedNode.value) {
		store.updateTransform(selectedNode.value.id, {
			scl: { ...scl.value }
		})
	}
}

function updateName() {
	if (selectedNode.value && localName.value) {
		store.setNodeProperty(selectedNode.value.id, 'name', localName.value)
	}
}

function resetPos() {
	pos.value = { x: 0, y: 0, z: 0 }
	if (selectedNode.value) {
		store.updateTransform(selectedNode.value.id, { pos: { ...pos.value } })
	}
}

function resetRot() {
	rot.value = { x: 0, y: 0, z: 0 }
	if (selectedNode.value) {
		store.updateTransform(selectedNode.value.id, { rot: { ...rot.value } })
	}
}

function resetScl() {
	scl.value = { x: 1, y: 1, z: 1 }
	if (selectedNode.value) {
		store.updateTransform(selectedNode.value.id, { scl: { ...scl.value } })
	}
}

const lightTypes = [
	{ value: 'point', label: '点光源' },
	{ value: 'spot', label: '聚光灯' },
	{ value: 'directional', label: '平行光' }
]

const lightData = computed(() => {
	if (selectedNode.value?.type === 'light') {
		return selectedNode.value.data as {
			lightType?: string
			color?: string
			intensity?: number
			range?: number
			angle?: number
		}
	}
	return null
})

function updateLightData(key: string, val: unknown) {
	if (selectedNode.value) {
		store.setNodeData(selectedNode.value.id, key, val)
	}
}

const triggerData = computed(() => {
	if (selectedNode.value?.type === 'trigger') {
		return selectedNode.value.data as {
			event?: string
			once?: boolean
			delay?: number
		}
	}
	return null
})

function updateTriggerData(key: string, val: unknown) {
	if (selectedNode.value) {
		store.setNodeData(selectedNode.value.id, key, val)
	}
}
</script>

<template>
	<div class="inspector-pn">
		<div class="pn-hdr">
			<span class="pn-ttl">属性</span>
		</div>
		<div class="pn-bd">
			<template v-if="!selectedNode && !multiSelected">
				<div class="pn-emp">未选择对象</div>
			</template>
			<template v-else-if="multiSelected">
				<div class="pn-emp">已选择 {{ store.selectedIds.length }} 个对象</div>
			</template>
			<template v-else-if="selectedNode">
				<div class="sec">
					<div class="sec-hdr">基本信息</div>
					<div class="sec-row">
						<label class="row-lbl">名称</label>
						<input
							v-model="localName"
							type="text"
							class="row-ipt"
							@blur="updateName"
							@keyup.enter="updateName"
						/>
					</div>
					<div class="sec-row">
						<label class="row-lbl">类型</label>
						<span class="row-val">{{ nodeTypeLabels[selectedNode.type] }}</span>
					</div>
					<div class="sec-row">
						<label class="row-lbl">ID</label>
						<span class="row-val row-id">{{ selectedNode.id }}</span>
					</div>
				</div>
				<div class="sec">
					<div class="sec-hdr">
						<span>位置</span>
						<button class="sec-btn" @click="resetPos" title="重置">↺</button>
					</div>
					<div class="sec-vec">
						<div class="vec-fld">
							<label class="vec-lbl vec-x">X</label>
							<input
								type="number"
								class="vec-ipt"
								:value="pos.x.toFixed(2)"
								step="0.1"
								@change="(e) => updatePos('x', (e.target as HTMLInputElement).value)"
							/>
						</div>
						<div class="vec-fld">
							<label class="vec-lbl vec-y">Y</label>
							<input
								type="number"
								class="vec-ipt"
								:value="pos.y.toFixed(2)"
								step="0.1"
								@change="(e) => updatePos('y', (e.target as HTMLInputElement).value)"
							/>
						</div>
						<div class="vec-fld">
							<label class="vec-lbl vec-z">Z</label>
							<input
								type="number"
								class="vec-ipt"
								:value="pos.z.toFixed(2)"
								step="0.1"
								@change="(e) => updatePos('z', (e.target as HTMLInputElement).value)"
							/>
						</div>
					</div>
				</div>
				<div class="sec">
					<div class="sec-hdr">
						<span>旋转</span>
						<button class="sec-btn" @click="resetRot" title="重置">↺</button>
					</div>
					<div class="sec-vec">
						<div class="vec-fld">
							<label class="vec-lbl vec-x">X</label>
							<input
								type="number"
								class="vec-ipt"
								:value="(rot.x * 180 / Math.PI).toFixed(1)"
								step="1"
								@change="(e) => updateRot('x', String(parseFloat((e.target as HTMLInputElement).value) * Math.PI / 180))"
							/>
						</div>
						<div class="vec-fld">
							<label class="vec-lbl vec-y">Y</label>
							<input
								type="number"
								class="vec-ipt"
								:value="(rot.y * 180 / Math.PI).toFixed(1)"
								step="1"
								@change="(e) => updateRot('y', String(parseFloat((e.target as HTMLInputElement).value) * Math.PI / 180))"
							/>
						</div>
						<div class="vec-fld">
							<label class="vec-lbl vec-z">Z</label>
							<input
								type="number"
								class="vec-ipt"
								:value="(rot.z * 180 / Math.PI).toFixed(1)"
								step="1"
								@change="(e) => updateRot('z', String(parseFloat((e.target as HTMLInputElement).value) * Math.PI / 180))"
							/>
						</div>
					</div>
				</div>
				<div class="sec">
					<div class="sec-hdr">
						<span>缩放</span>
						<button class="sec-btn" @click="resetScl" title="重置">↺</button>
					</div>
					<div class="sec-vec">
						<div class="vec-fld">
							<label class="vec-lbl vec-x">X</label>
							<input
								type="number"
								class="vec-ipt"
								:value="scl.x.toFixed(2)"
								step="0.1"
								@change="(e) => updateScl('x', (e.target as HTMLInputElement).value)"
							/>
						</div>
						<div class="vec-fld">
							<label class="vec-lbl vec-y">Y</label>
							<input
								type="number"
								class="vec-ipt"
								:value="scl.y.toFixed(2)"
								step="0.1"
								@change="(e) => updateScl('y', (e.target as HTMLInputElement).value)"
							/>
						</div>
						<div class="vec-fld">
							<label class="vec-lbl vec-z">Z</label>
							<input
								type="number"
								class="vec-ipt"
								:value="scl.z.toFixed(2)"
								step="0.1"
								@change="(e) => updateScl('z', (e.target as HTMLInputElement).value)"
							/>
						</div>
					</div>
				</div>
				<template v-if="selectedNode.type === 'light' && lightData">
					<div class="sec">
						<div class="sec-hdr">光源属性</div>
						<div class="sec-row">
							<label class="row-lbl">类型</label>
							<select
								class="row-sel"
								:value="lightData.lightType || 'point'"
								@change="(e) => updateLightData('lightType', (e.target as HTMLSelectElement).value)"
							>
								<option v-for="lt in lightTypes" :key="lt.value" :value="lt.value">{{ lt.label }}</option>
							</select>
						</div>
						<div class="sec-row">
							<label class="row-lbl">颜色</label>
							<input
								type="color"
								class="row-clr"
								:value="lightData.color || '#ffffff'"
								@change="(e) => updateLightData('color', (e.target as HTMLInputElement).value)"
							/>
						</div>
						<div class="sec-row">
							<label class="row-lbl">强度</label>
							<input
								type="number"
								class="row-ipt"
								:value="lightData.intensity ?? 1"
								step="0.1"
								min="0"
								@change="(e) => updateLightData('intensity', parseFloat((e.target as HTMLInputElement).value))"
							/>
						</div>
						<div class="sec-row">
							<label class="row-lbl">范围</label>
							<input
								type="number"
								class="row-ipt"
								:value="lightData.range ?? 10"
								step="1"
								min="0"
								@change="(e) => updateLightData('range', parseFloat((e.target as HTMLInputElement).value))"
							/>
						</div>
					</div>
				</template>
				<template v-if="selectedNode.type === 'trigger' && triggerData">
					<div class="sec">
						<div class="sec-hdr">触发器属性</div>
						<div class="sec-row">
							<label class="row-lbl">事件</label>
							<input
								type="text"
								class="row-ipt"
								:value="triggerData.event || ''"
								placeholder="事件名称"
								@change="(e) => updateTriggerData('event', (e.target as HTMLInputElement).value)"
							/>
						</div>
						<div class="sec-row">
							<label class="row-lbl">一次性</label>
							<input
								type="checkbox"
								class="row-chk"
								:checked="triggerData.once || false"
								@change="(e) => updateTriggerData('once', (e.target as HTMLInputElement).checked)"
							/>
						</div>
						<div class="sec-row">
							<label class="row-lbl">延迟</label>
							<input
								type="number"
								class="row-ipt"
								:value="triggerData.delay ?? 0"
								step="0.1"
								min="0"
								@change="(e) => updateTriggerData('delay', parseFloat((e.target as HTMLInputElement).value))"
							/>
						</div>
					</div>
				</template>
			</template>
		</div>
	</div>
</template>

<style scoped>
.inspector-pn {
	display: flex;
	flex-direction: column;
	height: 100%;
	background: #252526;
	color: #ccc;
	font-size: 12px;
}

.pn-hdr {
	display: flex;
	align-items: center;
	padding: 8px 12px;
	background: #333;
	border-bottom: 1px solid #444;
}

.pn-ttl {
	font-weight: 500;
}

.pn-bd {
	flex: 1;
	overflow-y: auto;
	padding: 8px 0;
}

.pn-emp {
	padding: 20px;
	text-align: center;
	color: #666;
}

.sec {
	padding: 8px 12px;
	border-bottom: 1px solid #333;
}

.sec-hdr {
	display: flex;
	align-items: center;
	justify-content: space-between;
	font-weight: 500;
	margin-bottom: 8px;
	color: #e0e0e0;
}

.sec-btn {
	background: transparent;
	border: none;
	color: #888;
	cursor: pointer;
	font-size: 14px;
}

.sec-btn:hover {
	color: #fff;
}

.sec-row {
	display: flex;
	align-items: center;
	margin-bottom: 6px;
}

.row-lbl {
	width: 60px;
	color: #999;
}

.row-ipt {
	flex: 1;
	padding: 4px 8px;
	background: #3c3c3c;
	border: 1px solid #444;
	border-radius: 4px;
	color: #fff;
	font-size: 12px;
}

.row-ipt:focus {
	outline: none;
	border-color: #0e639c;
}

.row-val {
	flex: 1;
	color: #999;
}

.row-id {
	font-family: monospace;
	font-size: 10px;
}

.row-sel {
	flex: 1;
	padding: 4px 8px;
	background: #3c3c3c;
	border: 1px solid #444;
	border-radius: 4px;
	color: #fff;
	font-size: 12px;
}

.row-clr {
	width: 60px;
	height: 24px;
	padding: 0;
	border: 1px solid #444;
	border-radius: 4px;
	cursor: pointer;
}

.row-chk {
	width: 16px;
	height: 16px;
	cursor: pointer;
}

.sec-vec {
	display: flex;
	gap: 8px;
}

.vec-fld {
	flex: 1;
	display: flex;
	align-items: center;
	gap: 4px;
}

.vec-lbl {
	width: 16px;
	text-align: center;
	font-weight: 500;
	font-size: 11px;
}

.vec-x {
	color: #e74c3c;
}

.vec-y {
	color: #27ae60;
}

.vec-z {
	color: #3498db;
}

.vec-ipt {
	flex: 1;
	min-width: 0;
	padding: 4px 6px;
	background: #3c3c3c;
	border: 1px solid #444;
	border-radius: 4px;
	color: #fff;
	font-size: 11px;
}

.vec-ipt:focus {
	outline: none;
	border-color: #0e639c;
}

.vec-ipt::-webkit-inner-spin-button,
.vec-ipt::-webkit-outer-spin-button {
	-webkit-appearance: none;
	margin: 0;
}
</style>
