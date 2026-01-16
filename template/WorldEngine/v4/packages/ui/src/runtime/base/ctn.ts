import { UINode, UINodeCfg } from './node'

export type UILayoutDir = 'horizontal' | 'vertical'
export type UILayoutAlign = 'start' | 'center' | 'end' | 'stretch'

export interface UIContainerCfg extends UINodeCfg {
	bgColor?: string
	borderColor?: string
	borderWidth?: number
	radius?: number
	padding?: number
	layout?: UILayoutDir
	gap?: number
	align?: UILayoutAlign
	clip?: boolean
}

export class UIContainer extends UINode {
	bgColor: string
	borderColor: string
	borderWidth: number
	radius: number
	padding: number
	layout: UILayoutDir
	gap: number
	align: UILayoutAlign
	clip: boolean

	constructor(cfg?: UIContainerCfg) {
		super(cfg)
		this.bgColor = cfg?.bgColor ?? ''
		this.borderColor = cfg?.borderColor ?? ''
		this.borderWidth = cfg?.borderWidth ?? 0
		this.radius = cfg?.radius ?? 0
		this.padding = cfg?.padding ?? 0
		this.layout = cfg?.layout ?? 'vertical'
		this.gap = cfg?.gap ?? 0
		this.align = cfg?.align ?? 'start'
		this.clip = cfg?.clip ?? false
	}

	addChild(child: UINode) {
		super.addChild(child)
		this.layoutChildren()
	}

	delChild(child: UINode) {
		super.delChild(child)
		this.layoutChildren()
	}

	layoutChildren() {
		const innerW = this.w - this.padding * 2
		const innerH = this.h - this.padding * 2
		let offset = 0
		for (const child of this.children) {
			if (!child.visible) continue
			if (this.layout === 'horizontal') {
				child.x = this.padding + offset
				switch (this.align) {
					case 'start':
						child.y = this.padding
						break
					case 'center':
						child.y = this.padding + (innerH - child.h) / 2
						break
					case 'end':
						child.y = this.padding + innerH - child.h
						break
					case 'stretch':
						child.y = this.padding
						child.h = innerH
						break
				}
				offset += child.w + this.gap
			} else {
				child.y = this.padding + offset
				switch (this.align) {
					case 'start':
						child.x = this.padding
						break
					case 'center':
						child.x = this.padding + (innerW - child.w) / 2
						break
					case 'end':
						child.x = this.padding + innerW - child.w
						break
					case 'stretch':
						child.x = this.padding
						child.w = innerW
						break
				}
				offset += child.h + this.gap
			}
		}
	}

	setBgColor(color: string) {
		this.bgColor = color
		this.dirty = true
	}

	setLayout(dir: UILayoutDir) {
		this.layout = dir
		this.layoutChildren()
	}

	setGap(gap: number) {
		this.gap = gap
		this.layoutChildren()
	}

	setAlign(align: UILayoutAlign) {
		this.align = align
		this.layoutChildren()
	}

	fitContent() {
		let maxW = 0
		let maxH = 0
		let totalW = 0
		let totalH = 0
		for (const child of this.children) {
			if (!child.visible) continue
			if (this.layout === 'horizontal') {
				totalW += child.w
				maxH = Math.max(maxH, child.h)
			} else {
				totalH += child.h
				maxW = Math.max(maxW, child.w)
			}
		}
		const gapTotal = Math.max(0, this.children.filter(c => c.visible).length - 1) * this.gap
		if (this.layout === 'horizontal') {
			this.w = totalW + gapTotal + this.padding * 2
			this.h = maxH + this.padding * 2
		} else {
			this.w = maxW + this.padding * 2
			this.h = totalH + gapTotal + this.padding * 2
		}
	}

	draw(ctx: CanvasRenderingContext2D) {
		const x = this.getWorldX()
		const y = this.getWorldY()
		if (this.bgColor) {
			this.drawRoundRect(ctx, x, y, this.w, this.h, this.radius, this.bgColor)
		}
		if (this.borderWidth > 0 && this.borderColor) {
			ctx.strokeStyle = this.borderColor
			ctx.lineWidth = this.borderWidth
			this.strokeRoundRect(ctx, x, y, this.w, this.h, this.radius)
		}
	}

	rnd(ctx: CanvasRenderingContext2D) {
		if (!this.visible || this.getWorldAlpha() <= 0) return
		ctx.save()
		ctx.globalAlpha = this.getWorldAlpha()
		this.draw(ctx)
		if (this.clip) {
			ctx.beginPath()
			const x = this.getWorldX()
			const y = this.getWorldY()
			this.clipRoundRect(ctx, x, y, this.w, this.h, this.radius)
			ctx.clip()
		}
		for (const child of this.children) {
			child.rnd(ctx)
		}
		ctx.restore()
	}

	private drawRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, color: string) {
		ctx.beginPath()
		ctx.moveTo(x + r, y)
		ctx.lineTo(x + w - r, y)
		ctx.quadraticCurveTo(x + w, y, x + w, y + r)
		ctx.lineTo(x + w, y + h - r)
		ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
		ctx.lineTo(x + r, y + h)
		ctx.quadraticCurveTo(x, y + h, x, y + h - r)
		ctx.lineTo(x, y + r)
		ctx.quadraticCurveTo(x, y, x + r, y)
		ctx.closePath()
		ctx.fillStyle = color
		ctx.fill()
	}

	private strokeRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
		ctx.beginPath()
		ctx.moveTo(x + r, y)
		ctx.lineTo(x + w - r, y)
		ctx.quadraticCurveTo(x + w, y, x + w, y + r)
		ctx.lineTo(x + w, y + h - r)
		ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
		ctx.lineTo(x + r, y + h)
		ctx.quadraticCurveTo(x, y + h, x, y + h - r)
		ctx.lineTo(x, y + r)
		ctx.quadraticCurveTo(x, y, x + r, y)
		ctx.closePath()
		ctx.stroke()
	}

	private clipRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
		ctx.moveTo(x + r, y)
		ctx.lineTo(x + w - r, y)
		ctx.quadraticCurveTo(x + w, y, x + w, y + r)
		ctx.lineTo(x + w, y + h - r)
		ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
		ctx.lineTo(x + r, y + h)
		ctx.quadraticCurveTo(x, y + h, x, y + h - r)
		ctx.lineTo(x, y + r)
		ctx.quadraticCurveTo(x, y, x + r, y)
	}
}
