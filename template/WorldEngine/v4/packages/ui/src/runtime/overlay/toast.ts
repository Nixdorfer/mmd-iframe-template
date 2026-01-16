import { UINode, UINodeCfg } from '../base/node'

export type ToastType = 'info' | 'success' | 'warning' | 'error'
export type ToastPosition = 'top' | 'bottom' | 'center'

export interface ToastItem {
	id: number
	text: string
	typ: ToastType
	duration: number
	elapsed: number
	alpha: number
	y: number
}

export interface ToastCfg extends UINodeCfg {
	maxW?: number
	fontSize?: number
	padding?: number
	radius?: number
	gap?: number
	position?: ToastPosition
	offsetY?: number
	fadeTime?: number
	maxVisible?: number
}

const TOAST_COLORS: Record<ToastType, { bg: string; text: string; border: string }> = {
	info: { bg: 'rgba(50, 50, 60, 0.95)', text: '#ffffff', border: '#6688aa' },
	success: { bg: 'rgba(40, 60, 40, 0.95)', text: '#ffffff', border: '#66aa66' },
	warning: { bg: 'rgba(60, 55, 35, 0.95)', text: '#ffffff', border: '#aaaa44' },
	error: { bg: 'rgba(60, 35, 35, 0.95)', text: '#ffffff', border: '#aa4444' }
}

const TOAST_ICONS: Record<ToastType, string> = {
	info: 'i',
	success: '✓',
	warning: '!',
	error: '×'
}

export class Toast extends UINode {
	maxW: number
	fontSize: number
	padding: number
	radius: number
	gap: number
	position: ToastPosition
	offsetY: number
	fadeTime: number
	maxVisible: number
	private items: ToastItem[]
	private nxtId: number

	constructor(cfg?: ToastCfg) {
		super(cfg)
		this.maxW = cfg?.maxW ?? 300
		this.fontSize = cfg?.fontSize ?? 14
		this.padding = cfg?.padding ?? 12
		this.radius = cfg?.radius ?? 6
		this.gap = cfg?.gap ?? 8
		this.position = cfg?.position ?? 'top'
		this.offsetY = cfg?.offsetY ?? 50
		this.fadeTime = cfg?.fadeTime ?? 0.3
		this.maxVisible = cfg?.maxVisible ?? 5
		this.items = []
		this.nxtId = 1
		this.visible = true
	}

	showMsg(text: string, typ: ToastType = 'info', duration: number = 3): number {
		const id = this.nxtId++
		const item: ToastItem = {
			id,
			text,
			typ,
			duration,
			elapsed: 0,
			alpha: 0,
			y: 0
		}
		this.items.push(item)
		while (this.items.length > this.maxVisible) {
			this.items.shift()
		}
		this.dirty = true
		return id
	}

	info(text: string, duration?: number): number {
		return this.showMsg(text, 'info', duration)
	}

	success(text: string, duration?: number): number {
		return this.showMsg(text, 'success', duration)
	}

	warning(text: string, duration?: number): number {
		return this.showMsg(text, 'warning', duration)
	}

	error(text: string, duration?: number): number {
		return this.showMsg(text, 'error', duration)
	}

	dismiss(id: number) {
		const item = this.items.find(t => t.id === id)
		if (item) {
			item.elapsed = item.duration - this.fadeTime
		}
	}

	clr() {
		this.items = []
		this.dirty = true
	}

	upd(dt: number) {
		super.upd(dt)
		for (let i = this.items.length - 1; i >= 0; i--) {
			const item = this.items[i]
			item.elapsed += dt
			if (item.elapsed < this.fadeTime) {
				item.alpha = item.elapsed / this.fadeTime
			} else if (item.elapsed > item.duration - this.fadeTime) {
				item.alpha = Math.max(0, (item.duration - item.elapsed) / this.fadeTime)
			} else {
				item.alpha = 1
			}
			if (item.elapsed >= item.duration) {
				this.items.splice(i, 1)
			}
		}
		this.dirty = true
	}

	rnd(ctx: CanvasRenderingContext2D) {
		if (this.items.length === 0) return
		const canvasW = ctx.canvas.width
		const canvasH = ctx.canvas.height
		ctx.font = `${this.fontSize}px system-ui, sans-serif`
		const heights: number[] = []
		for (const item of this.items) {
			const textW = Math.min(this.maxW - this.padding * 2 - 24, ctx.measureText(item.text).width)
			const toastW = textW + this.padding * 2 + 24
			const toastH = this.fontSize + this.padding * 2
			heights.push(toastH)
		}
		let baseY: number
		switch (this.position) {
			case 'top':
				baseY = this.offsetY
				break
			case 'bottom':
				baseY = canvasH - this.offsetY
				break
			case 'center':
				const totalH = heights.reduce((a, b) => a + b, 0) + (heights.length - 1) * this.gap
				baseY = (canvasH - totalH) / 2
				break
		}
		let curY = baseY
		for (let i = 0; i < this.items.length; i++) {
			const item = this.items[i]
			const colors = TOAST_COLORS[item.typ]
			const icon = TOAST_ICONS[item.typ]
			const textW = Math.min(this.maxW - this.padding * 2 - 24, ctx.measureText(item.text).width)
			const toastW = textW + this.padding * 2 + 24
			const toastH = heights[i]
			const x = (canvasW - toastW) / 2
			let y: number
			if (this.position === 'bottom') {
				y = curY - toastH
				curY -= toastH + this.gap
			} else {
				y = curY
				curY += toastH + this.gap
			}
			item.y = y
			ctx.save()
			ctx.globalAlpha = item.alpha
			ctx.beginPath()
			ctx.roundRect(x, y, toastW, toastH, this.radius)
			ctx.fillStyle = colors.bg
			ctx.fill()
			ctx.strokeStyle = colors.border
			ctx.lineWidth = 1
			ctx.stroke()
			ctx.beginPath()
			ctx.arc(x + this.padding + 8, y + toastH / 2, 10, 0, Math.PI * 2)
			ctx.fillStyle = colors.border
			ctx.fill()
			ctx.font = `bold ${this.fontSize}px system-ui, sans-serif`
			ctx.fillStyle = '#ffffff'
			ctx.textAlign = 'center'
			ctx.textBaseline = 'middle'
			ctx.fillText(icon, x + this.padding + 8, y + toastH / 2)
			ctx.font = `${this.fontSize}px system-ui, sans-serif`
			ctx.fillStyle = colors.text
			ctx.textAlign = 'left'
			ctx.textBaseline = 'middle'
			ctx.fillText(item.text, x + this.padding + 24, y + toastH / 2)
			ctx.restore()
		}
	}
}
