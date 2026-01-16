use serde::{Deserialize, Serialize};
use std::collections::{HashMap, VecDeque};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Snapshot {
	pub tick: u64,
	pub time: f64,
	pub data: HashMap<String, Vec<u8>>,
}

impl Snapshot {
	pub fn new(tick: u64, time: f64) -> Self {
		Self {
			tick,
			time,
			data: HashMap::new(),
		}
	}

	pub fn set<T: Serialize>(&mut self, key: &str, value: &T) {
		if let Ok(bytes) = serde_json::to_vec(value) {
			self.data.insert(key.to_string(), bytes);
		}
	}

	pub fn get<T: for<'de> Deserialize<'de>>(&self, key: &str) -> Option<T> {
		self.data
			.get(key)
			.and_then(|bytes| serde_json::from_slice(bytes).ok())
	}

	pub fn keys(&self) -> impl Iterator<Item = &String> {
		self.data.keys()
	}

	pub fn size(&self) -> usize {
		self.data.values().map(|v| v.len()).sum()
	}
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DiffOp {
	Add { key: String, data: Vec<u8> },
	Del { key: String },
	Upd { key: String, data: Vec<u8> },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Diff {
	pub from_tick: u64,
	pub to_tick: u64,
	pub ops: Vec<DiffOp>,
}

impl Diff {
	pub fn cal(from: &Snapshot, to: &Snapshot) -> Self {
		let mut ops = Vec::new();
		for (key, data) in &to.data {
			match from.data.get(key) {
				Some(old_data) if old_data != data => {
					ops.push(DiffOp::Upd {
						key: key.clone(),
						data: data.clone(),
					});
				}
				None => {
					ops.push(DiffOp::Add {
						key: key.clone(),
						data: data.clone(),
					});
				}
				_ => {}
			}
		}
		for key in from.data.keys() {
			if !to.data.contains_key(key) {
				ops.push(DiffOp::Del { key: key.clone() });
			}
		}
		Self {
			from_tick: from.tick,
			to_tick: to.tick,
			ops,
		}
	}

	pub fn apply(&self, snap: &mut Snapshot) {
		for op in &self.ops {
			match op {
				DiffOp::Add { key, data } | DiffOp::Upd { key, data } => {
					snap.data.insert(key.clone(), data.clone());
				}
				DiffOp::Del { key } => {
					snap.data.remove(key);
				}
			}
		}
		snap.tick = self.to_tick;
	}
}

pub struct SnapshotBuffer {
	buf: VecDeque<Snapshot>,
	cap: usize,
}

impl Default for SnapshotBuffer {
	fn default() -> Self {
		Self::new(300)
	}
}

impl SnapshotBuffer {
	pub fn new(cap: usize) -> Self {
		Self {
			buf: VecDeque::with_capacity(cap),
			cap,
		}
	}

	pub fn push(&mut self, snap: Snapshot) {
		if self.buf.len() >= self.cap {
			self.buf.pop_front();
		}
		self.buf.push_back(snap);
	}

	pub fn get(&self, tick: u64) -> Option<&Snapshot> {
		self.buf.iter().find(|s| s.tick == tick)
	}

	pub fn latest(&self) -> Option<&Snapshot> {
		self.buf.back()
	}

	pub fn find_nearest(&self, time: f64) -> Option<&Snapshot> {
		self.buf
			.iter()
			.min_by(|a, b| {
				let da = (a.time - time).abs();
				let db = (b.time - time).abs();
				da.partial_cmp(&db).unwrap()
			})
	}

	pub fn range(&self, from: u64, to: u64) -> Vec<&Snapshot> {
		self.buf
			.iter()
			.filter(|s| s.tick >= from && s.tick <= to)
			.collect()
	}

	pub fn len(&self) -> usize {
		self.buf.len()
	}

	pub fn is_empty(&self) -> bool {
		self.buf.is_empty()
	}

	pub fn clr(&mut self) {
		self.buf.clear();
	}
}

pub struct KeyframedBuffer {
	keyframes: VecDeque<Snapshot>,
	deltas: HashMap<u64, VecDeque<Diff>>,
	keyframe_interval: u64,
	max_keyframes: usize,
	cur_keyframe_tick: u64,
	prv_snapshot: Option<Snapshot>,
}

impl KeyframedBuffer {
	pub fn new(max_seconds: u32, tick_rate: u32, keyframe_interval: u64) -> Self {
		let max_keyframes = (max_seconds as usize * tick_rate as usize) / keyframe_interval as usize;
		Self {
			keyframes: VecDeque::with_capacity(max_keyframes),
			deltas: HashMap::new(),
			keyframe_interval,
			max_keyframes,
			cur_keyframe_tick: 0,
			prv_snapshot: None,
		}
	}

	pub fn push(&mut self, snap: Snapshot) {
		let is_keyframe = snap.tick % self.keyframe_interval == 0;
		if is_keyframe {
			if self.keyframes.len() >= self.max_keyframes {
				if let Some(old) = self.keyframes.pop_front() {
					self.deltas.remove(&old.tick);
				}
			}
			self.cur_keyframe_tick = snap.tick;
			self.deltas.insert(snap.tick, VecDeque::new());
			self.keyframes.push_back(snap.clone());
		} else if let Some(ref prv) = self.prv_snapshot {
			let diff = Diff::cal(prv, &snap);
			if !diff.ops.is_empty() {
				if let Some(delta_list) = self.deltas.get_mut(&self.cur_keyframe_tick) {
					delta_list.push_back(diff);
				}
			}
		}
		self.prv_snapshot = Some(snap);
	}

	pub fn reconstruct(&self, tick: u64) -> Option<Snapshot> {
		let mut keyframe: Option<&Snapshot> = None;
		for kf in self.keyframes.iter().rev() {
			if kf.tick <= tick {
				keyframe = Some(kf);
				break;
			}
		}
		let kf = keyframe?;
		let mut result = kf.clone();
		if let Some(delta_list) = self.deltas.get(&kf.tick) {
			for diff in delta_list {
				if diff.to_tick <= tick {
					diff.apply(&mut result);
				}
			}
		}
		Some(result)
	}

	pub fn keyframe_count(&self) -> usize {
		self.keyframes.len()
	}

	pub fn delta_count(&self) -> usize {
		self.deltas.values().map(|v| v.len()).sum()
	}

	pub fn clr(&mut self) {
		self.keyframes.clear();
		self.deltas.clear();
		self.cur_keyframe_tick = 0;
		self.prv_snapshot = None;
	}
}
