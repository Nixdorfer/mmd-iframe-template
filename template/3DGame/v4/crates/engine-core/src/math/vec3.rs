use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Default, Serialize, Deserialize)]
pub struct Vec3 {
	pub x: f32,
	pub y: f32,
	pub z: f32,
}

impl Vec3 {
	pub const ZERO: Self = Self { x: 0.0, y: 0.0, z: 0.0 };
	pub const ONE: Self = Self { x: 1.0, y: 1.0, z: 1.0 };
	pub const UP: Self = Self { x: 0.0, y: 0.0, z: 1.0 };
	pub const RIGHT: Self = Self { x: 1.0, y: 0.0, z: 0.0 };
	pub const FORWARD: Self = Self { x: 0.0, y: 1.0, z: 0.0 };

	pub fn new(x: f32, y: f32, z: f32) -> Self {
		Self { x, y, z }
	}

	pub fn add(&self, other: &Self) -> Self {
		Self {
			x: self.x + other.x,
			y: self.y + other.y,
			z: self.z + other.z,
		}
	}

	pub fn sub(&self, other: &Self) -> Self {
		Self {
			x: self.x - other.x,
			y: self.y - other.y,
			z: self.z - other.z,
		}
	}

	pub fn mul(&self, scalar: f32) -> Self {
		Self {
			x: self.x * scalar,
			y: self.y * scalar,
			z: self.z * scalar,
		}
	}

	pub fn dot(&self, other: &Self) -> f32 {
		self.x * other.x + self.y * other.y + self.z * other.z
	}

	pub fn cross(&self, other: &Self) -> Self {
		Self {
			x: self.y * other.z - self.z * other.y,
			y: self.z * other.x - self.x * other.z,
			z: self.x * other.y - self.y * other.x,
		}
	}

	pub fn len(&self) -> f32 {
		(self.x * self.x + self.y * self.y + self.z * self.z).sqrt()
	}

	pub fn len_sq(&self) -> f32 {
		self.x * self.x + self.y * self.y + self.z * self.z
	}

	pub fn nrm(&self) -> Self {
		let l = self.len();
		if l > 0.0 {
			self.mul(1.0 / l)
		} else {
			Self::ZERO
		}
	}

	pub fn lrp(&self, other: &Self, t: f32) -> Self {
		Self {
			x: self.x + (other.x - self.x) * t,
			y: self.y + (other.y - self.y) * t,
			z: self.z + (other.z - self.z) * t,
		}
	}

	pub fn dist(&self, other: &Self) -> f32 {
		self.sub(other).len()
	}
}

impl std::ops::Add for Vec3 {
	type Output = Self;
	fn add(self, other: Self) -> Self {
		Self::add(&self, &other)
	}
}

impl std::ops::Sub for Vec3 {
	type Output = Self;
	fn sub(self, other: Self) -> Self {
		Self::sub(&self, &other)
	}
}

impl std::ops::Mul<f32> for Vec3 {
	type Output = Self;
	fn mul(self, scalar: f32) -> Self {
		Self::mul(&self, scalar)
	}
}

impl std::ops::Neg for Vec3 {
	type Output = Self;
	fn neg(self) -> Self {
		Self {
			x: -self.x,
			y: -self.y,
			z: -self.z,
		}
	}
}
