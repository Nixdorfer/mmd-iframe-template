use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::atomic::{AtomicUsize, Ordering};

pub const CHUNK_SIZE: usize = 32;
pub const CHUNK_HEIGHT: usize = 64;

static CHUNK_HEIGHT_CFG: AtomicUsize = AtomicUsize::new(64);

pub fn set_chunk_height(h: usize) {
	CHUNK_HEIGHT_CFG.store(h, Ordering::SeqCst);
}

pub fn get_chunk_height() -> usize {
	CHUNK_HEIGHT_CFG.load(Ordering::SeqCst)
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct ChunkPos {
	pub x: i32,
	pub y: i32,
	pub z: i32,
}

impl ChunkPos {
	pub fn new(x: i32, y: i32, z: i32) -> Self {
		Self { x, y, z }
	}

	pub fn from_world(wx: f32, wy: f32, wz: f32) -> Self {
		let h = get_chunk_height() as f32;
		Self {
			x: (wx / CHUNK_SIZE as f32).floor() as i32,
			y: (wy / CHUNK_SIZE as f32).floor() as i32,
			z: (wz / h).floor() as i32,
		}
	}

	pub fn world_origin(&self) -> (f32, f32, f32) {
		let h = get_chunk_height() as f32;
		(
			self.x as f32 * CHUNK_SIZE as f32,
			self.y as f32 * CHUNK_SIZE as f32,
			self.z as f32 * h,
		)
	}

	pub fn neighbors(&self) -> [ChunkPos; 26] {
		let mut res = [ChunkPos::new(0, 0, 0); 26];
		let mut idx = 0;
		for dz in -1..=1 {
			for dy in -1..=1 {
				for dx in -1..=1 {
					if dx == 0 && dy == 0 && dz == 0 {
						continue;
					}
					res[idx] = ChunkPos::new(self.x + dx, self.y + dy, self.z + dz);
					idx += 1;
				}
			}
		}
		res
	}
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct BlockId(pub u16);

impl Default for BlockId {
	fn default() -> Self {
		Self(0)
	}
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChunkData {
	pub pos: ChunkPos,
	pub blocks: Vec<BlockId>,
	pub dirty: bool,
	pub gen: bool,
}

impl ChunkData {
	pub fn new(pos: ChunkPos) -> Self {
		Self {
			pos,
			blocks: vec![BlockId(0); CHUNK_SIZE * CHUNK_SIZE * CHUNK_HEIGHT],
			dirty: true,
			gen: false,
		}
	}

	fn idx(x: usize, y: usize, z: usize) -> usize {
		z * CHUNK_SIZE * CHUNK_SIZE + y * CHUNK_SIZE + x
	}

	pub fn get(&self, x: usize, y: usize, z: usize) -> BlockId {
		if x >= CHUNK_SIZE || y >= CHUNK_SIZE || z >= CHUNK_HEIGHT {
			return BlockId(0);
		}
		self.blocks[Self::idx(x, y, z)]
	}

	pub fn set(&mut self, x: usize, y: usize, z: usize, block: BlockId) {
		if x >= CHUNK_SIZE || y >= CHUNK_SIZE || z >= CHUNK_HEIGHT {
			return;
		}
		let idx = Self::idx(x, y, z);
		if self.blocks[idx] != block {
			self.blocks[idx] = block;
			self.dirty = true;
		}
	}

	pub fn fill(&mut self, block: BlockId) {
		self.blocks.fill(block);
		self.dirty = true;
	}

	pub fn fill_layer(&mut self, z: usize, block: BlockId) {
		if z >= CHUNK_HEIGHT {
			return;
		}
		let start = z * CHUNK_SIZE * CHUNK_SIZE;
		let end = start + CHUNK_SIZE * CHUNK_SIZE;
		self.blocks[start..end].fill(block);
		self.dirty = true;
	}
}

pub struct ChunkManager {
	chunks: HashMap<ChunkPos, ChunkData>,
	load_dist: i32,
}

impl Default for ChunkManager {
	fn default() -> Self {
		Self::new(3)
	}
}

impl ChunkManager {
	pub fn new(load_dist: i32) -> Self {
		Self {
			chunks: HashMap::new(),
			load_dist,
		}
	}

	pub fn get(&self, pos: &ChunkPos) -> Option<&ChunkData> {
		self.chunks.get(pos)
	}

	pub fn get_mut(&mut self, pos: &ChunkPos) -> Option<&mut ChunkData> {
		self.chunks.get_mut(pos)
	}

	pub fn load(&mut self, pos: ChunkPos) -> &mut ChunkData {
		self.chunks.entry(pos).or_insert_with(|| ChunkData::new(pos))
	}

	pub fn unload(&mut self, pos: &ChunkPos) -> Option<ChunkData> {
		self.chunks.remove(pos)
	}

	pub fn upd_around(&mut self, center: ChunkPos) -> Vec<ChunkPos> {
		let mut to_load = Vec::new();
		let mut to_unload = Vec::new();
		for z in -self.load_dist..=self.load_dist {
			for y in -self.load_dist..=self.load_dist {
				for x in -self.load_dist..=self.load_dist {
					let pos = ChunkPos::new(center.x + x, center.y + y, center.z + z);
					if !self.chunks.contains_key(&pos) {
						to_load.push(pos);
					}
				}
			}
		}
		for pos in self.chunks.keys() {
			let dx = (pos.x - center.x).abs();
			let dy = (pos.y - center.y).abs();
			let dz = (pos.z - center.z).abs();
			if dx > self.load_dist + 1 || dy > self.load_dist + 1 || dz > self.load_dist + 1 {
				to_unload.push(*pos);
			}
		}
		for pos in &to_unload {
			self.chunks.remove(pos);
		}
		for pos in &to_load {
			self.chunks.insert(*pos, ChunkData::new(*pos));
		}
		to_load
	}

	pub fn dirty_chunks(&self) -> Vec<ChunkPos> {
		self.chunks
			.iter()
			.filter(|(_, c)| c.dirty)
			.map(|(p, _)| *p)
			.collect()
	}

	pub fn mark_clean(&mut self, pos: &ChunkPos) {
		if let Some(chunk) = self.chunks.get_mut(pos) {
			chunk.dirty = false;
		}
	}

	pub fn cnt(&self) -> usize {
		self.chunks.len()
	}
}
