import { UINode, UINodeCfg } from './node'

export type UIButtonState = 'normal' | 'hover' | 'pressed' | 'disabled'

export interface UIButtonCfg extends UINodeCfg {
	text?: string
	fontSize?: number
	textColor?: string
	bgColor?: string
	hoverColor?: string
	pressedColor?: string
	disabledColor?: string
	borderColor?: string
	borderWidth?: number
	radius?: number
	disabled?: boolean
	onClick?: () => void
}

export class UIButton extends UINode {
	text: string
	fontSize: number
	textColor: string
	bgColor: string
	hoverColor: string
	pressedColor: string
	disabledColor: string
	borderColor: string
	borderWidth: number
	radius: number
	disabled: boolean
	state: UIButtonState
	onClickCb: (() => void) | null

	constructor(cfg?: UIButtonCfg) {
		super(cfg)
		this.text = cfg?.text ?? ''
		this.fontSize = cfg?.fontSize ?? 14
		this.textColor = cfg?.textColor ?? '#ffffff'
		this.bgColor = cfg?.bgColor ?? '#4a4a4a'
		this.hoverColor = cfg?.hoverColor ?? '#5a5a5a'
		this.pressedColor = cfg?.pressedColor ?? '#3a3a3a'
		this.disabledColor = cfg?.disabledColor ?? '#2a2a2a'
		this.borderColor = cfg?.borderColor ?? '#666666'
		this.borderWidth = cfg?.borderWidth ?? 1
		this.radius = cfg?.radius ?? 4
		this.disabled = cfg?.disabled ?? false
		this.state = this.disabled ? 'disabled' : 'normal'
		this.onClickCb = cfg?.onClick ?? null
	}

	setText(text: string) {
		this.text = text
		this.dirty = true
	}

	setDisabled(disabled: boolean) {
		this.disabled = disabled
		this.state = disabled ? 'disabled' : 'normal'
		this.dirty = true
	}

	onHoverIn() {
		if (!this.disabled) {
			this.state = 'hover'
			this.dirty = true
		}
	}

	onHoverOut() {
		if (!this.disabled) {
			this.state = 'normal'
			this.dirty = true
		}
	}

	onPressDown() {
		if (!this.disabled) {
			this.state = 'pressed'
			this.dirty = true
		}
	}

	onPressUp() {
		if (!this.disabled) {
			this.state = 'hover'
			this.dirty = true
		}
	}

	onClick() {
		if (!this.disabled && this.onClickCb) {
			this.onClickCb()
		}
	}

	hitTest(x: number, y: number): boolean {
		return super.hitTest(x, y)
	}

	draw(ctx: CanvasRenderingContext2D) {
		const x = this.getWorldX()
		const y = this.getWorldY()
		let bgColor: string
		switch (this.state) {
			case 'hover':
				bgColor = this.hoverColor
				break
			case 'pressed':
				bgColor = this.pressedColor
				break
			case 'disabled':
				bgColor = this.disabledColor
				break
			default:
				bgColor = this.bgColor
		}
		this.drawRoundRect(ctx, x, y, this.w, this.h, this.radius, bgColor)
		if (this.borderWidth > 0 && this.borderColor) {
			ctx.strokeStyle = this.borderColor
			ctx.lineWidth = this.borderWidth
			this.strokeRoundRect(ctx, x, y, this.w, this.h, this.radius)
		}
		if (this.text) {
			ctx.font = `${this.fontSize}px system-ui, sans-serif`
			ctx.fillStyle = this.disabled ? '#888888' : this.textColor
			ctx.textAlign = 'center'
			ctx.textBaseline = 'middle'
			ctx.fillText(this.text, x + this.w / 2, y + this.h / 2)
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
