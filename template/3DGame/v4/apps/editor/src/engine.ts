import { GLContext, Scene, Camera, TerrainRenderer, terrainVS, terrainFS, gridVS, gridFS, buildGridVerts, buildAxisVerts, axisVS, axisFS, RndMode } from '@engine/render'
import { Toolbar, Panel, EditorCanvas, InputHandler } from '@engine/ui'
import { WorldGenerator } from '@engine/mapgen'
import { LawLayer, RulesLayer, EraLayer, PlaneLayer, FactionLayer, DimensionLayer, TimeLayer, SpaceLayer, EntityLayer, ModuleLayer } from '@engine/world'
import { SBRSystem, TriggerManager, ActionRunner } from '@engine/event'
import { VAO } from '@engine/render'
import { globalProfiler, DebugUIRenderer } from '@engine/common'

class Editor {
	cv: EditorCanvas
	ctx: GLContext
	scene: Scene
	cam: Camera
	input: InputHandler
	toolbar!: Toolbar
	lePn!: Panel
	riPn!: Panel
	worldGen: WorldGenerator
	terrainRnd: TerrainRenderer
	law: LawLayer
	rules: RulesLayer
	era: EraLayer
	plane: PlaneLayer
	faction: FactionLayer
	dim: DimensionLayer
	time: TimeLayer
	space: SpaceLayer
	entity: EntityLayer
	module: ModuleLayer
	sbr: SBRSystem
	triggers: TriggerManager
	actions: ActionRunner
	gridVao: VAO | null
	axisVao: VAO | null
	running: boolean
	lastTime: number
	frames: number
	fpsTime: number
	curTool: string
	debugUI: DebugUIRenderer
	debugCv: HTMLCanvasElement
	debugCtx: CanvasRenderingContext2D

	constructor() {
		const cvCtn = document.getElementById('cv-ctn')!
		this.cv = new EditorCanvas(cvCtn)
		this.ctx = new GLContext(this.cv.el)
		this.scene = new Scene(this.ctx)
		this.cam = this.scene.cam
		this.input = new InputHandler(this.cv.el)
		this.worldGen = new WorldGenerator({ seed: Date.now() })
		this.terrainRnd = new TerrainRenderer(this.ctx)
		this.law = new LawLayer()
		this.rules = new RulesLayer()
		this.era = new EraLayer()
		this.plane = new PlaneLayer()
		this.faction = new FactionLayer()
		this.dim = new DimensionLayer(this.rules)
		this.time = new TimeLayer()
		this.space = new SpaceLayer()
		this.entity = new EntityLayer()
		this.module = new ModuleLayer()
		this.sbr = new SBRSystem()
		this.triggers = new TriggerManager()
		this.actions = new ActionRunner()
		this.gridVao = null
		this.axisVao = null
		this.running = true
		this.lastTime = performance.now()
		this.frames = 0
		this.fpsTime = 0
		this.curTool = 'select'
		this.debugCv = document.createElement('canvas')
		this.debugCv.id = 'debug-cv'
		this.debugCv.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;z-index:1000'
		cvCtn.appendChild(this.debugCv)
		this.debugCtx = this.debugCv.getContext('2d')!
		this.debugUI = new DebugUIRenderer(globalProfiler)
		this.debugUI.attach(this.debugCtx)
		this.iniToolbar()
		this.iniPanels()
		this.iniShaders()
		this.iniHelpers()
		this.iniInput()
		this.iniWorld()
		this.cv.onResize = (w, h) => {
			this.ctx.resize(w, h)
			this.debugCv.width = w
			this.debugCv.height = h
		}
		this.debugCv.width = this.cv.el.width
		this.debugCv.height = this.cv.el.height
		this.loop()
	}

	private iniToolbar() {
		const ctn = document.getElementById('toolbar-ctn')!
		this.toolbar = new Toolbar(ctn)
		this.toolbar.addGroup({
			id: 'file',
			items: [
				{ id: 'new', icon: '📄', label: '新建', shortcut: 'Ctrl+N', onClick: () => this.newProject() },
				{ id: 'open', icon: '📂', label: '打开', shortcut: 'Ctrl+O', onClick: () => this.openProject() },
				{ id: 'save', icon: '💾', label: '保存', shortcut: 'Ctrl+S', onClick: () => this.saveProject() }
			]
		})
		this.toolbar.addGroup({
			id: 'tools',
			items: [
				{ id: 'select', icon: '◇', label: '选择', shortcut: 'Q', onClick: () => this.setTool('select'), active: true },
				{ id: 'move', icon: '✥', label: '移动', shortcut: 'W', onClick: () => this.setTool('move') },
				{ id: 'rotate', icon: '↻', label: '旋转', shortcut: 'E', onClick: () => this.setTool('rotate') },
				{ id: 'scale', icon: '⤢', label: '缩放', shortcut: 'R', onClick: () => this.setTool('scale') }
			]
		})
		this.toolbar.addGroup({
			id: 'view',
			items: [
				{ id: 'grid', icon: '▦', label: '网格', onClick: () => this.toggleGrid() },
				{ id: 'wireframe', icon: '▤', label: '线框', onClick: () => this.toggleWireframe() },
				{ id: 'profiler', icon: '◎', label: '性能', shortcut: 'F3', onClick: () => this.toggleProfiler() }
			]
		})
		this.toolbar.addGroup({
			id: 'render',
			items: [
				{ id: 'realistic', icon: '◐', label: '拟真', onClick: () => this.setRndMode(RndMode.REALISTIC), active: true },
				{ id: 'acrylic', icon: '◑', label: '亚克力', onClick: () => this.setRndMode(RndMode.ACRYLIC) },
				{ id: 'anime', icon: '◒', label: '二次元', onClick: () => this.setRndMode(RndMode.ANIME) }
			]
		})
	}

	private iniPanels() {
		const leCtn = document.getElementById('le-pn-ctn')!
		this.lePn = new Panel(leCtn, {
			id: 'hierarchy',
			title: '层级',
			position: 'left',
			collapsible: true
		})
		this.lePn.addSection('场景')
		this.lePn.setContent('<div style="color:#888;font-size:12px;">暂无对象</div>')
		const riCtn = document.getElementById('ri-pn-ctn')!
		this.riPn = new Panel(riCtn, {
			id: 'inspector',
			title: '属性',
			position: 'right',
			collapsible: true
		})
		this.riPn.addSection('变换')
		this.riPn.addRow('位置', this.riPn.createInput('text', '0, 0, 0'))
		this.riPn.addRow('旋转', this.riPn.createInput('text', '0, 0, 0'))
		this.riPn.addRow('缩放', this.riPn.createInput('text', '1, 1, 1'))
	}

	private iniShaders() {
		this.scene.shaders.add('terrain', terrainVS, terrainFS)
		this.scene.shaders.add('grid', gridVS, gridFS)
		this.scene.shaders.add('axis', axisVS, axisFS)
		const terrainShd = this.scene.shaders.get('terrain')
		if (terrainShd) {
			this.terrainRnd.setShader(terrainShd)
		}
	}

	private iniHelpers() {
		const { gl } = this.ctx
		const gridVerts = buildGridVerts(100, 1)
		this.gridVao = new VAO(gl)
		this.gridVao.setVerts(gridVerts)
		this.gridVao.setLayout([
			{ name: 'aPos', size: 3, type: gl.FLOAT, normalized: false, offset: 0 }
		], 12)
		const gridShd = this.scene.shaders.get('grid')
		if (gridShd) {
			this.gridVao.setup(name => gridShd.attr(name))
		}
		const axisVerts = buildAxisVerts(10)
		this.axisVao = new VAO(gl)
		this.axisVao.setVerts(axisVerts)
		this.axisVao.setLayout([
			{ name: 'aPos', size: 3, type: gl.FLOAT, normalized: false, offset: 0 },
			{ name: 'aClr', size: 3, type: gl.FLOAT, normalized: false, offset: 12 }
		], 24)
		const axisShd = this.scene.shaders.get('axis')
		if (axisShd) {
			this.axisVao.setup(name => axisShd.attr(name))
		}
	}

	private iniInput() {
		this.input.onMouseMove = (x, y, dx, dy) => {
			this.debugUI.onMouseMove(x, y)
			if (this.input.isMouseDown(2)) {
				this.cam.orbit(-dx * 0.005, -dy * 0.005)
			}
			if (this.input.isMouseDown(1)) {
				this.cam.pan(-dx * 0.1, dy * 0.1)
			}
		}
		this.input.onMouseDown = (btn, x, y) => {
			if (btn === 0 && this.debugUI.onMouseDown(x, y)) return
		}
		this.input.onMouseUp = (btn, _x, _y) => {
			if (btn === 0) this.debugUI.onMouseUp()
		}
		this.input.onWheel = (delta, x, y) => {
			if (this.debugUI.onWheel(x, y, delta)) return
			this.cam.zoom(delta * 0.05)
		}
		this.input.onKeyDown = (key) => {
			if (this.debugUI.onKeyDown(key)) return
			switch (key.toLowerCase()) {
				case 'q': this.setTool('select'); break
				case 'w': this.setTool('move'); break
				case 'e': this.setTool('rotate'); break
				case 'r': this.setTool('scale'); break
				case 'f3': this.toggleProfiler(); break
			}
		}
	}

	private iniWorld() {
		const chunks = this.space.updLoadedChunks(0, 0)
		for (const pos of chunks) {
			const blocks = this.worldGen.genChunk(pos)
			const chunk = this.space.getChunk(pos)
			if (chunk) {
				for (let i = 0; i < blocks.length; i++) {
					chunk.blocks[i] = blocks[i]
				}
				chunk.gen = true
				chunk.dirty = true
			}
		}
		this.rebuildTerrain()
	}

	private rebuildTerrain() {
		const dirtyChunks = this.space.getDirtyChunks()
		for (const chunk of dirtyChunks) {
			this.terrainRnd.buildMesh(chunk.pos, chunk.blocks, (id) => {
				const colors: Record<number, [number, number, number]> = {
					0: [0, 0, 0],
					1: [0.5, 0.5, 0.5],
					2: [0.3, 0.6, 0.2],
					3: [0.5, 0.4, 0.3],
					4: [0.9, 0.85, 0.6],
					5: [0.3, 0.4, 0.3],
					6: [0.2, 0.4, 0.7],
					10: [0.9, 0.95, 1.0],
					11: [0.7, 0.75, 0.8],
					20: [0.2, 0.2, 0.2],
					21: [0.7, 0.5, 0.3],
					22: [0.6, 0.6, 0.7],
					23: [0.9, 0.8, 0.3],
					24: [0.4, 0.9, 0.9]
				}
				return colors[id] ?? [1, 0, 1]
			})
			this.space.markChunkClean(chunk.pos)
		}
	}

	private setTool(tool: string) {
		this.curTool = tool
		this.toolbar.setItemActive('select', tool === 'select')
		this.toolbar.setItemActive('move', tool === 'move')
		this.toolbar.setItemActive('rotate', tool === 'rotate')
		this.toolbar.setItemActive('scale', tool === 'scale')
	}

	private newProject() {
		console.log('New project')
	}

	private openProject() {
		console.log('Open project')
	}

	private saveProject() {
		console.log('Save project')
	}

	private toggleGrid() {
		console.log('Toggle grid')
	}

	private toggleWireframe() {
		console.log('Toggle wireframe')
	}

	private toggleProfiler() {
		globalProfiler.setEnabled(!globalProfiler.enabled)
		this.debugCv.style.pointerEvents = globalProfiler.enabled ? 'auto' : 'none'
	}

	private setRndMode(mode: RndMode) {
		this.scene.setRndMode(mode)
		this.toolbar.setItemActive('realistic', mode === RndMode.REALISTIC)
		this.toolbar.setItemActive('acrylic', mode === RndMode.ACRYLIC)
		this.toolbar.setItemActive('anime', mode === RndMode.ANIME)
	}

	private renderDebugUI() {
		this.debugCtx.clearRect(0, 0, this.debugCv.width, this.debugCv.height)
		this.debugUI.render()
	}

	private loop() {
		if (!this.running) return
		globalProfiler.beginFrame()
		const now = performance.now()
		const dt = (now - this.lastTime) / 1000
		this.lastTime = now
		this.frames++
		this.fpsTime += dt
		if (this.fpsTime >= 1) {
			const fps = Math.round(this.frames / this.fpsTime)
			document.getElementById('fps')!.textContent = `FPS: ${fps}`
			this.frames = 0
			this.fpsTime = 0
		}
		globalProfiler.beginSystem('Time')
		this.time.upd(dt)
		globalProfiler.endSystem('Time')
		globalProfiler.beginSystem('Triggers')
		this.triggers.upd(dt, dt)
		globalProfiler.endSystem('Triggers')
		globalProfiler.beginSystem('Entity')
		this.entity.upd(dt)
		globalProfiler.endSystem('Entity')
		globalProfiler.beginSystem('SBR')
		this.sbr.process()
		globalProfiler.endSystem('SBR')
		globalProfiler.beginSystem('Camera')
		this.cam.upd(this.ctx.aspect())
		globalProfiler.endSystem('Camera')
		document.getElementById('pos')!.textContent = `Pos: ${this.cam.tgt.x.toFixed(1)}, ${this.cam.tgt.y.toFixed(1)}, ${this.cam.tgt.z.toFixed(1)}`
		document.getElementById('chunks')!.textContent = `Chunks: ${this.space.loadedChunks.size}`
		globalProfiler.beginSystem('Render')
		this.render()
		globalProfiler.endSystem('Render')
		this.renderDebugUI()
		this.input.reset()
		globalProfiler.endFrame()
		requestAnimationFrame(() => this.loop())
	}

	private render() {
		const { gl } = this.ctx
		this.ctx.clr()
		const gridShd = this.scene.shaders.get('grid')
		if (gridShd && this.gridVao) {
			gridShd.use()
			gridShd.setMat4('uViewProj', this.cam.viewProj)
			gridShd.setVec4('uColor', 0.3, 0.3, 0.3, 0.5)
			gridShd.setFloat('uFadeStart', 30)
			gridShd.setFloat('uFadeEnd', 50)
			this.gridVao.bind()
			gl.drawArrays(gl.LINES, 0, this.gridVao.vbo.cnt / 3)
			this.gridVao.unbind()
		}
		const axisShd = this.scene.shaders.get('axis')
		if (axisShd && this.axisVao) {
			axisShd.use()
			axisShd.setMat4('uViewProj', this.cam.viewProj)
			gl.lineWidth(2)
			this.axisVao.bind()
			gl.drawArrays(gl.LINES, 0, 6)
			this.axisVao.unbind()
		}
		this.terrainRnd.render(
			this.cam.viewProj,
			[this.scene.ambientLight.x, this.scene.ambientLight.y, this.scene.ambientLight.z],
			[this.scene.sunDir.x, this.scene.sunDir.y, this.scene.sunDir.z],
			[this.scene.sunColor.x, this.scene.sunColor.y, this.scene.sunColor.z],
			[this.cam.pos.x, this.cam.pos.y, this.cam.pos.z],
			this.scene.rndCfg
		)
	}

	dispose() {
		this.running = false
		this.scene.dispose()
		this.terrainRnd.dispose()
		this.gridVao?.dispose()
		this.axisVao?.dispose()
	}
}

const editor = new Editor()
;(window as any).editor = editor
