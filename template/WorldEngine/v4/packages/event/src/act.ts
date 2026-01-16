import { globalAudio, type Vec3, type EntityId } from '@engine/common'

export enum ActionType {
	SetVar = 'set_var',
	GetVar = 'get_var',
	AddVar = 'add_var',
	If = 'if',
	Loop = 'loop',
	Wait = 'wait',
	Spawn = 'spawn',
	Despawn = 'despawn',
	Move = 'move',
	Teleport = 'teleport',
	Damage = 'damage',
	Heal = 'heal',
	AddBuff = 'add_buff',
	RemoveBuff = 'remove_buff',
	PlayAnim = 'play_anim',
	PlaySound = 'play_sound',
	ShowText = 'show_text',
	SetBlock = 'set_block',
	PubEvent = 'pub_event',
	Custom = 'custom'
}

export interface ActionDef {
	typ: ActionType
	params: Record<string, any>
	children?: ActionDef[]
}

export interface ActionContext {
	vars: Map<string, any>
	entId?: EntityId
	targetId?: EntityId
	pos?: Vec3
	cancelled: boolean
}

export type ActionHandler = (params: Record<string, any>, ctx: ActionContext) => Promise<void> | void

export class ActionRunner {
	handlers: Map<ActionType, ActionHandler>
	customHandlers: Map<string, ActionHandler>

	constructor() {
		this.handlers = new Map()
		this.customHandlers = new Map()
		this.iniHandlers()
	}

	private iniHandlers() {
		this.handlers.set(ActionType.SetVar, (params, ctx) => {
			ctx.vars.set(params.name, params.value)
		})
		this.handlers.set(ActionType.GetVar, (params, ctx) => {
			return ctx.vars.get(params.name)
		})
		this.handlers.set(ActionType.AddVar, (params, ctx) => {
			const cur = ctx.vars.get(params.name) ?? 0
			ctx.vars.set(params.name, cur + params.value)
		})
		this.handlers.set(ActionType.Wait, async (params) => {
			await new Promise(resolve => setTimeout(resolve, params.ms ?? 0))
		})
		this.handlers.set(ActionType.PlaySound, (params, ctx) => {
			const { soundId, vol, loop, spatial } = params
			const pos = spatial && ctx.pos ? ctx.pos : undefined
			globalAudio.play(soundId, pos, { vol, loop })
		})
	}

	setHandler(typ: ActionType, handler: ActionHandler) {
		this.handlers.set(typ, handler)
	}

	setCustomHandler(name: string, handler: ActionHandler) {
		this.customHandlers.set(name, handler)
	}

	async run(action: ActionDef, ctx: ActionContext): Promise<void> {
		if (ctx.cancelled) return
		const handler = action.typ === ActionType.Custom
			? this.customHandlers.get(action.params.name)
			: this.handlers.get(action.typ)
		if (!handler) {
			console.warn(`No handler for action type: ${action.typ}`)
			return
		}
		if (action.typ === ActionType.If) {
			await this.runIf(action, ctx)
			return
		}
		if (action.typ === ActionType.Loop) {
			await this.runLoop(action, ctx)
			return
		}
		await handler(action.params, ctx)
		if (action.children) {
			for (const child of action.children) {
				if (ctx.cancelled) break
				await this.run(child, ctx)
			}
		}
	}

	private async runIf(action: ActionDef, ctx: ActionContext): Promise<void> {
		const { condition, thenBranch, elseBranch } = action.params
		let result = false
		if (typeof condition === 'function') {
			result = condition(ctx)
		} else if (typeof condition === 'string') {
			const val = ctx.vars.get(condition)
			result = Boolean(val)
		} else {
			result = Boolean(condition)
		}
		const branch = result ? thenBranch : elseBranch
		if (branch && Array.isArray(branch)) {
			for (const child of branch) {
				if (ctx.cancelled) break
				await this.run(child, ctx)
			}
		}
	}

	private async runLoop(action: ActionDef, ctx: ActionContext): Promise<void> {
		const { count, condition } = action.params
		const children = action.children ?? []
		if (count !== undefined) {
			for (let i = 0; i < count; i++) {
				if (ctx.cancelled) break
				ctx.vars.set('_loopIndex', i)
				for (const child of children) {
					if (ctx.cancelled) break
					await this.run(child, ctx)
				}
			}
		} else if (condition !== undefined) {
			let iterations = 0
			const maxIterations = 10000
			while (iterations < maxIterations && !ctx.cancelled) {
				let shouldContinue = false
				if (typeof condition === 'function') {
					shouldContinue = condition(ctx)
				} else if (typeof condition === 'string') {
					shouldContinue = Boolean(ctx.vars.get(condition))
				}
				if (!shouldContinue) break
				for (const child of children) {
					if (ctx.cancelled) break
					await this.run(child, ctx)
				}
				iterations++
			}
		}
	}

	async runSequence(actions: ActionDef[], ctx: ActionContext): Promise<void> {
		for (const action of actions) {
			if (ctx.cancelled) break
			await this.run(action, ctx)
		}
	}

	cancel(ctx: ActionContext) {
		ctx.cancelled = true
	}
}

export function createContext(entId?: EntityId, targetId?: EntityId, pos?: Vec3): ActionContext {
	return {
		vars: new Map(),
		entId,
		targetId,
		pos,
		cancelled: false
	}
}
