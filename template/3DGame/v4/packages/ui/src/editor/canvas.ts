export interface CanvasConfig {
	width?: number
	height?: number
	autoResize?: boolean
}

export class EditorCanvas {
	el: HTMLCanvasElement
	container: HTMLElement
	cfg: CanvasConfig
	onResize: ((w: number, h: number) => void) | null

	constructor(container: HTMLElement, cfg: CanvasConfig = {}) {
		this.container = container
		this.cfg = {
			autoResize: true,
			...cfg
		}
		this.onResize = null
		this.el = document.createElement('canvas')
		this.el.className = 'editor-cv'
		container.appendChild(this.el)
		this.iniStyle()
		this.resize()
		if (this.cfg.autoResize) {
			window.addEventListener('resize', () => this.resize())
			new ResizeObserver(() => this.resize()).observe(container)
		}
	}

	private iniStyle() {
		const style = document.createElement('style')
		style.textContent = `
.editor-cv {
	display: block;
	width: 100%;
	height: 100%;
	background: #1a1a1a;
}
`
		document.head.appendChild(style)
	}

	resize() {
		const rect = this.container.getBoundingClientRect()
		const w = Math.floor(rect.width) || 800
		const h = Math.floor(rect.height) || 600
		if (this.el.width !== w || this.el.height !== h) {
			this.el.width = w
			this.el.height = h
			this.onResize?.(w, h)
		}
	}

	getContext(): WebGL2RenderingContext | null {
		return this.el.getContext('webgl2', {
			antialias: true,
			alpha: false,
			depth: true,
			stencil: false,
			powerPreference: 'high-performance'
		})
	}

	get width(): number {
		return this.el.width
	}

	get height(): number {
		return this.el.height
	}
}

export interface InputState {
	mouseX: number
	mouseY: number
	deltaX: number
	deltaY: number
	wheel: number
	buttons: number
	keys: Set<string>
	shift: boolean
	ctrl: boolean
	alt: boolean
}

export class InputHandler {
	el: HTMLElement
	state: InputState
	onMouseMove: ((x: number, y: number, dx: number, dy: number) => void) | null
	onMouseDown: ((btn: number, x: number, y: number) => void) | null
	onMouseUp: ((btn: number, x: number, y: number) => void) | null
	onWheel: ((delta: number, x: number, y: number) => void) | null
	onKeyDown: ((key: string) => void) | null
	onKeyUp: ((key: string) => void) | null

	constructor(el: HTMLElement) {
		this.el = el
		this.state = {
			mouseX: 0,
			mouseY: 0,
			deltaX: 0,
			deltaY: 0,
			wheel: 0,
			buttons: 0,
			keys: new Set(),
			shift: false,
			ctrl: false,
			alt: false
		}
		this.onMouseMove = null
		this.onMouseDown = null
		this.onMouseUp = null
		this.onWheel = null
		this.onKeyDown = null
		this.onKeyUp = null
		this.bind()
	}

	private bind() {
		this.el.addEventListener('mousemove', (e) => {
			const rect = this.el.getBoundingClientRect()
			const x = e.clientX - rect.left
			const y = e.clientY - rect.top
			this.state.deltaX = x - this.state.mouseX
			this.state.deltaY = y - this.state.mouseY
			this.state.mouseX = x
			this.state.mouseY = y
			this.onMouseMove?.(x, y, this.state.deltaX, this.state.deltaY)
		})
		this.el.addEventListener('mousedown', (e) => {
			this.state.buttons = e.buttons
			this.onMouseDown?.(e.button, this.state.mouseX, this.state.mouseY)
		})
		this.el.addEventListener('mouseup', (e) => {
			this.state.buttons = e.buttons
			this.onMouseUp?.(e.button, this.state.mouseX, this.state.mouseY)
		})
		this.el.addEventListener('wheel', (e) => {
			e.preventDefault()
			this.state.wheel = e.deltaY
			this.onWheel?.(e.deltaY, this.state.mouseX, this.state.mouseY)
		}, { passive: false })
		this.el.addEventListener('contextmenu', (e) => e.preventDefault())
		window.addEventListener('keydown', (e) => {
			this.state.keys.add(e.key.toLowerCase())
			this.state.shift = e.shiftKey
			this.state.ctrl = e.ctrlKey
			this.state.alt = e.altKey
			this.onKeyDown?.(e.key)
		})
		window.addEventListener('keyup', (e) => {
			this.state.keys.delete(e.key.toLowerCase())
			this.state.shift = e.shiftKey
			this.state.ctrl = e.ctrlKey
			this.state.alt = e.altKey
			this.onKeyUp?.(e.key)
		})
	}

	isKeyDown(key: string): boolean {
		return this.state.keys.has(key.toLowerCase())
	}

	isMouseDown(btn: number): boolean {
		return (this.state.buttons & (1 << btn)) !== 0
	}

	reset() {
		this.state.deltaX = 0
		this.state.deltaY = 0
		this.state.wheel = 0
	}
}
