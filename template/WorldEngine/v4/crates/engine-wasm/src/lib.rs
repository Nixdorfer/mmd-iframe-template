use wasm_bindgen::prelude::*;
use engine_core::{
	math::{Vec3, Mat4, Quat, Perlin},
	ecs::{World, EntityId},
	physics::{AABB, Collider, RigidBody, test_aabb_aabb, test_sphere_sphere},
	spatial::{ChunkPos, ChunkData, ChunkManager, CHUNK_SIZE, CHUNK_HEIGHT, set_chunk_height},
	pathfind::{PathFinder, PathNode},
	snapshot::{Snapshot, SnapshotBuffer},
};
use std::collections::HashMap;

#[wasm_bindgen(start)]
pub fn init() {
	console_error_panic_hook::set_once();
}

#[wasm_bindgen]
pub struct WasmVec3 {
	inner: Vec3,
}

#[wasm_bindgen]
impl WasmVec3 {
	#[wasm_bindgen(constructor)]
	pub fn new(x: f32, y: f32, z: f32) -> Self {
		Self { inner: Vec3::new(x, y, z) }
	}

	pub fn x(&self) -> f32 { self.inner.x }
	pub fn y(&self) -> f32 { self.inner.y }
	pub fn z(&self) -> f32 { self.inner.z }

	pub fn add(&self, other: &WasmVec3) -> WasmVec3 {
		WasmVec3 { inner: self.inner.add(&other.inner) }
	}

	pub fn sub(&self, other: &WasmVec3) -> WasmVec3 {
		WasmVec3 { inner: self.inner.sub(&other.inner) }
	}

	pub fn mul(&self, scalar: f32) -> WasmVec3 {
		WasmVec3 { inner: self.inner.mul(scalar) }
	}

	pub fn dot(&self, other: &WasmVec3) -> f32 {
		self.inner.dot(&other.inner)
	}

	pub fn cross(&self, other: &WasmVec3) -> WasmVec3 {
		WasmVec3 { inner: self.inner.cross(&other.inner) }
	}

	pub fn len(&self) -> f32 { self.inner.len() }

	pub fn nrm(&self) -> WasmVec3 {
		WasmVec3 { inner: self.inner.nrm() }
	}

	pub fn lrp(&self, other: &WasmVec3, t: f32) -> WasmVec3 {
		WasmVec3 { inner: self.inner.lrp(&other.inner, t) }
	}
}

#[wasm_bindgen]
pub struct WasmMat4 {
	inner: Mat4,
}

#[wasm_bindgen]
impl WasmMat4 {
	#[wasm_bindgen(constructor)]
	pub fn new() -> Self {
		Self { inner: Mat4::identity() }
	}

	pub fn identity() -> WasmMat4 {
		WasmMat4 { inner: Mat4::identity() }
	}

	pub fn trs(x: f32, y: f32, z: f32) -> WasmMat4 {
		WasmMat4 { inner: Mat4::trs(&Vec3::new(x, y, z)) }
	}

	pub fn scl(x: f32, y: f32, z: f32) -> WasmMat4 {
		WasmMat4 { inner: Mat4::scl(&Vec3::new(x, y, z)) }
	}

	pub fn rot_x(rad: f32) -> WasmMat4 {
		WasmMat4 { inner: Mat4::rot_x(rad) }
	}

	pub fn rot_y(rad: f32) -> WasmMat4 {
		WasmMat4 { inner: Mat4::rot_y(rad) }
	}

	pub fn rot_z(rad: f32) -> WasmMat4 {
		WasmMat4 { inner: Mat4::rot_z(rad) }
	}

	pub fn mul(&self, other: &WasmMat4) -> WasmMat4 {
		WasmMat4 { inner: self.inner.mul(&other.inner) }
	}

	pub fn perspective(fov: f32, aspect: f32, near: f32, far: f32) -> WasmMat4 {
		WasmMat4 { inner: Mat4::perspective(fov, aspect, near, far) }
	}

	pub fn look_at(
		eye_x: f32, eye_y: f32, eye_z: f32,
		tgt_x: f32, tgt_y: f32, tgt_z: f32,
		up_x: f32, up_y: f32, up_z: f32
	) -> WasmMat4 {
		WasmMat4 {
			inner: Mat4::look_at(
				&Vec3::new(eye_x, eye_y, eye_z),
				&Vec3::new(tgt_x, tgt_y, tgt_z),
				&Vec3::new(up_x, up_y, up_z),
			)
		}
	}

	pub fn as_array(&self) -> Vec<f32> {
		self.inner.m.to_vec()
	}
}

#[wasm_bindgen]
pub struct WasmPerlin {
	inner: Perlin,
}

#[wasm_bindgen]
impl WasmPerlin {
	#[wasm_bindgen(constructor)]
	pub fn new(seed: u64) -> Self {
		Self { inner: Perlin::new(seed) }
	}

	pub fn noise2d(&self, x: f32, y: f32) -> f32 {
		self.inner.noise2d(x, y)
	}

	pub fn noise3d(&self, x: f32, y: f32, z: f32) -> f32 {
		self.inner.noise3d(x, y, z)
	}

	pub fn fbm2d(&self, x: f32, y: f32, octaves: u32, persistence: f32) -> f32 {
		self.inner.fbm2d(x, y, octaves, persistence)
	}

	pub fn fbm3d(&self, x: f32, y: f32, z: f32, octaves: u32, persistence: f32) -> f32 {
		self.inner.fbm3d(x, y, z, octaves, persistence)
	}
}

#[wasm_bindgen]
pub struct WasmWorld {
	inner: World,
}

#[wasm_bindgen]
impl WasmWorld {
	#[wasm_bindgen(constructor)]
	pub fn new() -> Self {
		Self { inner: World::new() }
	}

	pub fn spawn(&mut self) -> u64 {
		self.inner.spawn().0
	}

	pub fn spawn_named(&mut self, name: &str) -> u64 {
		self.inner.spawn_named(name).0
	}

	pub fn despawn(&mut self, id: u64) -> bool {
		self.inner.despawn(EntityId(id))
	}

	pub fn cnt(&self) -> usize {
		self.inner.cnt()
	}

	pub fn clr(&mut self) {
		self.inner.clr();
	}
}

#[wasm_bindgen]
pub struct WasmChunkManager {
	inner: ChunkManager,
}

#[wasm_bindgen]
impl WasmChunkManager {
	#[wasm_bindgen(constructor)]
	pub fn new(load_dist: i32) -> Self {
		Self { inner: ChunkManager::new(load_dist) }
	}

	pub fn load(&mut self, x: i32, y: i32, z: i32) {
		self.inner.load(ChunkPos::new(x, y, z));
	}

	pub fn unload(&mut self, x: i32, y: i32, z: i32) {
		self.inner.unload(&ChunkPos::new(x, y, z));
	}

	pub fn get_block(&self, cx: i32, cy: i32, cz: i32, lx: usize, ly: usize, lz: usize) -> u16 {
		self.inner
			.get(&ChunkPos::new(cx, cy, cz))
			.map(|c| c.get(lx, ly, lz).0)
			.unwrap_or(0)
	}

	pub fn set_block(&mut self, cx: i32, cy: i32, cz: i32, lx: usize, ly: usize, lz: usize, block: u16) {
		if let Some(chunk) = self.inner.get_mut(&ChunkPos::new(cx, cy, cz)) {
			chunk.set(lx, ly, lz, engine_core::spatial::chunk::BlockId(block));
		}
	}

	pub fn upd_around(&mut self, cx: i32, cy: i32, cz: i32) -> Vec<i32> {
		let loaded = self.inner.upd_around(ChunkPos::new(cx, cy, cz));
		loaded.iter().flat_map(|p| [p.x, p.y, p.z]).collect()
	}

	pub fn cnt(&self) -> usize {
		self.inner.cnt()
	}

	pub fn chunk_size() -> usize { CHUNK_SIZE }
	pub fn chunk_height() -> usize { CHUNK_HEIGHT }
	pub fn set_chunk_height(h: usize) { set_chunk_height(h); }
}

#[wasm_bindgen]
pub struct WasmPathFinder {
	inner: PathFinder,
}

#[wasm_bindgen]
impl WasmPathFinder {
	#[wasm_bindgen(constructor)]
	pub fn new(max_iter: usize, allow_diag: bool) -> Self {
		Self {
			inner: PathFinder::new().with_max_iter(max_iter).with_diag(allow_diag)
		}
	}
}

#[wasm_bindgen]
pub fn find_path(
	start_x: i32, start_y: i32, start_z: i32,
	goal_x: i32, goal_y: i32, goal_z: i32,
	walkable: &js_sys::Function,
	max_iter: usize
) -> Vec<i32> {
	let finder = PathFinder::new().with_max_iter(max_iter);
	let start = PathNode::new(start_x, start_y, start_z);
	let goal = PathNode::new(goal_x, goal_y, goal_z);
	let result = finder.find(start, goal, |node| {
		let this = JsValue::NULL;
		let x = JsValue::from(node.x);
		let y = JsValue::from(node.y);
		let z = JsValue::from(node.z);
		walkable.call3(&this, &x, &y, &z)
			.map(|v| v.as_bool().unwrap_or(false))
			.unwrap_or(false)
	});
	if result.found {
		result.path.iter().flat_map(|n| [n.x, n.y, n.z]).collect()
	} else {
		vec![]
	}
}

#[wasm_bindgen]
pub fn test_aabb(
	a_min_x: f32, a_min_y: f32, a_min_z: f32,
	a_max_x: f32, a_max_y: f32, a_max_z: f32,
	b_min_x: f32, b_min_y: f32, b_min_z: f32,
	b_max_x: f32, b_max_y: f32, b_max_z: f32
) -> bool {
	let a = AABB::new(
		Vec3::new(a_min_x, a_min_y, a_min_z),
		Vec3::new(a_max_x, a_max_y, a_max_z)
	);
	let b = AABB::new(
		Vec3::new(b_min_x, b_min_y, b_min_z),
		Vec3::new(b_max_x, b_max_y, b_max_z)
	);
	a.intersects(&b)
}

#[wasm_bindgen]
pub fn col_aabb_detail(
	a_min_x: f32, a_min_y: f32, a_min_z: f32,
	a_max_x: f32, a_max_y: f32, a_max_z: f32,
	b_min_x: f32, b_min_y: f32, b_min_z: f32,
	b_max_x: f32, b_max_y: f32, b_max_z: f32
) -> Vec<f32> {
	let a = AABB::new(
		Vec3::new(a_min_x, a_min_y, a_min_z),
		Vec3::new(a_max_x, a_max_y, a_max_z)
	);
	let b = AABB::new(
		Vec3::new(b_min_x, b_min_y, b_min_z),
		Vec3::new(b_max_x, b_max_y, b_max_z)
	);
	match test_aabb_aabb(&a, &b) {
		Some(col) => vec![
			1.0,
			col.normal.x, col.normal.y, col.normal.z,
			col.depth,
			col.point.x, col.point.y, col.point.z
		],
		None => vec![0.0]
	}
}

#[wasm_bindgen]
pub fn col_sphere(
	ax: f32, ay: f32, az: f32, ar: f32,
	bx: f32, by: f32, bz: f32, br: f32
) -> Vec<f32> {
	let pa = Vec3::new(ax, ay, az);
	let pb = Vec3::new(bx, by, bz);
	match test_sphere_sphere(&pa, ar, &pb, br) {
		Some(col) => vec![
			1.0,
			col.normal.x, col.normal.y, col.normal.z,
			col.depth,
			col.point.x, col.point.y, col.point.z
		],
		None => vec![0.0]
	}
}

#[wasm_bindgen]
pub fn batch_aabb_test(data: &[f32]) -> Vec<u8> {
	let cnt = data.len() / 12;
	let mut results = Vec::with_capacity(cnt * cnt / 8 + 1);
	for _ in 0..((cnt * cnt + 7) / 8) {
		results.push(0u8);
	}
	for i in 0..cnt {
		let ai = i * 12;
		let a = AABB::new(
			Vec3::new(data[ai], data[ai + 1], data[ai + 2]),
			Vec3::new(data[ai + 3], data[ai + 4], data[ai + 5])
		);
		for j in (i + 1)..cnt {
			let bi = j * 12;
			let b = AABB::new(
				Vec3::new(data[bi], data[bi + 1], data[bi + 2]),
				Vec3::new(data[bi + 3], data[bi + 4], data[bi + 5])
			);
			if a.intersects(&b) {
				let idx = i * cnt + j;
				results[idx / 8] |= 1 << (idx % 8);
			}
		}
	}
	results
}

#[wasm_bindgen]
pub struct WasmCollider {
	inner: Collider,
}

#[wasm_bindgen]
impl WasmCollider {
	pub fn box_col(sx: f32, sy: f32, sz: f32) -> WasmCollider {
		WasmCollider { inner: Collider::box_col(Vec3::new(sx, sy, sz)) }
	}

	pub fn sphere(r: f32) -> WasmCollider {
		WasmCollider { inner: Collider::sphere(r) }
	}

	pub fn capsule(r: f32, h: f32) -> WasmCollider {
		WasmCollider { inner: Collider::capsule(r, h) }
	}

	pub fn set_offset(&mut self, x: f32, y: f32, z: f32) {
		self.inner.offset = Vec3::new(x, y, z);
	}

	pub fn set_trg(&mut self, is_trg: bool) {
		self.inner.is_trg = is_trg;
	}

	pub fn aabb(&self, px: f32, py: f32, pz: f32) -> Vec<f32> {
		let pos = Vec3::new(px, py, pz);
		let aabb = self.inner.aabb(&pos);
		vec![aabb.min.x, aabb.min.y, aabb.min.z, aabb.max.x, aabb.max.y, aabb.max.z]
	}
}

#[wasm_bindgen]
pub struct WasmPhysicsWorld {
	bodies: HashMap<u64, (Vec3, Vec3, Vec3, f32, bool)>,
	colliders: HashMap<u64, Collider>,
	gravity: Vec3,
}

#[wasm_bindgen]
impl WasmPhysicsWorld {
	#[wasm_bindgen(constructor)]
	pub fn new() -> Self {
		Self {
			bodies: HashMap::new(),
			colliders: HashMap::new(),
			gravity: Vec3::new(0.0, -9.81, 0.0),
		}
	}

	pub fn set_gravity(&mut self, x: f32, y: f32, z: f32) {
		self.gravity = Vec3::new(x, y, z);
	}

	pub fn add_body(&mut self, id: u64, mass: f32) {
		self.bodies.insert(id, (Vec3::ZERO, Vec3::ZERO, Vec3::ZERO, mass, false));
	}

	pub fn add_box_col(&mut self, id: u64, sx: f32, sy: f32, sz: f32) {
		self.colliders.insert(id, Collider::box_col(Vec3::new(sx, sy, sz)));
	}

	pub fn add_sphere_col(&mut self, id: u64, r: f32) {
		self.colliders.insert(id, Collider::sphere(r));
	}

	pub fn set_pos(&mut self, id: u64, x: f32, y: f32, z: f32) {
		if let Some(body) = self.bodies.get_mut(&id) {
			body.0 = Vec3::new(x, y, z);
		}
	}

	pub fn set_vel(&mut self, id: u64, x: f32, y: f32, z: f32) {
		if let Some(body) = self.bodies.get_mut(&id) {
			body.1 = Vec3::new(x, y, z);
		}
	}

	pub fn remove(&mut self, id: u64) {
		self.bodies.remove(&id);
		self.colliders.remove(&id);
	}

	pub fn step(&mut self, dt: f32) -> Vec<f32> {
		let ids: Vec<u64> = self.bodies.keys().copied().collect();
		for &id in &ids {
			if let Some(body) = self.bodies.get_mut(&id) {
				if body.3 > 0.0 {
					body.1.x += self.gravity.x * dt;
					body.1.y += self.gravity.y * dt;
					body.1.z += self.gravity.z * dt;
					body.0.x += body.1.x * dt;
					body.0.y += body.1.y * dt;
					body.0.z += body.1.z * dt;
				}
			}
		}
		let mut collisions = Vec::new();
		for i in 0..ids.len() {
			for j in (i + 1)..ids.len() {
				let id_a = ids[i];
				let id_b = ids[j];
				if let (Some(col_a), Some(col_b)) = (self.colliders.get(&id_a), self.colliders.get(&id_b)) {
					if let (Some(body_a), Some(body_b)) = (self.bodies.get(&id_a), self.bodies.get(&id_b)) {
						let aabb_a = col_a.aabb(&body_a.0);
						let aabb_b = col_b.aabb(&body_b.0);
						if let Some(col) = test_aabb_aabb(&aabb_a, &aabb_b) {
							collisions.push(id_a as f32);
							collisions.push(id_b as f32);
							collisions.push(col.normal.x);
							collisions.push(col.normal.y);
							collisions.push(col.normal.z);
							collisions.push(col.depth);
						}
					}
				}
			}
		}
		collisions
	}

	pub fn get_states(&self) -> Vec<f32> {
		let mut result = Vec::with_capacity(self.bodies.len() * 7);
		for (&id, body) in &self.bodies {
			result.push(id as f32);
			result.push(body.0.x);
			result.push(body.0.y);
			result.push(body.0.z);
			result.push(body.1.x);
			result.push(body.1.y);
			result.push(body.1.z);
		}
		result
	}

	pub fn cnt(&self) -> usize {
		self.bodies.len()
	}

	pub fn clr(&mut self) {
		self.bodies.clear();
		self.colliders.clear();
	}
}

#[wasm_bindgen]
pub fn batch_find_path(
	starts: &[i32],
	goals: &[i32],
	walkable: &js_sys::Function,
	max_iter: usize
) -> Vec<i32> {
	let finder = PathFinder::new().with_max_iter(max_iter);
	let cnt = starts.len() / 3;
	let mut results = Vec::new();
	for i in 0..cnt {
		let si = i * 3;
		let start = PathNode::new(starts[si], starts[si + 1], starts[si + 2]);
		let goal = PathNode::new(goals[si], goals[si + 1], goals[si + 2]);
		let result = finder.find(start, goal, |node| {
			let this = JsValue::NULL;
			let x = JsValue::from(node.x);
			let y = JsValue::from(node.y);
			let z = JsValue::from(node.z);
			walkable.call3(&this, &x, &y, &z)
				.map(|v| v.as_bool().unwrap_or(false))
				.unwrap_or(false)
		});
		results.push(result.path.len() as i32);
		for n in &result.path {
			results.push(n.x);
			results.push(n.y);
			results.push(n.z);
		}
	}
	results
}
