use super::World;

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum SystemStage {
	PreUpdate,
	Update,
	PostUpdate,
	PreRender,
	Render,
	PostRender,
}

pub trait System: Send + Sync {
	fn name(&self) -> &'static str;
	fn stage(&self) -> SystemStage;
	fn run(&mut self, world: &mut World, dt: f32);
}

pub struct SystemRunner {
	systems: Vec<Box<dyn System>>,
}

impl Default for SystemRunner {
	fn default() -> Self {
		Self::new()
	}
}

impl SystemRunner {
	pub fn new() -> Self {
		Self {
			systems: Vec::new(),
		}
	}

	pub fn add<S: System + 'static>(&mut self, system: S) {
		self.systems.push(Box::new(system));
		self.systems.sort_by_key(|s| s.stage());
	}

	pub fn run(&mut self, world: &mut World, dt: f32) {
		for system in &mut self.systems {
			system.run(world, dt);
		}
	}

	pub fn run_stage(&mut self, world: &mut World, dt: f32, stage: SystemStage) {
		for system in &mut self.systems {
			if system.stage() == stage {
				system.run(world, dt);
			}
		}
	}
}
