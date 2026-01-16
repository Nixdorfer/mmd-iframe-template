import { UINode, UINodeCfg } from '../base/node'

export interface TooltipCfg extends UINodeCfg {
	text?: string
	maxW?: number
	fontSize?: number
	padding?: number
	bgColor?: string
	textColor?: string
	borderColor?: string
	borderWidth?: number
	radius?: number
	offsetX?: number
	offsetY?: number
	showDelay?: number
	hideDelay?: number
	followMouse?: boolean
}

export class Tooltip extends UINode {
	text: string
	maxW: number
	fontSize: number
	padding: number
	bgColor: string
	textColor: string
	borderColor: string
	borderWidth: number
	radius: number
	offsetX: number
	offsetY: number
	showDelay: number
	hideDelay: number
	followMouse: boolean
	private lines: string[]
	private showTimer: number
	private hideTimer: number
	private targetX: number
	private targetY: number
	private showing: boolean
	private fadeAlpha: number

	constructor(cfg?: TooltipCfg) {
		super(cfg)
		this.text = cfg?.text ?? ''
		this.maxW = cfg?.maxW ?? 200
		this.fontSize = cfg?.fontSize ?? 12
		this.padding = cfg?.padding ?? 8
		this.bgColor = cfg?.bgColor ?? 'rgba(30, 30, 30, 0.95)'
		this.textColor = cfg?.textColor ?? '#ffffff'
		this.borderColor = cfg?.borderColor ?? '#555555'
		this.borderWidth = cfg?.borderWidth ?? 1
		this.radius = cfg?.radius ?? 4
		this.offsetX = cfg?.offsetX ?? 10
		this.offsetY = cfg?.offsetY ?? 10
		this.showDelay = cfg?.showDelay ?? 0.3
		this.hideDelay = cfg?.hideDelay ?? 0
		this.followMouse = cfg?.followMouse ?? true
		this.lines = []
		this.showTimer = 0
		this.hideTimer = 0
		this.targetX = 0
		this.targetY = 0
		this.showing = false
		this.fadeAlpha = 0
		this.visible = false
	}

	showTip(text: string, x: number, y: number) {
		this.text = text
		this.targetX = x
		this.targetY = y
		this.lines = []
		this.hideTimer = 0
		if (!this.showing) {
			this.showTimer = this.showDelay
			this.showing = true
		}
		this.dirty = true
	}

	hide() {
		if (this.showing) {
			if (this.hideDelay > 0) {
				this.hideTimer = this.hideDelay
			} else {
				this.showing = false
			}
		}
	}

	forceHide() {
		this.showing = false
		this.visible = false
		this.fadeAlpha = 0
		this.showTimer = 0
		this.hideTimer = 0
	}

	updatePos(x: number, y: number) {
		if (this.followMouse && this.showing) {
			this.targetX = x
			this.targetY = y
			this.dirty = true
		}
	}

	upd(dt: number) {
		super.upd(dt)
		if (this.showing) {
			if (this.showTimer > 0) {
				this.showTimer -= dt
			} else {
				this.visible = true
				this.fadeAlpha = Math.min(1, this.fadeAlpha + dt * 5)
			}
			if (this.hideTimer > 0) {
				this.hideTimer -= dt
				if (this.hideTimer <= 0) {
					this.showing = false
				}
			}
		} else {
			this.fadeAlpha = Math.max(0, this.fadeAlpha - dt * 5)
			if (this.fadeAlpha <= 0) {
				this.visible = false
			}
		}
		this.dirty = true
	}

	private wrapText(ctx: CanvasRenderingContext2D) {
		if (this.lines.length > 0) return
		ctx.font = `${this.fontSize}px system-ui, sans-serif`
		const maxTextW = this.maxW - this.padding * 2
		const words = this.text.split('')
		let line = ''
		for (const char of words) {
			if (char === '\n') {
				this.lines.push(line)
				line = ''
				continue
			}
			const testLine = line + char
			const metrics = ctx.measureText(testLine)
			if (metrics.width > maxTextW && line.length > 0) {
				this.lines.push(line)
				line = char
			} else {
				line = testLine
			}
		}
		if (line) {
			this.lines.push(line)
		}
	}

	rnd(ctx: CanvasRenderingContext2D) {
		if (!this.visible || this.fadeAlpha <= 0) return
		this.wrapText(ctx)
		ctx.font = `${this.fontSize}px system-ui, sans-serif`
		let maxLineW = 0
		for (const line of this.lines) {
			const w = ctx.measureText(line).width
			if (w > maxLineW) maxLineW = w
		}
		const tooltipW = Math.min(this.maxW, maxLineW + this.padding * 2)
		const lineH = this.fontSize * 1.4
		const tooltipH = this.lines.length * lineH + this.padding * 2
		this.w = tooltipW
		this.h = tooltipH
		let x = this.targetX + this.offsetX
		let y = this.targetY + this.offsetY
		const canvasW = ctx.canvas.width
		const canvasH = ctx.canvas.height
		if (x + tooltipW > canvasW) {
			x = this.targetX - tooltipW - this.offsetX
		}
		if (y + tooltipH > canvasH) {
			y = this.targetY - tooltipH - this.offsetY
		}
		if (x < 0) x = 0
		if (y < 0) y = 0
		ctx.save()
		ctx.globalAlpha = this.fadeAlpha
		ctx.beginPath()
		ctx.roundRect(x, y, tooltipW, tooltipH, this.radius)
		ctx.fillStyle = this.bgColor
		ctx.fill()
		if (this.borderWidth > 0) {
			ctx.strokeStyle = this.borderColor
			ctx.lineWidth = this.borderWidth
			ctx.stroke()
		}
		ctx.fillStyle = this.textColor
		ctx.textAlign = 'left'
		ctx.textBaseline = 'top'
		for (let i = 0; i < this.lines.length; i++) {
			ctx.fillText(this.lines[i], x + this.padding, y + this.padding + i * lineH)
		}
		ctx.restore()
	}
}
