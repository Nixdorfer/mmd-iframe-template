import { UINode } from './node'

export interface DragData {
	type: string
	payload: unknown
	sourceNode: UINode | null
}

export interface DropZone {
	node: UINode
	accepts: string[]
	onDrop: (data: DragData, x: number, y: number) => void
	onDragEnter?: (data: DragData) => void
	onDragLeave?: (data: DragData) => void
	onDragOver?: (data: DragData, x: number, y: number) => void
}

export interface DraggableConfig {
	node: UINode
	type: string
	getData: () => unknown
	onDragStart?: () => void
	onDragEnd?: (dropped: boolean) => void
	createGhost?: () => UINode | null
}

export class DragDropManager {
	draggables: Map<string, DraggableConfig>
	dropZones: Map<string, DropZone>
	isDragging: boolean
	currentDrag: DragData | null
	ghost: UINode | null
	ghostOffsetX: number
	ghostOffsetY: number
	currentDropZone: DropZone | null
	startX: number
	startY: number
	dragThreshold: number

	constructor() {
		this.draggables = new Map()
		this.dropZones = new Map()
		this.isDragging = false
		this.currentDrag = null
		this.ghost = null
		this.ghostOffsetX = 0
		this.ghostOffsetY = 0
		this.currentDropZone = null
		this.startX = 0
		this.startY = 0
		this.dragThreshold = 5
	}

	regDraggable(id: string, cfg: DraggableConfig) {
		this.draggables.set(id, cfg)
	}

	unregDraggable(id: string) {
		this.draggables.delete(id)
	}

	regDropZone(id: string, zone: DropZone) {
		this.dropZones.set(id, zone)
	}

	unregDropZone(id: string) {
		this.dropZones.delete(id)
	}

	onMouseDown(x: number, y: number): boolean {
		for (const [, cfg] of this.draggables) {
			if (cfg.node.hitTest(x, y)) {
				this.startX = x
				this.startY = y
				return true
			}
		}
		return false
	}

	onMouseMove(x: number, y: number): boolean {
		if (this.isDragging) {
			this.updGhostPos(x, y)
			this.updDropZoneHover(x, y)
			return true
		}
		if (this.startX !== 0 || this.startY !== 0) {
			const dx = x - this.startX
			const dy = y - this.startY
			if (Math.sqrt(dx * dx + dy * dy) > this.dragThreshold) {
				this.startDrag(this.startX, this.startY, x, y)
				return true
			}
		}
		return false
	}

	onMouseUp(x: number, y: number): boolean {
		this.startX = 0
		this.startY = 0
		if (!this.isDragging) return false
		const dropped = this.tryDrop(x, y)
		this.endDrag(dropped)
		return true
	}

	private startDrag(startX: number, startY: number, curX: number, curY: number) {
		let foundCfg: DraggableConfig | null = null
		for (const [, cfg] of this.draggables) {
			if (cfg.node.hitTest(startX, startY)) {
				foundCfg = cfg
				break
			}
		}
		if (!foundCfg) return
		this.isDragging = true
		this.currentDrag = {
			type: foundCfg.type,
			payload: foundCfg.getData(),
			sourceNode: foundCfg.node
		}
		if (foundCfg.createGhost) {
			this.ghost = foundCfg.createGhost()
		}
		if (this.ghost) {
			this.ghostOffsetX = startX - foundCfg.node.getWorldX()
			this.ghostOffsetY = startY - foundCfg.node.getWorldY()
			this.updGhostPos(curX, curY)
		}
		foundCfg.onDragStart?.()
	}

	private updGhostPos(x: number, y: number) {
		if (this.ghost) {
			this.ghost.x = x - this.ghostOffsetX
			this.ghost.y = y - this.ghostOffsetY
		}
	}

	private updDropZoneHover(x: number, y: number) {
		if (!this.currentDrag) return
		let foundZone: DropZone | null = null
		for (const [, zone] of this.dropZones) {
			if (zone.node.hitTest(x, y) && zone.accepts.includes(this.currentDrag.type)) {
				foundZone = zone
				break
			}
		}
		if (foundZone !== this.currentDropZone) {
			if (this.currentDropZone) {
				this.currentDropZone.onDragLeave?.(this.currentDrag)
			}
			this.currentDropZone = foundZone
			if (this.currentDropZone) {
				this.currentDropZone.onDragEnter?.(this.currentDrag)
			}
		}
		if (this.currentDropZone) {
			this.currentDropZone.onDragOver?.(this.currentDrag, x, y)
		}
	}

	private tryDrop(x: number, y: number): boolean {
		if (!this.currentDrag || !this.currentDropZone) return false
		if (!this.currentDropZone.node.hitTest(x, y)) return false
		this.currentDropZone.onDrop(this.currentDrag, x, y)
		return true
	}

	private endDrag(dropped: boolean) {
		if (this.currentDrag?.sourceNode) {
			for (const [, cfg] of this.draggables) {
				if (cfg.node === this.currentDrag.sourceNode) {
					cfg.onDragEnd?.(dropped)
					break
				}
			}
		}
		if (this.currentDropZone && this.currentDrag) {
			this.currentDropZone.onDragLeave?.(this.currentDrag)
		}
		this.isDragging = false
		this.currentDrag = null
		this.ghost = null
		this.currentDropZone = null
	}

	rndGhost(ctx: CanvasRenderingContext2D) {
		if (this.ghost && this.isDragging) {
			ctx.save()
			ctx.globalAlpha = 0.7
			this.ghost.rnd(ctx)
			ctx.restore()
		}
	}

	getDragData(): DragData | null {
		return this.currentDrag
	}

	isOver(node: UINode): boolean {
		return this.currentDropZone?.node === node
	}

	cancel() {
		if (this.isDragging) {
			this.endDrag(false)
		}
		this.startX = 0
		this.startY = 0
	}

	dispose() {
		this.cancel()
		this.draggables.clear()
		this.dropZones.clear()
	}
}
