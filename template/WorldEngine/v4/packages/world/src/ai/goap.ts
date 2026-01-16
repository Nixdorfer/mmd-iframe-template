import type { EntityId } from '@engine/common'

export type WorldState = Map<string, boolean | number | string>

export interface GoapAction {
	name: string
	cost: number
	preconditions: WorldState
	effects: WorldState
	execute: (entityId: EntityId, ctx: GoapContext) => Promise<boolean>
	isValid?: (entityId: EntityId, ctx: GoapContext) => boolean
	getDynamicCost?: (entityId: EntityId, ctx: GoapContext) => number
}

export interface GoapGoal {
	name: string
	priority: number
	conditions: WorldState
	isValid?: (entityId: EntityId, ctx: GoapContext) => boolean
}

export interface GoapContext {
	worldState: WorldState
	entityState: WorldState
	blackboard: Map<string, any>
}

interface PlanNode {
	state: WorldState
	action: GoapAction | null
	parent: PlanNode | null
	cost: number
	heuristic: number
}

export class GoapPlanner {
	actions: GoapAction[]
	maxIterations: number

	constructor() {
		this.actions = []
		this.maxIterations = 1000
	}

	addAction(action: GoapAction) {
		this.actions.push(action)
	}

	removeAction(name: string) {
		const idx = this.actions.findIndex(a => a.name === name)
		if (idx >= 0) this.actions.splice(idx, 1)
	}

	plan(
		entityId: EntityId,
		currentState: WorldState,
		goal: GoapGoal,
		ctx: GoapContext
	): GoapAction[] | null {
		if (goal.isValid && !goal.isValid(entityId, ctx)) {
			return null
		}
		const validActions = this.actions.filter(
			a => !a.isValid || a.isValid(entityId, ctx)
		)
		const startNode: PlanNode = {
			state: new Map(currentState),
			action: null,
			parent: null,
			cost: 0,
			heuristic: this.calHeuristic(currentState, goal.conditions)
		}
		const openSet: PlanNode[] = [startNode]
		const closedSet = new Set<string>()
		let iterations = 0
		while (openSet.length > 0 && iterations < this.maxIterations) {
			iterations++
			openSet.sort((a, b) => (a.cost + a.heuristic) - (b.cost + b.heuristic))
			const current = openSet.shift()!
			if (this.satisfiesGoal(current.state, goal.conditions)) {
				return this.reconstructPlan(current)
			}
			const stateKey = this.stateToKey(current.state)
			if (closedSet.has(stateKey)) continue
			closedSet.add(stateKey)
			for (const action of validActions) {
				if (!this.canApply(current.state, action.preconditions)) continue
				const newState = this.applyEffects(current.state, action.effects)
				const newStateKey = this.stateToKey(newState)
				if (closedSet.has(newStateKey)) continue
				const actionCost = action.getDynamicCost
					? action.getDynamicCost(entityId, ctx)
					: action.cost
				const newNode: PlanNode = {
					state: newState,
					action: action,
					parent: current,
					cost: current.cost + actionCost,
					heuristic: this.calHeuristic(newState, goal.conditions)
				}
				openSet.push(newNode)
			}
		}
		return null
	}

	private calHeuristic(state: WorldState, goal: WorldState): number {
		let diff = 0
		for (const [key, value] of goal) {
			const current = state.get(key)
			if (current !== value) diff++
		}
		return diff
	}

	private satisfiesGoal(state: WorldState, goal: WorldState): boolean {
		for (const [key, value] of goal) {
			if (state.get(key) !== value) return false
		}
		return true
	}

	private canApply(state: WorldState, preconditions: WorldState): boolean {
		for (const [key, value] of preconditions) {
			if (state.get(key) !== value) return false
		}
		return true
	}

	private applyEffects(state: WorldState, effects: WorldState): WorldState {
		const newState = new Map(state)
		for (const [key, value] of effects) {
			newState.set(key, value)
		}
		return newState
	}

	private stateToKey(state: WorldState): string {
		const entries = Array.from(state.entries()).sort((a, b) => a[0].localeCompare(b[0]))
		return JSON.stringify(entries)
	}

	private reconstructPlan(node: PlanNode): GoapAction[] {
		const plan: GoapAction[] = []
		let current: PlanNode | null = node
		while (current) {
			if (current.action) {
				plan.unshift(current.action)
			}
			current = current.parent
		}
		return plan
	}
}

export class GoapAgent {
	entityId: EntityId
	planner: GoapPlanner
	goals: GoapGoal[]
	currentPlan: GoapAction[]
	currentActionIdx: number
	ctx: GoapContext
	isExecuting: boolean
	replanInterval: number
	lastReplanTime: number

	constructor(entityId: EntityId, planner: GoapPlanner) {
		this.entityId = entityId
		this.planner = planner
		this.goals = []
		this.currentPlan = []
		this.currentActionIdx = 0
		this.ctx = {
			worldState: new Map(),
			entityState: new Map(),
			blackboard: new Map()
		}
		this.isExecuting = false
		this.replanInterval = 1000
		this.lastReplanTime = 0
	}

	addGoal(goal: GoapGoal) {
		this.goals.push(goal)
		this.goals.sort((a, b) => b.priority - a.priority)
	}

	removeGoal(name: string) {
		const idx = this.goals.findIndex(g => g.name === name)
		if (idx >= 0) this.goals.splice(idx, 1)
	}

	setWorldState(key: string, value: boolean | number | string) {
		this.ctx.worldState.set(key, value)
	}

	setEntityState(key: string, value: boolean | number | string) {
		this.ctx.entityState.set(key, value)
	}

	setBlackboard(key: string, value: any) {
		this.ctx.blackboard.set(key, value)
	}

	getCurrentState(): WorldState {
		const combined = new Map<string, boolean | number | string>()
		for (const [k, v] of this.ctx.worldState) combined.set(k, v)
		for (const [k, v] of this.ctx.entityState) combined.set(k, v)
		return combined
	}

	async upd(now: number): Promise<void> {
		if (now - this.lastReplanTime >= this.replanInterval || this.currentPlan.length === 0) {
			this.replan()
			this.lastReplanTime = now
		}
		if (this.currentPlan.length > 0 && !this.isExecuting) {
			await this.executeCurrentAction()
		}
	}

	private replan() {
		const currentState = this.getCurrentState()
		for (const goal of this.goals) {
			if (goal.isValid && !goal.isValid(this.entityId, this.ctx)) continue
			const plan = this.planner.plan(this.entityId, currentState, goal, this.ctx)
			if (plan && plan.length > 0) {
				this.currentPlan = plan
				this.currentActionIdx = 0
				return
			}
		}
		this.currentPlan = []
		this.currentActionIdx = 0
	}

	private async executeCurrentAction(): Promise<void> {
		if (this.currentActionIdx >= this.currentPlan.length) {
			this.currentPlan = []
			this.currentActionIdx = 0
			return
		}
		const action = this.currentPlan[this.currentActionIdx]
		this.isExecuting = true
		try {
			const success = await action.execute(this.entityId, this.ctx)
			if (success) {
				for (const [key, value] of action.effects) {
					this.ctx.entityState.set(key, value)
				}
				this.currentActionIdx++
			} else {
				this.currentPlan = []
				this.currentActionIdx = 0
			}
		} catch (e) {
			this.currentPlan = []
			this.currentActionIdx = 0
		}
		this.isExecuting = false
	}

	getCurrentAction(): GoapAction | null {
		if (this.currentActionIdx < this.currentPlan.length) {
			return this.currentPlan[this.currentActionIdx]
		}
		return null
	}

	getPlan(): GoapAction[] {
		return [...this.currentPlan]
	}

	cancelPlan() {
		this.currentPlan = []
		this.currentActionIdx = 0
		this.isExecuting = false
	}
}

export function createCombatActions(): GoapAction[] {
	return [
		{
			name: 'attack',
			cost: 1,
			preconditions: new Map([['hasTarget', true], ['inRange', true], ['hasWeapon', true]]),
			effects: new Map([['targetDead', true]]),
			execute: async () => true
		},
		{
			name: 'moveToTarget',
			cost: 2,
			preconditions: new Map([['hasTarget', true]]),
			effects: new Map([['inRange', true]]),
			execute: async () => true
		},
		{
			name: 'findTarget',
			cost: 3,
			preconditions: new Map(),
			effects: new Map([['hasTarget', true]]),
			execute: async () => true
		},
		{
			name: 'equipWeapon',
			cost: 1,
			preconditions: new Map([['hasWeaponInInventory', true]]),
			effects: new Map([['hasWeapon', true]]),
			execute: async () => true
		},
		{
			name: 'heal',
			cost: 2,
			preconditions: new Map([['hasPotion', true], ['lowHealth', true]]),
			effects: new Map([['lowHealth', false]]),
			execute: async () => true
		},
		{
			name: 'flee',
			cost: 5,
			preconditions: new Map([['lowHealth', true]]),
			effects: new Map([['isSafe', true]]),
			execute: async () => true
		}
	]
}
