import { UINode, UINodeCfg } from './node'

export type UITextAlign = 'left' | 'center' | 'right'
export type UITextBaseline = 'top' | 'middle' | 'bottom'

export interface UITextCfg extends UINodeCfg {
	text?: string
	font?: string
	fontSize?: number
	color?: string
	align?: UITextAlign
	baseline?: UITextBaseline
	stroke?: string
	strokeWidth?: number
	shadow?: { color: string; blur: number; offsetX: number; offsetY: number }
	maxWidth?: number
	lineHeight?: number
}

export class UIText extends UINode {
	text: string
	font: string
	fontSize: number
	color: string
	align: UITextAlign
	baseline: UITextBaseline
	stroke: string
	strokeWidth: number
	shadow: { color: string; blur: number; offsetX: number; offsetY: number } | null
	maxWidth: number
	lineHeight: number
	private lines: string[]

	constructor(cfg?: UITextCfg) {
		super(cfg)
		this.text = cfg?.text ?? ''
		this.font = cfg?.font ?? 'system-ui, sans-serif'
		this.fontSize = cfg?.fontSize ?? 14
		this.color = cfg?.color ?? '#ffffff'
		this.align = cfg?.align ?? 'left'
		this.baseline = cfg?.baseline ?? 'top'
		this.stroke = cfg?.stroke ?? ''
		this.strokeWidth = cfg?.strokeWidth ?? 0
		this.shadow = cfg?.shadow ?? null
		this.maxWidth = cfg?.maxWidth ?? 0
		this.lineHeight = cfg?.lineHeight ?? 1.2
		this.lines = []
		this.updateLines()
	}

	private updateLines() {
		if (!this.maxWidth || this.maxWidth <= 0) {
			this.lines = this.text.split('\n')
			return
		}
		this.lines = []
		const rawLines = this.text.split('\n')
		const canvas = document.createElement('canvas')
		const ctx = canvas.getContext('2d')!
		ctx.font = `${this.fontSize}px ${this.font}`
		for (const rawLine of rawLines) {
			const words = rawLine.split('')
			let curLine = ''
			for (const word of words) {
				const testLine = curLine + word
				const metrics = ctx.measureText(testLine)
				if (metrics.width > this.maxWidth && curLine) {
					this.lines.push(curLine)
					curLine = word
				} else {
					curLine = testLine
				}
			}
			if (curLine) {
				this.lines.push(curLine)
			}
		}
	}

	setText(text: string) {
		if (this.text !== text) {
			this.text = text
			this.updateLines()
			this.dirty = true
		}
	}

	setColor(color: string) {
		this.color = color
		this.dirty = true
	}

	setFontSize(size: number) {
		this.fontSize = size
		this.updateLines()
		this.dirty = true
	}

	draw(ctx: CanvasRenderingContext2D) {
		const x = this.getWorldX()
		const y = this.getWorldY()
		ctx.font = `${this.fontSize}px ${this.font}`
		ctx.textAlign = this.align
		ctx.textBaseline = this.baseline
		if (this.shadow) {
			ctx.shadowColor = this.shadow.color
			ctx.shadowBlur = this.shadow.blur
			ctx.shadowOffsetX = this.shadow.offsetX
			ctx.shadowOffsetY = this.shadow.offsetY
		}
		const lh = this.fontSize * this.lineHeight
		for (let i = 0; i < this.lines.length; i++) {
			const ly = y + i * lh
			if (this.stroke && this.strokeWidth > 0) {
				ctx.strokeStyle = this.stroke
				ctx.lineWidth = this.strokeWidth
				ctx.strokeText(this.lines[i], x, ly)
			}
			ctx.fillStyle = this.color
			ctx.fillText(this.lines[i], x, ly)
		}
		if (this.shadow) {
			ctx.shadowColor = 'transparent'
			ctx.shadowBlur = 0
			ctx.shadowOffsetX = 0
			ctx.shadowOffsetY = 0
		}
	}

	measureWidth(ctx: CanvasRenderingContext2D): number {
		ctx.font = `${this.fontSize}px ${this.font}`
		let maxW = 0
		for (const line of this.lines) {
			const w = ctx.measureText(line).width
			if (w > maxW) maxW = w
		}
		return maxW
	}

	measureHeight(): number {
		return this.lines.length * this.fontSize * this.lineHeight
	}
}
