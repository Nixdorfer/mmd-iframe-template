use std::collections::{BinaryHeap, HashMap, HashSet};
use std::cmp::Ordering;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct PathNode {
	pub x: i32,
	pub y: i32,
	pub z: i32,
}

impl PathNode {
	pub fn new(x: i32, y: i32, z: i32) -> Self {
		Self { x, y, z }
	}

	pub fn dist_sq(&self, other: &Self) -> i32 {
		let dx = self.x - other.x;
		let dy = self.y - other.y;
		let dz = self.z - other.z;
		dx * dx + dy * dy + dz * dz
	}

	pub fn manhattan(&self, other: &Self) -> i32 {
		(self.x - other.x).abs() + (self.y - other.y).abs() + (self.z - other.z).abs()
	}
}

#[derive(Debug, Clone)]
struct OpenNode {
	node: PathNode,
	g: i32,
	f: i32,
}

impl PartialEq for OpenNode {
	fn eq(&self, other: &Self) -> bool {
		self.f == other.f
	}
}

impl Eq for OpenNode {}

impl Ord for OpenNode {
	fn cmp(&self, other: &Self) -> Ordering {
		other.f.cmp(&self.f)
	}
}

impl PartialOrd for OpenNode {
	fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
		Some(self.cmp(other))
	}
}

#[derive(Debug, Clone)]
pub struct PathResult {
	pub path: Vec<PathNode>,
	pub found: bool,
	pub cost: i32,
}

pub struct PathFinder {
	max_iter: usize,
	allow_diag: bool,
}

impl Default for PathFinder {
	fn default() -> Self {
		Self::new()
	}
}

impl PathFinder {
	pub fn new() -> Self {
		Self {
			max_iter: 10000,
			allow_diag: true,
		}
	}

	pub fn with_max_iter(mut self, max_iter: usize) -> Self {
		self.max_iter = max_iter;
		self
	}

	pub fn with_diag(mut self, allow: bool) -> Self {
		self.allow_diag = allow;
		self
	}

	fn neighbors(&self, node: &PathNode) -> Vec<PathNode> {
		let mut result = Vec::with_capacity(26);
		for dx in -1..=1 {
			for dy in -1..=1 {
				for dz in -1..=1 {
					if dx == 0 && dy == 0 && dz == 0 {
						continue;
					}
					if !self.allow_diag && (dx.abs() + dy.abs() + dz.abs()) > 1 {
						continue;
					}
					result.push(PathNode::new(node.x + dx, node.y + dy, node.z + dz));
				}
			}
		}
		result
	}

	fn heuristic(&self, a: &PathNode, b: &PathNode) -> i32 {
		if self.allow_diag {
			let dx = (a.x - b.x).abs();
			let dy = (a.y - b.y).abs();
			let dz = (a.z - b.z).abs();
			let min1 = dx.min(dy).min(dz);
			let max1 = dx.max(dy).max(dz);
			let mid1 = dx + dy + dz - min1 - max1;
			min1 * 17 + (mid1 - min1) * 14 + (max1 - mid1) * 10
		} else {
			a.manhattan(b) * 10
		}
	}

	fn move_cost(&self, from: &PathNode, to: &PathNode) -> i32 {
		let dx = (from.x - to.x).abs();
		let dy = (from.y - to.y).abs();
		let dz = (from.z - to.z).abs();
		let diag = dx + dy + dz;
		match diag {
			1 => 10,
			2 => 14,
			3 => 17,
			_ => 10,
		}
	}

	pub fn find<F>(&self, start: PathNode, goal: PathNode, is_walkable: F) -> PathResult
	where
		F: Fn(&PathNode) -> bool,
	{
		let mut open = BinaryHeap::new();
		let mut closed = HashSet::new();
		let mut came_from: HashMap<PathNode, PathNode> = HashMap::new();
		let mut g_score: HashMap<PathNode, i32> = HashMap::new();
		if !is_walkable(&start) || !is_walkable(&goal) {
			return PathResult { path: vec![], found: false, cost: 0 };
		}
		let h = self.heuristic(&start, &goal);
		open.push(OpenNode { node: start, g: 0, f: h });
		g_score.insert(start, 0);
		let mut iterations = 0;
		while let Some(current) = open.pop() {
			iterations += 1;
			if iterations > self.max_iter {
				break;
			}
			if current.node == goal {
				let mut path = vec![goal];
				let mut node = goal;
				while let Some(&prev) = came_from.get(&node) {
					path.push(prev);
					node = prev;
				}
				path.reverse();
				return PathResult {
					path,
					found: true,
					cost: current.g,
				};
			}
			if closed.contains(&current.node) {
				continue;
			}
			closed.insert(current.node);
			for neighbor in self.neighbors(&current.node) {
				if closed.contains(&neighbor) || !is_walkable(&neighbor) {
					continue;
				}
				let tentative_g = current.g + self.move_cost(&current.node, &neighbor);
				let prev_g = g_score.get(&neighbor).copied().unwrap_or(i32::MAX);
				if tentative_g < prev_g {
					came_from.insert(neighbor, current.node);
					g_score.insert(neighbor, tentative_g);
					let h = self.heuristic(&neighbor, &goal);
					open.push(OpenNode {
						node: neighbor,
						g: tentative_g,
						f: tentative_g + h,
					});
				}
			}
		}
		PathResult { path: vec![], found: false, cost: 0 }
	}
}
