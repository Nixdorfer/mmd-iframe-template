use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Perlin {
	perm: [usize; 512],
	grad: [[f32; 3]; 16],
}

impl Default for Perlin {
	fn default() -> Self {
		Self::new(0)
	}
}

impl Perlin {
	pub fn new(seed: u64) -> Self {
		let mut perm = [0usize; 512];
		let mut p: Vec<usize> = (0..256).collect();
		let mut rng = seed;
		for i in (1..256).rev() {
			rng = rng.wrapping_mul(6364136223846793005).wrapping_add(1);
			let j = ((rng >> 33) as usize) % (i + 1);
			p.swap(i, j);
		}
		for i in 0..256 {
			perm[i] = p[i];
			perm[i + 256] = p[i];
		}
		let grad = [
			[1.0, 1.0, 0.0], [-1.0, 1.0, 0.0], [1.0, -1.0, 0.0], [-1.0, -1.0, 0.0],
			[1.0, 0.0, 1.0], [-1.0, 0.0, 1.0], [1.0, 0.0, -1.0], [-1.0, 0.0, -1.0],
			[0.0, 1.0, 1.0], [0.0, -1.0, 1.0], [0.0, 1.0, -1.0], [0.0, -1.0, -1.0],
			[1.0, 1.0, 0.0], [-1.0, 1.0, 0.0], [0.0, -1.0, 1.0], [0.0, -1.0, -1.0],
		];
		Self { perm, grad }
	}

	fn fade(t: f32) -> f32 {
		t * t * t * (t * (t * 6.0 - 15.0) + 10.0)
	}

	fn lrp(a: f32, b: f32, t: f32) -> f32 {
		a + t * (b - a)
	}

	fn grad_dot(&self, hash: usize, x: f32, y: f32, z: f32) -> f32 {
		let g = &self.grad[hash & 15];
		g[0] * x + g[1] * y + g[2] * z
	}

	pub fn noise3d(&self, x: f32, y: f32, z: f32) -> f32 {
		let xi = (x.floor() as i32 & 255) as usize;
		let yi = (y.floor() as i32 & 255) as usize;
		let zi = (z.floor() as i32 & 255) as usize;
		let xf = x - x.floor();
		let yf = y - y.floor();
		let zf = z - z.floor();
		let u = Self::fade(xf);
		let v = Self::fade(yf);
		let w = Self::fade(zf);
		let aaa = self.perm[self.perm[self.perm[xi] + yi] + zi];
		let aba = self.perm[self.perm[self.perm[xi] + yi + 1] + zi];
		let aab = self.perm[self.perm[self.perm[xi] + yi] + zi + 1];
		let abb = self.perm[self.perm[self.perm[xi] + yi + 1] + zi + 1];
		let baa = self.perm[self.perm[self.perm[xi + 1] + yi] + zi];
		let bba = self.perm[self.perm[self.perm[xi + 1] + yi + 1] + zi];
		let bab = self.perm[self.perm[self.perm[xi + 1] + yi] + zi + 1];
		let bbb = self.perm[self.perm[self.perm[xi + 1] + yi + 1] + zi + 1];
		let x1 = Self::lrp(
			self.grad_dot(aaa, xf, yf, zf),
			self.grad_dot(baa, xf - 1.0, yf, zf),
			u,
		);
		let x2 = Self::lrp(
			self.grad_dot(aba, xf, yf - 1.0, zf),
			self.grad_dot(bba, xf - 1.0, yf - 1.0, zf),
			u,
		);
		let y1 = Self::lrp(x1, x2, v);
		let x3 = Self::lrp(
			self.grad_dot(aab, xf, yf, zf - 1.0),
			self.grad_dot(bab, xf - 1.0, yf, zf - 1.0),
			u,
		);
		let x4 = Self::lrp(
			self.grad_dot(abb, xf, yf - 1.0, zf - 1.0),
			self.grad_dot(bbb, xf - 1.0, yf - 1.0, zf - 1.0),
			u,
		);
		let y2 = Self::lrp(x3, x4, v);
		(Self::lrp(y1, y2, w) + 1.0) * 0.5
	}

	pub fn noise2d(&self, x: f32, y: f32) -> f32 {
		self.noise3d(x, y, 0.0)
	}

	pub fn fbm3d(&self, x: f32, y: f32, z: f32, octaves: u32, persistence: f32) -> f32 {
		let mut total = 0.0;
		let mut frequency = 1.0;
		let mut amplitude = 1.0;
		let mut max_value = 0.0;
		for _ in 0..octaves {
			total += self.noise3d(x * frequency, y * frequency, z * frequency) * amplitude;
			max_value += amplitude;
			amplitude *= persistence;
			frequency *= 2.0;
		}
		total / max_value
	}

	pub fn fbm2d(&self, x: f32, y: f32, octaves: u32, persistence: f32) -> f32 {
		self.fbm3d(x, y, 0.0, octaves, persistence)
	}
}
