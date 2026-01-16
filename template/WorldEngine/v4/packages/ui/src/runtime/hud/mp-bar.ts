import { UINode, UINodeCfg } from '../base/node'

export interface MPBarCfg extends UINodeCfg {
	maxMP?: number
	curMP?: number
	bgColor?: string
	fillColor?: string
	borderColor?: string
	borderWidth?: number
	showText?: boolean
	animSpeed?: number
}

export class MPBar extends UINode {
	maxMP: number
	curMP: number
	displayMP: number
	bgColor: string
	fillColor: string
	borderColor: string
	borderWidth: number
	showText: boolean
	animSpeed: number

	constructor(cfg?: MPBarCfg) {
		super(cfg)
		this.maxMP = cfg?.maxMP ?? 100
		this.curMP = cfg?.curMP ?? this.maxMP
		this.displayMP = this.curMP
		this.bgColor = cfg?.bgColor ?? '#1a1a3a'
		this.fillColor = cfg?.fillColor ?? '#3366ff'
		this.borderColor = cfg?.borderColor ?? '#6699ff'
		this.borderWidth = cfg?.borderWidth ?? 1
		this.showText = cfg?.showText ?? true
		this.animSpeed = cfg?.animSpeed ?? 5
		if (this.w === 0) this.w = 150
		if (this.h === 0) this.h = 16
	}

	setMP(cur: number, max?: number) {
		this.curMP = Math.max(0, Math.min(cur, max ?? this.maxMP))
		if (max !== undefined) this.maxMP = max
		this.dirty = true
	}

	addMP(amount: number) {
		this.setMP(this.curMP + amount)
	}

	subMP(amount: number) {
		this.setMP(this.curMP - amount)
	}

	getPercent(): number {
		return this.maxMP > 0 ? this.curMP / this.maxMP : 0
	}

	upd(dt: number) {
		super.upd(dt)
		if (Math.abs(this.displayMP - this.curMP) > 0.1) {
			const diff = this.curMP - this.displayMP
			this.displayMP += diff * Math.min(1, this.animSpeed * dt)
			this.dirty = true
		} else {
			this.displayMP = this.curMP
		}
	}

	draw(ctx: CanvasRenderingContext2D) {
		const x = this.getWorldX()
		const y = this.getWorldY()
		ctx.fillStyle = this.bgColor
		ctx.fillRect(x, y, this.w, this.h)
		const percent = this.maxMP > 0 ? this.displayMP / this.maxMP : 0
		const fillW = this.w * percent
		if (fillW > 0) {
			const grad = ctx.createLinearGradient(x, y, x, y + this.h)
			grad.addColorStop(0, '#4477ff')
			grad.addColorStop(0.5, this.fillColor)
			grad.addColorStop(1, '#2244aa')
			ctx.fillStyle = grad
			ctx.fillRect(x, y, fillW, this.h)
		}
		if (this.borderWidth > 0) {
			ctx.strokeStyle = this.borderColor
			ctx.lineWidth = this.borderWidth
			ctx.strokeRect(x, y, this.w, this.h)
		}
		if (this.showText) {
			ctx.font = `${Math.floor(this.h * 0.7)}px system-ui, sans-serif`
			ctx.fillStyle = '#ffffff'
			ctx.textAlign = 'center'
			ctx.textBaseline = 'middle'
			ctx.strokeStyle = '#000000'
			ctx.lineWidth = 2
			const text = `${Math.floor(this.curMP)}/${this.maxMP}`
			ctx.strokeText(text, x + this.w / 2, y + this.h / 2)
			ctx.fillText(text, x + this.w / 2, y + this.h / 2)
		}
	}
}
