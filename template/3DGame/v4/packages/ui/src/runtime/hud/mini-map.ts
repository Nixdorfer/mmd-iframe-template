import { UINode, UINodeCfg } from '../base/node'

export interface MapMarker {
	id: string
	x: number
	y: number
	icon?: string | HTMLImageElement
	color?: string
	size?: number
	label?: string
	visible?: boolean
}

export interface MiniMapCfg extends UINodeCfg {
	worldW?: number
	worldH?: number
	bgColor?: string
	borderColor?: string
	borderWidth?: number
	playerColor?: string
	playerSize?: number
	showGrid?: boolean
	gridColor?: string
	gridSize?: number
	radius?: number
	maskShape?: 'rect' | 'circle'
}

export class MiniMap extends UINode {
	worldW: number
	worldH: number
	bgColor: string
	borderColor: string
	borderWidth: number
	playerColor: string
	playerSize: number
	showGrid: boolean
	gridColor: string
	gridSize: number
	radius: number
	maskShape: 'rect' | 'circle'
	playerX: number
	playerY: number
	playerRot: number
	markers: Map<string, MapMarker>
	private markerIcons: Map<string, HTMLImageElement>
	private fogCanvas: HTMLCanvasElement | null
	private fogCtx: CanvasRenderingContext2D | null
	fogEnabled: boolean
	viewRadius: number

	constructor(cfg?: MiniMapCfg) {
		super(cfg)
		this.worldW = cfg?.worldW ?? 1000
		this.worldH = cfg?.worldH ?? 1000
		this.bgColor = cfg?.bgColor ?? '#1a2a1a'
		this.borderColor = cfg?.borderColor ?? '#446644'
		this.borderWidth = cfg?.borderWidth ?? 2
		this.playerColor = cfg?.playerColor ?? '#00ff00'
		this.playerSize = cfg?.playerSize ?? 6
		this.showGrid = cfg?.showGrid ?? true
		this.gridColor = cfg?.gridColor ?? 'rgba(68, 102, 68, 0.3)'
		this.gridSize = cfg?.gridSize ?? 100
		this.radius = cfg?.radius ?? 0
		this.maskShape = cfg?.maskShape ?? 'rect'
		this.playerX = 0
		this.playerY = 0
		this.playerRot = 0
		this.markers = new Map()
		this.markerIcons = new Map()
		this.fogCanvas = null
		this.fogCtx = null
		this.fogEnabled = false
		this.viewRadius = 50
		if (this.w === 0) this.w = 150
		if (this.h === 0) this.h = 150
	}

	setPlayer(x: number, y: number, rot?: number) {
		this.playerX = x
		this.playerY = y
		if (rot !== undefined) this.playerRot = rot
		this.dirty = true
		if (this.fogEnabled) {
			this.revealFog(x, y)
		}
	}

	addMarker(marker: MapMarker) {
		this.markers.set(marker.id, { visible: true, ...marker })
		if (marker.icon && typeof marker.icon === 'string') {
			const img = new Image()
			img.src = marker.icon
			this.markerIcons.set(marker.id, img)
		}
		this.dirty = true
	}

	delMarker(id: string) {
		this.markers.delete(id)
		this.markerIcons.delete(id)
		this.dirty = true
	}

	updMarker(id: string, x: number, y: number) {
		const marker = this.markers.get(id)
		if (marker) {
			marker.x = x
			marker.y = y
			this.dirty = true
		}
	}

	clrMarkers() {
		this.markers.clear()
		this.markerIcons.clear()
		this.dirty = true
	}

	enableFog(viewRadius: number = 50) {
		this.fogEnabled = true
		this.viewRadius = viewRadius
		this.fogCanvas = document.createElement('canvas')
		this.fogCanvas.width = Math.ceil(this.w)
		this.fogCanvas.height = Math.ceil(this.h)
		this.fogCtx = this.fogCanvas.getContext('2d')
		if (this.fogCtx) {
			this.fogCtx.fillStyle = '#000000'
			this.fogCtx.fillRect(0, 0, this.fogCanvas.width, this.fogCanvas.height)
		}
		this.dirty = true
	}

	disableFog() {
		this.fogEnabled = false
		this.fogCanvas = null
		this.fogCtx = null
		this.dirty = true
	}

	private revealFog(worldX: number, worldY: number) {
		if (!this.fogCtx || !this.fogCanvas) return
		const mapX = (worldX / this.worldW) * this.fogCanvas.width
		const mapY = (worldY / this.worldH) * this.fogCanvas.height
		const mapRadius = (this.viewRadius / this.worldW) * this.fogCanvas.width
		this.fogCtx.globalCompositeOperation = 'destination-out'
		const grad = this.fogCtx.createRadialGradient(mapX, mapY, 0, mapX, mapY, mapRadius)
		grad.addColorStop(0, 'rgba(0,0,0,1)')
		grad.addColorStop(0.7, 'rgba(0,0,0,0.8)')
		grad.addColorStop(1, 'rgba(0,0,0,0)')
		this.fogCtx.fillStyle = grad
		this.fogCtx.beginPath()
		this.fogCtx.arc(mapX, mapY, mapRadius, 0, Math.PI * 2)
		this.fogCtx.fill()
		this.fogCtx.globalCompositeOperation = 'source-over'
	}

	worldToMap(worldX: number, worldY: number): { x: number; y: number } {
		const x = this.getWorldX()
		const y = this.getWorldY()
		return {
			x: x + (worldX / this.worldW) * this.w,
			y: y + (worldY / this.worldH) * this.h
		}
	}

	draw(ctx: CanvasRenderingContext2D) {
		const x = this.getWorldX()
		const y = this.getWorldY()
		ctx.save()
		if (this.maskShape === 'circle') {
			ctx.beginPath()
			ctx.arc(x + this.w / 2, y + this.h / 2, Math.min(this.w, this.h) / 2, 0, Math.PI * 2)
			ctx.clip()
		} else if (this.radius > 0) {
			ctx.beginPath()
			ctx.moveTo(x + this.radius, y)
			ctx.lineTo(x + this.w - this.radius, y)
			ctx.quadraticCurveTo(x + this.w, y, x + this.w, y + this.radius)
			ctx.lineTo(x + this.w, y + this.h - this.radius)
			ctx.quadraticCurveTo(x + this.w, y + this.h, x + this.w - this.radius, y + this.h)
			ctx.lineTo(x + this.radius, y + this.h)
			ctx.quadraticCurveTo(x, y + this.h, x, y + this.h - this.radius)
			ctx.lineTo(x, y + this.radius)
			ctx.quadraticCurveTo(x, y, x + this.radius, y)
			ctx.clip()
		}
		ctx.fillStyle = this.bgColor
		ctx.fillRect(x, y, this.w, this.h)
		if (this.showGrid) {
			ctx.strokeStyle = this.gridColor
			ctx.lineWidth = 1
			const stepX = (this.gridSize / this.worldW) * this.w
			const stepY = (this.gridSize / this.worldH) * this.h
			for (let gx = stepX; gx < this.w; gx += stepX) {
				ctx.beginPath()
				ctx.moveTo(x + gx, y)
				ctx.lineTo(x + gx, y + this.h)
				ctx.stroke()
			}
			for (let gy = stepY; gy < this.h; gy += stepY) {
				ctx.beginPath()
				ctx.moveTo(x, y + gy)
				ctx.lineTo(x + this.w, y + gy)
				ctx.stroke()
			}
		}
		for (const [id, marker] of this.markers) {
			if (marker.visible === false) continue
			const mx = x + (marker.x / this.worldW) * this.w
			const my = y + (marker.y / this.worldH) * this.h
			const icon = this.markerIcons.get(id)
			const size = marker.size ?? 8
			if (icon && icon.complete) {
				ctx.drawImage(icon, mx - size / 2, my - size / 2, size, size)
			} else {
				ctx.fillStyle = marker.color ?? '#ffffff'
				ctx.beginPath()
				ctx.arc(mx, my, size / 2, 0, Math.PI * 2)
				ctx.fill()
			}
			if (marker.label) {
				ctx.font = '9px system-ui, sans-serif'
				ctx.fillStyle = '#ffffff'
				ctx.textAlign = 'center'
				ctx.textBaseline = 'top'
				ctx.fillText(marker.label, mx, my + size / 2 + 2)
			}
		}
		const px = x + (this.playerX / this.worldW) * this.w
		const py = y + (this.playerY / this.worldH) * this.h
		ctx.save()
		ctx.translate(px, py)
		ctx.rotate(this.playerRot)
		ctx.fillStyle = this.playerColor
		ctx.beginPath()
		ctx.moveTo(0, -this.playerSize)
		ctx.lineTo(-this.playerSize * 0.6, this.playerSize * 0.6)
		ctx.lineTo(this.playerSize * 0.6, this.playerSize * 0.6)
		ctx.closePath()
		ctx.fill()
		ctx.restore()
		if (this.fogEnabled && this.fogCanvas) {
			ctx.globalAlpha = 0.7
			ctx.drawImage(this.fogCanvas, x, y, this.w, this.h)
			ctx.globalAlpha = 1
		}
		ctx.restore()
		if (this.maskShape === 'circle') {
			ctx.strokeStyle = this.borderColor
			ctx.lineWidth = this.borderWidth
			ctx.beginPath()
			ctx.arc(x + this.w / 2, y + this.h / 2, Math.min(this.w, this.h) / 2, 0, Math.PI * 2)
			ctx.stroke()
		} else {
			ctx.strokeStyle = this.borderColor
			ctx.lineWidth = this.borderWidth
			if (this.radius > 0) {
				ctx.beginPath()
				ctx.moveTo(x + this.radius, y)
				ctx.lineTo(x + this.w - this.radius, y)
				ctx.quadraticCurveTo(x + this.w, y, x + this.w, y + this.radius)
				ctx.lineTo(x + this.w, y + this.h - this.radius)
				ctx.quadraticCurveTo(x + this.w, y + this.h, x + this.w - this.radius, y + this.h)
				ctx.lineTo(x + this.radius, y + this.h)
				ctx.quadraticCurveTo(x, y + this.h, x, y + this.h - this.radius)
				ctx.lineTo(x, y + this.radius)
				ctx.quadraticCurveTo(x, y, x + this.radius, y)
				ctx.stroke()
			} else {
				ctx.strokeRect(x, y, this.w, this.h)
			}
		}
	}

	getMarkerAt(screenX: number, screenY: number): MapMarker | null {
		const x = this.getWorldX()
		const y = this.getWorldY()
		for (const [, marker] of this.markers) {
			if (marker.visible === false) continue
			const mx = x + (marker.x / this.worldW) * this.w
			const my = y + (marker.y / this.worldH) * this.h
			const size = marker.size ?? 8
			const dx = screenX - mx
			const dy = screenY - my
			if (dx * dx + dy * dy <= (size / 2) * (size / 2)) {
				return marker
			}
		}
		return null
	}
}
