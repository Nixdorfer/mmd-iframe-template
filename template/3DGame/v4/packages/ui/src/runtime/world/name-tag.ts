import { UINode, UINodeCfg } from '../base/node'

export interface NameTagCfg extends UINodeCfg {
	name?: string
	title?: string
	nameColor?: string
	titleColor?: string
	bgColor?: string
	borderColor?: string
	fontSize?: number
	padding?: number
	showHP?: boolean
	maxHP?: number
	curHP?: number
	hpBarH?: number
	hpColor?: string
	hpBgColor?: string
}

export class NameTag extends UINode {
	name: string
	title: string
	nameColor: string
	titleColor: string
	bgColor: string
	borderColor: string
	fontSize: number
	padding: number
	showHP: boolean
	maxHP: number
	curHP: number
	hpBarH: number
	hpColor: string
	hpBgColor: string
	worldX: number
	worldY: number
	worldZ: number

	constructor(cfg?: NameTagCfg) {
		super(cfg)
		this.name = cfg?.name ?? ''
		this.title = cfg?.title ?? ''
		this.nameColor = cfg?.nameColor ?? '#ffffff'
		this.titleColor = cfg?.titleColor ?? '#aaaaaa'
		this.bgColor = cfg?.bgColor ?? 'rgba(0, 0, 0, 0.5)'
		this.borderColor = cfg?.borderColor ?? ''
		this.fontSize = cfg?.fontSize ?? 12
		this.padding = cfg?.padding ?? 4
		this.showHP = cfg?.showHP ?? false
		this.maxHP = cfg?.maxHP ?? 100
		this.curHP = cfg?.curHP ?? this.maxHP
		this.hpBarH = cfg?.hpBarH ?? 4
		this.hpColor = cfg?.hpColor ?? '#44ff44'
		this.hpBgColor = cfg?.hpBgColor ?? '#333333'
		this.worldX = 0
		this.worldY = 0
		this.worldZ = 0
	}

	setName(name: string, title?: string) {
		this.name = name
		if (title !== undefined) this.title = title
		this.dirty = true
	}

	setHP(cur: number, max?: number) {
		this.curHP = cur
		if (max !== undefined) this.maxHP = max
		this.dirty = true
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

	draw(ctx: CanvasRenderingContext2D) {
		if (!this.name && !this.title) return
		ctx.font = `${this.fontSize}px system-ui, sans-serif`
		const nameW = ctx.measureText(this.name).width
		const titleW = this.title ? ctx.measureText(this.title).width : 0
		const maxTextW = Math.max(nameW, titleW)
		const totalW = maxTextW + this.padding * 2
		let totalH = this.padding * 2
		if (this.title) totalH += this.fontSize + 2
		if (this.name) totalH += this.fontSize
		if (this.showHP) totalH += this.hpBarH + 4
		this.w = totalW
		this.h = totalH
		const x = this.getWorldX() - this.w / 2
		const y = this.getWorldY() - this.h
		if (this.bgColor) {
			ctx.fillStyle = this.bgColor
			ctx.beginPath()
			ctx.roundRect(x, y, this.w, this.h, 4)
			ctx.fill()
		}
		if (this.borderColor) {
			ctx.strokeStyle = this.borderColor
			ctx.lineWidth = 1
			ctx.beginPath()
			ctx.roundRect(x, y, this.w, this.h, 4)
			ctx.stroke()
		}
		let textY = y + this.padding
		if (this.title) {
			ctx.font = `${this.fontSize - 2}px system-ui, sans-serif`
			ctx.fillStyle = this.titleColor
			ctx.textAlign = 'center'
			ctx.textBaseline = 'top'
			ctx.fillText(this.title, x + this.w / 2, textY)
			textY += this.fontSize
		}
		if (this.name) {
			ctx.font = `${this.fontSize}px system-ui, sans-serif`
			ctx.fillStyle = this.nameColor
			ctx.textAlign = 'center'
			ctx.textBaseline = 'top'
			ctx.fillText(this.name, x + this.w / 2, textY)
			textY += this.fontSize + 4
		}
		if (this.showHP && this.maxHP > 0) {
			const hpBarW = this.w - this.padding * 2
			const hpX = x + this.padding
			ctx.fillStyle = this.hpBgColor
			ctx.fillRect(hpX, textY, hpBarW, this.hpBarH)
			const hpPercent = Math.max(0, Math.min(1, this.curHP / this.maxHP))
			if (hpPercent > 0) {
				ctx.fillStyle = this.hpColor
				ctx.fillRect(hpX, textY, hpBarW * hpPercent, this.hpBarH)
			}
		}
	}
}
