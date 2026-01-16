<script setup lang="ts">
interface EffectNode {
	type: string
	delay?: number
	entityId?: string
	projectileId?: string
	rangeId?: string
	targetType?: string
	attrName?: string
	modifyType?: string
	modifyVal?: number
	duration?: number
	maxStack?: number
	filterType?: string
	filterColor?: string
	spreadType?: string
}

const props = defineProps<{
	modelValue: EffectNode[]
}>()

const emit = defineEmits<{
	'update:modelValue': [value: EffectNode[]]
}>()

const typeOpts = [
	{ value: 'delay', label: '延迟', desc: '等待一段时间' },
	{ value: 'spawn_entity', label: '生成实体', desc: '生成一个实体' },
	{ value: 'spawn_projectile', label: '生成射弹', desc: '发射射弹' },
	{ value: 'spawn_range', label: '范围效果', desc: '生成范围效果' },
	{ value: 'modify_attr', label: '属性修改', desc: '修改属性值' },
	{ value: 'add_filter', label: '滤镜效果', desc: '添加视觉滤镜' }
]

const targetOpts = [
	{ value: 'self', label: '使用者' },
	{ value: 'target', label: '目标' },
	{ value: 'all', label: '所有实体' },
	{ value: 'tagged', label: '标签实体' }
]

const modifyOpts = [
	{ value: 'add', label: '增加' },
	{ value: 'sub', label: '减少' },
	{ value: 'set', label: '设为' },
	{ value: 'mul', label: '乘以' }
]

const filterOpts = [
	{ value: 'blur', label: '模糊' },
	{ value: 'invert', label: '反色' },
	{ value: 'saturate', label: '饱和' },
	{ value: 'sepia', label: '褐色' },
	{ value: 'tint', label: '着色' }
]

const spreadOpts = [
	{ value: 'center', label: '从中心' },
	{ value: 'ground', label: '从地面' },
	{ value: 'inward', label: '向内收拢' }
]

function addNode() {
	const arr = [...props.modelValue]
	arr.push({ type: 'delay', delay: 500 })
	emit('update:modelValue', arr)
}

function delNode(idx: number) {
	const arr = [...props.modelValue]
	arr.splice(idx, 1)
	emit('update:modelValue', arr)
}

function updateNode(idx: number, node: EffectNode) {
	const arr = [...props.modelValue]
	arr[idx] = node
	emit('update:modelValue', arr)
}

function onTypeChange(idx: number, type: string) {
	const node: EffectNode = { type }
	switch (type) {
		case 'delay':
			node.delay = 500
			break
		case 'spawn_entity':
			node.entityId = ''
			break
		case 'spawn_projectile':
			node.projectileId = ''
			break
		case 'spawn_range':
			node.rangeId = ''
			node.spreadType = 'center'
			break
		case 'modify_attr':
			node.targetType = 'target'
			node.attrName = ''
			node.modifyType = 'add'
			node.modifyVal = 0
			node.duration = 0
			node.maxStack = 1
			break
		case 'add_filter':
			node.filterType = 'blur'
			node.filterColor = '#ffffff'
			node.duration = 1000
			node.spreadType = 'center'
			break
	}
	updateNode(idx, node)
}
</script>

<template>
	<div class="eff-edt">
		<div class="eff-timeline">
			<div v-for="(node, idx) in modelValue" :key="idx" class="eff-node">
				<div class="eff-node-hd">
					<span class="eff-node-idx">{{ idx + 1 }}</span>
					<select :value="node.type" @change="onTypeChange(idx, ($event.target as HTMLSelectElement).value)" class="eff-node-type">
						<option v-for="opt in typeOpts" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
					</select>
					<button class="eff-node-del" @click="delNode(idx)">×</button>
				</div>
				<div class="eff-node-bd">
					<template v-if="node.type === 'delay'">
						<div class="eff-row">
							<span class="eff-lbl">延迟</span>
							<input type="number" :value="node.delay" @input="updateNode(idx, { ...node, delay: Number(($event.target as HTMLInputElement).value) })" min="0" class="eff-ipt">
							<span class="eff-unit">ms</span>
						</div>
					</template>
					<template v-else-if="node.type === 'spawn_entity'">
						<div class="eff-row">
							<span class="eff-lbl">实体ID</span>
							<input type="text" :value="node.entityId" @input="updateNode(idx, { ...node, entityId: ($event.target as HTMLInputElement).value })" placeholder="实体资产ID" class="eff-ipt-lg">
						</div>
					</template>
					<template v-else-if="node.type === 'spawn_projectile'">
						<div class="eff-row">
							<span class="eff-lbl">射弹ID</span>
							<input type="text" :value="node.projectileId" @input="updateNode(idx, { ...node, projectileId: ($event.target as HTMLInputElement).value })" placeholder="射弹资产ID" class="eff-ipt-lg">
						</div>
					</template>
					<template v-else-if="node.type === 'spawn_range'">
						<div class="eff-row">
							<span class="eff-lbl">范围ID</span>
							<input type="text" :value="node.rangeId" @input="updateNode(idx, { ...node, rangeId: ($event.target as HTMLInputElement).value })" placeholder="范围效果资产ID" class="eff-ipt-lg">
						</div>
						<div class="eff-row">
							<span class="eff-lbl">扩散</span>
							<select :value="node.spreadType" @change="updateNode(idx, { ...node, spreadType: ($event.target as HTMLSelectElement).value })" class="eff-sel">
								<option v-for="opt in spreadOpts" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
							</select>
						</div>
					</template>
					<template v-else-if="node.type === 'modify_attr'">
						<div class="eff-row">
							<span class="eff-lbl">目标</span>
							<select :value="node.targetType" @change="updateNode(idx, { ...node, targetType: ($event.target as HTMLSelectElement).value })" class="eff-sel">
								<option v-for="opt in targetOpts" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
							</select>
						</div>
						<div class="eff-row">
							<span class="eff-lbl">属性</span>
							<input type="text" :value="node.attrName" @input="updateNode(idx, { ...node, attrName: ($event.target as HTMLInputElement).value })" placeholder="属性名" class="eff-ipt">
						</div>
						<div class="eff-row">
							<span class="eff-lbl">方式</span>
							<select :value="node.modifyType" @change="updateNode(idx, { ...node, modifyType: ($event.target as HTMLSelectElement).value })" class="eff-sel-sm">
								<option v-for="opt in modifyOpts" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
							</select>
							<input type="number" :value="node.modifyVal" @input="updateNode(idx, { ...node, modifyVal: Number(($event.target as HTMLInputElement).value) })" class="eff-ipt-sm">
						</div>
						<div class="eff-row">
							<span class="eff-lbl">持续</span>
							<input type="number" :value="node.duration" @input="updateNode(idx, { ...node, duration: Number(($event.target as HTMLInputElement).value) })" min="0" class="eff-ipt">
							<span class="eff-unit">ms</span>
						</div>
						<div class="eff-row">
							<span class="eff-lbl">层数</span>
							<input type="number" :value="node.maxStack" @input="updateNode(idx, { ...node, maxStack: Number(($event.target as HTMLInputElement).value) })" min="1" max="99" class="eff-ipt-sm">
						</div>
					</template>
					<template v-else-if="node.type === 'add_filter'">
						<div class="eff-row">
							<span class="eff-lbl">滤镜</span>
							<select :value="node.filterType" @change="updateNode(idx, { ...node, filterType: ($event.target as HTMLSelectElement).value })" class="eff-sel">
								<option v-for="opt in filterOpts" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
							</select>
						</div>
						<div class="eff-row">
							<span class="eff-lbl">颜色</span>
							<input type="color" :value="node.filterColor" @input="updateNode(idx, { ...node, filterColor: ($event.target as HTMLInputElement).value })" class="eff-clr">
						</div>
						<div class="eff-row">
							<span class="eff-lbl">持续</span>
							<input type="number" :value="node.duration" @input="updateNode(idx, { ...node, duration: Number(($event.target as HTMLInputElement).value) })" min="0" class="eff-ipt">
							<span class="eff-unit">ms</span>
						</div>
						<div class="eff-row">
							<span class="eff-lbl">扩散</span>
							<select :value="node.spreadType" @change="updateNode(idx, { ...node, spreadType: ($event.target as HTMLSelectElement).value })" class="eff-sel">
								<option v-for="opt in spreadOpts" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
							</select>
						</div>
					</template>
				</div>
			</div>
		</div>
		<button class="eff-add" @click="addNode">+ 添加效果节点</button>
	</div>
</template>

<style scoped>
.eff-edt {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.eff-timeline {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.eff-node {
	background: #1a1a1a;
	border: 1px solid #333;
	border-radius: 4px;
	overflow: hidden;
}

.eff-node-hd {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 8px 10px;
	background: #222;
	border-bottom: 1px solid #333;
}

.eff-node-idx {
	width: 20px;
	height: 20px;
	background: #166d3b;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 10px;
	color: #fff;
	flex-shrink: 0;
}

.eff-node-type {
	flex: 1;
	height: 26px;
	padding: 0 8px;
	background: #1a1a1a;
	border: 1px solid #444;
	border-radius: 3px;
	color: #ddd;
	font-size: 12px;
}

.eff-node-del {
	width: 22px;
	height: 22px;
	background: #3a2222;
	border: 1px solid #552222;
	border-radius: 3px;
	color: #c66;
	font-size: 14px;
	cursor: pointer;
	flex-shrink: 0;
}

.eff-node-del:hover {
	background: #4a2828;
	color: #f88;
}

.eff-node-bd {
	padding: 10px;
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.eff-row {
	display: flex;
	align-items: center;
	gap: 8px;
}

.eff-lbl {
	width: 50px;
	font-size: 11px;
	color: #888;
	flex-shrink: 0;
}

.eff-ipt {
	width: 80px;
	height: 26px;
	padding: 0 6px;
	background: #222;
	border: 1px solid #444;
	border-radius: 3px;
	color: #ddd;
	font-size: 12px;
}

.eff-ipt-sm {
	width: 60px;
	height: 26px;
	padding: 0 6px;
	background: #222;
	border: 1px solid #444;
	border-radius: 3px;
	color: #ddd;
	font-size: 12px;
}

.eff-ipt-lg {
	flex: 1;
	height: 26px;
	padding: 0 8px;
	background: #222;
	border: 1px solid #444;
	border-radius: 3px;
	color: #ddd;
	font-size: 12px;
}

.eff-sel {
	width: 100px;
	height: 26px;
	padding: 0 6px;
	background: #222;
	border: 1px solid #444;
	border-radius: 3px;
	color: #ddd;
	font-size: 12px;
}

.eff-sel-sm {
	width: 70px;
	height: 26px;
	padding: 0 6px;
	background: #222;
	border: 1px solid #444;
	border-radius: 3px;
	color: #ddd;
	font-size: 12px;
}

.eff-unit {
	font-size: 11px;
	color: #666;
}

.eff-clr {
	width: 40px;
	height: 26px;
	padding: 2px;
	background: #222;
	border: 1px solid #444;
	border-radius: 3px;
}

.eff-add {
	width: 100%;
	height: 32px;
	background: transparent;
	border: 1px dashed #444;
	border-radius: 4px;
	color: #888;
	font-size: 12px;
	cursor: pointer;
}

.eff-add:hover {
	background: #252525;
	border-color: #166d3b;
	color: #aaa;
}
</style>
