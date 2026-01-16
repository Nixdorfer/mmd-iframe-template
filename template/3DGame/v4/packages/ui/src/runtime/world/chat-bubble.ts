import { UINode, UINodeCfg } from '../base/node'
import { Poolable } from '../pool'

export interface ChatBubbleCfg extends UINodeCfg {
	text?: string
	maxW?: number
	fontSize?: number
	padding?: number
	bgColor?: string
	textColor?: string
	borderColor?: string
	borderWidth?: number
	radius?: number
	tailSize?: number
	duration?: number
	fadeTime?: number
}

export class ChatBubble extends UINode implements Poolable {
	text: string
	maxW: number
	fontSize: number
	padding: number
	bgColor: string
	textColor: string
	borderColor: string
	borderWidth: number
	radius: number
	tailSize: number
	duration: number
	fadeTime: number
	elapsed: number
	done: boolean
	active: boolean
	worldX: number
	worldY: number
	worldZ: number
	private lines: string[]

	constructor(cfg?: ChatBubbleCfg) {
		super(cfg)
		this.text = cfg?.text ?? ''
		this.maxW = cfg?.maxW ?? 200
		this.fontSize = cfg?.fontSize ?? 12
		this.padding = cfg?.padding ?? 8
		this.bgColor = cfg?.bgColor ?? '#ffffff'
		this.textColor = cfg?.textColor ?? '#000000'
		this.borderColor = cfg?.borderColor ?? '#333333'
		this.borderWidth = cfg?.borderWidth ?? 1
		this.radius = cfg?.radius ?? 8
		this.tailSize = cfg?.tailSize ?? 8
		this.duration = cfg?.duration ?? 5
		this.fadeTime = cfg?.fadeTime ?? 0.5
		this.elapsed = 0
		this.done = false
		this.active = false
		this.worldX = 0
		this.worldY = 0
		this.worldZ = 0
		this.lines = []
	}

	ini(text: string, duration?: number) {
		this.text = text
		if (duration !== undefined) this.duration = duration
		this.elapsed = 0
		this.done = false
		this.visible = true
		this.alpha = 1
		this.lines = []
		this.dirty = true
	}

	reset() {
		this.text = ''
		this.elapsed = 0
		this.done = false
		this.visible = false
		this.alpha = 1
		this.lines = []
	}

	setWorldPos(x: number, y: number, z: number) {
		this.worldX = x
		this.worldY = y
		this.worldZ = z
	}

	updateScreenPos(screenX: number, screenY: number) {
		this.x = screenX
		this.y = screenY
		this.dirty = true
	}

	upd(dt: number) {
		super.upd(dt)
		if (this.duration > 0) {
			this.elapsed += dt
			if (this.elapsed >= this.duration) {
				this.done = true
				this.visible = false
				return
			}
			const remaining = this.duration - this.elapsed
			if (remaining < this.fadeTime) {
				this.alpha = remaining / this.fadeTime
			}
		}
		this.dirty = true
	}

	private wrapText(ctx: CanvasRenderingContext2D) {
		if (this.lines.length > 0) return
		ctx.font = `${this.fontSize}px system-ui, sans-serif`
		const words = this.text.split('')
		let line = ''
		const maxTextW = this.maxW - this.padding * 2
		for (const char of words) {
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

	draw(ctx: CanvasRenderingContext2D) {
		if (!this.text || this.done) return
		this.wrapText(ctx)
		ctx.font = `${this.fontSize}px system-ui, sans-serif`
		let maxLineW = 0
		for (const line of this.lines) {
			const w = ctx.measureText(line).width
			if (w > maxLineW) maxLineW = w
		}
		const bubbleW = maxLineW + this.padding * 2
		const lineH = this.fontSize * 1.3
		const bubbleH = this.lines.length * lineH + this.padding * 2
		this.w = bubbleW
		this.h = bubbleH + this.tailSize
		const x = this.getWorldX() - bubbleW / 2
		const y = this.getWorldY() - bubbleH - this.tailSize
		ctx.beginPath()
		ctx.moveTo(x + this.radius, y)
		ctx.lineTo(x + bubbleW - this.radius, y)
		ctx.quadraticCurveTo(x + bubbleW, y, x + bubbleW, y + this.radius)
		ctx.lineTo(x + bubbleW, y + bubbleH - this.radius)
		ctx.quadraticCurveTo(x + bubbleW, y + bubbleH, x + bubbleW - this.radius, y + bubbleH)
		const tailX = x + bubbleW / 2
		ctx.lineTo(tailX + this.tailSize, y + bubbleH)
		ctx.lineTo(tailX, y + bubbleH + this.tailSize)
		ctx.lineTo(tailX - this.tailSize, y + bubbleH)
		ctx.lineTo(x + this.radius, y + bubbleH)
		ctx.quadraticCurveTo(x, y + bubbleH, x, y + bubbleH - this.radius)
		ctx.lineTo(x, y + this.radius)
		ctx.quadraticCurveTo(x, y, x + this.radius, y)
		ctx.closePath()
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
	}
}
