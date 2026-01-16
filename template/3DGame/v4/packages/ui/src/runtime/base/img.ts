import { UINode, UINodeCfg } from './node'

export type UIImageMode = 'stretch' | 'tile' | 'slice9'

export interface UISlice9 {
	top: number
	right: number
	bottom: number
	left: number
}

export interface UIImageCfg extends UINodeCfg {
	src?: string | HTMLImageElement
	mode?: UIImageMode
	slice9?: UISlice9
	tint?: string
}

export class UIImage extends UINode {
	img: HTMLImageElement | null
	mode: UIImageMode
	slice9: UISlice9 | null
	tint: string
	loaded: boolean

	constructor(cfg?: UIImageCfg) {
		super(cfg)
		this.img = null
		this.mode = cfg?.mode ?? 'stretch'
		this.slice9 = cfg?.slice9 ?? null
		this.tint = cfg?.tint ?? ''
		this.loaded = false
		if (cfg?.src) {
			this.setSrc(cfg.src)
		}
	}

	setSrc(src: string | HTMLImageElement) {
		if (typeof src === 'string') {
			this.img = new Image()
			this.img.onload = () => {
				this.loaded = true
				if (this.w === 0) this.w = this.img!.width
				if (this.h === 0) this.h = this.img!.height
				this.dirty = true
			}
			this.img.src = src
			this.loaded = false
		} else {
			this.img = src
			this.loaded = true
			if (this.w === 0) this.w = src.width
			if (this.h === 0) this.h = src.height
		}
	}

	draw(ctx: CanvasRenderingContext2D) {
		if (!this.img || !this.loaded) return
		const x = this.getWorldX()
		const y = this.getWorldY()
		if (this.tint) {
			ctx.globalCompositeOperation = 'source-atop'
		}
		switch (this.mode) {
			case 'stretch':
				this.drawStretch(ctx, x, y)
				break
			case 'tile':
				this.drawTile(ctx, x, y)
				break
			case 'slice9':
				this.drawSlice9(ctx, x, y)
				break
		}
		if (this.tint) {
			ctx.fillStyle = this.tint
			ctx.globalCompositeOperation = 'multiply'
			ctx.fillRect(x, y, this.w, this.h)
			ctx.globalCompositeOperation = 'source-over'
		}
	}

	private drawStretch(ctx: CanvasRenderingContext2D, x: number, y: number) {
		ctx.drawImage(this.img!, x, y, this.w, this.h)
	}

	private drawTile(ctx: CanvasRenderingContext2D, x: number, y: number) {
		const iw = this.img!.width
		const ih = this.img!.height
		const cols = Math.ceil(this.w / iw)
		const rows = Math.ceil(this.h / ih)
		ctx.save()
		ctx.beginPath()
		ctx.rect(x, y, this.w, this.h)
		ctx.clip()
		for (let row = 0; row < rows; row++) {
			for (let col = 0; col < cols; col++) {
				ctx.drawImage(this.img!, x + col * iw, y + row * ih)
			}
		}
		ctx.restore()
	}

	private drawSlice9(ctx: CanvasRenderingContext2D, x: number, y: number) {
		if (!this.slice9) {
			this.drawStretch(ctx, x, y)
			return
		}
		const img = this.img!
		const iw = img.width
		const ih = img.height
		const { top, right, bottom, left } = this.slice9
		const midSrcW = iw - left - right
		const midSrcH = ih - top - bottom
		const midDstW = this.w - left - right
		const midDstH = this.h - top - bottom
		ctx.drawImage(img, 0, 0, left, top, x, y, left, top)
		ctx.drawImage(img, left, 0, midSrcW, top, x + left, y, midDstW, top)
		ctx.drawImage(img, iw - right, 0, right, top, x + this.w - right, y, right, top)
		ctx.drawImage(img, 0, top, left, midSrcH, x, y + top, left, midDstH)
		ctx.drawImage(img, left, top, midSrcW, midSrcH, x + left, y + top, midDstW, midDstH)
		ctx.drawImage(img, iw - right, top, right, midSrcH, x + this.w - right, y + top, right, midDstH)
		ctx.drawImage(img, 0, ih - bottom, left, bottom, x, y + this.h - bottom, left, bottom)
		ctx.drawImage(img, left, ih - bottom, midSrcW, bottom, x + left, y + this.h - bottom, midDstW, bottom)
		ctx.drawImage(img, iw - right, ih - bottom, right, bottom, x + this.w - right, y + this.h - bottom, right, bottom)
	}

	setTint(color: string) {
		this.tint = color
		this.dirty = true
	}

	clrTint() {
		this.tint = ''
		this.dirty = true
	}
}
