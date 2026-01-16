import { UINode, UINodeCfg } from '../base/node'

export type IndicatorType = 'arrow' | 'circle' | 'diamond' | 'cross' | 'exclaim' | 'question'

export interface IndicatorCfg extends UINodeCfg {
	typ?: IndicatorType
	size?: number
	color?: string
	outlineColor?: string
	outlineWidth?: number
	pulse?: boolean
	pulseSpeed?: number
	pulseMin?: number
	pulseMax?: number
	rotate?: boolean
	rotSpeed?: number
	label?: string
	labelColor?: string
	labelBg?: string
	labelOffset?: number
}

export class Indicator extends UINode {
	typ: IndicatorType
	size: number
	color: string
	outlineColor: string
	outlineWidth: number
	pulse: boolean
	pulseSpeed: number
	pulseMin: number
	pulseMax: number
	rotate: boolean
	rotSpeed: number
	label: string
	labelColor: string
	labelBg: string
	labelOffset: number
	worldX: number
	worldY: number
	worldZ: number
	private curScale: number
	private curRot: number
	private elapsed: number

	constructor(cfg?: IndicatorCfg) {
		super(cfg)
		this.typ = cfg?.typ ?? 'arrow'
		this.size = cfg?.size ?? 24
		this.color = cfg?.color ?? '#ffff00'
		this.outlineColor = cfg?.outlineColor ?? '#000000'
		this.outlineWidth = cfg?.outlineWidth ?? 2
		this.pulse = cfg?.pulse ?? false
		this.pulseSpeed = cfg?.pulseSpeed ?? 3
		this.pulseMin = cfg?.pulseMin ?? 0.8
		this.pulseMax = cfg?.pulseMax ?? 1.2
		this.rotate = cfg?.rotate ?? false
		this.rotSpeed = cfg?.rotSpeed ?? 2
		this.label = cfg?.label ?? ''
		this.labelColor = cfg?.labelColor ?? '#ffffff'
		this.labelBg = cfg?.labelBg ?? 'rgba(0,0,0,0.6)'
		this.labelOffset = cfg?.labelOffset ?? 20
		this.worldX = 0
		this.worldY = 0
		this.worldZ = 0
		this.curScale = 1
		this.curRot = 0
		this.elapsed = 0
		this.w = this.size
		this.h = this.size
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

	setType(typ: IndicatorType) {
		this.typ = typ
		this.dirty = true
	}

	setColor(color: string) {
		this.color = color
		this.dirty = true
	}

	setLabel(label: string) {
		this.label = label
		this.dirty = true
	}

	upd(dt: number) {
		super.upd(dt)
		this.elapsed += dt
		if (this.pulse) {
			const t = Math.sin(this.elapsed * this.pulseSpeed * Math.PI * 2) * 0.5 + 0.5
			this.curScale = this.pulseMin + t * (this.pulseMax - this.pulseMin)
			this.dirty = true
		}
		if (this.rotate) {
			this.curRot += this.rotSpeed * dt
			this.dirty = true
		}
	}

	draw(ctx: CanvasRenderingContext2D) {
		const x = this.getWorldX()
		const y = this.getWorldY()
		const halfSize = (this.size * this.curScale) / 2
		ctx.save()
		ctx.translate(x, y)
		ctx.rotate(this.curRot)
		ctx.scale(this.curScale, this.curScale)
		switch (this.typ) {
			case 'arrow':
				this.drawArrow(ctx, halfSize)
				break
			case 'circle':
				this.drawCircle(ctx, halfSize)
				break
			case 'diamond':
				this.drawDiamond(ctx, halfSize)
				break
			case 'cross':
				this.drawCross(ctx, halfSize)
				break
			case 'exclaim':
				this.drawExclaim(ctx, halfSize)
				break
			case 'question':
				this.drawQuestion(ctx, halfSize)
				break
		}
		ctx.restore()
		if (this.label) {
			ctx.font = '11px system-ui, sans-serif'
			const textW = ctx.measureText(this.label).width
			const labelX = x - textW / 2 - 4
			const labelY = y + this.labelOffset
			ctx.fillStyle = this.labelBg
			ctx.beginPath()
			ctx.roundRect(labelX, labelY, textW + 8, 16, 3)
			ctx.fill()
			ctx.fillStyle = this.labelColor
			ctx.textAlign = 'center'
			ctx.textBaseline = 'middle'
			ctx.fillText(this.label, x, labelY + 8)
		}
	}

	private drawArrow(ctx: CanvasRenderingContext2D, half: number) {
		ctx.beginPath()
		ctx.moveTo(0, -half)
		ctx.lineTo(half * 0.6, half * 0.3)
		ctx.lineTo(0, 0)
		ctx.lineTo(-half * 0.6, half * 0.3)
		ctx.closePath()
		if (this.outlineWidth > 0) {
			ctx.strokeStyle = this.outlineColor
			ctx.lineWidth = this.outlineWidth
			ctx.stroke()
		}
		ctx.fillStyle = this.color
		ctx.fill()
	}

	private drawCircle(ctx: CanvasRenderingContext2D, half: number) {
		ctx.beginPath()
		ctx.arc(0, 0, half, 0, Math.PI * 2)
		if (this.outlineWidth > 0) {
			ctx.strokeStyle = this.outlineColor
			ctx.lineWidth = this.outlineWidth
			ctx.stroke()
		}
		ctx.fillStyle = this.color
		ctx.fill()
	}

	private drawDiamond(ctx: CanvasRenderingContext2D, half: number) {
		ctx.beginPath()
		ctx.moveTo(0, -half)
		ctx.lineTo(half, 0)
		ctx.lineTo(0, half)
		ctx.lineTo(-half, 0)
		ctx.closePath()
		if (this.outlineWidth > 0) {
			ctx.strokeStyle = this.outlineColor
			ctx.lineWidth = this.outlineWidth
			ctx.stroke()
		}
		ctx.fillStyle = this.color
		ctx.fill()
	}

	private drawCross(ctx: CanvasRenderingContext2D, half: number) {
		const thick = half * 0.35
		ctx.beginPath()
		ctx.moveTo(-thick, -half)
		ctx.lineTo(thick, -half)
		ctx.lineTo(thick, -thick)
		ctx.lineTo(half, -thick)
		ctx.lineTo(half, thick)
		ctx.lineTo(thick, thick)
		ctx.lineTo(thick, half)
		ctx.lineTo(-thick, half)
		ctx.lineTo(-thick, thick)
		ctx.lineTo(-half, thick)
		ctx.lineTo(-half, -thick)
		ctx.lineTo(-thick, -thick)
		ctx.closePath()
		if (this.outlineWidth > 0) {
			ctx.strokeStyle = this.outlineColor
			ctx.lineWidth = this.outlineWidth
			ctx.stroke()
		}
		ctx.fillStyle = this.color
		ctx.fill()
	}

	private drawExclaim(ctx: CanvasRenderingContext2D, half: number) {
		ctx.fillStyle = this.color
		if (this.outlineWidth > 0) {
			ctx.strokeStyle = this.outlineColor
			ctx.lineWidth = this.outlineWidth
		}
		ctx.beginPath()
		ctx.moveTo(-half * 0.25, -half)
		ctx.lineTo(half * 0.25, -half)
		ctx.lineTo(half * 0.2, half * 0.3)
		ctx.lineTo(-half * 0.2, half * 0.3)
		ctx.closePath()
		if (this.outlineWidth > 0) ctx.stroke()
		ctx.fill()
		ctx.beginPath()
		ctx.arc(0, half * 0.7, half * 0.2, 0, Math.PI * 2)
		if (this.outlineWidth > 0) ctx.stroke()
		ctx.fill()
	}

	private drawQuestion(ctx: CanvasRenderingContext2D, half: number) {
		ctx.font = `bold ${half * 2}px system-ui, sans-serif`
		ctx.textAlign = 'center'
		ctx.textBaseline = 'middle'
		if (this.outlineWidth > 0) {
			ctx.strokeStyle = this.outlineColor
			ctx.lineWidth = this.outlineWidth
			ctx.strokeText('?', 0, 0)
		}
		ctx.fillStyle = this.color
		ctx.fillText('?', 0, 0)
	}
}
