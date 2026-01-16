import { UILayer } from './layer'

export interface UIRndCfg {
	w: number
	h: number
	scale?: number
}

export class UIRenderer {
	canvas: HTMLCanvasElement
	ctx: CanvasRenderingContext2D
	w: number
	h: number
	scale: number
	layers: UILayer[]

	constructor(cfg: UIRndCfg) {
		this.canvas = document.createElement('canvas')
		this.ctx = this.canvas.getContext('2d')!
		this.w = cfg.w
		this.h = cfg.h
		this.scale = cfg.scale ?? window.devicePixelRatio
		this.layers = []
		this.resize(cfg.w, cfg.h)
		this.iniStyle()
	}

	private iniStyle() {
		this.canvas.style.position = 'absolute'
		this.canvas.style.top = '0'
		this.canvas.style.left = '0'
		this.canvas.style.pointerEvents = 'none'
		this.canvas.style.zIndex = '10'
	}

	mount(container: HTMLElement) {
		container.appendChild(this.canvas)
	}

	unmount() {
		this.canvas.remove()
	}

	resize(w: number, h: number) {
		this.w = w
		this.h = h
		this.canvas.width = w * this.scale
		this.canvas.height = h * this.scale
		this.canvas.style.width = `${w}px`
		this.canvas.style.height = `${h}px`
		this.ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0)
	}

	addLayer(layer: UILayer) {
		this.layers.push(layer)
		this.layers.sort((a, b) => a.zIndex - b.zIndex)
	}

	delLayer(layer: UILayer) {
		const idx = this.layers.indexOf(layer)
		if (idx >= 0) {
			this.layers.splice(idx, 1)
		}
	}

	clr() {
		this.ctx.clearRect(0, 0, this.w, this.h)
	}

	rnd() {
		this.clr()
		for (const layer of this.layers) {
			layer.rnd(this.ctx)
		}
	}

	findAt(x: number, y: number) {
		for (let i = this.layers.length - 1; i >= 0; i--) {
			const node = this.layers[i].findAt(x, y)
			if (node) return { layer: this.layers[i], node }
		}
		return null
	}

	enablePointerEvents() {
		this.canvas.style.pointerEvents = 'auto'
	}

	disablePointerEvents() {
		this.canvas.style.pointerEvents = 'none'
	}
}
