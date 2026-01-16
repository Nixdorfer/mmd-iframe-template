export interface UINodeCfg {
	id?: string
	x?: number
	y?: number
	w?: number
	h?: number
	anchorX?: number
	anchorY?: number
	visible?: boolean
	alpha?: number
}

let nxtNodeId = 1

export class UINode {
	id: string
	x: number
	y: number
	w: number
	h: number
	anchorX: number
	anchorY: number
	visible: boolean
	alpha: number
	parent: UINode | null
	children: UINode[]
	dirty: boolean

	constructor(cfg?: UINodeCfg) {
		this.id = cfg?.id ?? `node_${nxtNodeId++}`
		this.x = cfg?.x ?? 0
		this.y = cfg?.y ?? 0
		this.w = cfg?.w ?? 0
		this.h = cfg?.h ?? 0
		this.anchorX = cfg?.anchorX ?? 0
		this.anchorY = cfg?.anchorY ?? 0
		this.visible = cfg?.visible ?? true
		this.alpha = cfg?.alpha ?? 1
		this.parent = null
		this.children = []
		this.dirty = true
	}

	getWorldX(): number {
		const localX = this.x - this.w * this.anchorX
		return this.parent ? this.parent.getWorldX() + localX : localX
	}

	getWorldY(): number {
		const localY = this.y - this.h * this.anchorY
		return this.parent ? this.parent.getWorldY() + localY : localY
	}

	getWorldAlpha(): number {
		return this.parent ? this.parent.getWorldAlpha() * this.alpha : this.alpha
	}

	addChild(child: UINode) {
		if (child.parent) {
			child.parent.delChild(child)
		}
		child.parent = this
		this.children.push(child)
	}

	delChild(child: UINode) {
		const idx = this.children.indexOf(child)
		if (idx >= 0) {
			this.children.splice(idx, 1)
			child.parent = null
		}
	}

	delAllChildren() {
		for (const child of this.children) {
			child.parent = null
		}
		this.children = []
	}

	hitTest(x: number, y: number): boolean {
		if (!this.visible) return false
		const wx = this.getWorldX()
		const wy = this.getWorldY()
		return x >= wx && x <= wx + this.w && y >= wy && y <= wy + this.h
	}

	findNodeAt(x: number, y: number): UINode | null {
		if (!this.visible) return null
		for (let i = this.children.length - 1; i >= 0; i--) {
			const found = this.children[i].findNodeAt(x, y)
			if (found) return found
		}
		if (this.hitTest(x, y)) return this
		return null
	}

	upd(dt: number) {
		for (const child of this.children) {
			child.upd(dt)
		}
	}

	rnd(ctx: CanvasRenderingContext2D) {
		if (!this.visible || this.getWorldAlpha() <= 0) return
		ctx.save()
		ctx.globalAlpha = this.getWorldAlpha()
		this.draw(ctx)
		for (const child of this.children) {
			child.rnd(ctx)
		}
		ctx.restore()
	}

	draw(_ctx: CanvasRenderingContext2D) {
	}

	setPos(x: number, y: number) {
		this.x = x
		this.y = y
		this.dirty = true
	}

	setSize(w: number, h: number) {
		this.w = w
		this.h = h
		this.dirty = true
	}

	setAnchor(x: number, y: number) {
		this.anchorX = x
		this.anchorY = y
		this.dirty = true
	}

	show() {
		this.visible = true
	}

	hide() {
		this.visible = false
	}

	destroy() {
		if (this.parent) {
			this.parent.delChild(this)
		}
		for (const child of this.children) {
			child.destroy()
		}
		this.children = []
	}
}
