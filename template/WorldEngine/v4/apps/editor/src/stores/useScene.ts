import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'

export interface Vec3 {
	x: number
	y: number
	z: number
}

export interface Transform {
	pos: Vec3
	rot: Vec3
	scl: Vec3
}

export interface SceneNode {
	id: string
	name: string
	type: 'empty' | 'mesh' | 'light' | 'camera' | 'trigger' | 'spawn' | 'waypoint' | 'volume'
	parentId: string | null
	children: string[]
	transform: Transform
	visible: boolean
	locked: boolean
	expanded: boolean
	data: Record<string, unknown>
}

export interface HistoryEntry {
	type: string
	data: unknown
	timestamp: number
}

export type GizmoMode = 'translate' | 'rotate' | 'scale'
export type GizmoSpace = 'world' | 'local'
export type SnapMode = 'none' | 'grid' | 'vertex'

export const useSceneStore = defineStore('scene', () => {
	const nodes = reactive<Map<string, SceneNode>>(new Map())
	const rootIds = ref<string[]>([])
	const selectedIds = ref<string[]>([])
	const hoveredId = ref<string | null>(null)
	const clipboardIds = ref<string[]>([])
	const gizmoMode = ref<GizmoMode>('translate')
	const gizmoSpace = ref<GizmoSpace>('world')
	const snapMode = ref<SnapMode>('none')
	const gridSize = ref(1)
	const rotSnap = ref(15)
	const sclSnap = ref(0.1)
	const showGrid = ref(true)
	const showAxis = ref(true)
	const showGizmo = ref(true)
	const showBounds = ref(false)
	const showWireframe = ref(false)
	const showStats = ref(true)
	const camSpeed = ref(10)
	const camSens = ref(0.003)
	const history = ref<HistoryEntry[]>([])
	const historyIdx = ref(-1)
	const maxHistory = 100
	const dirty = ref(false)
	const sceneName = ref('未命名场景')
	const scenePath = ref<string | null>(null)

	let idCnt = 0
	function genId(): string {
		return `node_${Date.now()}_${++idCnt}`
	}

	function createNode(type: SceneNode['type'], name?: string, parentId?: string | null): SceneNode {
		const id = genId()
		const node: SceneNode = {
			id,
			name: name || `${type}_${id.slice(-4)}`,
			type,
			parentId: parentId ?? null,
			children: [],
			transform: {
				pos: { x: 0, y: 0, z: 0 },
				rot: { x: 0, y: 0, z: 0 },
				scl: { x: 1, y: 1, z: 1 }
			},
			visible: true,
			locked: false,
			expanded: true,
			data: {}
		}
		return node
	}

	function addNode(node: SceneNode) {
		pushHistory('add', { node: JSON.parse(JSON.stringify(node)) })
		nodes.set(node.id, node)
		if (node.parentId) {
			const parent = nodes.get(node.parentId)
			if (parent && !parent.children.includes(node.id)) {
				parent.children.push(node.id)
			}
		} else {
			if (!rootIds.value.includes(node.id)) {
				rootIds.value.push(node.id)
			}
		}
		dirty.value = true
	}

	function removeNode(id: string) {
		const node = nodes.get(id)
		if (!node) return
		const removedNodes: SceneNode[] = []
		function collectNodes(nodeId: string) {
			const n = nodes.get(nodeId)
			if (!n) return
			removedNodes.push(JSON.parse(JSON.stringify(n)))
			for (const childId of n.children) {
				collectNodes(childId)
			}
		}
		collectNodes(id)
		pushHistory('remove', { nodes: removedNodes })
		function doRemove(nodeId: string) {
			const n = nodes.get(nodeId)
			if (!n) return
			for (const childId of [...n.children]) {
				doRemove(childId)
			}
			if (n.parentId) {
				const parent = nodes.get(n.parentId)
				if (parent) {
					const idx = parent.children.indexOf(nodeId)
					if (idx >= 0) parent.children.splice(idx, 1)
				}
			} else {
				const idx = rootIds.value.indexOf(nodeId)
				if (idx >= 0) rootIds.value.splice(idx, 1)
			}
			nodes.delete(nodeId)
		}
		doRemove(id)
		selectedIds.value = selectedIds.value.filter(sid => sid !== id)
		dirty.value = true
	}

	function duplicateNode(id: string): SceneNode | null {
		const node = nodes.get(id)
		if (!node) return null
		const newNode = createNode(node.type, `${node.name}_copy`, node.parentId)
		newNode.transform = JSON.parse(JSON.stringify(node.transform))
		newNode.visible = node.visible
		newNode.data = JSON.parse(JSON.stringify(node.data))
		addNode(newNode)
		return newNode
	}

	function reparentNode(id: string, newParentId: string | null) {
		const node = nodes.get(id)
		if (!node) return
		if (node.id === newParentId) return
		let checkId = newParentId
		while (checkId) {
			if (checkId === id) return
			const p = nodes.get(checkId)
			checkId = p?.parentId ?? null
		}
		pushHistory('reparent', {
			nodeId: id,
			oldParentId: node.parentId,
			newParentId
		})
		if (node.parentId) {
			const oldParent = nodes.get(node.parentId)
			if (oldParent) {
				const idx = oldParent.children.indexOf(id)
				if (idx >= 0) oldParent.children.splice(idx, 1)
			}
		} else {
			const idx = rootIds.value.indexOf(id)
			if (idx >= 0) rootIds.value.splice(idx, 1)
		}
		node.parentId = newParentId
		if (newParentId) {
			const newParent = nodes.get(newParentId)
			if (newParent && !newParent.children.includes(id)) {
				newParent.children.push(id)
			}
		} else {
			if (!rootIds.value.includes(id)) {
				rootIds.value.push(id)
			}
		}
		dirty.value = true
	}

	function updateTransform(id: string, transform: Partial<Transform>) {
		const node = nodes.get(id)
		if (!node) return
		pushHistory('transform', {
			nodeId: id,
			oldTransform: JSON.parse(JSON.stringify(node.transform)),
			newTransform: { ...node.transform, ...transform }
		})
		if (transform.pos) Object.assign(node.transform.pos, transform.pos)
		if (transform.rot) Object.assign(node.transform.rot, transform.rot)
		if (transform.scl) Object.assign(node.transform.scl, transform.scl)
		dirty.value = true
	}

	function setNodeProperty(id: string, key: string, value: unknown) {
		const node = nodes.get(id)
		if (!node) return
		pushHistory('property', {
			nodeId: id,
			key,
			oldValue: (node as Record<string, unknown>)[key],
			newValue: value
		})
		;(node as Record<string, unknown>)[key] = value
		dirty.value = true
	}

	function setNodeData(id: string, key: string, value: unknown) {
		const node = nodes.get(id)
		if (!node) return
		pushHistory('data', {
			nodeId: id,
			key,
			oldValue: node.data[key],
			newValue: value
		})
		node.data[key] = value
		dirty.value = true
	}

	function select(id: string, multi = false) {
		if (multi) {
			const idx = selectedIds.value.indexOf(id)
			if (idx >= 0) {
				selectedIds.value.splice(idx, 1)
			} else {
				selectedIds.value.push(id)
			}
		} else {
			selectedIds.value = [id]
		}
	}

	function selectAll() {
		selectedIds.value = Array.from(nodes.keys())
	}

	function deselectAll() {
		selectedIds.value = []
	}

	function copySelection() {
		clipboardIds.value = [...selectedIds.value]
	}

	function pasteSelection() {
		const newIds: string[] = []
		for (const id of clipboardIds.value) {
			const newNode = duplicateNode(id)
			if (newNode) {
				newNode.transform.pos.x += 1
				newIds.push(newNode.id)
			}
		}
		selectedIds.value = newIds
	}

	function deleteSelection() {
		for (const id of [...selectedIds.value]) {
			removeNode(id)
		}
	}

	function pushHistory(type: string, data: unknown) {
		if (historyIdx.value < history.value.length - 1) {
			history.value = history.value.slice(0, historyIdx.value + 1)
		}
		history.value.push({ type, data, timestamp: Date.now() })
		if (history.value.length > maxHistory) {
			history.value.shift()
		}
		historyIdx.value = history.value.length - 1
	}

	function undo() {
		if (historyIdx.value < 0) return
		const entry = history.value[historyIdx.value]
		applyUndo(entry)
		historyIdx.value--
		dirty.value = true
	}

	function redo() {
		if (historyIdx.value >= history.value.length - 1) return
		historyIdx.value++
		const entry = history.value[historyIdx.value]
		applyRedo(entry)
		dirty.value = true
	}

	function applyUndo(entry: HistoryEntry) {
		const d = entry.data as Record<string, unknown>
		switch (entry.type) {
			case 'add': {
				const node = d.node as SceneNode
				nodes.delete(node.id)
				if (node.parentId) {
					const parent = nodes.get(node.parentId)
					if (parent) {
						const idx = parent.children.indexOf(node.id)
						if (idx >= 0) parent.children.splice(idx, 1)
					}
				} else {
					const idx = rootIds.value.indexOf(node.id)
					if (idx >= 0) rootIds.value.splice(idx, 1)
				}
				break
			}
			case 'remove': {
				const removedNodes = d.nodes as SceneNode[]
				for (const node of removedNodes) {
					nodes.set(node.id, node)
					if (node.parentId) {
						const parent = nodes.get(node.parentId)
						if (parent && !parent.children.includes(node.id)) {
							parent.children.push(node.id)
						}
					} else {
						if (!rootIds.value.includes(node.id)) {
							rootIds.value.push(node.id)
						}
					}
				}
				break
			}
			case 'transform': {
				const node = nodes.get(d.nodeId as string)
				if (node) {
					node.transform = d.oldTransform as Transform
				}
				break
			}
			case 'reparent': {
				const node = nodes.get(d.nodeId as string)
				if (node) {
					if (node.parentId) {
						const curParent = nodes.get(node.parentId)
						if (curParent) {
							const idx = curParent.children.indexOf(node.id)
							if (idx >= 0) curParent.children.splice(idx, 1)
						}
					} else {
						const idx = rootIds.value.indexOf(node.id)
						if (idx >= 0) rootIds.value.splice(idx, 1)
					}
					node.parentId = d.oldParentId as string | null
					if (node.parentId) {
						const oldParent = nodes.get(node.parentId)
						if (oldParent && !oldParent.children.includes(node.id)) {
							oldParent.children.push(node.id)
						}
					} else {
						if (!rootIds.value.includes(node.id)) {
							rootIds.value.push(node.id)
						}
					}
				}
				break
			}
			case 'property': {
				const node = nodes.get(d.nodeId as string)
				if (node) {
					;(node as Record<string, unknown>)[d.key as string] = d.oldValue
				}
				break
			}
			case 'data': {
				const node = nodes.get(d.nodeId as string)
				if (node) {
					node.data[d.key as string] = d.oldValue
				}
				break
			}
		}
	}

	function applyRedo(entry: HistoryEntry) {
		const d = entry.data as Record<string, unknown>
		switch (entry.type) {
			case 'add': {
				const node = d.node as SceneNode
				nodes.set(node.id, node)
				if (node.parentId) {
					const parent = nodes.get(node.parentId)
					if (parent && !parent.children.includes(node.id)) {
						parent.children.push(node.id)
					}
				} else {
					if (!rootIds.value.includes(node.id)) {
						rootIds.value.push(node.id)
					}
				}
				break
			}
			case 'remove': {
				const removedNodes = d.nodes as SceneNode[]
				for (const node of removedNodes) {
					nodes.delete(node.id)
					if (node.parentId) {
						const parent = nodes.get(node.parentId)
						if (parent) {
							const idx = parent.children.indexOf(node.id)
							if (idx >= 0) parent.children.splice(idx, 1)
						}
					} else {
						const idx = rootIds.value.indexOf(node.id)
						if (idx >= 0) rootIds.value.splice(idx, 1)
					}
				}
				break
			}
			case 'transform': {
				const node = nodes.get(d.nodeId as string)
				if (node) {
					node.transform = d.newTransform as Transform
				}
				break
			}
			case 'reparent': {
				const node = nodes.get(d.nodeId as string)
				if (node) {
					if (node.parentId) {
						const oldParent = nodes.get(node.parentId)
						if (oldParent) {
							const idx = oldParent.children.indexOf(node.id)
							if (idx >= 0) oldParent.children.splice(idx, 1)
						}
					} else {
						const idx = rootIds.value.indexOf(node.id)
						if (idx >= 0) rootIds.value.splice(idx, 1)
					}
					node.parentId = d.newParentId as string | null
					if (node.parentId) {
						const newParent = nodes.get(node.parentId)
						if (newParent && !newParent.children.includes(node.id)) {
							newParent.children.push(node.id)
						}
					} else {
						if (!rootIds.value.includes(node.id)) {
							rootIds.value.push(node.id)
						}
					}
				}
				break
			}
			case 'property': {
				const node = nodes.get(d.nodeId as string)
				if (node) {
					;(node as Record<string, unknown>)[d.key as string] = d.newValue
				}
				break
			}
			case 'data': {
				const node = nodes.get(d.nodeId as string)
				if (node) {
					node.data[d.key as string] = d.newValue
				}
				break
			}
		}
	}

	function clearScene() {
		nodes.clear()
		rootIds.value = []
		selectedIds.value = []
		history.value = []
		historyIdx.value = -1
		dirty.value = false
		sceneName.value = '未命名场景'
		scenePath.value = null
	}

	function exportScene(): string {
		const data = {
			name: sceneName.value,
			nodes: Array.from(nodes.values()),
			rootIds: rootIds.value
		}
		return JSON.stringify(data, null, 2)
	}

	function importScene(json: string) {
		try {
			const data = JSON.parse(json)
			clearScene()
			sceneName.value = data.name || '导入场景'
			for (const node of data.nodes) {
				nodes.set(node.id, node)
			}
			rootIds.value = data.rootIds || []
			dirty.value = false
		} catch (e) {
			console.error('导入场景失败:', e)
		}
	}

	const selectedNodes = computed(() => {
		return selectedIds.value.map(id => nodes.get(id)).filter(Boolean) as SceneNode[]
	})

	const canUndo = computed(() => historyIdx.value >= 0)
	const canRedo = computed(() => historyIdx.value < history.value.length - 1)

	const nodeCount = computed(() => nodes.size)

	function getNode(id: string): SceneNode | undefined {
		return nodes.get(id)
	}

	function getRootNodes(): SceneNode[] {
		return rootIds.value.map(id => nodes.get(id)).filter(Boolean) as SceneNode[]
	}

	function getChildren(id: string): SceneNode[] {
		const node = nodes.get(id)
		if (!node) return []
		return node.children.map(cid => nodes.get(cid)).filter(Boolean) as SceneNode[]
	}

	return {
		nodes,
		rootIds,
		selectedIds,
		hoveredId,
		clipboardIds,
		gizmoMode,
		gizmoSpace,
		snapMode,
		gridSize,
		rotSnap,
		sclSnap,
		showGrid,
		showAxis,
		showGizmo,
		showBounds,
		showWireframe,
		showStats,
		camSpeed,
		camSens,
		dirty,
		sceneName,
		scenePath,
		selectedNodes,
		canUndo,
		canRedo,
		nodeCount,
		createNode,
		addNode,
		removeNode,
		duplicateNode,
		reparentNode,
		updateTransform,
		setNodeProperty,
		setNodeData,
		select,
		selectAll,
		deselectAll,
		copySelection,
		pasteSelection,
		deleteSelection,
		undo,
		redo,
		clearScene,
		exportScene,
		importScene,
		getNode,
		getRootNodes,
		getChildren
	}
})
