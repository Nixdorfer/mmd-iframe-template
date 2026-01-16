use serde::{Deserialize, Serialize};
use super::{Vec3, Mat4};

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct Quat {
	pub x: f32,
	pub y: f32,
	pub z: f32,
	pub w: f32,
}

impl Default for Quat {
	fn default() -> Self {
		Self::identity()
	}
}

impl Quat {
	pub fn identity() -> Self {
		Self { x: 0.0, y: 0.0, z: 0.0, w: 1.0 }
	}

	pub fn new(x: f32, y: f32, z: f32, w: f32) -> Self {
		Self { x, y, z, w }
	}

	pub fn from_axis_angle(axis: &Vec3, rad: f32) -> Self {
		let half = rad * 0.5;
		let s = half.sin();
		let n = axis.nrm();
		Self {
			x: n.x * s,
			y: n.y * s,
			z: n.z * s,
			w: half.cos(),
		}
	}

	pub fn from_euler(x: f32, y: f32, z: f32) -> Self {
		let cx = (x * 0.5).cos();
		let sx = (x * 0.5).sin();
		let cy = (y * 0.5).cos();
		let sy = (y * 0.5).sin();
		let cz = (z * 0.5).cos();
		let sz = (z * 0.5).sin();
		Self {
			x: sx * cy * cz - cx * sy * sz,
			y: cx * sy * cz + sx * cy * sz,
			z: cx * cy * sz - sx * sy * cz,
			w: cx * cy * cz + sx * sy * sz,
		}
	}

	pub fn mul(&self, other: &Self) -> Self {
		Self {
			x: self.w * other.x + self.x * other.w + self.y * other.z - self.z * other.y,
			y: self.w * other.y - self.x * other.z + self.y * other.w + self.z * other.x,
			z: self.w * other.z + self.x * other.y - self.y * other.x + self.z * other.w,
			w: self.w * other.w - self.x * other.x - self.y * other.y - self.z * other.z,
		}
	}

	pub fn mul_vec3(&self, v: &Vec3) -> Vec3 {
		let qv = Vec3::new(self.x, self.y, self.z);
		let uv = qv.cross(v);
		let uuv = qv.cross(&uv);
		v.add(&uv.mul(2.0 * self.w)).add(&uuv.mul(2.0))
	}

	pub fn len(&self) -> f32 {
		(self.x * self.x + self.y * self.y + self.z * self.z + self.w * self.w).sqrt()
	}

	pub fn nrm(&self) -> Self {
		let l = self.len();
		if l > 0.0 {
			Self {
				x: self.x / l,
				y: self.y / l,
				z: self.z / l,
				w: self.w / l,
			}
		} else {
			Self::identity()
		}
	}

	pub fn conj(&self) -> Self {
		Self {
			x: -self.x,
			y: -self.y,
			z: -self.z,
			w: self.w,
		}
	}

	pub fn inv(&self) -> Self {
		let len_sq = self.x * self.x + self.y * self.y + self.z * self.z + self.w * self.w;
		if len_sq > 0.0 {
			let inv_len = 1.0 / len_sq;
			Self {
				x: -self.x * inv_len,
				y: -self.y * inv_len,
				z: -self.z * inv_len,
				w: self.w * inv_len,
			}
		} else {
			Self::identity()
		}
	}

	pub fn slerp(&self, other: &Self, t: f32) -> Self {
		let mut dot = self.x * other.x + self.y * other.y + self.z * other.z + self.w * other.w;
		let mut other = *other;
		if dot < 0.0 {
			other.x = -other.x;
			other.y = -other.y;
			other.z = -other.z;
			other.w = -other.w;
			dot = -dot;
		}
		if dot > 0.9995 {
			return Self {
				x: self.x + t * (other.x - self.x),
				y: self.y + t * (other.y - self.y),
				z: self.z + t * (other.z - self.z),
				w: self.w + t * (other.w - self.w),
			}.nrm();
		}
		let theta_0 = dot.acos();
		let theta = theta_0 * t;
		let sin_theta = theta.sin();
		let sin_theta_0 = theta_0.sin();
		let s0 = (theta_0 - theta).cos() - dot * sin_theta / sin_theta_0;
		let s1 = sin_theta / sin_theta_0;
		Self {
			x: self.x * s0 + other.x * s1,
			y: self.y * s0 + other.y * s1,
			z: self.z * s0 + other.z * s1,
			w: self.w * s0 + other.w * s1,
		}
	}

	pub fn to_mat4(&self) -> Mat4 {
		let xx = self.x * self.x;
		let yy = self.y * self.y;
		let zz = self.z * self.z;
		let xy = self.x * self.y;
		let xz = self.x * self.z;
		let yz = self.y * self.z;
		let wx = self.w * self.x;
		let wy = self.w * self.y;
		let wz = self.w * self.z;
		Mat4 {
			m: [
				1.0 - 2.0 * (yy + zz), 2.0 * (xy + wz), 2.0 * (xz - wy), 0.0,
				2.0 * (xy - wz), 1.0 - 2.0 * (xx + zz), 2.0 * (yz + wx), 0.0,
				2.0 * (xz + wy), 2.0 * (yz - wx), 1.0 - 2.0 * (xx + yy), 0.0,
				0.0, 0.0, 0.0, 1.0,
			],
		}
	}
}
