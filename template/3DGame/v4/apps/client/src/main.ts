import { GLContext } from '@engine/render'

class GameClient {
	cv: HTMLCanvasElement
	ctx: GLContext
	running: boolean
	lastTime: number

	constructor() {
		this.cv = document.getElementById('game-cv') as HTMLCanvasElement
		this.cv.width = window.innerWidth
		this.cv.height = window.innerHeight
		this.ctx = new GLContext(this.cv)
		this.running = true
		this.lastTime = performance.now()
		window.addEventListener('resize', () => this.resize())
		this.loop()
	}

	private resize() {
		this.cv.width = window.innerWidth
		this.cv.height = window.innerHeight
		this.ctx.resize(window.innerWidth, window.innerHeight)
	}

	private loop() {
		if (!this.running) return
		const now = performance.now()
		const dt = (now - this.lastTime) / 1000
		this.lastTime = now
		this.render()
		requestAnimationFrame(() => this.loop())
	}

	private render() {
		this.ctx.clr()
	}

	dispose() {
		this.running = false
	}
}

const client = new GameClient()
;(window as any).client = client
