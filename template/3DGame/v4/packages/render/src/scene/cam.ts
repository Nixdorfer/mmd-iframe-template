import type { Vec3 } from '@engine/common'

export class Camera {
	pos: Vec3
	tgt: Vec3
	up: Vec3
	fov: number
	near: number
	far: number
	azimuth: number
	elevation: number
	dist: number
	view: Float32Array
	proj: Float32Array
	viewProj: Float32Array

	constructor() {
		this.pos = { x: 0, y: -30, z: 20 }
		this.tgt = { x: 0, y: 0, z: 0 }
		this.up = { x: 0, y: 0, z: 1 }
		this.fov = Math.PI / 4
		this.near = 0.1
		this.far = 1000
		this.azimuth = Math.PI / 4
		this.elevation = -Math.PI / 6
		this.dist = 30
		this.view = new Float32Array(16)
		this.proj = new Float32Array(16)
		this.viewProj = new Float32Array(16)
	}

	setOrbit(azimuth: number, elevation: number, dist: number) {
		this.azimuth = azimuth
		this.elevation = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, elevation))
		this.dist = Math.max(1, dist)
		this.updOrbit()
	}

	updOrbit() {
		const { azimuth, elevation, dist, tgt } = this
		const cosEl = Math.cos(elevation)
		this.pos = {
			x: tgt.x + dist * cosEl * Math.sin(azimuth),
			y: tgt.y + dist * cosEl * Math.cos(azimuth),
			z: tgt.z + dist * Math.sin(-elevation)
		}
	}

	orbit(dAz: number, dEl: number) {
		this.setOrbit(this.azimuth + dAz, this.elevation + dEl, this.dist)
	}

	zoom(delta: number) {
		this.dist = Math.max(1, this.dist + delta)
		this.updOrbit()
	}

	pan(dx: number, dy: number) {
		const { azimuth } = this
		const forward = { x: Math.sin(azimuth), y: Math.cos(azimuth) }
		const right = { x: Math.cos(azimuth), y: -Math.sin(azimuth) }
		this.tgt.x += right.x * dx + forward.x * dy
		this.tgt.y += right.y * dx + forward.y * dy
		this.updOrbit()
	}

	updView() {
		const { pos, tgt, up, view } = this
		const zx = pos.x - tgt.x
		const zy = pos.y - tgt.y
		const zz = pos.z - tgt.z
		const zLen = Math.sqrt(zx * zx + zy * zy + zz * zz)
		const z = { x: zx / zLen, y: zy / zLen, z: zz / zLen }
		const xx = up.y * z.z - up.z * z.y
		const xy = up.z * z.x - up.x * z.z
		const xz = up.x * z.y - up.y * z.x
		const xLen = Math.sqrt(xx * xx + xy * xy + xz * xz)
		const x = { x: xx / xLen, y: xy / xLen, z: xz / xLen }
		const y = { x: z.y * x.z - z.z * x.y, y: z.z * x.x - z.x * x.z, z: z.x * x.y - z.y * x.x }
		view[0] = x.x; view[4] = x.y; view[8] = x.z; view[12] = -(x.x * pos.x + x.y * pos.y + x.z * pos.z)
		view[1] = y.x; view[5] = y.y; view[9] = y.z; view[13] = -(y.x * pos.x + y.y * pos.y + y.z * pos.z)
		view[2] = z.x; view[6] = z.y; view[10] = z.z; view[14] = -(z.x * pos.x + z.y * pos.y + z.z * pos.z)
		view[3] = 0; view[7] = 0; view[11] = 0; view[15] = 1
	}

	updProj(aspect: number) {
		const { fov, near, far, proj } = this
		const f = 1 / Math.tan(fov / 2)
		const nf = 1 / (near - far)
		proj[0] = f / aspect; proj[4] = 0; proj[8] = 0; proj[12] = 0
		proj[1] = 0; proj[5] = f; proj[9] = 0; proj[13] = 0
		proj[2] = 0; proj[6] = 0; proj[10] = (far + near) * nf; proj[14] = 2 * far * near * nf
		proj[3] = 0; proj[7] = 0; proj[11] = -1; proj[15] = 0
	}

	upd(aspect: number) {
		this.updOrbit()
		this.updView()
		this.updProj(aspect)
		this.mulMat4(this.proj, this.view, this.viewProj)
	}

	private mulMat4(a: Float32Array, b: Float32Array, out: Float32Array) {
		for (let i = 0; i < 4; i++) {
			for (let j = 0; j < 4; j++) {
				out[i * 4 + j] = 0
				for (let k = 0; k < 4; k++) {
					out[i * 4 + j] += a[k * 4 + j] * b[i * 4 + k]
				}
			}
		}
	}

	screenToWorld(sx: number, sy: number, w: number, h: number, z = 0): Vec3 {
		const nx = (2 * sx / w) - 1
		const ny = 1 - (2 * sy / h)
		const invProj = this.invMat4(this.proj)
		const invView = this.invMat4(this.view)
		const clipNear = { x: nx, y: ny, z: -1, w: 1 }
		const clipFar = { x: nx, y: ny, z: 1, w: 1 }
		const eyeNear = this.mulVec4(invProj, clipNear)
		const eyeFar = this.mulVec4(invProj, clipFar)
		eyeNear.x /= eyeNear.w; eyeNear.y /= eyeNear.w; eyeNear.z /= eyeNear.w
		eyeFar.x /= eyeFar.w; eyeFar.y /= eyeFar.w; eyeFar.z /= eyeFar.w
		const worldNear = this.mulVec4(invView, { x: eyeNear.x, y: eyeNear.y, z: eyeNear.z, w: 1 })
		const worldFar = this.mulVec4(invView, { x: eyeFar.x, y: eyeFar.y, z: eyeFar.z, w: 1 })
		const dir = {
			x: worldFar.x - worldNear.x,
			y: worldFar.y - worldNear.y,
			z: worldFar.z - worldNear.z
		}
		if (Math.abs(dir.z) < 0.0001) return { x: worldNear.x, y: worldNear.y, z }
		const t = (z - worldNear.z) / dir.z
		return {
			x: worldNear.x + dir.x * t,
			y: worldNear.y + dir.y * t,
			z
		}
	}

	private invMat4(m: Float32Array): Float32Array {
		const inv = new Float32Array(16)
		inv[0] = m[5]*m[10]*m[15] - m[5]*m[11]*m[14] - m[9]*m[6]*m[15] + m[9]*m[7]*m[14] + m[13]*m[6]*m[11] - m[13]*m[7]*m[10]
		inv[4] = -m[4]*m[10]*m[15] + m[4]*m[11]*m[14] + m[8]*m[6]*m[15] - m[8]*m[7]*m[14] - m[12]*m[6]*m[11] + m[12]*m[7]*m[10]
		inv[8] = m[4]*m[9]*m[15] - m[4]*m[11]*m[13] - m[8]*m[5]*m[15] + m[8]*m[7]*m[13] + m[12]*m[5]*m[11] - m[12]*m[7]*m[9]
		inv[12] = -m[4]*m[9]*m[14] + m[4]*m[10]*m[13] + m[8]*m[5]*m[14] - m[8]*m[6]*m[13] - m[12]*m[5]*m[10] + m[12]*m[6]*m[9]
		inv[1] = -m[1]*m[10]*m[15] + m[1]*m[11]*m[14] + m[9]*m[2]*m[15] - m[9]*m[3]*m[14] - m[13]*m[2]*m[11] + m[13]*m[3]*m[10]
		inv[5] = m[0]*m[10]*m[15] - m[0]*m[11]*m[14] - m[8]*m[2]*m[15] + m[8]*m[3]*m[14] + m[12]*m[2]*m[11] - m[12]*m[3]*m[10]
		inv[9] = -m[0]*m[9]*m[15] + m[0]*m[11]*m[13] + m[8]*m[1]*m[15] - m[8]*m[3]*m[13] - m[12]*m[1]*m[11] + m[12]*m[3]*m[9]
		inv[13] = m[0]*m[9]*m[14] - m[0]*m[10]*m[13] - m[8]*m[1]*m[14] + m[8]*m[2]*m[13] + m[12]*m[1]*m[10] - m[12]*m[2]*m[9]
		inv[2] = m[1]*m[6]*m[15] - m[1]*m[7]*m[14] - m[5]*m[2]*m[15] + m[5]*m[3]*m[14] + m[13]*m[2]*m[7] - m[13]*m[3]*m[6]
		inv[6] = -m[0]*m[6]*m[15] + m[0]*m[7]*m[14] + m[4]*m[2]*m[15] - m[4]*m[3]*m[14] - m[12]*m[2]*m[7] + m[12]*m[3]*m[6]
		inv[10] = m[0]*m[5]*m[15] - m[0]*m[7]*m[13] - m[4]*m[1]*m[15] + m[4]*m[3]*m[13] + m[12]*m[1]*m[7] - m[12]*m[3]*m[5]
		inv[14] = -m[0]*m[5]*m[14] + m[0]*m[6]*m[13] + m[4]*m[1]*m[14] - m[4]*m[2]*m[13] - m[12]*m[1]*m[6] + m[12]*m[2]*m[5]
		inv[3] = -m[1]*m[6]*m[11] + m[1]*m[7]*m[10] + m[5]*m[2]*m[11] - m[5]*m[3]*m[10] - m[9]*m[2]*m[7] + m[9]*m[3]*m[6]
		inv[7] = m[0]*m[6]*m[11] - m[0]*m[7]*m[10] - m[4]*m[2]*m[11] + m[4]*m[3]*m[10] + m[8]*m[2]*m[7] - m[8]*m[3]*m[6]
		inv[11] = -m[0]*m[5]*m[11] + m[0]*m[7]*m[9] + m[4]*m[1]*m[11] - m[4]*m[3]*m[9] - m[8]*m[1]*m[7] + m[8]*m[3]*m[5]
		inv[15] = m[0]*m[5]*m[10] - m[0]*m[6]*m[9] - m[4]*m[1]*m[10] + m[4]*m[2]*m[9] + m[8]*m[1]*m[6] - m[8]*m[2]*m[5]
		const det = m[0]*inv[0] + m[1]*inv[4] + m[2]*inv[8] + m[3]*inv[12]
		if (Math.abs(det) < 1e-10) return inv
		const invDet = 1 / det
		for (let i = 0; i < 16; i++) inv[i] *= invDet
		return inv
	}

	private mulVec4(m: Float32Array, v: { x: number, y: number, z: number, w: number }) {
		return {
			x: m[0]*v.x + m[4]*v.y + m[8]*v.z + m[12]*v.w,
			y: m[1]*v.x + m[5]*v.y + m[9]*v.z + m[13]*v.w,
			z: m[2]*v.x + m[6]*v.y + m[10]*v.z + m[14]*v.w,
			w: m[3]*v.x + m[7]*v.y + m[11]*v.z + m[15]*v.w
		}
	}
}
