import { UILayer, UILayerType } from './layer'
import { UIRenderer } from './rnd'
import { UINode } from './base/node'

export interface Vec3 {
	x: number
	y: number
	z: number
}

export interface UICamera {
	viewProj: Float32Array
}

export interface UIMgrCfg {
	container: HTMLElement
	w: number
	h: number
	camera?: UICamera
}

export class UIManager {
	renderer: UIRenderer
	worldLayer: UILayer
	hudLayer: UILayer
	overlayLayer: UILayer
	camera: UICamera | null
	container: HTMLElement
	private mouseX: number
	private mouseY: number
	private hovered: UINode | null
	private pressed: UINode | null

	constructor(cfg: UIMgrCfg) {
		this.container = cfg.container
		this.renderer = new UIRenderer({ w: cfg.w, h: cfg.h })
		this.worldLayer = new UILayer(UILayerType.World, 0)
		this.hudLayer = new UILayer(UILayerType.HUD, 10)
		this.overlayLayer = new UILayer(UILayerType.Overlay, 20)
		this.renderer.addLayer(this.worldLayer)
		this.renderer.addLayer(this.hudLayer)
		this.renderer.addLayer(this.overlayLayer)
		this.camera = cfg.camera ?? null
		this.mouseX = 0
		this.mouseY = 0
		this.hovered = null
		this.pressed = null
		this.renderer.mount(cfg.container)
		this.bindEvents()
	}

	private bindEvents() {
		this.renderer.canvas.addEventListener('mousemove', this.onMouseMove.bind(this))
		this.renderer.canvas.addEventListener('mousedown', this.onMouseDown.bind(this))
		this.renderer.canvas.addEventListener('mouseup', this.onMouseUp.bind(this))
		this.renderer.canvas.addEventListener('click', this.onClick.bind(this))
	}

	private onMouseMove(e: MouseEvent) {
		const rect = this.renderer.canvas.getBoundingClientRect()
		this.mouseX = e.clientX - rect.left
		this.mouseY = e.clientY - rect.top
		const result = this.renderer.findAt(this.mouseX, this.mouseY)
		const newHovered = result?.node ?? null
		if (this.hovered !== newHovered) {
			if (this.hovered && 'onHoverOut' in this.hovered) {
				(this.hovered as any).onHoverOut()
			}
			this.hovered = newHovered
			if (this.hovered && 'onHoverIn' in this.hovered) {
				(this.hovered as any).onHoverIn()
			}
		}
	}

	private onMouseDown(_e: MouseEvent) {
		const result = this.renderer.findAt(this.mouseX, this.mouseY)
		this.pressed = result?.node ?? null
		if (this.pressed && 'onPressDown' in this.pressed) {
			(this.pressed as any).onPressDown()
		}
	}

	private onMouseUp(_e: MouseEvent) {
		if (this.pressed && 'onPressUp' in this.pressed) {
			(this.pressed as any).onPressUp()
		}
		this.pressed = null
	}

	private onClick(_e: MouseEvent) {
		const result = this.renderer.findAt(this.mouseX, this.mouseY)
		if (result?.node && 'onClick' in result.node) {
			(result.node as any).onClick()
		}
	}

	setCamera(camera: UICamera) {
		this.camera = camera
	}

	worldToScreen(pos: Vec3): { x: number; y: number } | null {
		if (!this.camera) return null
		const vp = this.camera.viewProj
		const x = pos.x * vp[0] + pos.y * vp[4] + pos.z * vp[8] + vp[12]
		const y = pos.x * vp[1] + pos.y * vp[5] + pos.z * vp[9] + vp[13]
		const z = pos.x * vp[2] + pos.y * vp[6] + pos.z * vp[10] + vp[14]
		const w = pos.x * vp[3] + pos.y * vp[7] + pos.z * vp[11] + vp[15]
		if (w <= 0) return null
		const ndcX = x / w
		const ndcY = y / w
		const ndcZ = z / w
		if (ndcZ < -1 || ndcZ > 1) return null
		return {
			x: (ndcX + 1) * 0.5 * this.renderer.w,
			y: (1 - ndcY) * 0.5 * this.renderer.h
		}
	}

	resize(w: number, h: number) {
		this.renderer.resize(w, h)
	}

	upd(dt: number) {
		this.worldLayer.upd(dt)
		this.hudLayer.upd(dt)
		this.overlayLayer.upd(dt)
	}

	rnd() {
		this.renderer.rnd()
	}

	addToWorld(node: UINode) {
		this.worldLayer.add(node)
	}

	addToHUD(node: UINode) {
		this.hudLayer.add(node)
	}

	addToOverlay(node: UINode) {
		this.overlayLayer.add(node)
	}

	del(node: UINode) {
		this.worldLayer.del(node)
		this.hudLayer.del(node)
		this.overlayLayer.del(node)
	}

	enableInteraction() {
		this.renderer.enablePointerEvents()
	}

	disableInteraction() {
		this.renderer.disablePointerEvents()
	}

	getMousePos(): { x: number; y: number } {
		return { x: this.mouseX, y: this.mouseY }
	}

	getHovered(): UINode | null {
		return this.hovered
	}

	destroy() {
		this.renderer.unmount()
		this.worldLayer.clr()
		this.hudLayer.clr()
		this.overlayLayer.clr()
	}
}
