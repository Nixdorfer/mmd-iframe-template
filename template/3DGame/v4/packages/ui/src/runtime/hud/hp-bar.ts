import { UINode, UINodeCfg } from '../base/node'

export interface HPBarCfg extends UINodeCfg {
	hp?: number
	maxHp?: number
	showValue?: boolean
	showShield?: boolean
	shield?: number
	maxShield?: number
	bgColor?: string
	hpColor?: string
	hpLowColor?: string
	shieldColor?: string
	damageColor?: string
	healColor?: string
	borderColor?: string
	borderWidth?: number
	radius?: number
	animSpeed?: number
	lowThreshold?: number
}

export class HPBar extends UINode {
	hp: number
	maxHp: number
	showValue: boolean
	showShield: boolean
	shield: number
	maxShield: number
	bgColor: string
	hpColor: string
	hpLowColor: string
	shieldColor: string
	damageColor: string
	healColor: string
	borderColor: string
	borderWidth: number
	radius: number
	animSpeed: number
	lowThreshold: number
	private displayHp: number
	private prevHp: number
	private damageFlashTime: number
	private healFlashTime: number

	constructor(cfg?: HPBarCfg) {
		super(cfg)
		this.hp = cfg?.hp ?? 100
		this.maxHp = cfg?.maxHp ?? 100
		this.showValue = cfg?.showValue ?? true
		this.showShield = cfg?.showShield ?? false
		this.shield = cfg?.shield ?? 0
		this.maxShield = cfg?.maxShield ?? 0
		this.bgColor = cfg?.bgColor ?? '#1a1a1a'
		this.hpColor = cfg?.hpColor ?? '#44cc44'
		this.hpLowColor = cfg?.hpLowColor ?? '#cc4444'
		this.shieldColor = cfg?.shieldColor ?? '#6688cc'
		this.damageColor = cfg?.damageColor ?? '#ff4444'
		this.healColor = cfg?.healColor ?? '#44ff44'
		this.borderColor = cfg?.borderColor ?? '#333333'
		this.borderWidth = cfg?.borderWidth ?? 1
		this.radius = cfg?.radius ?? 4
		this.animSpeed = cfg?.animSpeed ?? 5
		this.lowThreshold = cfg?.lowThreshold ?? 0.3
		this.displayHp = this.hp
		this.prevHp = this.hp
		this.damageFlashTime = 0
		this.healFlashTime = 0
		if (this.w === 0) this.w = 200
		if (this.h === 0) this.h = 20
	}

	setHp(hp: number) {
		const newHp = Math.max(0, Math.min(this.maxHp, hp))
		if (newHp < this.hp) {
			this.damageFlashTime = 0.3
		} else if (newHp > this.hp) {
			this.healFlashTime = 0.2
		}
		this.prevHp = this.hp
		this.hp = newHp
		this.dirty = true
	}

	setMaxHp(maxHp: number) {
		this.maxHp = maxHp
		this.hp = Math.min(this.hp, maxHp)
		this.dirty = true
	}

	setShield(shield: number) {
		this.shield = Math.max(0, Math.min(this.maxShield, shield))
		this.dirty = true
	}

	setMaxShield(maxShield: number) {
		this.maxShield = maxShield
		this.shield = Math.min(this.shield, maxShield)
		this.dirty = true
	}

	getPercent(): number {
		return this.maxHp > 0 ? this.hp / this.maxHp : 0
	}

	isLow(): boolean {
		return this.getPercent() <= this.lowThreshold
	}

	upd(dt: number) {
		super.upd(dt)
		if (this.displayHp !== this.hp) {
			const diff = this.hp - this.displayHp
			const step = diff * this.animSpeed * dt
			if (Math.abs(diff) < 0.5) {
				this.displayHp = this.hp
			} else {
				this.displayHp += step
			}
			this.dirty = true
		}
		if (this.damageFlashTime > 0) {
			this.damageFlashTime = Math.max(0, this.damageFlashTime - dt)
			this.dirty = true
		}
		if (this.healFlashTime > 0) {
			this.healFlashTime = Math.max(0, this.healFlashTime - dt)
			this.dirty = true
		}
	}

	draw(ctx: CanvasRenderingContext2D) {
		const x = this.getWorldX()
		const y = this.getWorldY()
		this.drawRoundRect(ctx, x, y, this.w, this.h, this.radius, this.bgColor)
		const padding = 2
		const innerW = this.w - padding * 2
		const innerH = this.h - padding * 2
		if (this.damageFlashTime > 0) {
			const prevPercent = this.maxHp > 0 ? this.prevHp / this.maxHp : 0
			const curPercent = this.maxHp > 0 ? this.displayHp / this.maxHp : 0
			const dmgW = innerW * (prevPercent - curPercent)
			const dmgX = x + padding + innerW * curPercent
			this.drawRoundRect(ctx, dmgX, y + padding, dmgW, innerH, Math.max(0, this.radius - padding), this.damageColor)
		}
		const hpPercent = this.maxHp > 0 ? this.displayHp / this.maxHp : 0
		const hpW = innerW * hpPercent
		const hpColor = this.isLow() ? this.hpLowColor : this.hpColor
		if (hpW > 0) {
			this.drawRoundRect(ctx, x + padding, y + padding, hpW, innerH, Math.max(0, this.radius - padding), hpColor)
		}
		if (this.healFlashTime > 0) {
			const alpha = this.healFlashTime / 0.2
			ctx.globalAlpha = this.getWorldAlpha() * alpha * 0.5
			this.drawRoundRect(ctx, x + padding, y + padding, hpW, innerH, Math.max(0, this.radius - padding), this.healColor)
			ctx.globalAlpha = this.getWorldAlpha()
		}
		if (this.showShield && this.shield > 0) {
			const shieldPercent = this.maxShield > 0 ? this.shield / this.maxShield : 0
			const shieldH = innerH * 0.3
			const shieldW = innerW * shieldPercent
			this.drawRoundRect(ctx, x + padding, y + this.h - padding - shieldH, shieldW, shieldH, 2, this.shieldColor)
		}
		if (this.borderWidth > 0 && this.borderColor) {
			ctx.strokeStyle = this.borderColor
			ctx.lineWidth = this.borderWidth
			this.strokeRoundRect(ctx, x, y, this.w, this.h, this.radius)
		}
		if (this.showValue) {
			ctx.font = '12px system-ui, sans-serif'
			ctx.fillStyle = '#ffffff'
			ctx.textAlign = 'center'
			ctx.textBaseline = 'middle'
			ctx.fillText(`${Math.floor(this.hp)}/${this.maxHp}`, x + this.w / 2, y + this.h / 2)
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
