import { PlaneType, type PlaneEnv, type EntityId } from '@engine/common'

export interface PlaneDef {
	typ: PlaneType
	name: string
	env: PlaneEnv
	connections: Map<PlaneType, ConnectionType>
	spawnPoints: PlaneSpawnPoint[]
}

export enum ConnectionType {
	None = 0,
	OneWay = 1,
	TwoWay = 2,
	Restricted = 3
}

export interface PlaneSpawnPoint {
	id: string
	pos: { x: number; y: number; z: number }
	radius: number
}

export interface PlaneTransition {
	from: PlaneType
	to: PlaneType
	entId: EntityId
	time: number
}

export class PlaneLayer {
	planes: Map<PlaneType, PlaneDef>
	cur: PlaneType
	transitions: PlaneTransition[]
	entPlanes: Map<EntityId, PlaneType>

	constructor() {
		this.planes = new Map()
		this.cur = PlaneType.Material
		this.transitions = []
		this.entPlanes = new Map()
		this.iniDefPlanes()
	}

	private iniDefPlanes() {
		this.addPlane({
			typ: PlaneType.Material,
			name: '物质界',
			env: { gravity: 1.0, timeFlow: 1.0, mana: 1.0, tech: 1.0 },
			connections: new Map([
				[PlaneType.Ethereal, ConnectionType.TwoWay],
				[PlaneType.Shadow, ConnectionType.TwoWay],
				[PlaneType.Digital, ConnectionType.OneWay]
			]),
			spawnPoints: []
		})
		this.addPlane({
			typ: PlaneType.Ethereal,
			name: '灵界',
			env: { gravity: 0.5, timeFlow: 0.5, mana: 5.0, tech: 0.1 },
			connections: new Map([
				[PlaneType.Material, ConnectionType.TwoWay],
				[PlaneType.Astral, ConnectionType.TwoWay]
			]),
			spawnPoints: []
		})
		this.addPlane({
			typ: PlaneType.Astral,
			name: '星界',
			env: { gravity: 0.0, timeFlow: 0.1, mana: 10.0, tech: 0.0 },
			connections: new Map([
				[PlaneType.Ethereal, ConnectionType.TwoWay]
			]),
			spawnPoints: []
		})
		this.addPlane({
			typ: PlaneType.Shadow,
			name: '影界',
			env: { gravity: 0.8, timeFlow: 1.5, mana: 2.0, tech: 0.5 },
			connections: new Map([
				[PlaneType.Material, ConnectionType.TwoWay]
			]),
			spawnPoints: []
		})
		this.addPlane({
			typ: PlaneType.Digital,
			name: '赛博空间',
			env: { gravity: 0.0, timeFlow: 10.0, mana: 0.0, tech: 10.0 },
			connections: new Map([
				[PlaneType.Material, ConnectionType.TwoWay]
			]),
			spawnPoints: []
		})
		this.addPlane({
			typ: PlaneType.Dream,
			name: '梦境',
			env: { gravity: 0.3, timeFlow: 0.01, mana: 3.0, tech: 0.0 },
			connections: new Map([
				[PlaneType.Ethereal, ConnectionType.OneWay]
			]),
			spawnPoints: []
		})
		this.addPlane({
			typ: PlaneType.Void,
			name: '虚空',
			env: { gravity: 0.0, timeFlow: 0.0, mana: 0.0, tech: 0.0 },
			connections: new Map(),
			spawnPoints: []
		})
	}

	addPlane(plane: PlaneDef) {
		this.planes.set(plane.typ, plane)
	}

	getPlane(typ: PlaneType): PlaneDef | undefined {
		return this.planes.get(typ)
	}

	getCurPlane(): PlaneDef | undefined {
		return this.planes.get(this.cur)
	}

	setCurPlane(typ: PlaneType) {
		if (this.planes.has(typ)) {
			this.cur = typ
		}
	}

	getEnv(): PlaneEnv {
		return this.getCurPlane()?.env ?? { gravity: 1.0, timeFlow: 1.0, mana: 1.0, tech: 1.0 }
	}

	canTransit(from: PlaneType, to: PlaneType): boolean {
		const plane = this.planes.get(from)
		if (!plane) return false
		const conn = plane.connections.get(to)
		return conn === ConnectionType.TwoWay || conn === ConnectionType.OneWay
	}

	transit(entId: EntityId, to: PlaneType): boolean {
		const from = this.entPlanes.get(entId) ?? this.cur
		if (!this.canTransit(from, to)) return false
		this.transitions.push({ from, to, entId, time: Date.now() })
		this.entPlanes.set(entId, to)
		return true
	}

	getEntPlane(entId: EntityId): PlaneType {
		return this.entPlanes.get(entId) ?? this.cur
	}

	setEntPlane(entId: EntityId, plane: PlaneType) {
		this.entPlanes.set(entId, plane)
	}

	applyEnvMod(baseVal: number, envKey: keyof PlaneEnv): number {
		const env = this.getEnv()
		return baseVal * env[envKey]
	}
}
