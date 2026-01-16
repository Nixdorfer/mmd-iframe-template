import { UINode, UINodeCfg } from './node'

export type UIProgressDir = 'horizontal' | 'vertical' | 'radial'

export interface UIProgressCfg extends UINodeCfg {
	value?: number
	max?: number
	dir?: UIProgressDir
	bgColor?: string
	fillColor?: string
	borderColor?: string
	borderWidth?: number
	radius?: number
	padding?: number
	showText?: boolean
	textColor?: string
	fontSize?: number
	animSpeed?: number
}

export class UIProgress extends UINode {
	value: number
	max: number
	dir: UIProgressDir
	bgColor: string
	fillColor: string
	borderColor: string
	borderWidth: number
	radius: number
	padding: number
	showText: boolean
	textColor: string
	fontSize: number
	animSpeed: number
	private displayValue: number

	constructor(cfg?: UIProgressCfg) {
		super(cfg)
		this.value = cfg?.value ?? 0
		this.max = cfg?.max ?? 100
		this.dir = cfg?.dir ?? 'horizontal'
		this.bgColor = cfg?.bgColor ?? '#333333'
		this.fillColor = cfg?.fillColor ?? '#4a9eff'
		this.borderColor = cfg?.borderColor ?? '#555555'
		this.borderWidth = cfg?.borderWidth ?? 1
		this.radius = cfg?.radius ?? 4
		this.padding = cfg?.padding ?? 2
		this.showText = cfg?.showText ?? false
		this.textColor = cfg?.textColor ?? '#ffffff'
		this.fontSize = cfg?.fontSize ?? 12
		this.animSpeed = cfg?.animSpeed ?? 5
		this.displayValue = this.value
	}

	setValue(value: number) {
		this.value = Math.max(0, Math.min(this.max, value))
		this.dirty = true
	}

	setMax(max: number) {
		this.max = max
		this.value = Math.min(this.value, max)
		this.dirty = true
	}

	getPercent(): number {
		return this.max > 0 ? this.value / this.max : 0
	}

	upd(dt: number) {
		super.upd(dt)
		if (this.displayValue !== this.value) {
			const diff = this.value - this.displayValue
			const step = diff * this.animSpeed * dt
			if (Math.abs(diff) < 0.5) {
				this.displayValue = this.value
			} else {
				this.displayValue += step
			}
			this.dirty = true
		}
	}

	draw(ctx: CanvasRenderingContext2D) {
		const x = this.getWorldX()
		const y = this.getWorldY()
		switch (this.dir) {
			case 'horizontal':
			case 'vertical':
				this.drawBar(ctx, x, y)
				break
			case 'radial':
				this.drawRadial(ctx, x, y)
				break
		}
	}

	private drawBar(ctx: CanvasRenderingContext2D, x: number, y: number) {
		this.drawRoundRect(ctx, x, y, this.w, this.h, this.radius, this.bgColor)
		if (this.borderWidth > 0 && this.borderColor) {
			ctx.strokeStyle = this.borderColor
			ctx.lineWidth = this.borderWidth
			this.strokeRoundRect(ctx, x, y, this.w, this.h, this.radius)
		}
		const percent = this.max > 0 ? this.displayValue / this.max : 0
		const innerX = x + this.padding
		const innerY = y + this.padding
		const innerW = this.w - this.padding * 2
		const innerH = this.h - this.padding * 2
		if (this.dir === 'horizontal') {
			const fillW = innerW * percent
			if (fillW > 0) {
				this.drawRoundRect(ctx, innerX, innerY, fillW, innerH, Math.max(0, this.radius - this.padding), this.fillColor)
			}
		} else {
			const fillH = innerH * percent
			if (fillH > 0) {
				this.drawRoundRect(ctx, innerX, innerY + innerH - fillH, innerW, fillH, Math.max(0, this.radius - this.padding), this.fillColor)
			}
		}
		if (this.showText) {
			ctx.font = `${this.fontSize}px system-ui, sans-serif`
			ctx.fillStyle = this.textColor
			ctx.textAlign = 'center'
			ctx.textBaseline = 'middle'
			ctx.fillText(`${Math.floor(this.value)}/${this.max}`, x + this.w / 2, y + this.h / 2)
		}
	}

	private drawRadial(ctx: CanvasRenderingContext2D, x: number, y: number) {
		const cx = x + this.w / 2
		const cy = y + this.h / 2
		const outerR = Math.min(this.w, this.h) / 2
		const innerR = outerR - 8
		ctx.beginPath()
		ctx.arc(cx, cy, outerR, 0, Math.PI * 2)
		ctx.fillStyle = this.bgColor
		ctx.fill()
		const percent = this.max > 0 ? this.displayValue / this.max : 0
		const startAngle = -Math.PI / 2
		const endAngle = startAngle + Math.PI * 2 * percent
		ctx.beginPath()
		ctx.moveTo(cx, cy)
		ctx.arc(cx, cy, outerR, startAngle, endAngle)
		ctx.closePath()
		ctx.fillStyle = this.fillColor
		ctx.fill()
		ctx.beginPath()
		ctx.arc(cx, cy, innerR, 0, Math.PI * 2)
		ctx.fillStyle = this.bgColor
		ctx.fill()
		if (this.showText) {
			ctx.font = `${this.fontSize}px system-ui, sans-serif`
			ctx.fillStyle = this.textColor
			ctx.textAlign = 'center'
			ctx.textBaseline = 'middle'
			ctx.fillText(`${Math.floor(percent * 100)}%`, cx, cy)
		}
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
}
