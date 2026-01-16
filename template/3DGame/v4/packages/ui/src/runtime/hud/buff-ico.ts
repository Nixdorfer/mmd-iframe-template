import { UINode, UINodeCfg } from '../base/node'

export interface BuffData {
	id: string
	icon: string | HTMLImageElement
	duration: number
	remaining: number
	stacks: number
	isBuff: boolean
}

export interface BuffIconCfg extends UINodeCfg {
	size?: number
	gap?: number
	maxVisible?: number
	showDuration?: boolean
	showStacks?: boolean
}

export class BuffIcon extends UINode {
	size: number
	gap: number
	maxVisible: number
	showDuration: boolean
	showStacks: boolean
	buffs: BuffData[]
	private icons: Map<string, HTMLImageElement>

	constructor(cfg?: BuffIconCfg) {
		super(cfg)
		this.size = cfg?.size ?? 32
		this.gap = cfg?.gap ?? 4
		this.maxVisible = cfg?.maxVisible ?? 10
		this.showDuration = cfg?.showDuration ?? true
		this.showStacks = cfg?.showStacks ?? true
		this.buffs = []
		this.icons = new Map()
		if (this.w === 0) this.w = (this.size + this.gap) * this.maxVisible - this.gap
		if (this.h === 0) this.h = this.size
	}

	addBuff(data: BuffData) {
		const existing = this.buffs.find(b => b.id === data.id)
		if (existing) {
			existing.stacks = data.stacks
			existing.remaining = data.remaining
			existing.duration = data.duration
		} else {
			this.buffs.push({ ...data })
			if (typeof data.icon === 'string') {
				const img = new Image()
				img.src = data.icon
				this.icons.set(data.id, img)
			} else {
				this.icons.set(data.id, data.icon)
			}
		}
		this.dirty = true
	}

	delBuff(id: string) {
		const idx = this.buffs.findIndex(b => b.id === id)
		if (idx >= 0) {
			this.buffs.splice(idx, 1)
			this.icons.delete(id)
			this.dirty = true
		}
	}

	updBuff(id: string, remaining: number, stacks?: number) {
		const buff = this.buffs.find(b => b.id === id)
		if (buff) {
			buff.remaining = remaining
			if (stacks !== undefined) buff.stacks = stacks
			this.dirty = true
		}
	}

	clrBuffs() {
		this.buffs = []
		this.icons.clear()
		this.dirty = true
	}

	upd(dt: number) {
		super.upd(dt)
		for (let i = this.buffs.length - 1; i >= 0; i--) {
			const buff = this.buffs[i]
			if (buff.duration > 0) {
				buff.remaining -= dt
				if (buff.remaining <= 0) {
					this.buffs.splice(i, 1)
					this.icons.delete(buff.id)
				}
				this.dirty = true
			}
		}
	}

	draw(ctx: CanvasRenderingContext2D) {
		const x = this.getWorldX()
		const y = this.getWorldY()
		const visible = this.buffs.slice(0, this.maxVisible)
		for (let i = 0; i < visible.length; i++) {
			const buff = visible[i]
			const bx = x + i * (this.size + this.gap)
			const by = y
			ctx.fillStyle = buff.isBuff ? '#225522' : '#552222'
			ctx.fillRect(bx, by, this.size, this.size)
			ctx.strokeStyle = buff.isBuff ? '#44aa44' : '#aa4444'
			ctx.lineWidth = 1
			ctx.strokeRect(bx, by, this.size, this.size)
			const icon = this.icons.get(buff.id)
			if (icon && icon.complete) {
				ctx.drawImage(icon, bx + 2, by + 2, this.size - 4, this.size - 4)
			}
			if (this.showDuration && buff.duration > 0) {
				const percent = buff.remaining / buff.duration
				ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
				ctx.fillRect(bx, by + this.size * percent, this.size, this.size * (1 - percent))
				ctx.font = '10px system-ui, sans-serif'
				ctx.fillStyle = '#ffffff'
				ctx.textAlign = 'center'
				ctx.textBaseline = 'bottom'
				const sec = Math.ceil(buff.remaining)
				ctx.fillText(`${sec}`, bx + this.size / 2, by + this.size - 2)
			}
			if (this.showStacks && buff.stacks > 1) {
				ctx.font = 'bold 10px system-ui, sans-serif'
				ctx.fillStyle = '#ffffff'
				ctx.textAlign = 'right'
				ctx.textBaseline = 'top'
				ctx.strokeStyle = '#000000'
				ctx.lineWidth = 2
				ctx.strokeText(`${buff.stacks}`, bx + this.size - 2, by + 2)
				ctx.fillText(`${buff.stacks}`, bx + this.size - 2, by + 2)
			}
		}
		if (this.buffs.length > this.maxVisible) {
			const moreX = x + this.maxVisible * (this.size + this.gap)
			ctx.font = '12px system-ui, sans-serif'
			ctx.fillStyle = '#888888'
			ctx.textAlign = 'left'
			ctx.textBaseline = 'middle'
			ctx.fillText(`+${this.buffs.length - this.maxVisible}`, moreX, y + this.size / 2)
		}
	}

	getBuffAt(screenX: number, screenY: number): BuffData | null {
		const x = this.getWorldX()
		const y = this.getWorldY()
		if (screenY < y || screenY > y + this.size) return null
		const idx = Math.floor((screenX - x) / (this.size + this.gap))
		if (idx >= 0 && idx < this.buffs.length && idx < this.maxVisible) {
			return this.buffs[idx]
		}
		return null
	}
}
