import { UINode } from './base/node'

export enum UILayerType {
	World = 'world',
	HUD = 'hud',
	Overlay = 'overlay'
}

export class UILayer {
	typ: UILayerType
	root: UINode
	zIndex: number
	enabled: boolean

	constructor(typ: UILayerType, zIndex: number) {
		this.typ = typ
		this.root = new UINode({ id: `layer_${typ}` })
		this.zIndex = zIndex
		this.enabled = true
	}

	add(node: UINode) {
		this.root.addChild(node)
	}

	del(node: UINode) {
		this.root.delChild(node)
	}

	clr() {
		this.root.delAllChildren()
	}

	upd(dt: number) {
		if (!this.enabled) return
		this.root.upd(dt)
	}

	rnd(ctx: CanvasRenderingContext2D) {
		if (!this.enabled) return
		this.root.rnd(ctx)
	}

	findAt(x: number, y: number): UINode | null {
		if (!this.enabled) return null
		return this.root.findNodeAt(x, y)
	}

	getNodes(): UINode[] {
		return this.root.children
	}

	getNodeById(id: string): UINode | null {
		return this.findById(this.root, id)
	}

	private findById(node: UINode, id: string): UINode | null {
		if (node.id === id) return node
		for (const child of node.children) {
			const found = this.findById(child, id)
			if (found) return found
		}
		return null
	}

	enable() {
		this.enabled = true
	}

	disable() {
		this.enabled = false
	}
}
