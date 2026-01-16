import { UINode, UINodeCfg } from '../base/node'

export interface DialogBtn {
	text: string
	color?: string
	bgColor?: string
	onClick?: () => void
}

export interface DialogCfg extends UINodeCfg {
	title?: string
	content?: string
	titleColor?: string
	contentColor?: string
	bgColor?: string
	borderColor?: string
	borderWidth?: number
	radius?: number
	padding?: number
	titleFontSize?: number
	contentFontSize?: number
	btnHeight?: number
	btnGap?: number
	btns?: DialogBtn[]
	modal?: boolean
	modalColor?: string
	closeOnClickOutside?: boolean
	animDuration?: number
}

export class Dialog extends UINode {
	title: string
	content: string
	titleColor: string
	contentColor: string
	bgColor: string
	borderColor: string
	borderWidth: number
	radius: number
	padding: number
	titleFontSize: number
	contentFontSize: number
	btnHeight: number
	btnGap: number
	btns: DialogBtn[]
	modal: boolean
	modalColor: string
	closeOnClickOutside: boolean
	animDuration: number
	private animProgress: number
	private animDir: 'in' | 'out' | null
	private hoverBtnIdx: number
	private contentLines: string[]
	onClose?: () => void

	constructor(cfg?: DialogCfg) {
		super(cfg)
		this.title = cfg?.title ?? ''
		this.content = cfg?.content ?? ''
		this.titleColor = cfg?.titleColor ?? '#ffffff'
		this.contentColor = cfg?.contentColor ?? '#cccccc'
		this.bgColor = cfg?.bgColor ?? '#2a2a2a'
		this.borderColor = cfg?.borderColor ?? '#444444'
		this.borderWidth = cfg?.borderWidth ?? 1
		this.radius = cfg?.radius ?? 8
		this.padding = cfg?.padding ?? 16
		this.titleFontSize = cfg?.titleFontSize ?? 18
		this.contentFontSize = cfg?.contentFontSize ?? 14
		this.btnHeight = cfg?.btnHeight ?? 36
		this.btnGap = cfg?.btnGap ?? 8
		this.btns = cfg?.btns ?? []
		this.modal = cfg?.modal ?? true
		this.modalColor = cfg?.modalColor ?? 'rgba(0, 0, 0, 0.6)'
		this.closeOnClickOutside = cfg?.closeOnClickOutside ?? true
		this.animDuration = cfg?.animDuration ?? 0.2
		this.animProgress = 0
		this.animDir = null
		this.hoverBtnIdx = -1
		this.contentLines = []
		if (this.w === 0) this.w = 320
		if (this.h === 0) this.h = 200
		this.visible = false
	}

	show() {
		this.visible = true
		this.animDir = 'in'
		this.animProgress = 0
		this.contentLines = []
		this.dirty = true
	}

	hide() {
		this.animDir = 'out'
		this.dirty = true
	}

	setTitle(title: string) {
		this.title = title
		this.dirty = true
	}

	setContent(content: string) {
		this.content = content
		this.contentLines = []
		this.dirty = true
	}

	setBtns(btns: DialogBtn[]) {
		this.btns = btns
		this.dirty = true
	}

	upd(dt: number) {
		super.upd(dt)
		if (this.animDir) {
			if (this.animDir === 'in') {
				this.animProgress = Math.min(1, this.animProgress + dt / this.animDuration)
				if (this.animProgress >= 1) {
					this.animDir = null
				}
			} else if (this.animDir === 'out') {
				this.animProgress = Math.max(0, this.animProgress - dt / this.animDuration)
				if (this.animProgress <= 0) {
					this.animDir = null
					this.visible = false
					if (this.onClose) this.onClose()
				}
			}
			this.dirty = true
		}
	}

	private wrapContent(ctx: CanvasRenderingContext2D) {
		if (this.contentLines.length > 0) return
		ctx.font = `${this.contentFontSize}px system-ui, sans-serif`
		const maxW = this.w - this.padding * 2
		const words = this.content.split('')
		let line = ''
		for (const char of words) {
			if (char === '\n') {
				this.contentLines.push(line)
				line = ''
				continue
			}
			const testLine = line + char
			const metrics = ctx.measureText(testLine)
			if (metrics.width > maxW && line.length > 0) {
				this.contentLines.push(line)
				line = char
			} else {
				line = testLine
			}
		}
		if (line) {
			this.contentLines.push(line)
		}
	}

	rnd(ctx: CanvasRenderingContext2D) {
		if (!this.visible || this.animProgress <= 0) return
		const canvasW = ctx.canvas.width
		const canvasH = ctx.canvas.height
		ctx.save()
		ctx.globalAlpha = this.animProgress
		if (this.modal) {
			ctx.fillStyle = this.modalColor
			ctx.fillRect(0, 0, canvasW, canvasH)
		}
		this.wrapContent(ctx)
		const scale = 0.8 + 0.2 * this.animProgress
		const x = (canvasW - this.w) / 2
		const y = (canvasH - this.h) / 2
		ctx.translate(canvasW / 2, canvasH / 2)
		ctx.scale(scale, scale)
		ctx.translate(-canvasW / 2, -canvasH / 2)
		ctx.beginPath()
		ctx.roundRect(x, y, this.w, this.h, this.radius)
		ctx.fillStyle = this.bgColor
		ctx.fill()
		if (this.borderWidth > 0) {
			ctx.strokeStyle = this.borderColor
			ctx.lineWidth = this.borderWidth
			ctx.stroke()
		}
		let curY = y + this.padding
		if (this.title) {
			ctx.font = `bold ${this.titleFontSize}px system-ui, sans-serif`
			ctx.fillStyle = this.titleColor
			ctx.textAlign = 'center'
			ctx.textBaseline = 'top'
			ctx.fillText(this.title, x + this.w / 2, curY)
			curY += this.titleFontSize + 12
		}
		ctx.font = `${this.contentFontSize}px system-ui, sans-serif`
		ctx.fillStyle = this.contentColor
		ctx.textAlign = 'left'
		const lineH = this.contentFontSize * 1.4
		for (const line of this.contentLines) {
			ctx.fillText(line, x + this.padding, curY)
			curY += lineH
		}
		if (this.btns.length > 0) {
			const btnY = y + this.h - this.padding - this.btnHeight
			const totalBtnW = this.btns.length * 80 + (this.btns.length - 1) * this.btnGap
			let btnX = x + (this.w - totalBtnW) / 2
			for (let i = 0; i < this.btns.length; i++) {
				const btn = this.btns[i]
				const isHover = i === this.hoverBtnIdx
				const btnW = 80
				const bgClr = isHover
					? this.lightenColor(btn.bgColor ?? '#4488ff')
					: (btn.bgColor ?? '#4488ff')
				ctx.beginPath()
				ctx.roundRect(btnX, btnY, btnW, this.btnHeight, 4)
				ctx.fillStyle = bgClr
				ctx.fill()
				ctx.font = `${this.contentFontSize}px system-ui, sans-serif`
				ctx.fillStyle = btn.color ?? '#ffffff'
				ctx.textAlign = 'center'
				ctx.textBaseline = 'middle'
				ctx.fillText(btn.text, btnX + btnW / 2, btnY + this.btnHeight / 2)
				btnX += btnW + this.btnGap
			}
		}
		ctx.restore()
	}

	private lightenColor(color: string): string {
		if (color.startsWith('#')) {
			const r = parseInt(color.slice(1, 3), 16)
			const g = parseInt(color.slice(3, 5), 16)
			const b = parseInt(color.slice(5, 7), 16)
			const nr = Math.min(255, r + 30)
			const ng = Math.min(255, g + 30)
			const nb = Math.min(255, b + 30)
			return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`
		}
		return color
	}

	hitTest(_x: number, _y: number): boolean {
		if (!this.visible || this.animProgress < 1) return false
		return true
	}

	getBtnAt(screenX: number, screenY: number, canvasW: number, canvasH: number): number {
		if (this.btns.length === 0) return -1
		const x = (canvasW - this.w) / 2
		const y = (canvasH - this.h) / 2
		const btnY = y + this.h - this.padding - this.btnHeight
		if (screenY < btnY || screenY > btnY + this.btnHeight) return -1
		const totalBtnW = this.btns.length * 80 + (this.btns.length - 1) * this.btnGap
		let btnX = x + (this.w - totalBtnW) / 2
		for (let i = 0; i < this.btns.length; i++) {
			if (screenX >= btnX && screenX <= btnX + 80) {
				return i
			}
			btnX += 80 + this.btnGap
		}
		return -1
	}

	setHoverBtn(idx: number) {
		if (this.hoverBtnIdx !== idx) {
			this.hoverBtnIdx = idx
			this.dirty = true
		}
	}

	clickBtn(idx: number) {
		if (idx >= 0 && idx < this.btns.length) {
			const btn = this.btns[idx]
			if (btn.onClick) btn.onClick()
		}
	}

	isInDialog(screenX: number, screenY: number, canvasW: number, canvasH: number): boolean {
		const x = (canvasW - this.w) / 2
		const y = (canvasH - this.h) / 2
		return screenX >= x && screenX <= x + this.w && screenY >= y && screenY <= y + this.h
	}
}
