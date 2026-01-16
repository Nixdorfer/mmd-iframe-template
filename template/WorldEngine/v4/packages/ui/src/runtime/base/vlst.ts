import { UINode, UINodeCfg } from './node'

export interface UIVirtualListCfg extends UINodeCfg {
	itemHeight: number
	totalCount: number
	bgColor?: string
	borderColor?: string
	borderWidth?: number
	scrollBarWidth?: number
	scrollBarColor?: string
	scrollBarBgColor?: string
}

export type ItemRenderer<T> = (data: T, index: number, node: UINode) => void

export class UIVirtualList<T = unknown> extends UINode {
	itemHeight: number
	totalCount: number
	bgColor: string
	borderColor: string
	borderWidth: number
	scrollBarWidth: number
	scrollBarColor: string
	scrollBarBgColor: string
	scrollY: number
	data: T[]
	pool: UINode[]
	activeNodes: Map<number, UINode>
	itemRenderer: ItemRenderer<T> | null
	itemFactory: (() => UINode) | null
	visibleStart: number
	visibleEnd: number
	contentHeight: number
	isDragging: boolean
	dragStartY: number
	dragStartScroll: number

	constructor(cfg: UIVirtualListCfg) {
		super(cfg)
		this.itemHeight = cfg.itemHeight
		this.totalCount = cfg.totalCount
		this.bgColor = cfg.bgColor ?? '#1a1a1a'
		this.borderColor = cfg.borderColor ?? '#333'
		this.borderWidth = cfg.borderWidth ?? 1
		this.scrollBarWidth = cfg.scrollBarWidth ?? 8
		this.scrollBarColor = cfg.scrollBarColor ?? '#666'
		this.scrollBarBgColor = cfg.scrollBarBgColor ?? '#222'
		this.scrollY = 0
		this.data = []
		this.pool = []
		this.activeNodes = new Map()
		this.itemRenderer = null
		this.itemFactory = null
		this.visibleStart = 0
		this.visibleEnd = 0
		this.contentHeight = 0
		this.isDragging = false
		this.dragStartY = 0
		this.dragStartScroll = 0
	}

	setData(data: T[]) {
		this.data = data
		this.totalCount = data.length
		this.contentHeight = this.totalCount * this.itemHeight
		this.clampScroll()
		this.updVisibleRange()
	}

	setItemFactory(factory: () => UINode) {
		this.itemFactory = factory
	}

	setItemRenderer(renderer: ItemRenderer<T>) {
		this.itemRenderer = renderer
	}

	private getOrCreateNode(): UINode {
		if (this.pool.length > 0) {
			return this.pool.pop()!
		}
		if (this.itemFactory) {
			const node = this.itemFactory()
			node.h = this.itemHeight
			return node
		}
		const node = new UINode({ h: this.itemHeight, w: this.w - this.scrollBarWidth - 4 })
		return node
	}

	private recycleNode(node: UINode) {
		node.visible = false
		this.pool.push(node)
	}

	private clampScroll() {
		const maxScroll = Math.max(0, this.contentHeight - this.h)
		this.scrollY = Math.max(0, Math.min(this.scrollY, maxScroll))
	}

	private updVisibleRange() {
		const bufferCount = 2
		const start = Math.max(0, Math.floor(this.scrollY / this.itemHeight) - bufferCount)
		const end = Math.min(this.totalCount, Math.ceil((this.scrollY + this.h) / this.itemHeight) + bufferCount)
		if (start === this.visibleStart && end === this.visibleEnd) return
		const oldIndices = new Set(this.activeNodes.keys())
		const newIndices = new Set<number>()
		for (let i = start; i < end; i++) {
			newIndices.add(i)
		}
		for (const idx of oldIndices) {
			if (!newIndices.has(idx)) {
				const node = this.activeNodes.get(idx)!
				this.recycleNode(node)
				this.activeNodes.delete(idx)
			}
		}
		for (const idx of newIndices) {
			if (!oldIndices.has(idx)) {
				const node = this.getOrCreateNode()
				node.visible = true
				node.w = this.w - this.scrollBarWidth - 4
				this.activeNodes.set(idx, node)
				if (this.itemRenderer && idx < this.data.length) {
					this.itemRenderer(this.data[idx], idx, node)
				}
			}
		}
		this.visibleStart = start
		this.visibleEnd = end
	}

	scroll(delta: number) {
		this.scrollY += delta
		this.clampScroll()
		this.updVisibleRange()
		this.dirty = true
	}

	scrollTo(y: number) {
		this.scrollY = y
		this.clampScroll()
		this.updVisibleRange()
		this.dirty = true
	}

	scrollToIndex(idx: number) {
		this.scrollY = idx * this.itemHeight
		this.clampScroll()
		this.updVisibleRange()
		this.dirty = true
	}

	onWheel(deltaY: number) {
		this.scroll(deltaY)
	}

	onPressDown(x: number, y: number) {
		const wx = this.getWorldX()
		const scrollBarX = wx + this.w - this.scrollBarWidth - 2
		if (x >= scrollBarX) {
			this.isDragging = true
			this.dragStartY = y
			this.dragStartScroll = this.scrollY
		}
	}

	onPressUp() {
		this.isDragging = false
	}

	onDrag(_x: number, y: number) {
		if (!this.isDragging) return
		const scrollBarHeight = this.h
		const thumbHeight = Math.max(20, (this.h / this.contentHeight) * scrollBarHeight)
		const trackHeight = scrollBarHeight - thumbHeight
		const deltaY = y - this.dragStartY
		const scrollRatio = this.contentHeight > this.h ? deltaY / trackHeight : 0
		const newScroll = this.dragStartScroll + scrollRatio * (this.contentHeight - this.h)
		this.scrollTo(newScroll)
	}

	upd(dt: number) {
		for (const node of this.activeNodes.values()) {
			node.upd(dt)
		}
	}

	draw(ctx: CanvasRenderingContext2D) {
		const x = this.getWorldX()
		const y = this.getWorldY()
		if (this.bgColor) {
			ctx.fillStyle = this.bgColor
			ctx.fillRect(x, y, this.w, this.h)
		}
		if (this.borderWidth > 0 && this.borderColor) {
			ctx.strokeStyle = this.borderColor
			ctx.lineWidth = this.borderWidth
			ctx.strokeRect(x, y, this.w, this.h)
		}
		ctx.save()
		ctx.beginPath()
		ctx.rect(x, y, this.w - this.scrollBarWidth - 2, this.h)
		ctx.clip()
		for (const [idx, node] of this.activeNodes) {
			const itemY = y + idx * this.itemHeight - this.scrollY
			node.x = x + 2
			node.y = itemY
			node.rnd(ctx)
		}
		ctx.restore()
		this.drawScrollBar(ctx)
	}

	private drawScrollBar(ctx: CanvasRenderingContext2D) {
		if (this.contentHeight <= this.h) return
		const x = this.getWorldX() + this.w - this.scrollBarWidth - 2
		const y = this.getWorldY()
		ctx.fillStyle = this.scrollBarBgColor
		ctx.fillRect(x, y, this.scrollBarWidth, this.h)
		const thumbHeight = Math.max(20, (this.h / this.contentHeight) * this.h)
		const scrollRatio = this.scrollY / (this.contentHeight - this.h)
		const thumbY = y + scrollRatio * (this.h - thumbHeight)
		ctx.fillStyle = this.scrollBarColor
		ctx.beginPath()
		ctx.roundRect(x + 1, thumbY, this.scrollBarWidth - 2, thumbHeight, 3)
		ctx.fill()
	}

	rnd(ctx: CanvasRenderingContext2D) {
		if (!this.visible || this.getWorldAlpha() <= 0) return
		ctx.save()
		ctx.globalAlpha = this.getWorldAlpha()
		this.draw(ctx)
		ctx.restore()
	}

	refresh() {
		for (const [idx, node] of this.activeNodes) {
			if (this.itemRenderer && idx < this.data.length) {
				this.itemRenderer(this.data[idx], idx, node)
			}
		}
	}

	destroy() {
		this.activeNodes.clear()
		this.pool = []
		super.destroy()
	}
}
