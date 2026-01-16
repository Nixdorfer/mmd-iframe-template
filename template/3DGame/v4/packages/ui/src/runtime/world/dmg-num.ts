import { UINode, UINodeCfg } from '../base/node'
import { Poolable } from '../pool'

export type DmgType = 'normal' | 'crit' | 'heal' | 'miss' | 'block' | 'dot' | 'buff'

export interface DmgNumCfg extends UINodeCfg {
	value?: number
	typ?: DmgType
	fontSize?: number
	duration?: number
	riseSpeed?: number
	fadeStart?: number
}

const DMG_COLORS: Record<DmgType, string> = {
	normal: '#ffffff',
	crit: '#ff4444',
	heal: '#44ff44',
	miss: '#888888',
	block: '#4488ff',
	dot: '#ff8844',
	buff: '#ffff44'
}

const DMG_SCALES: Record<DmgType, number> = {
	normal: 1.0,
	crit: 1.5,
	heal: 1.2,
	miss: 0.8,
	block: 1.0,
	dot: 0.9,
	buff: 1.0
}

export class DmgNum extends UINode implements Poolable {
	value: number
	typ: DmgType
	fontSize: number
	duration: number
	riseSpeed: number
	fadeStart: number
	elapsed: number
	done: boolean
	active: boolean
	worldX: number
	worldY: number
	worldZ: number
	offsetX: number
	offsetY: number
	scale: number
	color: string

	constructor(cfg?: DmgNumCfg) {
		super(cfg)
		this.value = cfg?.value ?? 0
		this.typ = cfg?.typ ?? 'normal'
		this.fontSize = cfg?.fontSize ?? 16
		this.duration = cfg?.duration ?? 1.5
		this.riseSpeed = cfg?.riseSpeed ?? 50
		this.fadeStart = cfg?.fadeStart ?? 0.7
		this.elapsed = 0
		this.done = false
		this.active = false
		this.worldX = 0
		this.worldY = 0
		this.worldZ = 0
		this.offsetX = 0
		this.offsetY = 0
		this.scale = 1
		this.color = DMG_COLORS[this.typ]
	}

	ini(value: number, typ: DmgType = 'normal') {
		this.value = value
		this.typ = typ
		this.color = DMG_COLORS[typ]
		this.scale = DMG_SCALES[typ]
		this.elapsed = 0
		this.done = false
		this.offsetX = (Math.random() - 0.5) * 30
		this.offsetY = 0
		this.visible = true
		this.alpha = 1
		this.dirty = true
	}

	reset() {
		this.value = 0
		this.typ = 'normal'
		this.elapsed = 0
		this.done = false
		this.visible = false
		this.alpha = 1
		this.offsetX = 0
		this.offsetY = 0
	}

	setWorldPos(x: number, y: number, z: number) {
		this.worldX = x
		this.worldY = y
		this.worldZ = z
	}

	updateScreenPos(screenX: number, screenY: number) {
		this.x = screenX + this.offsetX
		this.y = screenY + this.offsetY
		this.dirty = true
	}

	upd(dt: number) {
		super.upd(dt)
		this.elapsed += dt
		if (this.elapsed >= this.duration) {
			this.done = true
			this.visible = false
			return
		}
		this.offsetY -= this.riseSpeed * dt
		const progress = this.elapsed / this.duration
		if (progress >= this.fadeStart) {
			const fadeProgress = (progress - this.fadeStart) / (1 - this.fadeStart)
			this.alpha = 1 - fadeProgress
		}
		if (this.typ === 'crit') {
			const bounce = Math.sin(this.elapsed * 10) * 0.1
			this.scale = DMG_SCALES.crit + bounce
		}
		this.dirty = true
	}

	draw(ctx: CanvasRenderingContext2D) {
		if (this.done) return
		const x = this.getWorldX()
		const y = this.getWorldY()
		const size = Math.floor(this.fontSize * this.scale)
		ctx.font = `bold ${size}px system-ui, sans-serif`
		ctx.textAlign = 'center'
		ctx.textBaseline = 'middle'
		let text = ''
		switch (this.typ) {
			case 'miss':
				text = 'MISS'
				break
			case 'block':
				text = 'BLOCK'
				break
			case 'heal':
				text = `+${Math.abs(Math.floor(this.value))}`
				break
			case 'buff':
				text = `+${this.value}`
				break
			default:
				text = Math.floor(this.value).toString()
		}
		ctx.strokeStyle = '#000000'
		ctx.lineWidth = 3
		ctx.strokeText(text, x, y)
		ctx.fillStyle = this.color
		ctx.fillText(text, x, y)
		if (this.typ === 'crit') {
			ctx.font = `bold ${Math.floor(size * 0.5)}px system-ui, sans-serif`
			ctx.fillStyle = '#ffff00'
			ctx.strokeText('CRIT!', x, y - size * 0.8)
			ctx.fillText('CRIT!', x, y - size * 0.8)
		}
	}
}
