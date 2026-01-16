import type { Vec3 } from '@engine/common'
import { Camera } from './cam'
import { GLContext } from '../gl/context'
import { ShaderManager } from '../gl/shd'
import { TextureManager } from '../gl/tex'
import { RndMode, RndCfg, defRndCfg } from '../gl/rnd-mode'

export interface SceneNode {
	id: string
	pos: Vec3
	rot: Vec3
	scl: Vec3
	visible: boolean
	children: SceneNode[]
}

export class Scene {
	ctx: GLContext
	shaders: ShaderManager
	textures: TextureManager
	cam: Camera
	root: SceneNode
	nodes: Map<string, SceneNode>
	ambientLight: Vec3
	sunDir: Vec3
	sunColor: Vec3
	rndCfg: RndCfg

	constructor(ctx: GLContext) {
		this.ctx = ctx
		this.shaders = new ShaderManager(ctx.gl)
		this.textures = new TextureManager(ctx.gl)
		this.cam = new Camera()
		this.root = {
			id: 'root',
			pos: { x: 0, y: 0, z: 0 },
			rot: { x: 0, y: 0, z: 0 },
			scl: { x: 1, y: 1, z: 1 },
			visible: true,
			children: []
		}
		this.nodes = new Map()
		this.nodes.set('root', this.root)
		this.ambientLight = { x: 0.3, y: 0.3, z: 0.35 }
		this.sunDir = { x: 0.5, y: 0.3, z: 0.8 }
		this.sunColor = { x: 1.0, y: 0.95, z: 0.9 }
		this.rndCfg = defRndCfg()
	}

	setRndMode(mode: RndMode) {
		this.rndCfg.mode = mode
	}

	addNode(id: string, parent = 'root'): SceneNode {
		const node: SceneNode = {
			id,
			pos: { x: 0, y: 0, z: 0 },
			rot: { x: 0, y: 0, z: 0 },
			scl: { x: 1, y: 1, z: 1 },
			visible: true,
			children: []
		}
		this.nodes.set(id, node)
		const prt = this.nodes.get(parent)
		if (prt) prt.children.push(node)
		return node
	}

	getNode(id: string): SceneNode | undefined {
		return this.nodes.get(id)
	}

	delNode(id: string) {
		const node = this.nodes.get(id)
		if (!node || id === 'root') return
		for (const [, n] of this.nodes) {
			const idx = n.children.indexOf(node)
			if (idx >= 0) {
				n.children.splice(idx, 1)
				break
			}
		}
		this.nodes.delete(id)
	}

	upd(_dt: number) {
		this.cam.upd(this.ctx.aspect())
	}

	dispose() {
		this.shaders.dispose()
		this.textures.dispose()
	}
}
