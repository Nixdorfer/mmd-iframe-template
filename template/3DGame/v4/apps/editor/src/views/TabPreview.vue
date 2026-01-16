<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useConfigStore } from '@/stores/useConfig'

const store = useConfigStore()
const cvRef = ref<HTMLCanvasElement | null>(null)

let gl: WebGL2RenderingContext | null = null
let shd: WebGLProgram | null = null
let vao: WebGLVertexArrayObject | null = null
let uMVP: WebGLUniformLocation | null = null
let uClr: WebGLUniformLocation | null = null
let uAmb: WebGLUniformLocation | null = null
let uSunDir: WebGLUniformLocation | null = null
let uSunClr: WebGLUniformLocation | null = null
let animId = 0
let camAngle = 0

const vsrc = `#version 300 es
in vec3 aPos;
in vec3 aNom;
uniform mat4 uMVP;
out vec3 vNom;
out vec3 vPos;
void main() {
	vNom = aNom;
	vPos = aPos;
	gl_Position = uMVP * vec4(aPos, 1.0);
}`

const fsrc = `#version 300 es
precision highp float;
in vec3 vNom;
in vec3 vPos;
uniform vec3 uClr;
uniform vec3 uAmb;
uniform vec3 uSunDir;
uniform vec3 uSunClr;
out vec4 fragClr;
void main() {
	vec3 nom = normalize(vNom);
	float diff = max(dot(nom, normalize(uSunDir)), 0.0);
	vec3 lighting = uAmb + uSunClr * diff;
	fragClr = vec4(uClr * lighting, 1.0);
}`

function createShader(type: number, src: string): WebGLShader | null {
	if (!gl) return null
	const s = gl.createShader(type)
	if (!s) return null
	gl.shaderSource(s, src)
	gl.compileShader(s)
	return s
}

function createCube(): Float32Array {
	const p: number[] = []
	const addFace = (verts: number[][], nom: number[]) => {
		for (const v of verts) {
			p.push(v[0] - 0.5, v[1] - 0.5, v[2] - 0.5, nom[0], nom[1], nom[2])
		}
	}
	addFace([[0,0,1],[1,0,1],[1,1,1],[0,0,1],[1,1,1],[0,1,1]], [0,0,1])
	addFace([[1,0,0],[0,0,0],[0,1,0],[1,0,0],[0,1,0],[1,1,0]], [0,0,-1])
	addFace([[1,0,1],[1,0,0],[1,1,0],[1,0,1],[1,1,0],[1,1,1]], [1,0,0])
	addFace([[0,0,0],[0,0,1],[0,1,1],[0,0,0],[0,1,1],[0,1,0]], [-1,0,0])
	addFace([[0,1,1],[1,1,1],[1,1,0],[0,1,1],[1,1,0],[0,1,0]], [0,1,0])
	addFace([[0,0,0],[1,0,0],[1,0,1],[0,0,0],[1,0,1],[0,0,1]], [0,-1,0])
	return new Float32Array(p)
}

function mul4(a: Float32Array, b: Float32Array): Float32Array {
	const r = new Float32Array(16)
	for (let i = 0; i < 4; i++) {
		for (let j = 0; j < 4; j++) {
			r[i * 4 + j] = a[i * 4] * b[j] + a[i * 4 + 1] * b[4 + j] + a[i * 4 + 2] * b[8 + j] + a[i * 4 + 3] * b[12 + j]
		}
	}
	return r
}

function persp(fov: number, asp: number, near: number, far: number): Float32Array {
	const f = 1 / Math.tan(fov / 2)
	const nf = 1 / (near - far)
	return new Float32Array([f / asp, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0])
}

function lookAt(eye: number[], tgt: number[], up: number[]): Float32Array {
	const z = [eye[0] - tgt[0], eye[1] - tgt[1], eye[2] - tgt[2]]
	const zl = Math.sqrt(z[0] * z[0] + z[1] * z[1] + z[2] * z[2])
	z[0] /= zl; z[1] /= zl; z[2] /= zl
	const x = [up[1] * z[2] - up[2] * z[1], up[2] * z[0] - up[0] * z[2], up[0] * z[1] - up[1] * z[0]]
	const xl = Math.sqrt(x[0] * x[0] + x[1] * x[1] + x[2] * x[2])
	x[0] /= xl; x[1] /= xl; x[2] /= xl
	const y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]]
	return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -x[0]*eye[0]-x[1]*eye[1]-x[2]*eye[2], -y[0]*eye[0]-y[1]*eye[1]-y[2]*eye[2], -z[0]*eye[0]-z[1]*eye[1]-z[2]*eye[2], 1])
}

function translate(x: number, y: number, z: number): Float32Array {
	return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1])
}

function scale(x: number, y: number, z: number): Float32Array {
	return new Float32Array([x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1])
}

function ini() {
	if (!cvRef.value) return
	gl = cvRef.value.getContext('webgl2', { antialias: true, alpha: false, depth: true })
	if (!gl) return
	gl.enable(gl.DEPTH_TEST)
	gl.enable(gl.CULL_FACE)
	gl.cullFace(gl.BACK)
	const vs = createShader(gl.VERTEX_SHADER, vsrc)
	const fs = createShader(gl.FRAGMENT_SHADER, fsrc)
	if (!vs || !fs) return
	shd = gl.createProgram()
	if (!shd) return
	gl.attachShader(shd, vs)
	gl.attachShader(shd, fs)
	gl.linkProgram(shd)
	gl.deleteShader(vs)
	gl.deleteShader(fs)
	uMVP = gl.getUniformLocation(shd, 'uMVP')
	uClr = gl.getUniformLocation(shd, 'uClr')
	uAmb = gl.getUniformLocation(shd, 'uAmb')
	uSunDir = gl.getUniformLocation(shd, 'uSunDir')
	uSunClr = gl.getUniformLocation(shd, 'uSunClr')
	const cubeData = createCube()
	const vbo = gl.createBuffer()
	gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
	gl.bufferData(gl.ARRAY_BUFFER, cubeData, gl.STATIC_DRAW)
	vao = gl.createVertexArray()
	gl.bindVertexArray(vao)
	gl.enableVertexAttribArray(0)
	gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0)
	gl.enableVertexAttribArray(1)
	gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12)
	gl.bindVertexArray(null)
	resize()
	loop()
}

function resize() {
	if (!cvRef.value || !gl) return
	const rect = cvRef.value.parentElement?.getBoundingClientRect()
	if (!rect) return
	cvRef.value.width = rect.width
	cvRef.value.height = rect.height
	gl.viewport(0, 0, rect.width, rect.height)
}

function drawCube(mvp: Float32Array, clr: number[]) {
	if (!gl || !shd || !vao) return
	gl.uniformMatrix4fv(uMVP, false, mvp)
	gl.uniform3f(uClr, clr[0], clr[1], clr[2])
	gl.bindVertexArray(vao)
	gl.drawArrays(gl.TRIANGLES, 0, 36)
}

function loop() {
	if (!gl || !shd || !cvRef.value) return
	camAngle += 0.005
	const w = cvRef.value.width
	const h = cvRef.value.height
	const bgClr = store.space.daylight / 200
	gl.clearColor(bgClr * 0.3, bgClr * 0.35, bgClr * 0.5, 1.0)
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
	gl.useProgram(shd)
	const light = store.space.light
	gl.uniform3f(uAmb, light.ambientR, light.ambientG, light.ambientB)
	gl.uniform3f(uSunDir, light.sunDirX, light.sunDirY, light.sunDirZ)
	gl.uniform3f(uSunClr, light.sunColorR * store.space.daylight / 100, light.sunColorG * store.space.daylight / 100, light.sunColorB * store.space.daylight / 100)
	const dist = 15
	const eyeX = Math.sin(camAngle) * dist
	const eyeZ = Math.cos(camAngle) * dist
	const proj = persp(store.world.camera.fov, w / h, store.world.camera.near, store.world.camera.far)
	const view = lookAt([eyeX, 8, eyeZ], [0, 2, 0], [0, 1, 0])
	const vp = mul4(proj, view)
	const groundMvp = mul4(vp, mul4(translate(0, -0.25, 0), scale(20, 0.5, 20)))
	drawCube(groundMvp, [0.3, 0.5, 0.3])
	const buildMvp = mul4(vp, mul4(translate(0, 2, 0), scale(3, 4, 3)))
	drawCube(buildMvp, [0.6, 0.55, 0.5])
	const roofMvp = mul4(vp, mul4(translate(0, 4.3, 0), scale(3.5, 0.6, 3.5)))
	drawCube(roofMvp, [0.5, 0.3, 0.25])
	const entClrs = [[0.8, 0.6, 0.4], [0.4, 0.6, 0.8], [0.6, 0.4, 0.6]]
	for (let i = 0; i < 3; i++) {
		const a = (i / 3) * Math.PI * 2 + camAngle * 0.5
		const x = Math.sin(a) * 5
		const z = Math.cos(a) * 5
		const entMvp = mul4(vp, mul4(translate(x, 0.75, z), scale(1, 1.5, 1)))
		drawCube(entMvp, entClrs[i])
	}
	const itemClrs = [[0.9, 0.8, 0.2], [0.2, 0.9, 0.4], [0.9, 0.3, 0.3], [0.3, 0.5, 0.9]]
	for (let i = 0; i < 4; i++) {
		const x = -6 + i * 4
		const bob = Math.sin(camAngle * 2 + i) * 0.2
		const itemMvp = mul4(vp, mul4(translate(x, 0.3 + bob, 6), scale(0.5, 0.5, 0.5)))
		drawCube(itemMvp, itemClrs[i])
	}
	animId = requestAnimationFrame(loop)
}

function cleanup() {
	if (animId) cancelAnimationFrame(animId)
	if (gl && shd) gl.deleteProgram(shd)
	if (gl && vao) gl.deleteVertexArray(vao)
}

onMounted(() => {
	ini()
	window.addEventListener('resize', resize)
})

onUnmounted(() => {
	cleanup()
	window.removeEventListener('resize', resize)
})

watch(() => [store.space.light, store.space.daylight, store.world.camera], () => {}, { deep: true })
</script>

<template>
	<div class="preview-ctn">
		<canvas ref="cvRef" class="preview-cv"></canvas>
		<div class="preview-info">
			<div class="info-item">
				<span class="info-label">日照强度</span>
				<span class="info-val">{{ store.space.daylight }}%</span>
			</div>
			<div class="info-item">
				<span class="info-label">环境光</span>
				<span class="info-val">{{ store.space.light.ambientR.toFixed(2) }}, {{ store.space.light.ambientG.toFixed(2) }}, {{ store.space.light.ambientB.toFixed(2) }}</span>
			</div>
			<div class="info-item">
				<span class="info-label">太阳方向</span>
				<span class="info-val">{{ store.space.light.sunDirX.toFixed(1) }}, {{ store.space.light.sunDirY.toFixed(1) }}, {{ store.space.light.sunDirZ.toFixed(1) }}</span>
			</div>
			<div class="info-item">
				<span class="info-label">相机FOV</span>
				<span class="info-val">{{ (store.world.camera.fov * 180 / Math.PI).toFixed(1) }}°</span>
			</div>
		</div>
	</div>
</template>

<style scoped>
.preview-ctn {
	position: relative;
	width: 100%;
	height: 100%;
	background: #1a1a1a;
}

.preview-cv {
	width: 100%;
	height: 100%;
	display: block;
}

.preview-info {
	position: absolute;
	top: 12px;
	left: 12px;
	background: rgba(0, 0, 0, 0.7);
	border-radius: 6px;
	padding: 12px 16px;
	pointer-events: none;
}

.info-item {
	display: flex;
	justify-content: space-between;
	gap: 24px;
	font-size: 12px;
	line-height: 1.8;
}

.info-label {
	color: #888;
}

.info-val {
	color: #6c9;
	font-family: monospace;
}
</style>
