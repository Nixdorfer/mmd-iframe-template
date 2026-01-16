use serde::{Deserialize, Serialize};
use super::Vec3;

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct Mat4 {
	pub m: [f32; 16],
}

impl Default for Mat4 {
	fn default() -> Self {
		Self::identity()
	}
}

impl Mat4 {
	pub fn identity() -> Self {
		Self {
			m: [
				1.0, 0.0, 0.0, 0.0,
				0.0, 1.0, 0.0, 0.0,
				0.0, 0.0, 1.0, 0.0,
				0.0, 0.0, 0.0, 1.0,
			],
		}
	}

	pub fn zero() -> Self {
		Self { m: [0.0; 16] }
	}

	pub fn trs(pos: &Vec3) -> Self {
		let mut r = Self::identity();
		r.m[12] = pos.x;
		r.m[13] = pos.y;
		r.m[14] = pos.z;
		r
	}

	pub fn scl(s: &Vec3) -> Self {
		let mut r = Self::identity();
		r.m[0] = s.x;
		r.m[5] = s.y;
		r.m[10] = s.z;
		r
	}

	pub fn rot_x(rad: f32) -> Self {
		let c = rad.cos();
		let s = rad.sin();
		let mut r = Self::identity();
		r.m[5] = c;
		r.m[6] = s;
		r.m[9] = -s;
		r.m[10] = c;
		r
	}

	pub fn rot_y(rad: f32) -> Self {
		let c = rad.cos();
		let s = rad.sin();
		let mut r = Self::identity();
		r.m[0] = c;
		r.m[2] = -s;
		r.m[8] = s;
		r.m[10] = c;
		r
	}

	pub fn rot_z(rad: f32) -> Self {
		let c = rad.cos();
		let s = rad.sin();
		let mut r = Self::identity();
		r.m[0] = c;
		r.m[1] = s;
		r.m[4] = -s;
		r.m[5] = c;
		r
	}

	pub fn mul(&self, other: &Self) -> Self {
		let mut r = Self::zero();
		for i in 0..4 {
			for j in 0..4 {
				for k in 0..4 {
					r.m[i * 4 + j] += self.m[i * 4 + k] * other.m[k * 4 + j];
				}
			}
		}
		r
	}

	pub fn mul_vec3(&self, v: &Vec3) -> Vec3 {
		Vec3 {
			x: self.m[0] * v.x + self.m[4] * v.y + self.m[8] * v.z + self.m[12],
			y: self.m[1] * v.x + self.m[5] * v.y + self.m[9] * v.z + self.m[13],
			z: self.m[2] * v.x + self.m[6] * v.y + self.m[10] * v.z + self.m[14],
		}
	}

	pub fn perspective(fov: f32, aspect: f32, near: f32, far: f32) -> Self {
		let f = 1.0 / (fov / 2.0).tan();
		let nf = 1.0 / (near - far);
		Self {
			m: [
				f / aspect, 0.0, 0.0, 0.0,
				0.0, f, 0.0, 0.0,
				0.0, 0.0, (far + near) * nf, -1.0,
				0.0, 0.0, 2.0 * far * near * nf, 0.0,
			],
		}
	}

	pub fn ortho(le: f32, ri: f32, bt: f32, tp: f32, near: f32, far: f32) -> Self {
		let lr = 1.0 / (le - ri);
		let bt_inv = 1.0 / (bt - tp);
		let nf = 1.0 / (near - far);
		Self {
			m: [
				-2.0 * lr, 0.0, 0.0, 0.0,
				0.0, -2.0 * bt_inv, 0.0, 0.0,
				0.0, 0.0, 2.0 * nf, 0.0,
				(le + ri) * lr, (tp + bt) * bt_inv, (far + near) * nf, 1.0,
			],
		}
	}

	pub fn look_at(eye: &Vec3, tgt: &Vec3, up: &Vec3) -> Self {
		let z = eye.sub(tgt).nrm();
		let x = up.cross(&z).nrm();
		let y = z.cross(&x);
		Self {
			m: [
				x.x, y.x, z.x, 0.0,
				x.y, y.y, z.y, 0.0,
				x.z, y.z, z.z, 0.0,
				-x.dot(eye), -y.dot(eye), -z.dot(eye), 1.0,
			],
		}
	}

	pub fn inv(&self) -> Option<Self> {
		let m = &self.m;
		let mut inv = [0.0f32; 16];
		inv[0] = m[5] * m[10] * m[15] - m[5] * m[11] * m[14] - m[9] * m[6] * m[15]
			+ m[9] * m[7] * m[14] + m[13] * m[6] * m[11] - m[13] * m[7] * m[10];
		inv[4] = -m[4] * m[10] * m[15] + m[4] * m[11] * m[14] + m[8] * m[6] * m[15]
			- m[8] * m[7] * m[14] - m[12] * m[6] * m[11] + m[12] * m[7] * m[10];
		inv[8] = m[4] * m[9] * m[15] - m[4] * m[11] * m[13] - m[8] * m[5] * m[15]
			+ m[8] * m[7] * m[13] + m[12] * m[5] * m[11] - m[12] * m[7] * m[9];
		inv[12] = -m[4] * m[9] * m[14] + m[4] * m[10] * m[13] + m[8] * m[5] * m[14]
			- m[8] * m[6] * m[13] - m[12] * m[5] * m[10] + m[12] * m[6] * m[9];
		inv[1] = -m[1] * m[10] * m[15] + m[1] * m[11] * m[14] + m[9] * m[2] * m[15]
			- m[9] * m[3] * m[14] - m[13] * m[2] * m[11] + m[13] * m[3] * m[10];
		inv[5] = m[0] * m[10] * m[15] - m[0] * m[11] * m[14] - m[8] * m[2] * m[15]
			+ m[8] * m[3] * m[14] + m[12] * m[2] * m[11] - m[12] * m[3] * m[10];
		inv[9] = -m[0] * m[9] * m[15] + m[0] * m[11] * m[13] + m[8] * m[1] * m[15]
			- m[8] * m[3] * m[13] - m[12] * m[1] * m[11] + m[12] * m[3] * m[9];
		inv[13] = m[0] * m[9] * m[14] - m[0] * m[10] * m[13] - m[8] * m[1] * m[14]
			+ m[8] * m[2] * m[13] + m[12] * m[1] * m[10] - m[12] * m[2] * m[9];
		inv[2] = m[1] * m[6] * m[15] - m[1] * m[7] * m[14] - m[5] * m[2] * m[15]
			+ m[5] * m[3] * m[14] + m[13] * m[2] * m[7] - m[13] * m[3] * m[6];
		inv[6] = -m[0] * m[6] * m[15] + m[0] * m[7] * m[14] + m[4] * m[2] * m[15]
			- m[4] * m[3] * m[14] - m[12] * m[2] * m[7] + m[12] * m[3] * m[6];
		inv[10] = m[0] * m[5] * m[15] - m[0] * m[7] * m[13] - m[4] * m[1] * m[15]
			+ m[4] * m[3] * m[13] + m[12] * m[1] * m[7] - m[12] * m[3] * m[5];
		inv[14] = -m[0] * m[5] * m[14] + m[0] * m[6] * m[13] + m[4] * m[1] * m[14]
			- m[4] * m[2] * m[13] - m[12] * m[1] * m[6] + m[12] * m[2] * m[5];
		inv[3] = -m[1] * m[6] * m[11] + m[1] * m[7] * m[10] + m[5] * m[2] * m[11]
			- m[5] * m[3] * m[10] - m[9] * m[2] * m[7] + m[9] * m[3] * m[6];
		inv[7] = m[0] * m[6] * m[11] - m[0] * m[7] * m[10] - m[4] * m[2] * m[11]
			+ m[4] * m[3] * m[10] + m[8] * m[2] * m[7] - m[8] * m[3] * m[6];
		inv[11] = -m[0] * m[5] * m[11] + m[0] * m[7] * m[9] + m[4] * m[1] * m[11]
			- m[4] * m[3] * m[9] - m[8] * m[1] * m[7] + m[8] * m[3] * m[5];
		inv[15] = m[0] * m[5] * m[10] - m[0] * m[6] * m[9] - m[4] * m[1] * m[10]
			+ m[4] * m[2] * m[9] + m[8] * m[1] * m[6] - m[8] * m[2] * m[5];
		let det = m[0] * inv[0] + m[1] * inv[4] + m[2] * inv[8] + m[3] * inv[12];
		if det.abs() < 1e-10 {
			return None;
		}
		let det_inv = 1.0 / det;
		for i in 0..16 {
			inv[i] *= det_inv;
		}
		Some(Self { m: inv })
	}

	pub fn as_slice(&self) -> &[f32; 16] {
		&self.m
	}
}
