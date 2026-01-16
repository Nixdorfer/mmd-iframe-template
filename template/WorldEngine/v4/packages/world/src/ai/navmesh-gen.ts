import type { Vec3 } from '@engine/common'

export interface NavMeshCfg {
	cellSize: number
	cellHeight: number
	agentHeight: number
	agentRadius: number
	agentMaxClimb: number
	agentMaxSlope: number
	regionMinSize: number
	regionMergeSize: number
	edgeMaxLen: number
	edgeMaxError: number
	vertsPerPoly: number
	detailSampleDist: number
	detailSampleMaxError: number
}

export const DEFAULT_NAVMESH_CFG: NavMeshCfg = {
	cellSize: 0.3,
	cellHeight: 0.2,
	agentHeight: 2.0,
	agentRadius: 0.6,
	agentMaxClimb: 0.9,
	agentMaxSlope: 45,
	regionMinSize: 8,
	regionMergeSize: 20,
	edgeMaxLen: 12,
	edgeMaxError: 1.3,
	vertsPerPoly: 6,
	detailSampleDist: 6,
	detailSampleMaxError: 1
}

export interface HeightField {
	width: number
	height: number
	minX: number
	minY: number
	minZ: number
	cellSize: number
	cellHeight: number
	spans: HeightSpan[][]
}

export interface HeightSpan {
	smin: number
	smax: number
	area: number
	next: HeightSpan | null
}

export interface CompactHeightField {
	width: number
	height: number
	spanCount: number
	walkableHeight: number
	walkableClimb: number
	cells: CompactCell[]
	spans: CompactSpan[]
	dist: number[]
	areas: number[]
	borderSize: number
}

export interface CompactCell {
	idx: number
	count: number
}

export interface CompactSpan {
	y: number
	reg: number
	con: number
	h: number
}

export interface ContourSet {
	contours: Contour[]
	minX: number
	minY: number
	minZ: number
	width: number
	height: number
	cellSize: number
	cellHeight: number
	borderSize: number
}

export interface Contour {
	verts: number[]
	nverts: number
	rverts: number[]
	nrverts: number
	reg: number
	area: number
}

export interface PolyMesh {
	verts: number[]
	polys: number[]
	regs: number[]
	areas: number[]
	nverts: number
	npolys: number
	nvp: number
	minX: number
	minY: number
	minZ: number
	cellSize: number
	cellHeight: number
	borderSize: number
}

export interface NavMeshTri {
	verts: [Vec3, Vec3, Vec3]
	neighbors: [number, number, number]
	center: Vec3
	area: number
}

export interface NavMesh {
	triangles: NavMeshTri[]
	verts: Vec3[]
	bounds: { min: Vec3, max: Vec3 }
}

export class NavMeshGenerator {
	cfg: NavMeshCfg

	constructor(cfg: Partial<NavMeshCfg> = {}) {
		this.cfg = { ...DEFAULT_NAVMESH_CFG, ...cfg }
	}

	generate(geometry: { verts: Float32Array, indices: Uint32Array }): NavMesh | null {
		const bounds = this.calBounds(geometry.verts)
		const hf = this.createHeightField(bounds)
		this.rasterizeTriangles(hf, geometry.verts, geometry.indices)
		this.filterLowHeightSpans(hf)
		this.filterLedgeSpans(hf)
		this.filterWalkableLowHeightSpans(hf)
		const chf = this.buildCompactHeightField(hf)
		if (!chf) return null
		this.erodeWalkableArea(chf)
		this.buildDistanceField(chf)
		this.buildRegions(chf)
		const cset = this.buildContours(chf)
		if (!cset) return null
		const pmesh = this.buildPolyMesh(cset)
		if (!pmesh) return null
		return this.createNavMesh(pmesh, bounds)
	}

	private calBounds(verts: Float32Array): { min: Vec3, max: Vec3 } {
		const min: Vec3 = { x: Infinity, y: Infinity, z: Infinity }
		const max: Vec3 = { x: -Infinity, y: -Infinity, z: -Infinity }
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

	private createHeightField(bounds: { min: Vec3, max: Vec3 }): HeightField {
		const width = Math.ceil((bounds.max.x - bounds.min.x) / this.cfg.cellSize)
		const height = Math.ceil((bounds.max.y - bounds.min.y) / this.cfg.cellSize)
		const spans: HeightSpan[][] = []
		for (let i = 0; i < width * height; i++) {
			spans.push([])
		}
		return {
			width,
			height,
			minX: bounds.min.x,
			minY: bounds.min.y,
			minZ: bounds.min.z,
			cellSize: this.cfg.cellSize,
			cellHeight: this.cfg.cellHeight,
			spans
		}
	}

	private rasterizeTriangles(hf: HeightField, verts: Float32Array, indices: Uint32Array) {
		for (let i = 0; i < indices.length; i += 3) {
			const i0 = indices[i] * 3
			const i1 = indices[i + 1] * 3
			const i2 = indices[i + 2] * 3
			const v0: Vec3 = { x: verts[i0], y: verts[i0 + 1], z: verts[i0 + 2] }
			const v1: Vec3 = { x: verts[i1], y: verts[i1 + 1], z: verts[i1 + 2] }
			const v2: Vec3 = { x: verts[i2], y: verts[i2 + 1], z: verts[i2 + 2] }
			this.rasterizeTriangle(hf, v0, v1, v2)
		}
	}

	private rasterizeTriangle(hf: HeightField, v0: Vec3, v1: Vec3, v2: Vec3) {
		const minX = Math.max(0, Math.floor((Math.min(v0.x, v1.x, v2.x) - hf.minX) / hf.cellSize))
		const maxX = Math.min(hf.width - 1, Math.floor((Math.max(v0.x, v1.x, v2.x) - hf.minX) / hf.cellSize))
		const minY = Math.max(0, Math.floor((Math.min(v0.y, v1.y, v2.y) - hf.minY) / hf.cellSize))
		const maxY = Math.min(hf.height - 1, Math.floor((Math.max(v0.y, v1.y, v2.y) - hf.minY) / hf.cellSize))
		const normal = this.calNormal(v0, v1, v2)
		const slope = Math.acos(Math.abs(normal.z)) * 180 / Math.PI
		const area = slope <= this.cfg.agentMaxSlope ? 1 : 0
		for (let y = minY; y <= maxY; y++) {
			for (let x = minX; x <= maxX; x++) {
				const cx = hf.minX + (x + 0.5) * hf.cellSize
				const cy = hf.minY + (y + 0.5) * hf.cellSize
				if (this.pointInTriangle(cx, cy, v0, v1, v2)) {
					const z = this.interpolateZ(cx, cy, v0, v1, v2)
					const smin = Math.floor((z - hf.minZ) / hf.cellHeight)
					const smax = smin + 1
					const idx = y * hf.width + x
					this.addSpan(hf.spans[idx], smin, smax, area)
				}
			}
		}
	}

	private calNormal(v0: Vec3, v1: Vec3, v2: Vec3): Vec3 {
		const e1: Vec3 = { x: v1.x - v0.x, y: v1.y - v0.y, z: v1.z - v0.z }
		const e2: Vec3 = { x: v2.x - v0.x, y: v2.y - v0.y, z: v2.z - v0.z }
		const n: Vec3 = {
			x: e1.y * e2.z - e1.z * e2.y,
			y: e1.z * e2.x - e1.x * e2.z,
			z: e1.x * e2.y - e1.y * e2.x
		}
		const len = Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z)
		if (len > 0.0001) {
			n.x /= len
			n.y /= len
			n.z /= len
		}
		return n
	}

	private pointInTriangle(px: number, py: number, v0: Vec3, v1: Vec3, v2: Vec3): boolean {
		const d1 = this.sign(px, py, v0.x, v0.y, v1.x, v1.y)
		const d2 = this.sign(px, py, v1.x, v1.y, v2.x, v2.y)
		const d3 = this.sign(px, py, v2.x, v2.y, v0.x, v0.y)
		const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0)
		const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0)
		return !(hasNeg && hasPos)
	}

	private sign(p1x: number, p1y: number, p2x: number, p2y: number, p3x: number, p3y: number): number {
		return (p1x - p3x) * (p2y - p3y) - (p2x - p3x) * (p1y - p3y)
	}

	private interpolateZ(px: number, py: number, v0: Vec3, v1: Vec3, v2: Vec3): number {
		const denom = (v1.y - v2.y) * (v0.x - v2.x) + (v2.x - v1.x) * (v0.y - v2.y)
		if (Math.abs(denom) < 0.0001) return v0.z
		const a = ((v1.y - v2.y) * (px - v2.x) + (v2.x - v1.x) * (py - v2.y)) / denom
		const b = ((v2.y - v0.y) * (px - v2.x) + (v0.x - v2.x) * (py - v2.y)) / denom
		const c = 1 - a - b
		return a * v0.z + b * v1.z + c * v2.z
	}

	private addSpan(spans: HeightSpan[], smin: number, smax: number, area: number) {
		const span: HeightSpan = { smin, smax, area, next: null }
		spans.push(span)
	}

	private filterLowHeightSpans(hf: HeightField) {
		const walkableHeight = Math.ceil(this.cfg.agentHeight / hf.cellHeight)
		for (const cell of hf.spans) {
			for (let i = cell.length - 1; i >= 0; i--) {
				const span = cell[i]
				const next = i + 1 < cell.length ? cell[i + 1] : null
				if (next) {
					const gap = next.smin - span.smax
					if (gap < walkableHeight) {
						span.area = 0
					}
				}
			}
		}
	}

	private filterLedgeSpans(_hf: HeightField) {
	}

	private filterWalkableLowHeightSpans(_hf: HeightField) {
	}

	private buildCompactHeightField(hf: HeightField): CompactHeightField | null {
		const walkableHeight = Math.ceil(this.cfg.agentHeight / hf.cellHeight)
		const walkableClimb = Math.ceil(this.cfg.agentMaxClimb / hf.cellHeight)
		const cells: CompactCell[] = []
		const spans: CompactSpan[] = []
		const areas: number[] = []
		let spanCount = 0
		for (let y = 0; y < hf.height; y++) {
			for (let x = 0; x < hf.width; x++) {
				const idx = y * hf.width + x
				const cell: CompactCell = { idx: spanCount, count: 0 }
				for (const span of hf.spans[idx]) {
					if (span.area > 0) {
						spans.push({ y: span.smax, reg: 0, con: 0, h: span.smax - span.smin })
						areas.push(span.area)
						cell.count++
						spanCount++
					}
				}
				cells.push(cell)
			}
		}
		return {
			width: hf.width,
			height: hf.height,
			spanCount,
			walkableHeight,
			walkableClimb,
			cells,
			spans,
			dist: new Array(spanCount).fill(0),
			areas,
			borderSize: 0
		}
	}

	private erodeWalkableArea(_chf: CompactHeightField) {
	}

	private buildDistanceField(_chf: CompactHeightField) {
	}

	private buildRegions(chf: CompactHeightField) {
		let regionId = 1
		for (let i = 0; i < chf.spanCount; i++) {
			if (chf.areas[i] > 0 && chf.spans[i].reg === 0) {
				chf.spans[i].reg = regionId++
			}
		}
	}

	private buildContours(chf: CompactHeightField): ContourSet | null {
		const contours: Contour[] = []
		const regions = new Set<number>()
		for (const span of chf.spans) {
			if (span.reg > 0) regions.add(span.reg)
		}
		for (const reg of regions) {
			contours.push({
				verts: [],
				nverts: 0,
				rverts: [],
				nrverts: 0,
				reg,
				area: 1
			})
		}
		return {
			contours,
			minX: 0,
			minY: 0,
			minZ: 0,
			width: chf.width,
			height: chf.height,
			cellSize: this.cfg.cellSize,
			cellHeight: this.cfg.cellHeight,
			borderSize: 0
		}
	}

	private buildPolyMesh(cset: ContourSet): PolyMesh | null {
		return {
			verts: [],
			polys: [],
			regs: [],
			areas: [],
			nverts: 0,
			npolys: cset.contours.length,
			nvp: this.cfg.vertsPerPoly,
			minX: cset.minX,
			minY: cset.minY,
			minZ: cset.minZ,
			cellSize: cset.cellSize,
			cellHeight: cset.cellHeight,
			borderSize: cset.borderSize
		}
	}

	private createNavMesh(_pmesh: PolyMesh, bounds: { min: Vec3, max: Vec3 }): NavMesh {
		return {
			triangles: [],
			verts: [],
			bounds
		}
	}
}

export function generateSimpleNavMesh(
	walkableVerts: Vec3[],
	walkableIndices: number[]
): NavMesh {
	const triangles: NavMeshTri[] = []
	const bounds = {
		min: { x: Infinity, y: Infinity, z: Infinity },
		max: { x: -Infinity, y: -Infinity, z: -Infinity }
	}
	for (const v of walkableVerts) {
		bounds.min.x = Math.min(bounds.min.x, v.x)
		bounds.min.y = Math.min(bounds.min.y, v.y)
		bounds.min.z = Math.min(bounds.min.z, v.z)
		bounds.max.x = Math.max(bounds.max.x, v.x)
		bounds.max.y = Math.max(bounds.max.y, v.y)
		bounds.max.z = Math.max(bounds.max.z, v.z)
	}
	for (let i = 0; i < walkableIndices.length; i += 3) {
		const v0 = walkableVerts[walkableIndices[i]]
		const v1 = walkableVerts[walkableIndices[i + 1]]
		const v2 = walkableVerts[walkableIndices[i + 2]]
		const center: Vec3 = {
			x: (v0.x + v1.x + v2.x) / 3,
			y: (v0.y + v1.y + v2.y) / 3,
			z: (v0.z + v1.z + v2.z) / 3
		}
		triangles.push({
			verts: [{ ...v0 }, { ...v1 }, { ...v2 }],
			neighbors: [-1, -1, -1],
			center,
			area: 1
		})
	}
	return {
		triangles,
		verts: walkableVerts.map(v => ({ ...v })),
		bounds
	}
}
