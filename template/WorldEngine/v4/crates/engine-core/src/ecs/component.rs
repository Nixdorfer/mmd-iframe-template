use std::any::{Any, TypeId};
use std::collections::HashMap;
use super::EntityId;

pub trait Component: Any + Send + Sync {
	fn type_name(&self) -> &'static str;
}

impl<T: Any + Send + Sync> Component for T {
	fn type_name(&self) -> &'static str {
		std::any::type_name::<T>()
	}
}

pub struct ComponentStorage {
	data: HashMap<TypeId, HashMap<EntityId, Box<dyn Any + Send + Sync>>>,
}

impl Default for ComponentStorage {
	fn default() -> Self {
		Self::new()
	}
}

impl ComponentStorage {
	pub fn new() -> Self {
		Self {
			data: HashMap::new(),
		}
	}

	pub fn add<T: 'static + Send + Sync>(&mut self, ent: EntityId, cmp: T) {
		let type_id = TypeId::of::<T>();
		self.data
			.entry(type_id)
			.or_default()
			.insert(ent, Box::new(cmp));
	}

	pub fn get<T: 'static>(&self, ent: EntityId) -> Option<&T> {
		let type_id = TypeId::of::<T>();
		self.data
			.get(&type_id)?
			.get(&ent)?
			.downcast_ref::<T>()
	}

	pub fn get_mut<T: 'static>(&mut self, ent: EntityId) -> Option<&mut T> {
		let type_id = TypeId::of::<T>();
		self.data
			.get_mut(&type_id)?
			.get_mut(&ent)?
			.downcast_mut::<T>()
	}

	pub fn del<T: 'static>(&mut self, ent: EntityId) -> Option<T> {
		let type_id = TypeId::of::<T>();
		self.data
			.get_mut(&type_id)?
			.remove(&ent)?
			.downcast::<T>()
			.ok()
			.map(|b| *b)
	}

	pub fn has<T: 'static>(&self, ent: EntityId) -> bool {
		let type_id = TypeId::of::<T>();
		self.data
			.get(&type_id)
			.map(|m| m.contains_key(&ent))
			.unwrap_or(false)
	}

	pub fn del_all(&mut self, ent: EntityId) {
		for storage in self.data.values_mut() {
			storage.remove(&ent);
		}
	}

	pub fn entities_with<T: 'static>(&self) -> Vec<EntityId> {
		let type_id = TypeId::of::<T>();
		self.data
			.get(&type_id)
			.map(|m| m.keys().copied().collect())
			.unwrap_or_default()
	}
}
