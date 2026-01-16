import type { EntityId } from '@engine/common'

export interface DialogueCondition {
	typ: 'flag' | 'stat' | 'item' | 'quest' | 'custom'
	key: string
	op: '==' | '!=' | '>' | '<' | '>=' | '<='
	val: string | number | boolean
}

export interface DialogueEffect {
	typ: 'setFlag' | 'addItem' | 'removeItem' | 'modStat' | 'startQuest' | 'completeQuest' | 'custom'
	key: string
	val: string | number | boolean
}

export interface DialogueOption {
	id: string
	text: string
	conditions?: DialogueCondition[]
	effects?: DialogueEffect[]
	nextNode: string | null
	action?: string
}

export interface DialogueNode {
	id: string
	speaker: string
	text: string
	options: DialogueOption[]
	conditions?: DialogueCondition[]
	effects?: DialogueEffect[]
	onEnter?: string
	onExit?: string
	autoAdvance?: number
	nextNode?: string
}

export interface DialogueTree {
	id: string
	name: string
	startNode: string
	nodes: Map<string, DialogueNode>
	variables: Map<string, any>
}

export interface DialogueCtx {
	flags: Map<string, boolean>
	stats: Map<string, number>
	items: Map<string, number>
	quests: Map<string, 'active' | 'complete' | 'failed'>
	custom: Map<string, any>
}

export type DialogueCallback = (event: string, data: any) => void

export class DialogueManager {
	trees: Map<string, DialogueTree>
	ctx: DialogueCtx
	currentTree: DialogueTree | null
	currentNode: DialogueNode | null
	history: DialogueNode[]
	callbacks: Map<string, DialogueCallback[]>
	speaker: EntityId | null
	listener: EntityId | null

	constructor() {
		this.trees = new Map()
		this.ctx = {
			flags: new Map(),
			stats: new Map(),
			items: new Map(),
			quests: new Map(),
			custom: new Map()
		}
		this.currentTree = null
		this.currentNode = null
		this.history = []
		this.callbacks = new Map()
		this.speaker = null
		this.listener = null
	}

	loadTree(tree: DialogueTree) {
		this.trees.set(tree.id, tree)
	}

	unloadTree(id: string) {
		this.trees.delete(id)
	}

	start(treeId: string, speaker: EntityId, listener: EntityId): boolean {
		const tree = this.trees.get(treeId)
		if (!tree) return false
		this.currentTree = tree
		this.speaker = speaker
		this.listener = listener
		this.history = []
		const startNode = tree.nodes.get(tree.startNode)
		if (!startNode) return false
		return this.enterNode(startNode)
	}

	private enterNode(node: DialogueNode): boolean {
		if (node.conditions && !this.evalConditions(node.conditions)) {
			return false
		}
		this.currentNode = node
		this.history.push(node)
		if (node.effects) {
			this.applyEffects(node.effects)
		}
		if (node.onEnter) {
			this.emit('onEnter', { node: node.id, action: node.onEnter })
		}
		this.emit('nodeEnter', { node, speaker: this.speaker, listener: this.listener })
		return true
	}

	selectOption(optionId: string): boolean {
		if (!this.currentNode) return false
		const option = this.currentNode.options.find(o => o.id === optionId)
		if (!option) return false
		if (option.conditions && !this.evalConditions(option.conditions)) {
			return false
		}
		if (option.effects) {
			this.applyEffects(option.effects)
		}
		if (option.action) {
			this.emit('action', { option: option.id, action: option.action })
		}
		this.emit('optionSelected', { option, node: this.currentNode })
		if (this.currentNode.onExit) {
			this.emit('onExit', { node: this.currentNode.id, action: this.currentNode.onExit })
		}
		if (!option.nextNode) {
			this.end()
			return true
		}
		const nextNode = this.currentTree?.nodes.get(option.nextNode)
		if (!nextNode) {
			this.end()
			return true
		}
		return this.enterNode(nextNode)
	}

	advance(): boolean {
		if (!this.currentNode || !this.currentTree) return false
		if (this.currentNode.onExit) {
			this.emit('onExit', { node: this.currentNode.id, action: this.currentNode.onExit })
		}
		const nextId = this.currentNode.nextNode
		if (!nextId) {
			if (this.currentNode.options.length === 0) {
				this.end()
			}
			return false
		}
		const nextNode = this.currentTree.nodes.get(nextId)
		if (!nextNode) {
			this.end()
			return false
		}
		return this.enterNode(nextNode)
	}

	getAvailableOptions(): DialogueOption[] {
		if (!this.currentNode) return []
		return this.currentNode.options.filter(o => {
			if (!o.conditions) return true
			return this.evalConditions(o.conditions)
		})
	}

	end() {
		this.emit('dialogueEnd', { tree: this.currentTree?.id, history: this.history })
		this.currentTree = null
		this.currentNode = null
		this.speaker = null
		this.listener = null
	}

	isActive(): boolean {
		return this.currentNode !== null
	}

	getCurrentText(): { speaker: string, text: string } | null {
		if (!this.currentNode) return null
		return {
			speaker: this.currentNode.speaker,
			text: this.interpolate(this.currentNode.text)
		}
	}

	private interpolate(text: string): string {
		return text.replace(/\{(\w+)\}/g, (_, key) => {
			if (this.ctx.stats.has(key)) return String(this.ctx.stats.get(key))
			if (this.ctx.flags.has(key)) return String(this.ctx.flags.get(key))
			if (this.ctx.custom.has(key)) return String(this.ctx.custom.get(key))
			if (this.currentTree?.variables.has(key)) return String(this.currentTree.variables.get(key))
			return `{${key}}`
		})
	}

	private evalConditions(conditions: DialogueCondition[]): boolean {
		for (const cond of conditions) {
			if (!this.evalCondition(cond)) return false
		}
		return true
	}

	private evalCondition(cond: DialogueCondition): boolean {
		let actual: any
		switch (cond.typ) {
			case 'flag':
				actual = this.ctx.flags.get(cond.key) ?? false
				break
			case 'stat':
				actual = this.ctx.stats.get(cond.key) ?? 0
				break
			case 'item':
				actual = this.ctx.items.get(cond.key) ?? 0
				break
			case 'quest':
				actual = this.ctx.quests.get(cond.key) ?? null
				break
			case 'custom':
				actual = this.ctx.custom.get(cond.key)
				break
			default:
				return false
		}
		switch (cond.op) {
			case '==': return actual === cond.val
			case '!=': return actual !== cond.val
			case '>': return actual > cond.val
			case '<': return actual < cond.val
			case '>=': return actual >= cond.val
			case '<=': return actual <= cond.val
			default: return false
		}
	}

	private applyEffects(effects: DialogueEffect[]) {
		for (const effect of effects) {
			this.applyEffect(effect)
		}
	}

	private applyEffect(effect: DialogueEffect) {
		switch (effect.typ) {
			case 'setFlag':
				this.ctx.flags.set(effect.key, effect.val as boolean)
				break
			case 'addItem':
				const cur = this.ctx.items.get(effect.key) ?? 0
				this.ctx.items.set(effect.key, cur + (effect.val as number))
				break
			case 'removeItem':
				const have = this.ctx.items.get(effect.key) ?? 0
				this.ctx.items.set(effect.key, Math.max(0, have - (effect.val as number)))
				break
			case 'modStat':
				const stat = this.ctx.stats.get(effect.key) ?? 0
				this.ctx.stats.set(effect.key, stat + (effect.val as number))
				break
			case 'startQuest':
				this.ctx.quests.set(effect.key, 'active')
				break
			case 'completeQuest':
				this.ctx.quests.set(effect.key, 'complete')
				break
			case 'custom':
				this.ctx.custom.set(effect.key, effect.val)
				break
		}
		this.emit('effect', effect)
	}

	setFlag(key: string, val: boolean) {
		this.ctx.flags.set(key, val)
	}

	getFlag(key: string): boolean {
		return this.ctx.flags.get(key) ?? false
	}

	setStat(key: string, val: number) {
		this.ctx.stats.set(key, val)
	}

	getStat(key: string): number {
		return this.ctx.stats.get(key) ?? 0
	}

	setItem(key: string, count: number) {
		this.ctx.items.set(key, count)
	}

	getItem(key: string): number {
		return this.ctx.items.get(key) ?? 0
	}

	on(event: string, callback: DialogueCallback) {
		if (!this.callbacks.has(event)) {
			this.callbacks.set(event, [])
		}
		this.callbacks.get(event)!.push(callback)
	}

	off(event: string, callback: DialogueCallback) {
		const list = this.callbacks.get(event)
		if (list) {
			const idx = list.indexOf(callback)
			if (idx >= 0) list.splice(idx, 1)
		}
	}

	private emit(event: string, data: any) {
		const list = this.callbacks.get(event)
		if (list) {
			for (const cb of list) {
				cb(event, data)
			}
		}
	}
}

export function createDialogueTree(id: string, name: string, nodes: DialogueNode[]): DialogueTree {
	const tree: DialogueTree = {
		id,
		name,
		startNode: nodes.length > 0 ? nodes[0].id : '',
		nodes: new Map(),
		variables: new Map()
	}
	for (const node of nodes) {
		tree.nodes.set(node.id, node)
	}
	return tree
}

export const globalDialogue = new DialogueManager()
