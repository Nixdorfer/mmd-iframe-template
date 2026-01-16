<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSceneStore, type SceneNode } from '@/stores/useScene'

const store = useSceneStore()
const searchText = ref('')
const contextMenu = ref<{ show: boolean; x: number; y: number; nodeId: string | null }>({
	show: false, x: 0, y: 0, nodeId: null
})

const nodeTypes = [
	{ type: 'empty', label: '空节点', icon: '○' },
	{ type: 'mesh', label: '网格', icon: '◆' },
	{ type: 'light', label: '光源', icon: '☀' },
	{ type: 'camera', label: '相机', icon: '◎' },
	{ type: 'trigger', label: '触发器', icon: '◈' },
	{ type: 'spawn', label: '出生点', icon: '★' },
	{ type: 'waypoint', label: '路点', icon: '◉' },
	{ type: 'volume', label: '体积', icon: '□' }
] as const

function getNodeIcon(type: SceneNode['type']): string {
	return nodeTypes.find(t => t.type === type)?.icon || '○'
}

function filterNodes(nodes: SceneNode[]): SceneNode[] {
	if (!searchText.value) return nodes
	const search = searchText.value.toLowerCase()
	return nodes.filter(n => n.name.toLowerCase().includes(search))
}

const filteredRoots = computed(() => filterNodes(store.getRootNodes()))

function onNodeClick(id: string, e: MouseEvent) {
	store.select(id, e.ctrlKey || e.metaKey)
}

function onNodeDblClick(id: string) {
	const node = store.getNode(id)
	if (node) {
		node.expanded = !node.expanded
	}
}

function onToggleExpand(id: string, e: MouseEvent) {
	e.stopPropagation()
	const node = store.getNode(id)
	if (node) {
		node.expanded = !node.expanded
	}
}

function onToggleVisible(id: string, e: MouseEvent) {
	e.stopPropagation()
	const node = store.getNode(id)
	if (node) {
		store.setNodeProperty(id, 'visible', !node.visible)
	}
}

function onToggleLock(id: string, e: MouseEvent) {
	e.stopPropagation()
	const node = store.getNode(id)
	if (node) {
		store.setNodeProperty(id, 'locked', !node.locked)
	}
}

function onContextMenu(e: MouseEvent, nodeId: string | null) {
	e.preventDefault()
	contextMenu.value = { show: true, x: e.clientX, y: e.clientY, nodeId }
}

function closeContextMenu() {
	contextMenu.value.show = false
}

function addNode(type: SceneNode['type']) {
	const node = store.createNode(type, undefined, contextMenu.value.nodeId)
	store.addNode(node)
	store.select(node.id)
	closeContextMenu()
}

function duplicateNode() {
	if (contextMenu.value.nodeId) {
		const newNode = store.duplicateNode(contextMenu.value.nodeId)
		if (newNode) store.select(newNode.id)
	}
	closeContextMenu()
}

function deleteNode() {
	if (contextMenu.value.nodeId) {
		store.removeNode(contextMenu.value.nodeId)
	}
	closeContextMenu()
}

function renameNode() {
	if (contextMenu.value.nodeId) {
		const node = store.getNode(contextMenu.value.nodeId)
		if (node) {
			const name = prompt('输入新名称:', node.name)
			if (name) {
				store.setNodeProperty(contextMenu.value.nodeId, 'name', name)
			}
		}
	}
	closeContextMenu()
}

function onDragStart(e: DragEvent, id: string) {
	e.dataTransfer?.setData('text/plain', id)
}

function onDrop(e: DragEvent, targetId: string | null) {
	e.preventDefault()
	const dragId = e.dataTransfer?.getData('text/plain')
	if (dragId && dragId !== targetId) {
		store.reparentNode(dragId, targetId)
	}
}

function onDragOver(e: DragEvent) {
	e.preventDefault()
}
</script>

<template>
	<div class="hierarchy-pn" @click="closeContextMenu">
		<div class="pn-hdr">
			<span class="pn-ttl">层级</span>
			<button class="pn-btn" @click.stop="onContextMenu($event, null)" title="添加节点">+</button>
		</div>
		<div class="pn-sch">
			<input v-model="searchText" type="text" placeholder="搜索..." class="sch-ipt" />
		</div>
		<div class="pn-tree" @contextmenu.prevent="onContextMenu($event, null)" @drop="onDrop($event, null)" @dragover="onDragOver">
			<template v-if="filteredRoots.length === 0">
				<div class="tree-emp">暂无节点</div>
			</template>
			<template v-for="node in filteredRoots" :key="node.id">
				<div
					class="tree-nod"
					:class="{
						'nod-sel': store.selectedIds.includes(node.id),
						'nod-hov': store.hoveredId === node.id
					}"
					draggable="true"
					@click="onNodeClick(node.id, $event)"
					@dblclick="onNodeDblClick(node.id)"
					@contextmenu.stop="onContextMenu($event, node.id)"
					@dragstart="onDragStart($event, node.id)"
					@drop.stop="onDrop($event, node.id)"
					@dragover="onDragOver"
					@mouseenter="store.hoveredId = node.id"
					@mouseleave="store.hoveredId = null"
				>
					<span
						v-if="node.children.length > 0"
						class="nod-exp"
						@click="onToggleExpand(node.id, $event)"
					>{{ node.expanded ? '▼' : '▶' }}</span>
					<span v-else class="nod-exp nod-emp"></span>
					<span class="nod-ico">{{ getNodeIcon(node.type) }}</span>
					<span class="nod-nam" :class="{ 'nam-hid': !node.visible }">{{ node.name }}</span>
					<span class="nod-acts">
						<button class="nod-btn" :class="{ 'btn-off': !node.visible }" @click="onToggleVisible(node.id, $event)" title="可见性">
							{{ node.visible ? '◉' : '○' }}
						</button>
						<button class="nod-btn" :class="{ 'btn-on': node.locked }" @click="onToggleLock(node.id, $event)" title="锁定">
							{{ node.locked ? '⊗' : '◎' }}
						</button>
					</span>
				</div>
				<template v-if="node.expanded && node.children.length > 0">
					<div
						v-for="child in store.getChildren(node.id)"
						:key="child.id"
						class="tree-nod tree-chd"
						:class="{
							'nod-sel': store.selectedIds.includes(child.id),
							'nod-hov': store.hoveredId === child.id
						}"
						draggable="true"
						@click="onNodeClick(child.id, $event)"
						@contextmenu.stop="onContextMenu($event, child.id)"
						@dragstart="onDragStart($event, child.id)"
						@drop.stop="onDrop($event, child.id)"
						@dragover="onDragOver"
						@mouseenter="store.hoveredId = child.id"
						@mouseleave="store.hoveredId = null"
					>
						<span class="nod-exp nod-emp"></span>
						<span class="nod-ico">{{ getNodeIcon(child.type) }}</span>
						<span class="nod-nam" :class="{ 'nam-hid': !child.visible }">{{ child.name }}</span>
						<span class="nod-acts">
							<button class="nod-btn" :class="{ 'btn-off': !child.visible }" @click="onToggleVisible(child.id, $event)">
								{{ child.visible ? '◉' : '○' }}
							</button>
							<button class="nod-btn" :class="{ 'btn-on': child.locked }" @click="onToggleLock(child.id, $event)">
								{{ child.locked ? '⊗' : '◎' }}
							</button>
						</span>
					</div>
				</template>
			</template>
		</div>
		<div
			v-if="contextMenu.show"
			class="ctx-mn"
			:style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
			@click.stop
		>
			<div class="mn-grp">
				<div class="mn-lbl">添加</div>
				<button v-for="nt in nodeTypes" :key="nt.type" class="mn-itm" @click="addNode(nt.type)">
					<span class="itm-ico">{{ nt.icon }}</span>
					<span>{{ nt.label }}</span>
				</button>
			</div>
			<div v-if="contextMenu.nodeId" class="mn-spr"></div>
			<div v-if="contextMenu.nodeId" class="mn-grp">
				<button class="mn-itm" @click="renameNode">重命名</button>
				<button class="mn-itm" @click="duplicateNode">复制</button>
				<button class="mn-itm mn-del" @click="deleteNode">删除</button>
			</div>
		</div>
	</div>
</template>

<style scoped>
.hierarchy-pn {
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
	justify-content: space-between;
	padding: 8px 12px;
	background: #333;
	border-bottom: 1px solid #444;
}

.pn-ttl {
	font-weight: 500;
}

.pn-btn {
	background: #0e639c;
	border: none;
	color: #fff;
	width: 20px;
	height: 20px;
	border-radius: 4px;
	cursor: pointer;
	font-size: 14px;
	line-height: 1;
}

.pn-btn:hover {
	background: #1177bb;
}

.pn-sch {
	padding: 8px;
	border-bottom: 1px solid #333;
}

.sch-ipt {
	width: 100%;
	padding: 4px 8px;
	background: #3c3c3c;
	border: 1px solid #444;
	border-radius: 4px;
	color: #fff;
	font-size: 12px;
}

.sch-ipt:focus {
	outline: none;
	border-color: #0e639c;
}

.pn-tree {
	flex: 1;
	overflow-y: auto;
	padding: 4px 0;
}

.tree-emp {
	padding: 20px;
	text-align: center;
	color: #666;
}

.tree-nod {
	display: flex;
	align-items: center;
	padding: 4px 8px;
	cursor: pointer;
	user-select: none;
}

.tree-nod:hover {
	background: #2a2d2e;
}

.tree-chd {
	padding-left: 24px;
}

.nod-sel {
	background: #094771 !important;
}

.nod-hov {
	outline: 1px solid #0e639c;
	outline-offset: -1px;
}

.nod-exp {
	width: 16px;
	font-size: 10px;
	color: #888;
	cursor: pointer;
}

.nod-emp {
	visibility: hidden;
}

.nod-ico {
	margin-right: 6px;
	font-size: 12px;
}

.nod-nam {
	flex: 1;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.nam-hid {
	opacity: 0.5;
}

.nod-acts {
	display: flex;
	gap: 2px;
	opacity: 0;
}

.tree-nod:hover .nod-acts {
	opacity: 1;
}

.nod-btn {
	background: transparent;
	border: none;
	color: #888;
	cursor: pointer;
	font-size: 10px;
	padding: 2px;
}

.nod-btn:hover {
	color: #fff;
}

.btn-off {
	color: #555;
}

.btn-on {
	color: #e7e740;
}

.ctx-mn {
	position: fixed;
	background: #2d2d2d;
	border: 1px solid #444;
	border-radius: 6px;
	padding: 4px 0;
	min-width: 140px;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
	z-index: 1000;
}

.mn-grp {
	padding: 4px 0;
}

.mn-lbl {
	padding: 4px 12px;
	color: #888;
	font-size: 11px;
}

.mn-itm {
	display: flex;
	align-items: center;
	gap: 8px;
	width: 100%;
	padding: 6px 12px;
	background: transparent;
	border: none;
	color: #ccc;
	font-size: 12px;
	cursor: pointer;
	text-align: left;
}

.mn-itm:hover {
	background: #094771;
}

.mn-del {
	color: #f48771;
}

.mn-del:hover {
	background: #5a1d1d;
}

.mn-spr {
	height: 1px;
	background: #444;
	margin: 4px 0;
}

.itm-ico {
	width: 16px;
	text-align: center;
}
</style>
