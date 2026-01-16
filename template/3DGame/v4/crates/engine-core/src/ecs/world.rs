use std::collections::HashMap;
use super::{Entity, EntityId, ComponentStorage};

pub struct World {
	nxt_id: u64,
	entities: HashMap<EntityId, Entity>,
	pub cmp: ComponentStorage,
}

impl Default for World {
	fn default() -> Self {
		Self::new()
	}
}

impl World {
	pub fn new() -> Self {
		Self {
			nxt_id: 1,
			entities: HashMap::new(),
			cmp: ComponentStorage::new(),
		}
	}

	pub fn spawn(&mut self) -> EntityId {
		let id = EntityId::new(self.nxt_id);
		self.nxt_id += 1;
		self.entities.insert(id, Entity::new(id));
		id
	}

	pub fn spawn_named(&mut self, name: &str) -> EntityId {
		let id = EntityId::new(self.nxt_id);
		self.nxt_id += 1;
		self.entities.insert(id, Entity::new(id).with_name(name));
		id
	}

	pub fn despawn(&mut self, id: EntityId) -> bool {
		if let Some(ent) = self.entities.remove(&id) {
			if let Some(prt) = ent.prt {
				if let Some(prt_ent) = self.entities.get_mut(&prt) {
					prt_ent.del_chd(id);
				}
			}
			for chd in ent.chd {
				self.despawn(chd);
			}
			self.cmp.del_all(id);
			true
		} else {
			false
		}
	}

	pub fn get(&self, id: EntityId) -> Option<&Entity> {
		self.entities.get(&id)
	}

	pub fn get_mut(&mut self, id: EntityId) -> Option<&mut Entity> {
		self.entities.get_mut(&id)
	}

	pub fn set_prt(&mut self, chd: EntityId, prt: Option<EntityId>) {
		if let Some(chd_ent) = self.entities.get(&chd) {
			let old_prt = chd_ent.prt;
			if old_prt == prt {
				return;
			}
			if let Some(old_prt_id) = old_prt {
				if let Some(old_prt_ent) = self.entities.get_mut(&old_prt_id) {
					old_prt_ent.del_chd(chd);
				}
			}
		}
		if let Some(chd_ent) = self.entities.get_mut(&chd) {
			chd_ent.set_prt(prt);
		}
		if let Some(prt_id) = prt {
			if let Some(prt_ent) = self.entities.get_mut(&prt_id) {
				prt_ent.add_chd(chd);
			}
		}
	}

	pub fn entities(&self) -> impl Iterator<Item = &Entity> {
		self.entities.values()
	}

	pub fn entity_ids(&self) -> impl Iterator<Item = EntityId> + '_ {
		self.entities.keys().copied()
	}

	pub fn cnt(&self) -> usize {
		self.entities.len()
	}

	pub fn clr(&mut self) {
		self.entities.clear();
		self.cmp = ComponentStorage::new();
		self.nxt_id = 1;
	}
}
