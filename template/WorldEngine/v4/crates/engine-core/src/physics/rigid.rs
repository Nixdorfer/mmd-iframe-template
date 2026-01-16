use serde::{Deserialize, Serialize};
use crate::math::Vec3;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum RigidBodyType {
	Static,
	Dynamic,
	Kinematic,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RigidBody {
	pub typ: RigidBodyType,
	pub mass: f32,
	pub vel: Vec3,
	pub ang_vel: Vec3,
	pub force: Vec3,
	pub torque: Vec3,
	pub drag: f32,
	pub ang_drag: f32,
	pub gravity_scl: f32,
	pub is_sleeping: bool,
}

impl Default for RigidBody {
	fn default() -> Self {
		Self {
			typ: RigidBodyType::Dynamic,
			mass: 1.0,
			vel: Vec3::ZERO,
			ang_vel: Vec3::ZERO,
			force: Vec3::ZERO,
			torque: Vec3::ZERO,
			drag: 0.0,
			ang_drag: 0.05,
			gravity_scl: 1.0,
			is_sleeping: false,
		}
	}
}

impl RigidBody {
	pub fn stc() -> Self {
		Self {
			typ: RigidBodyType::Static,
			mass: 0.0,
			..Default::default()
		}
	}

	pub fn dyn_body(mass: f32) -> Self {
		Self {
			typ: RigidBodyType::Dynamic,
			mass,
			..Default::default()
		}
	}

	pub fn kinematic() -> Self {
		Self {
			typ: RigidBodyType::Kinematic,
			mass: 0.0,
			..Default::default()
		}
	}

	pub fn add_force(&mut self, force: Vec3) {
		if self.typ == RigidBodyType::Dynamic {
			self.force = self.force.add(&force);
		}
	}

	pub fn add_impulse(&mut self, impulse: Vec3) {
		if self.typ == RigidBodyType::Dynamic && self.mass > 0.0 {
			self.vel = self.vel.add(&impulse.mul(1.0 / self.mass));
		}
	}

	pub fn add_torque(&mut self, torque: Vec3) {
		if self.typ == RigidBodyType::Dynamic {
			self.torque = self.torque.add(&torque);
		}
	}

	pub fn integrate(&mut self, dt: f32, gravity: &Vec3) {
		if self.typ != RigidBodyType::Dynamic || self.is_sleeping {
			return;
		}
		let grav = gravity.mul(self.gravity_scl);
		let accel = self.force.mul(1.0 / self.mass).add(&grav);
		self.vel = self.vel.add(&accel.mul(dt));
		self.vel = self.vel.mul(1.0 - self.drag * dt);
		let ang_accel = self.torque.mul(1.0 / self.mass);
		self.ang_vel = self.ang_vel.add(&ang_accel.mul(dt));
		self.ang_vel = self.ang_vel.mul(1.0 - self.ang_drag * dt);
		self.force = Vec3::ZERO;
		self.torque = Vec3::ZERO;
	}

	pub fn speed(&self) -> f32 {
		self.vel.len()
	}

	pub fn kinetic_energy(&self) -> f32 {
		0.5 * self.mass * self.vel.len_sq()
	}
}
