use crate::math::Vec3;
use crate::physics::AABB;

const MAX_DEPTH: usize = 8;
const MAX_ITEMS: usize = 8;

#[derive(Debug)]
pub struct OctreeNode<T> {
	bounds: AABB,
	items: Vec<(AABB, T)>,
	children: Option<Box<[OctreeNode<T>; 8]>>,
	depth: usize,
}

impl<T: Clone> OctreeNode<T> {
	pub fn new(bounds: AABB, depth: usize) -> Self {
		Self {
			bounds,
			items: Vec::new(),
			children: None,
			depth,
		}
	}

	fn subdivide(&mut self) {
		if self.children.is_some() || self.depth >= MAX_DEPTH {
			return;
		}
		let center = self.bounds.center();
		let min = self.bounds.min;
		let max = self.bounds.max;
		self.children = Some(Box::new([
			OctreeNode::new(AABB::new(min, center), self.depth + 1),
			OctreeNode::new(AABB::new(Vec3::new(center.x, min.y, min.z), Vec3::new(max.x, center.y, center.z)), self.depth + 1),
			OctreeNode::new(AABB::new(Vec3::new(min.x, center.y, min.z), Vec3::new(center.x, max.y, center.z)), self.depth + 1),
			OctreeNode::new(AABB::new(Vec3::new(center.x, center.y, min.z), Vec3::new(max.x, max.y, center.z)), self.depth + 1),
			OctreeNode::new(AABB::new(Vec3::new(min.x, min.y, center.z), Vec3::new(center.x, center.y, max.z)), self.depth + 1),
			OctreeNode::new(AABB::new(Vec3::new(center.x, min.y, center.z), Vec3::new(max.x, center.y, max.z)), self.depth + 1),
			OctreeNode::new(AABB::new(Vec3::new(min.x, center.y, center.z), Vec3::new(center.x, max.y, max.z)), self.depth + 1),
			OctreeNode::new(AABB::new(center, max), self.depth + 1),
		]));
	}

	pub fn ins(&mut self, bounds: AABB, item: T) -> bool {
		if !self.bounds.intersects(&bounds) {
			return false;
		}
		if self.children.is_none() && self.items.len() < MAX_ITEMS {
			self.items.push((bounds, item));
			return true;
		}
		if self.children.is_none() {
			self.subdivide();
		}
		if let Some(children) = &mut self.children {
			for child in children.iter_mut() {
				if child.bounds.intersects(&bounds) {
					if child.ins(bounds, item.clone()) {
						return true;
					}
				}
			}
		}
		self.items.push((bounds, item));
		true
	}

	pub fn query(&self, bounds: &AABB, result: &mut Vec<T>) {
		if !self.bounds.intersects(bounds) {
			return;
		}
		for (item_bounds, item) in &self.items {
			if bounds.intersects(item_bounds) {
				result.push(item.clone());
			}
		}
		if let Some(children) = &self.children {
			for child in children.iter() {
				child.query(bounds, result);
			}
		}
	}

	pub fn query_point(&self, point: &Vec3, result: &mut Vec<T>) {
		if !self.bounds.contains(point) {
			return;
		}
		for (item_bounds, item) in &self.items {
			if item_bounds.contains(point) {
				result.push(item.clone());
			}
		}
		if let Some(children) = &self.children {
			for child in children.iter() {
				child.query_point(point, result);
			}
		}
	}

	pub fn clr(&mut self) {
		self.items.clear();
		self.children = None;
	}
}

pub struct Octree<T> {
	root: OctreeNode<T>,
}

impl<T: Clone> Octree<T> {
	pub fn new(bounds: AABB) -> Self {
		Self {
			root: OctreeNode::new(bounds, 0),
		}
	}

	pub fn ins(&mut self, bounds: AABB, item: T) -> bool {
		self.root.ins(bounds, item)
	}

	pub fn query(&self, bounds: &AABB) -> Vec<T> {
		let mut result = Vec::new();
		self.root.query(bounds, &mut result);
		result
	}

	pub fn query_point(&self, point: &Vec3) -> Vec<T> {
		let mut result = Vec::new();
		self.root.query_point(point, &mut result);
		result
	}

	pub fn clr(&mut self) {
		self.root.clr();
	}
}
