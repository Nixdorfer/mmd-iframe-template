use serde::{Deserialize, Serialize};
use crate::math::Vec3;

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct AABB {
	pub min: Vec3,
	pub max: Vec3,
}

impl Default for AABB {
	fn default() -> Self {
		Self {
			min: Vec3::ZERO,
			max: Vec3::ONE,
		}
	}
}

impl AABB {
	pub fn new(min: Vec3, max: Vec3) -> Self {
		Self { min, max }
	}

	pub fn from_center_size(center: Vec3, size: Vec3) -> Self {
		let half = size.mul(0.5);
		Self {
			min: center.sub(&half),
			max: center.add(&half),
		}
	}

	pub fn center(&self) -> Vec3 {
		self.min.lrp(&self.max, 0.5)
	}

	pub fn size(&self) -> Vec3 {
		self.max.sub(&self.min)
	}

	pub fn contains(&self, p: &Vec3) -> bool {
		p.x >= self.min.x && p.x <= self.max.x
			&& p.y >= self.min.y && p.y <= self.max.y
			&& p.z >= self.min.z && p.z <= self.max.z
	}

	pub fn intersects(&self, other: &AABB) -> bool {
		self.min.x <= other.max.x && self.max.x >= other.min.x
			&& self.min.y <= other.max.y && self.max.y >= other.min.y
			&& self.min.z <= other.max.z && self.max.z >= other.min.z
	}

	pub fn expand(&self, p: &Vec3) -> Self {
		Self {
			min: Vec3::new(
				self.min.x.min(p.x),
				self.min.y.min(p.y),
				self.min.z.min(p.z),
			),
			max: Vec3::new(
				self.max.x.max(p.x),
				self.max.y.max(p.y),
				self.max.z.max(p.z),
			),
		}
	}

	pub fn merge(&self, other: &AABB) -> Self {
		Self {
			min: Vec3::new(
				self.min.x.min(other.min.x),
				self.min.y.min(other.min.y),
				self.min.z.min(other.min.z),
			),
			max: Vec3::new(
				self.max.x.max(other.max.x),
				self.max.y.max(other.max.y),
				self.max.z.max(other.max.z),
			),
		}
	}
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum ColliderType {
	Box,
	Sphere,
	Capsule,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Collider {
	pub typ: ColliderType,
	pub offset: Vec3,
	pub size: Vec3,
	pub radius: f32,
	pub height: f32,
	pub is_trg: bool,
}

impl Default for Collider {
	fn default() -> Self {
		Self {
			typ: ColliderType::Box,
			offset: Vec3::ZERO,
			size: Vec3::ONE,
			radius: 0.5,
			height: 2.0,
			is_trg: false,
		}
	}
}

impl Collider {
	pub fn box_col(size: Vec3) -> Self {
		Self {
			typ: ColliderType::Box,
			size,
			..Default::default()
		}
	}

	pub fn sphere(radius: f32) -> Self {
		Self {
			typ: ColliderType::Sphere,
			radius,
			..Default::default()
		}
	}

	pub fn capsule(radius: f32, height: f32) -> Self {
		Self {
			typ: ColliderType::Capsule,
			radius,
			height,
			..Default::default()
		}
	}

	pub fn aabb(&self, pos: &Vec3) -> AABB {
		let center = pos.add(&self.offset);
		match self.typ {
			ColliderType::Box => AABB::from_center_size(center, self.size),
			ColliderType::Sphere => {
				let r = Vec3::new(self.radius, self.radius, self.radius);
				AABB::new(center.sub(&r), center.add(&r))
			}
			ColliderType::Capsule => {
				let half_h = self.height * 0.5;
				AABB::new(
					Vec3::new(center.x - self.radius, center.y - self.radius, center.z - half_h),
					Vec3::new(center.x + self.radius, center.y + self.radius, center.z + half_h),
				)
			}
		}
	}
}

#[derive(Debug, Clone)]
pub struct Collision {
	pub ent_a: u64,
	pub ent_b: u64,
	pub normal: Vec3,
	pub depth: f32,
	pub point: Vec3,
}

pub fn test_aabb_aabb(a: &AABB, b: &AABB) -> Option<Collision> {
	if !a.intersects(b) {
		return None;
	}
	let overlap_x = (a.max.x.min(b.max.x) - a.min.x.max(b.min.x)).max(0.0);
	let overlap_y = (a.max.y.min(b.max.y) - a.min.y.max(b.min.y)).max(0.0);
	let overlap_z = (a.max.z.min(b.max.z) - a.min.z.max(b.min.z)).max(0.0);
	let (normal, depth) = if overlap_x <= overlap_y && overlap_x <= overlap_z {
		let dir = if a.center().x < b.center().x { -1.0 } else { 1.0 };
		(Vec3::new(dir, 0.0, 0.0), overlap_x)
	} else if overlap_y <= overlap_z {
		let dir = if a.center().y < b.center().y { -1.0 } else { 1.0 };
		(Vec3::new(0.0, dir, 0.0), overlap_y)
	} else {
		let dir = if a.center().z < b.center().z { -1.0 } else { 1.0 };
		(Vec3::new(0.0, 0.0, dir), overlap_z)
	};
	Some(Collision {
		ent_a: 0,
		ent_b: 0,
		normal,
		depth,
		point: a.center().lrp(&b.center(), 0.5),
	})
}

pub fn test_sphere_sphere(
	pos_a: &Vec3, radius_a: f32,
	pos_b: &Vec3, radius_b: f32
) -> Option<Collision> {
	let diff = pos_b.sub(pos_a);
	let dist_sq = diff.len_sq();
	let r_sum = radius_a + radius_b;
	if dist_sq >= r_sum * r_sum {
		return None;
	}
	let dist = dist_sq.sqrt();
	let normal = if dist > 0.0001 { diff.mul(1.0 / dist) } else { Vec3::UP };
	let depth = r_sum - dist;
	let point = pos_a.add(&normal.mul(radius_a));
	Some(Collision {
		ent_a: 0,
		ent_b: 0,
		normal,
		depth,
		point,
	})
}
