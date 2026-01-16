import type { Vec3, EntityId } from '@engine/common'

export enum NodeStatus {
	Suc = 'suc',
	Fal = 'fal',
	Run = 'run'
}

export interface BTContext {
	entId: EntityId
	blackboard: Map<string, any>
	dt: number
	getPos: () => Vec3 | null
	getTarget: () => EntityId | null
	getTargetPos: () => Vec3 | null
	moveTo: (pos: Vec3) => void
	attack: (targetId: EntityId) => void
	flee: (dir: Vec3) => void
	idle: () => void
}

export interface BTNode {
	typ: string
	tick(ctx: BTContext): NodeStatus
	reset(): void
}

export class BTSelector implements BTNode {
	typ = 'selector'
	children: BTNode[]
	curIdx: number

	constructor(children: BTNode[]) {
		this.children = children
		this.curIdx = 0
	}

	tick(ctx: BTContext): NodeStatus {
		for (let i = this.curIdx; i < this.children.length; i++) {
			const status = this.children[i].tick(ctx)
			if (status === NodeStatus.Run) {
				this.curIdx = i
				return NodeStatus.Run
			}
			if (status === NodeStatus.Suc) {
				this.curIdx = 0
				return NodeStatus.Suc
			}
		}
		this.curIdx = 0
		return NodeStatus.Fal
	}

	reset(): void {
		this.curIdx = 0
		for (const child of this.children) {
			child.reset()
		}
	}
}

export class BTSequence implements BTNode {
	typ = 'sequence'
	children: BTNode[]
	curIdx: number

	constructor(children: BTNode[]) {
		this.children = children
		this.curIdx = 0
	}

	tick(ctx: BTContext): NodeStatus {
		for (let i = this.curIdx; i < this.children.length; i++) {
			const status = this.children[i].tick(ctx)
			if (status === NodeStatus.Run) {
				this.curIdx = i
				return NodeStatus.Run
			}
			if (status === NodeStatus.Fal) {
				this.curIdx = 0
				return NodeStatus.Fal
			}
		}
		this.curIdx = 0
		return NodeStatus.Suc
	}

	reset(): void {
		this.curIdx = 0
		for (const child of this.children) {
			child.reset()
		}
	}
}

export class BTParallel implements BTNode {
	typ = 'parallel'
	children: BTNode[]
	sucThreshold: number

	constructor(children: BTNode[], sucThreshold: number = -1) {
		this.children = children
		this.sucThreshold = sucThreshold < 0 ? children.length : sucThreshold
	}

	tick(ctx: BTContext): NodeStatus {
		let sucCnt = 0
		let falCnt = 0
		for (const child of this.children) {
			const status = child.tick(ctx)
			if (status === NodeStatus.Suc) sucCnt++
			if (status === NodeStatus.Fal) falCnt++
		}
		if (sucCnt >= this.sucThreshold) return NodeStatus.Suc
		if (falCnt > this.children.length - this.sucThreshold) return NodeStatus.Fal
		return NodeStatus.Run
	}

	reset(): void {
		for (const child of this.children) {
			child.reset()
		}
	}
}

export class BTInverter implements BTNode {
	typ = 'inverter'
	child: BTNode

	constructor(child: BTNode) {
		this.child = child
	}

	tick(ctx: BTContext): NodeStatus {
		const status = this.child.tick(ctx)
		if (status === NodeStatus.Suc) return NodeStatus.Fal
		if (status === NodeStatus.Fal) return NodeStatus.Suc
		return NodeStatus.Run
	}

	reset(): void {
		this.child.reset()
	}
}

export class BTRepeater implements BTNode {
	typ = 'repeater'
	child: BTNode
	maxRepeats: number
	curRepeats: number

	constructor(child: BTNode, maxRepeats: number = -1) {
		this.child = child
		this.maxRepeats = maxRepeats
		this.curRepeats = 0
	}

	tick(ctx: BTContext): NodeStatus {
		if (this.maxRepeats >= 0 && this.curRepeats >= this.maxRepeats) {
			return NodeStatus.Suc
		}
		const status = this.child.tick(ctx)
		if (status === NodeStatus.Run) return NodeStatus.Run
		this.curRepeats++
		this.child.reset()
		if (this.maxRepeats < 0) return NodeStatus.Run
		if (this.curRepeats >= this.maxRepeats) return NodeStatus.Suc
		return NodeStatus.Run
	}

	reset(): void {
		this.curRepeats = 0
		this.child.reset()
	}
}

export class BTSucceeder implements BTNode {
	typ = 'succeeder'
	child: BTNode

	constructor(child: BTNode) {
		this.child = child
	}

	tick(ctx: BTContext): NodeStatus {
		this.child.tick(ctx)
		return NodeStatus.Suc
	}

	reset(): void {
		this.child.reset()
	}
}

export class BTCooldown implements BTNode {
	typ = 'cooldown'
	child: BTNode
	cooldown: number
	lastRun: number

	constructor(child: BTNode, cooldown: number) {
		this.child = child
		this.cooldown = cooldown
		this.lastRun = -Infinity
	}

	tick(ctx: BTContext): NodeStatus {
		const now = Date.now() / 1000
		if (now - this.lastRun < this.cooldown) {
			return NodeStatus.Fal
		}
		const status = this.child.tick(ctx)
		if (status !== NodeStatus.Run) {
			this.lastRun = now
		}
		return status
	}

	reset(): void {
		this.child.reset()
	}
}

export class BTCondition implements BTNode {
	typ = 'condition'
	check: (ctx: BTContext) => boolean

	constructor(check: (ctx: BTContext) => boolean) {
		this.check = check
	}

	tick(ctx: BTContext): NodeStatus {
		return this.check(ctx) ? NodeStatus.Suc : NodeStatus.Fal
	}

	reset(): void {}
}

export class BTAction implements BTNode {
	typ = 'action'
	action: (ctx: BTContext) => NodeStatus

	constructor(action: (ctx: BTContext) => NodeStatus) {
		this.action = action
	}

	tick(ctx: BTContext): NodeStatus {
		return this.action(ctx)
	}

	reset(): void {}
}

export class BTWait implements BTNode {
	typ = 'wait'
	duration: number
	elapsed: number

	constructor(duration: number) {
		this.duration = duration
		this.elapsed = 0
	}

	tick(ctx: BTContext): NodeStatus {
		this.elapsed += ctx.dt
		if (this.elapsed >= this.duration) {
			return NodeStatus.Suc
		}
		ctx.idle()
		return NodeStatus.Run
	}

	reset(): void {
		this.elapsed = 0
	}
}

export class BTMoveTo implements BTNode {
	typ = 'moveTo'
	targetKey: string
	arrivalDist: number
	timeout: number
	elapsed: number

	constructor(targetKey: string = 'moveTarget', arrivalDist: number = 1, timeout: number = 30) {
		this.targetKey = targetKey
		this.arrivalDist = arrivalDist
		this.timeout = timeout
		this.elapsed = 0
	}

	tick(ctx: BTContext): NodeStatus {
		this.elapsed += ctx.dt
		if (this.elapsed > this.timeout) {
			return NodeStatus.Fal
		}
		const target = ctx.blackboard.get(this.targetKey) as Vec3 | undefined
		if (!target) return NodeStatus.Fal
		const pos = ctx.getPos()
		if (!pos) return NodeStatus.Fal
		const dx = target.x - pos.x
		const dy = target.y - pos.y
		const dz = target.z - pos.z
		const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
		if (dist <= this.arrivalDist) {
			return NodeStatus.Suc
		}
		ctx.moveTo(target)
		return NodeStatus.Run
	}

	reset(): void {
		this.elapsed = 0
	}
}

export class BTChase implements BTNode {
	typ = 'chase'
	arrivalDist: number
	maxDist: number

	constructor(arrivalDist: number = 2, maxDist: number = 50) {
		this.arrivalDist = arrivalDist
		this.maxDist = maxDist
	}

	tick(ctx: BTContext): NodeStatus {
		const targetPos = ctx.getTargetPos()
		if (!targetPos) return NodeStatus.Fal
		const pos = ctx.getPos()
		if (!pos) return NodeStatus.Fal
		const dx = targetPos.x - pos.x
		const dy = targetPos.y - pos.y
		const dz = targetPos.z - pos.z
		const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
		if (dist > this.maxDist) {
			return NodeStatus.Fal
		}
		if (dist <= this.arrivalDist) {
			return NodeStatus.Suc
		}
		ctx.moveTo(targetPos)
		return NodeStatus.Run
	}

	reset(): void {}
}

export class BTAttack implements BTNode {
	typ = 'attack'
	range: number

	constructor(range: number = 2) {
		this.range = range
	}

	tick(ctx: BTContext): NodeStatus {
		const target = ctx.getTarget()
		if (!target) return NodeStatus.Fal
		const targetPos = ctx.getTargetPos()
		const pos = ctx.getPos()
		if (!pos || !targetPos) return NodeStatus.Fal
		const dx = targetPos.x - pos.x
		const dy = targetPos.y - pos.y
		const dz = targetPos.z - pos.z
		const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
		if (dist > this.range) {
			return NodeStatus.Fal
		}
		ctx.attack(target)
		return NodeStatus.Suc
	}

	reset(): void {}
}

export class BTFlee implements BTNode {
	typ = 'flee'
	fleeDist: number
	fleeTime: number
	elapsed: number

	constructor(fleeDist: number = 20, fleeTime: number = 5) {
		this.fleeDist = fleeDist
		this.fleeTime = fleeTime
		this.elapsed = 0
	}

	tick(ctx: BTContext): NodeStatus {
		this.elapsed += ctx.dt
		if (this.elapsed >= this.fleeTime) {
			return NodeStatus.Suc
		}
		const targetPos = ctx.getTargetPos()
		const pos = ctx.getPos()
		if (!pos) return NodeStatus.Fal
		if (!targetPos) {
			return NodeStatus.Suc
		}
		const dx = pos.x - targetPos.x
		const dy = pos.y - targetPos.y
		const dz = pos.z - targetPos.z
		const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
		if (dist >= this.fleeDist) {
			return NodeStatus.Suc
		}
		const len = dist > 0.001 ? dist : 1
		ctx.flee({ x: dx / len, y: dy / len, z: dz / len })
		return NodeStatus.Run
	}

	reset(): void {
		this.elapsed = 0
	}
}

export class BTPatrol implements BTNode {
	typ = 'patrol'
	points: Vec3[]
	curIdx: number
	arrivalDist: number
	waitTime: number
	curWait: number
	loop: boolean

	constructor(points: Vec3[], arrivalDist: number = 1, waitTime: number = 2, loop: boolean = true) {
		this.points = points
		this.curIdx = 0
		this.arrivalDist = arrivalDist
		this.waitTime = waitTime
		this.curWait = 0
		this.loop = loop
	}

	tick(ctx: BTContext): NodeStatus {
		if (this.points.length === 0) return NodeStatus.Fal
		if (this.curIdx >= this.points.length) {
			if (this.loop) {
				this.curIdx = 0
			} else {
				return NodeStatus.Suc
			}
		}
		const target = this.points[this.curIdx]
		const pos = ctx.getPos()
		if (!pos) return NodeStatus.Fal
		const dx = target.x - pos.x
		const dy = target.y - pos.y
		const dz = target.z - pos.z
		const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
		if (dist <= this.arrivalDist) {
			this.curWait += ctx.dt
			if (this.curWait >= this.waitTime) {
				this.curWait = 0
				this.curIdx++
			}
			ctx.idle()
			return NodeStatus.Run
		}
		ctx.moveTo(target)
		return NodeStatus.Run
	}

	reset(): void {
		this.curIdx = 0
		this.curWait = 0
	}
}

export class BTIdle implements BTNode {
	typ = 'idle'

	tick(ctx: BTContext): NodeStatus {
		ctx.idle()
		return NodeStatus.Suc
	}

	reset(): void {}
}

export class BTTree {
	root: BTNode
	id: string

	constructor(id: string, root: BTNode) {
		this.id = id
		this.root = root
	}

	tick(ctx: BTContext): NodeStatus {
		return this.root.tick(ctx)
	}

	reset(): void {
		this.root.reset()
	}
}

export class BTBuilder {
	static selector(...children: BTNode[]): BTSelector {
		return new BTSelector(children)
	}

	static sequence(...children: BTNode[]): BTSequence {
		return new BTSequence(children)
	}

	static parallel(sucThreshold: number, ...children: BTNode[]): BTParallel {
		return new BTParallel(children, sucThreshold)
	}

	static invert(child: BTNode): BTInverter {
		return new BTInverter(child)
	}

	static repeat(child: BTNode, times: number = -1): BTRepeater {
		return new BTRepeater(child, times)
	}

	static succeed(child: BTNode): BTSucceeder {
		return new BTSucceeder(child)
	}

	static cooldown(child: BTNode, cd: number): BTCooldown {
		return new BTCooldown(child, cd)
	}

	static condition(check: (ctx: BTContext) => boolean): BTCondition {
		return new BTCondition(check)
	}

	static action(action: (ctx: BTContext) => NodeStatus): BTAction {
		return new BTAction(action)
	}

	static wait(duration: number): BTWait {
		return new BTWait(duration)
	}

	static moveTo(targetKey: string = 'moveTarget', arrivalDist: number = 1): BTMoveTo {
		return new BTMoveTo(targetKey, arrivalDist)
	}

	static chase(arrivalDist: number = 2, maxDist: number = 50): BTChase {
		return new BTChase(arrivalDist, maxDist)
	}

	static attack(range: number = 2): BTAttack {
		return new BTAttack(range)
	}

	static flee(dist: number = 20, time: number = 5): BTFlee {
		return new BTFlee(dist, time)
	}

	static patrol(points: Vec3[], arrivalDist: number = 1, waitTime: number = 2): BTPatrol {
		return new BTPatrol(points, arrivalDist, waitTime)
	}

	static idle(): BTIdle {
		return new BTIdle()
	}

	static tree(id: string, root: BTNode): BTTree {
		return new BTTree(id, root)
	}
}

export const BTPresets = {
	aggressive: (attackRange: number = 2, chaseRange: number = 30): BTTree => {
		return BTBuilder.tree('aggressive', BTBuilder.selector(
			BTBuilder.sequence(
				BTBuilder.condition(ctx => ctx.getTarget() !== null),
				BTBuilder.selector(
					BTBuilder.sequence(
						BTBuilder.chase(attackRange, chaseRange),
						BTBuilder.attack(attackRange)
					),
					BTBuilder.chase(attackRange, chaseRange)
				)
			),
			BTBuilder.sequence(
				BTBuilder.wait(2 + Math.random() * 3),
				BTBuilder.action(ctx => {
					const pos = ctx.getPos()
					if (pos) {
						const angle = Math.random() * Math.PI * 2
						const dist = 3 + Math.random() * 5
						ctx.blackboard.set('moveTarget', {
							x: pos.x + Math.cos(angle) * dist,
							y: pos.y,
							z: pos.z + Math.sin(angle) * dist
						})
					}
					return NodeStatus.Suc
				}),
				BTBuilder.moveTo('moveTarget', 1)
			)
		))
	},

	defensive: (fleeThreshold: number = 0.3, attackRange: number = 2): BTTree => {
		return BTBuilder.tree('defensive', BTBuilder.selector(
			BTBuilder.sequence(
				BTBuilder.condition(ctx => {
					const hp = ctx.blackboard.get('hpRatio') as number | undefined
					return hp !== undefined && hp < fleeThreshold
				}),
				BTBuilder.flee(25, 8)
			),
			BTBuilder.sequence(
				BTBuilder.condition(ctx => ctx.getTarget() !== null),
				BTBuilder.chase(attackRange, 15),
				BTBuilder.attack(attackRange)
			),
			BTBuilder.idle()
		))
	},

	patroller: (points: Vec3[], waitTime: number = 3): BTTree => {
		return BTBuilder.tree('patroller', BTBuilder.selector(
			BTBuilder.sequence(
				BTBuilder.condition(ctx => ctx.getTarget() !== null),
				BTBuilder.chase(2, 20),
				BTBuilder.attack(2)
			),
			BTBuilder.patrol(points, 1, waitTime)
		))
	},

	passive: (): BTTree => {
		return BTBuilder.tree('passive', BTBuilder.selector(
			BTBuilder.sequence(
				BTBuilder.condition(ctx => ctx.getTarget() !== null),
				BTBuilder.flee(30, 10)
			),
			BTBuilder.sequence(
				BTBuilder.wait(3 + Math.random() * 4),
				BTBuilder.action(ctx => {
					const pos = ctx.getPos()
					if (pos) {
						const angle = Math.random() * Math.PI * 2
						const dist = 2 + Math.random() * 4
						ctx.blackboard.set('moveTarget', {
							x: pos.x + Math.cos(angle) * dist,
							y: pos.y,
							z: pos.z + Math.sin(angle) * dist
						})
					}
					return NodeStatus.Suc
				}),
				BTBuilder.moveTo('moveTarget', 0.5)
			)
		))
	}
}
