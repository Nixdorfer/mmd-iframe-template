import type { Vec3, EntityId } from '@engine/common'

export interface FractureCfg {
	minFragments: number
	maxFragments: number
	noiseScale: number
	noiseAmplitude: number
	impactThreshold: number
	fragmentMassRatio: number
	debrisLifetime: number
	maxDebris: number
}

export const DEFAULT_FRACTURE_CFG: FractureCfg = {
	minFragments: 3,
	maxFragments: 12,
	noiseScale: 1.0,
	noiseAmplitude: 0.2,
	impactThreshold: 100,
	fragmentMassRatio: 0.1,
	debrisLifetime: 10,
	maxDebris: 100
}

export interface Fragment {
	id: string
	entityId: EntityId
	verts: Float32Array
	indices: Uint16Array
	center: Vec3
	mass: number
	vel: Vec3
	angVel: Vec3
	lifetime: number
}

export interface DestructibleDef {
	id: string
	entityId: EntityId
	health: number
	maxHealth: number
	armor: number
	fractureCfg: FractureCfg
	onDestroy?: (fragments: Fragment[]) => void
}

export interface VoronoiCell {
	site: Vec3
	verts: Vec3[]
	faces: number[][]
}

export class VoronoiFracture {
	cfg: FractureCfg

	constructor(cfg: Partial<FractureCfg> = {}) {
		this.cfg = { ...DEFAULT_FRACTURE_CFG, ...cfg }
	}

	generateSites(bounds: { min: Vec3, max: Vec3 }, count: number, impactPoint?: Vec3): Vec3[] {
		const sites: Vec3[] = []
		const { min, max } = bounds
		const dx = max.x - min.x
		const dy = max.y - min.y
		const dz = max.z - min.z
		for (let i = 0; i < count; i++) {
			let x = min.x + Math.random() * dx
			let y = min.y + Math.random() * dy
			let z = min.z + Math.random() * dz
			if (impactPoint && i < count / 3) {
				const r = Math.random() * 0.3
				x = impactPoint.x + (Math.random() - 0.5) * dx * r
				y = impactPoint.y + (Math.random() - 0.5) * dy * r
				z = impactPoint.z + (Math.random() - 0.5) * dz * r
				x = Math.max(min.x, Math.min(max.x, x))
				y = Math.max(min.y, Math.min(max.y, y))
				z = Math.max(min.z, Math.min(max.z, z))
			}
			sites.push({ x, y, z })
		}
		return sites
	}

	fracture(verts: Float32Array, indices: Uint16Array, sites: Vec3[]): VoronoiCell[] {
		const cells: VoronoiCell[] = []
		const bounds = this.calBounds(verts)
		for (const site of sites) {
			const cell = this.createCell(site, sites, bounds, verts, indices)
			if (cell.verts.length >= 4) {
				cells.push(cell)
			}
		}
		return cells
	}

	private createCell(site: Vec3, allSites: Vec3[], bounds: { min: Vec3, max: Vec3 }, _verts: Float32Array, _indices: Uint16Array): VoronoiCell {
		const cellVerts: Vec3[] = []
		const subdivisions = 8
		const { min, max } = bounds
		for (let i = 0; i <= subdivisions; i++) {
			for (let j = 0; j <= subdivisions; j++) {
				for (let k = 0; k <= subdivisions; k++) {
					const x = min.x + (max.x - min.x) * i / subdivisions
					const y = min.y + (max.y - min.y) * j / subdivisions
					const z = min.z + (max.z - min.z) * k / subdivisions
					const point = { x, y, z }
					if (this.isClosestToSite(point, site, allSites)) {
						cellVerts.push(point)
					}
				}
			}
		}
		const faces = this.buildConvexFaces(cellVerts)
		return { site, verts: cellVerts, faces }
	}

	private isClosestToSite(point: Vec3, site: Vec3, allSites: Vec3[]): boolean {
		const distToSite = this.distSq(point, site)
		for (const other of allSites) {
			if (other === site) continue
			if (this.distSq(point, other) < distToSite) {
				return false
			}
		}
		return true
	}

	private distSq(a: Vec3, b: Vec3): number {
		const dx = a.x - b.x
		const dy = a.y - b.y
		const dz = a.z - b.z
		return dx * dx + dy * dy + dz * dz
	}

	private buildConvexFaces(verts: Vec3[]): number[][] {
		if (verts.length < 4) return []
		const faces: number[][] = []
		const center = this.calCenter(verts)
		for (let i = 0; i < verts.length - 2; i++) {
			for (let j = i + 1; j < verts.length - 1; j++) {
				for (let k = j + 1; k < verts.length; k++) {
					const normal = this.calFaceNormal(verts[i], verts[j], verts[k])
					const toCenter = {
						x: center.x - verts[i].x,
						y: center.y - verts[i].y,
						z: center.z - verts[i].z
					}
					const dot = normal.x * toCenter.x + normal.y * toCenter.y + normal.z * toCenter.z
					if (Math.abs(dot) > 0.01) {
						if (dot > 0) {
							faces.push([i, j, k])
						} else {
							faces.push([i, k, j])
						}
					}
				}
			}
		}
		return faces.slice(0, 12)
	}

	private calFaceNormal(a: Vec3, b: Vec3, c: Vec3): Vec3 {
		const ab = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z }
		const ac = { x: c.x - a.x, y: c.y - a.y, z: c.z - a.z }
		const n = {
			x: ab.y * ac.z - ab.z * ac.y,
			y: ab.z * ac.x - ab.x * ac.z,
			z: ab.x * ac.y - ab.y * ac.x
		}
		const len = Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z)
		if (len > 0.0001) {
			n.x /= len
			n.y /= len
			n.z /= len
		}
		return n
	}

	private calCenter(verts: Vec3[]): Vec3 {
		const center = { x: 0, y: 0, z: 0 }
		for (const v of verts) {
			center.x += v.x
			center.y += v.y
			center.z += v.z
		}
		center.x /= verts.length
		center.y /= verts.length
		center.z /= verts.length
		return center
	}

	private calBounds(verts: Float32Array): { min: Vec3, max: Vec3 } {
		const min = { x: Infinity, y: Infinity, z: Infinity }
		const max = { x: -Infinity, y: -Infinity, z: -Infinity }
		for (let i = 0; i < verts.length; i += 3) {
			min.x = Math.min(min.x, verts[i])
			min.y = Math.min(min.y, verts[i + 1])
			min.z = Math.min(min.z, verts[i + 2])
			max.x = Math.max(max.x, verts[i])
			max.y = Math.max(max.y, verts[i + 1])
			max.z = Math.max(max.z, verts[i + 2])
		}
		return { min, max }
	}

	cellToMesh(cell: VoronoiCell): { verts: Float32Array, indices: Uint16Array } {
		const verts = new Float32Array(cell.verts.length * 3)
		for (let i = 0; i < cell.verts.length; i++) {
			verts[i * 3] = cell.verts[i].x
			verts[i * 3 + 1] = cell.verts[i].y
			verts[i * 3 + 2] = cell.verts[i].z
		}
		const indexList: number[] = []
		for (const face of cell.faces) {
			if (face.length >= 3) {
				for (let i = 1; i < face.length - 1; i++) {
					indexList.push(face[0], face[i], face[i + 1])
				}
			}
		}
		return { verts, indices: new Uint16Array(indexList) }
	}
}

export class DestructionSystem {
	destructibles: Map<EntityId, DestructibleDef>
	fragments: Map<string, Fragment>
	fracture: VoronoiFracture
	nextFragmentId: number

	constructor() {
		this.destructibles = new Map()
		this.fragments = new Map()
		this.fracture = new VoronoiFracture()
		this.nextFragmentId = 0
	}

	register(entityId: EntityId, health: number, armor: number = 0, cfg: Partial<FractureCfg> = {}): DestructibleDef {
		const def: DestructibleDef = {
			id: `dest_${entityId}`,
			entityId,
			health,
			maxHealth: health,
			armor,
			fractureCfg: { ...DEFAULT_FRACTURE_CFG, ...cfg }
		}
		this.destructibles.set(entityId, def)
		return def
	}

	unregister(entityId: EntityId) {
		this.destructibles.delete(entityId)
	}

	damage(entityId: EntityId, amount: number, impactPoint?: Vec3, impactDir?: Vec3): boolean {
		const def = this.destructibles.get(entityId)
		if (!def) return false
		const effectiveDamage = Math.max(0, amount - def.armor)
		def.health -= effectiveDamage
		if (def.health <= 0) {
			this.destroy(entityId, impactPoint, impactDir)
			return true
		}
		return false
	}

	destroy(entityId: EntityId, impactPoint?: Vec3, impactDir?: Vec3) {
		const def = this.destructibles.get(entityId)
		if (!def) return
		const fragmentCount = Math.floor(
			def.fractureCfg.minFragments +
			Math.random() * (def.fractureCfg.maxFragments - def.fractureCfg.minFragments)
		)
		const fragments = this.createFragments(def, fragmentCount, impactPoint, impactDir)
		if (def.onDestroy) {
			def.onDestroy(fragments)
		}
		this.destructibles.delete(entityId)
	}

	private createFragments(def: DestructibleDef, count: number, impactPoint?: Vec3, impactDir?: Vec3): Fragment[] {
		const fragments: Fragment[] = []
		const baseMass = 1.0 * def.fractureCfg.fragmentMassRatio
		for (let i = 0; i < count; i++) {
			const id = `frag_${this.nextFragmentId++}`
			const angle = (Math.PI * 2 * i) / count
			const radius = 0.5 + Math.random() * 0.5
			const center: Vec3 = {
				x: Math.cos(angle) * radius,
				y: Math.sin(angle) * radius,
				z: (Math.random() - 0.5) * radius
			}
			const vel: Vec3 = { x: 0, y: 0, z: 0 }
			if (impactDir) {
				const spread = 0.5
				vel.x = impactDir.x * 5 + (Math.random() - 0.5) * spread
				vel.y = impactDir.y * 5 + (Math.random() - 0.5) * spread
				vel.z = impactDir.z * 5 + Math.random() * 2
			} else {
				vel.x = (Math.random() - 0.5) * 3
				vel.y = (Math.random() - 0.5) * 3
				vel.z = Math.random() * 5
			}
			const fragment: Fragment = {
				id,
				entityId: (this.nextFragmentId + 10000) as EntityId,
				verts: new Float32Array(0),
				indices: new Uint16Array(0),
				center,
				mass: baseMass + Math.random() * baseMass,
				vel,
				angVel: {
					x: (Math.random() - 0.5) * 10,
					y: (Math.random() - 0.5) * 10,
					z: (Math.random() - 0.5) * 10
				},
				lifetime: def.fractureCfg.debrisLifetime
			}
			fragments.push(fragment)
			this.fragments.set(id, fragment)
		}
		while (this.fragments.size > def.fractureCfg.maxDebris) {
			const oldest = this.fragments.keys().next().value
			if (oldest) this.fragments.delete(oldest)
		}
		return fragments
	}

	upd(dt: number) {
		const toRemove: string[] = []
		for (const [id, frag] of this.fragments) {
			frag.lifetime -= dt
			if (frag.lifetime <= 0) {
				toRemove.push(id)
				continue
			}
			frag.vel.z -= 9.81 * dt
			frag.center.x += frag.vel.x * dt
			frag.center.y += frag.vel.y * dt
			frag.center.z += frag.vel.z * dt
			if (frag.center.z < 0) {
				frag.center.z = 0
				frag.vel.z *= -0.3
				frag.vel.x *= 0.8
				frag.vel.y *= 0.8
				frag.angVel.x *= 0.5
				frag.angVel.y *= 0.5
				frag.angVel.z *= 0.5
			}
		}
		for (const id of toRemove) {
			this.fragments.delete(id)
		}
	}

	getDestructible(entityId: EntityId): DestructibleDef | null {
		return this.destructibles.get(entityId) ?? null
	}

	getFragments(): Fragment[] {
		return Array.from(this.fragments.values())
	}

	clr() {
		this.destructibles.clear()
		this.fragments.clear()
	}
}

export const globalDestruction = new DestructionSystem()
