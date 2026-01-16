use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct EntityId(pub u64);

impl EntityId {
	pub fn new(id: u64) -> Self {
		Self(id)
	}

	pub fn idx(&self) -> u64 {
		self.0
	}
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Entity {
	pub id: EntityId,
	pub name: String,
	pub act: bool,
	pub prt: Option<EntityId>,
	pub chd: Vec<EntityId>,
}

impl Entity {
	pub fn new(id: EntityId) -> Self {
		Self {
			id,
			name: String::new(),
			act: true,
			prt: None,
			chd: Vec::new(),
		}
	}

	pub fn with_name(mut self, name: &str) -> Self {
		self.name = name.to_string();
		self
	}

	pub fn set_prt(&mut self, prt: Option<EntityId>) {
		self.prt = prt;
	}

	pub fn add_chd(&mut self, chd: EntityId) {
		if !self.chd.contains(&chd) {
			self.chd.push(chd);
		}
	}

	pub fn del_chd(&mut self, chd: EntityId) {
		self.chd.retain(|&c| c != chd);
	}
}
