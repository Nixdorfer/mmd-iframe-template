import type { Vec3, EntityId } from '@engine/common'

export interface AIEntityState {
	id: EntityId
	pos: Vec3
	hp: number
	maxHp: number
	alive: boolean
	aiState: 'idle' | 'wander' | 'chase' | 'attack' | 'flee' | 'return'
	target: EntityId | null
	homePos: Vec3
	wanderRadius: number
	aggroRadius: number
	leashRadius: number
	faction: string
}

export interface AITarget {
	id: EntityId
	pos: Vec3
	hp: number
	alive: boolean
	faction: string
}

export interface AIDecision {
	id: EntityId
	action: 'idle' | 'wander' | 'moveTo' | 'attack' | 'flee'
	targetId?: EntityId
	targetPos?: Vec3
	newState?: string
}

interface WorkerMsg {
	typ: 'init' | 'upd' | 'addEnt' | 'removeEnt' | 'setFactionRelation'
	data: any
}

interface WorkerRes {
	typ: 'decisions'
	data: { decisions: AIDecision[] }
}

let entities: Map<EntityId, AIEntityState> = new Map()
let targets: Map<EntityId, AITarget> = new Map()
let factionRelations: Map<string, Map<string, 'ally' | 'neutral' | 'enemy'>> = new Map()

function dist(a: Vec3, b: Vec3): number {
	const dx = b.x - a.x
	const dy = b.y - a.y
	const dz = b.z - a.z
	return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

function vecSub(a: Vec3, b: Vec3): Vec3 {
	return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }
}

function vecNorm(v: Vec3): Vec3 {
	const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z)
	if (len < 0.0001) return { x: 0, y: 0, z: 0 }
	return { x: v.x / len, y: v.y / len, z: v.z / len }
}

function vecMul(v: Vec3, s: number): Vec3 {
	return { x: v.x * s, y: v.y * s, z: v.z * s }
}

function vecAdd(a: Vec3, b: Vec3): Vec3 {
	return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }
}

function randomInCircle(center: Vec3, radius: number): Vec3 {
	const angle = Math.random() * Math.PI * 2
	const r = Math.sqrt(Math.random()) * radius
	return {
		x: center.x + Math.cos(angle) * r,
		y: center.y + Math.sin(angle) * r,
		z: center.z
	}
}

function isEnemy(faction1: string, faction2: string): boolean {
	if (faction1 === faction2) return false
	const rel = factionRelations.get(faction1)?.get(faction2)
	return rel === 'enemy'
}

function findNearestEnemy(ent: AIEntityState): AITarget | null {
	let nearest: AITarget | null = null
	let nearestDist = Infinity
	for (const tgt of targets.values()) {
		if (!tgt.alive) continue
		if (!isEnemy(ent.faction, tgt.faction)) continue
		const d = dist(ent.pos, tgt.pos)
		if (d < nearestDist && d <= ent.aggroRadius) {
			nearest = tgt
			nearestDist = d
		}
	}
	return nearest
}

function calDecision(ent: AIEntityState, dt: number): AIDecision {
	const decision: AIDecision = { id: ent.id, action: 'idle' }
	if (!ent.alive) return decision
	const distToHome = dist(ent.pos, ent.homePos)
	if (distToHome > ent.leashRadius) {
		decision.action = 'moveTo'
		decision.targetPos = ent.homePos
		decision.newState = 'return'
		return decision
	}
	const enemy = findNearestEnemy(ent)
	if (enemy) {
		const d = dist(ent.pos, enemy.pos)
		if (ent.hp / ent.maxHp < 0.2) {
			const fleeDir = vecNorm(vecSub(ent.pos, enemy.pos))
			decision.action = 'flee'
			decision.targetPos = vecAdd(ent.pos, vecMul(fleeDir, 10))
			decision.newState = 'flee'
			return decision
		}
		if (d <= 2) {
			decision.action = 'attack'
			decision.targetId = enemy.id
			decision.newState = 'attack'
			return decision
		}
		decision.action = 'moveTo'
		decision.targetPos = enemy.pos
		decision.targetId = enemy.id
		decision.newState = 'chase'
		return decision
	}
	if (ent.aiState === 'return' && distToHome <= 1) {
		decision.action = 'idle'
		decision.newState = 'idle'
		return decision
	}
	if (ent.aiState === 'idle' && Math.random() < 0.01) {
		decision.action = 'moveTo'
		decision.targetPos = randomInCircle(ent.homePos, ent.wanderRadius)
		decision.newState = 'wander'
		return decision
	}
	return decision
}

self.onmessage = (e: MessageEvent<WorkerMsg>) => {
	const { typ, data } = e.data
	switch (typ) {
		case 'init':
			entities.clear()
			targets.clear()
			factionRelations.clear()
			break
		case 'upd':
			for (const ent of data.entities as AIEntityState[]) {
				entities.set(ent.id, ent)
			}
			for (const tgt of data.targets as AITarget[]) {
				targets.set(tgt.id, tgt)
			}
			const decisions: AIDecision[] = []
			for (const ent of entities.values()) {
				decisions.push(calDecision(ent, data.dt))
			}
			self.postMessage({ typ: 'decisions', data: { decisions } } as WorkerRes)
			break
		case 'addEnt':
			entities.set(data.ent.id, data.ent)
			break
		case 'removeEnt':
			entities.delete(data.id)
			targets.delete(data.id)
			break
		case 'setFactionRelation':
			if (!factionRelations.has(data.faction1)) {
				factionRelations.set(data.faction1, new Map())
			}
			factionRelations.get(data.faction1)!.set(data.faction2, data.relation)
			if (!factionRelations.has(data.faction2)) {
				factionRelations.set(data.faction2, new Map())
			}
			factionRelations.get(data.faction2)!.set(data.faction1, data.relation)
			break
	}
}
