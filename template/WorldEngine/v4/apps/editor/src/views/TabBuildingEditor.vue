<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'

interface BuildingPresetBlock {
	x: number
	y: number
	z: number
	blockType: string
}

interface BuildingPresetData {
	name: string
	desc: string
	tags: string[]
	sizeX: number
	sizeY: number
	sizeZ: number
	blocks: BuildingPresetBlock[]
	createdAt: number
	updatedAt: number
}

interface AssetItem {
	id: string
	name: string
	isFolder: boolean
	type: string
	data: BuildingPresetData
}

const props = defineProps<{
	item: AssetItem | null
}>()

const emit = defineEmits<{
	(e: 'close'): void
	(e: 'save', blocks: BuildingPresetBlock[]): void
}>()

const cvRef = ref<HTMLCanvasElement | null>(null)
const curBlockType = ref('stone')
const blocks = ref<BuildingPresetBlock[]>([])
const hoverPos = ref<{ x: number; y: number; z: number } | null>(null)

let gl: WebGL2RenderingContext | null = null
let shdVoxel: WebGLProgram | null = null
let shdGrid: WebGLProgram | null = null
let shdAxis: WebGLProgram | null = null
let vaoVoxel: WebGLVertexArrayObject | null = null
let vaoGrid: WebGLVertexArrayObject | null = null
let vaoAxis: WebGLVertexArrayObject | null = null
let uVPVoxel: WebGLUniformLocation | null = null
let uModelVoxel: WebGLUniformLocation | null = null
let uClrVoxel: WebGLUniformLocation | null = null
let uVPGrid: WebGLUniformLocation | null = null
let uClrGrid: WebGLUniformLocation | null = null
let uVPAxis: WebGLUniformLocation | null = null
let animId = 0
let camAz = Math.PI / 4
let camEl = -Math.PI / 6
let camDist = 30
let camTgt = [0, 5, 0]
let isDrag = false
let lastX = 0
let lastY = 0

const VOXEL_VS = `#version 300 es
precision highp float;
in vec3 aPos;
in vec3 aNom;
uniform mat4 uVP;
uniform mat4 uModel;
out vec3 vNom;
out vec3 vPos;
void main() {
	vNom = mat3(uModel) * aNom;
	vPos = (uModel * vec4(aPos, 1.0)).xyz;
	gl_Position = uVP * vec4(vPos, 1.0);
}`

const VOXEL_FS = `#version 300 es
precision highp float;
in vec3 vNom;
in vec3 vPos;
uniform vec3 uClr;
out vec4 fragClr;
void main() {
	vec3 nom = normalize(vNom);
	vec3 sunDir = normalize(vec3(0.5, 0.8, 0.3));
	float diff = max(dot(nom, sunDir), 0.0);
	vec3 amb = vec3(0.3, 0.3, 0.35);
	vec3 lighting = amb + vec3(1.0, 0.95, 0.9) * diff;
	fragClr = vec4(uClr * lighting, 1.0);
}`

const GRID_VS = `#version 300 es
precision highp float;
in vec3 aPos;
uniform mat4 uVP;
out vec3 vPos;
void main() {
	vPos = aPos;
	gl_Position = uVP * vec4(aPos, 1.0);
}`

const GRID_FS = `#version 300 es
precision highp float;
in vec3 vPos;
uniform vec4 uClr;
out vec4 fragClr;
void main() {
	float d = length(vPos.xz);
	float f = 1.0 - smoothstep(40.0, 60.0, d);
	fragClr = vec4(uClr.rgb, uClr.a * f);
}`

const AXIS_VS = `#version 300 es
precision highp float;
in vec3 aPos;
in vec3 aClr;
uniform mat4 uVP;
out vec3 vClr;
void main() {
	vClr = aClr;
	gl_Position = uVP * vec4(aPos, 1.0);
}`

const AXIS_FS = `#version 300 es
precision highp float;
in vec3 vClr;
out vec4 fragClr;
void main() {
	fragClr = vec4(vClr, 1.0);
}`

const blockTypes = [
	{ id: 'stone', name: '石头', clr: [0.5, 0.5, 0.5] },
	{ id: 'wood', name: '木头', clr: [0.6, 0.4, 0.2] },
	{ id: 'brick', name: '砖块', clr: [0.7, 0.3, 0.2] },
	{ id: 'glass', name: '玻璃', clr: [0.6, 0.8, 0.9] },
	{ id: 'metal', name: '金属', clr: [0.7, 0.7, 0.75] },
	{ id: 'dirt', name: '泥土', clr: [0.4, 0.3, 0.2] },
	{ id: 'grass', name: '草地', clr: [0.3, 0.5, 0.2] },
	{ id: 'sand', name: '沙子', clr: [0.9, 0.85, 0.6] }
]

function getBlockClr(type: string): number[] {
	const bt = blockTypes.find(b => b.id === type)
	return bt ? bt.clr : [0.5, 0.5, 0.5]
}

function crtShd(vsrc: string, fsrc: string): WebGLProgram | null {
	if (!gl) return null
	const vs = gl.createShader(gl.VERTEX_SHADER)
	const fs = gl.createShader(gl.FRAGMENT_SHADER)
	if (!vs || !fs) return null
	gl.shaderSource(vs, vsrc)
	gl.shaderSource(fs, fsrc)
	gl.compileShader(vs)
	gl.compileShader(fs)
	const prog = gl.createProgram()
	if (!prog) return null
	gl.attachShader(prog, vs)
	gl.attachShader(prog, fs)
	gl.linkProgram(prog)
	gl.deleteShader(vs)
	gl.deleteShader(fs)
	return prog
}

function crtCubeVerts(): Float32Array {
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

function crtGridVerts(size: number, step: number): Float32Array {
	const lines: number[] = []
	const half = size / 2
	for (let i = -half; i <= half; i += step) {
		lines.push(i, 0, -half, i, 0, half)
		lines.push(-half, 0, i, half, 0, i)
	}
	return new Float32Array(lines)
}

function crtAxisVerts(len: number): Float32Array {
	return new Float32Array([
		0, 0, 0, 1, 0, 0,
		len, 0, 0, 1, 0, 0,
		0, 0, 0, 0, 1, 0,
		0, len, 0, 0, 1, 0,
		0, 0, 0, 0, 0, 1,
		0, 0, len, 0, 0, 1
	])
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

function ini() {
	if (!cvRef.value) return
	gl = cvRef.value.getContext('webgl2', { antialias: true, alpha: false, depth: true })
	if (!gl) return
	gl.enable(gl.DEPTH_TEST)
	gl.enable(gl.CULL_FACE)
	gl.cullFace(gl.BACK)
	shdVoxel = crtShd(VOXEL_VS, VOXEL_FS)
	shdGrid = crtShd(GRID_VS, GRID_FS)
	shdAxis = crtShd(AXIS_VS, AXIS_FS)
	if (!shdVoxel || !shdGrid || !shdAxis) return
	uVPVoxel = gl.getUniformLocation(shdVoxel, 'uVP')
	uModelVoxel = gl.getUniformLocation(shdVoxel, 'uModel')
	uClrVoxel = gl.getUniformLocation(shdVoxel, 'uClr')
	uVPGrid = gl.getUniformLocation(shdGrid, 'uVP')
	uClrGrid = gl.getUniformLocation(shdGrid, 'uClr')
	uVPAxis = gl.getUniformLocation(shdAxis, 'uVP')
	const cubeData = crtCubeVerts()
	const vboVoxel = gl.createBuffer()
	gl.bindBuffer(gl.ARRAY_BUFFER, vboVoxel)
	gl.bufferData(gl.ARRAY_BUFFER, cubeData, gl.STATIC_DRAW)
	vaoVoxel = gl.createVertexArray()
	gl.bindVertexArray(vaoVoxel)
	gl.enableVertexAttribArray(0)
	gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0)
	gl.enableVertexAttribArray(1)
	gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12)
	gl.bindVertexArray(null)
	const gridData = crtGridVerts(64, 1)
	const vboGrid = gl.createBuffer()
	gl.bindBuffer(gl.ARRAY_BUFFER, vboGrid)
	gl.bufferData(gl.ARRAY_BUFFER, gridData, gl.STATIC_DRAW)
	vaoGrid = gl.createVertexArray()
	gl.bindVertexArray(vaoGrid)
	gl.enableVertexAttribArray(0)
	gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 12, 0)
	gl.bindVertexArray(null)
	const axisData = crtAxisVerts(10)
	const vboAxis = gl.createBuffer()
	gl.bindBuffer(gl.ARRAY_BUFFER, vboAxis)
	gl.bufferData(gl.ARRAY_BUFFER, axisData, gl.STATIC_DRAW)
	vaoAxis = gl.createVertexArray()
	gl.bindVertexArray(vaoAxis)
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

function getCamVP(): Float32Array {
	if (!cvRef.value) return new Float32Array(16)
	const w = cvRef.value.width
	const h = cvRef.value.height
	const eyeX = camTgt[0] + Math.sin(camAz) * Math.cos(camEl) * camDist
	const eyeY = camTgt[1] + Math.sin(-camEl) * camDist
	const eyeZ = camTgt[2] + Math.cos(camAz) * Math.cos(camEl) * camDist
	const proj = persp(0.785, w / h, 0.1, 1000)
	const view = lookAt([eyeX, eyeY, eyeZ], camTgt, [0, 1, 0])
	return mul4(proj, view)
}

function loop() {
	if (!gl || !cvRef.value) return
	gl.clearColor(0.12, 0.12, 0.14, 1.0)
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
	const vp = getCamVP()
	if (shdGrid && vaoGrid) {
		gl.useProgram(shdGrid)
		gl.uniformMatrix4fv(uVPGrid, false, vp)
		gl.uniform4f(uClrGrid, 0.3, 0.35, 0.3, 0.5)
		gl.bindVertexArray(vaoGrid)
		gl.drawArrays(gl.LINES, 0, 260)
	}
	if (shdAxis && vaoAxis) {
		gl.useProgram(shdAxis)
		gl.uniformMatrix4fv(uVPAxis, false, vp)
		gl.bindVertexArray(vaoAxis)
		gl.drawArrays(gl.LINES, 0, 6)
	}
	if (shdVoxel && vaoVoxel) {
		gl.useProgram(shdVoxel)
		gl.uniformMatrix4fv(uVPVoxel, false, vp)
		gl.bindVertexArray(vaoVoxel)
		for (const blk of blocks.value) {
			const model = translate(blk.x, blk.y, blk.z)
			gl.uniformMatrix4fv(uModelVoxel, false, model)
			const clr = getBlockClr(blk.blockType)
			gl.uniform3f(uClrVoxel, clr[0], clr[1], clr[2])
			gl.drawArrays(gl.TRIANGLES, 0, 36)
		}
		if (hoverPos.value) {
			const model = translate(hoverPos.value.x, hoverPos.value.y, hoverPos.value.z)
			gl.uniformMatrix4fv(uModelVoxel, false, model)
			const clr = getBlockClr(curBlockType.value)
			gl.uniform3f(uClrVoxel, clr[0] * 0.5, clr[1] * 0.5, clr[2] * 0.5)
			gl.drawArrays(gl.TRIANGLES, 0, 36)
		}
	}
	animId = requestAnimationFrame(loop)
}

function onMouseDown(e: MouseEvent) {
	if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
		isDrag = true
		lastX = e.clientX
		lastY = e.clientY
		e.preventDefault()
	} else if (e.button === 0 && !e.shiftKey) {
		placeBlock(e)
	} else if (e.button === 2) {
		delBlock(e)
	}
}

function onMouseMove(e: MouseEvent) {
	if (isDrag) {
		const dx = e.clientX - lastX
		const dy = e.clientY - lastY
		camAz += dx * 0.01
		camEl += dy * 0.01
		camEl = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, camEl))
		lastX = e.clientX
		lastY = e.clientY
	} else {
		updHoverPos(e)
	}
}

function onMouseUp() {
	isDrag = false
}

function onWheel(e: WheelEvent) {
	camDist += e.deltaY * 0.02
	camDist = Math.max(5, Math.min(100, camDist))
	e.preventDefault()
}

function onCtxMn(e: MouseEvent) {
	e.preventDefault()
}

function screenToRay(x: number, y: number): { origin: number[]; dir: number[] } {
	if (!cvRef.value) return { origin: [0, 0, 0], dir: [0, 0, -1] }
	const w = cvRef.value.width
	const h = cvRef.value.height
	const ndcX = (x / w) * 2 - 1
	const ndcY = 1 - (y / h) * 2
	const eyeX = camTgt[0] + Math.sin(camAz) * Math.cos(camEl) * camDist
	const eyeY = camTgt[1] + Math.sin(-camEl) * camDist
	const eyeZ = camTgt[2] + Math.cos(camAz) * Math.cos(camEl) * camDist
	const fov = 0.785
	const asp = w / h
	const tanFov = Math.tan(fov / 2)
	const forward = [camTgt[0] - eyeX, camTgt[1] - eyeY, camTgt[2] - eyeZ]
	const fl = Math.sqrt(forward[0] ** 2 + forward[1] ** 2 + forward[2] ** 2)
	forward[0] /= fl; forward[1] /= fl; forward[2] /= fl
	const right = [forward[1] * 0 - forward[2] * 1, forward[2] * 0 - forward[0] * 0, forward[0] * 1 - forward[1] * 0]
	const up = [0, 1, 0]
	const rl = Math.sqrt(right[0] ** 2 + right[1] ** 2 + right[2] ** 2)
	if (rl > 0.001) { right[0] /= rl; right[1] /= rl; right[2] /= rl }
	const dir = [
		forward[0] + right[0] * ndcX * tanFov * asp + up[0] * ndcY * tanFov,
		forward[1] + right[1] * ndcX * tanFov * asp + up[1] * ndcY * tanFov,
		forward[2] + right[2] * ndcX * tanFov * asp + up[2] * ndcY * tanFov
	]
	const dl = Math.sqrt(dir[0] ** 2 + dir[1] ** 2 + dir[2] ** 2)
	dir[0] /= dl; dir[1] /= dl; dir[2] /= dl
	return { origin: [eyeX, eyeY, eyeZ], dir }
}

function raycastGround(origin: number[], dir: number[]): { x: number; y: number; z: number } | null {
	if (Math.abs(dir[1]) < 0.001) return null
	const t = -origin[1] / dir[1]
	if (t < 0) return null
	const x = Math.round(origin[0] + dir[0] * t)
	const z = Math.round(origin[2] + dir[2] * t)
	return { x, y: 0, z }
}

function raycastBlocks(origin: number[], dir: number[]): { pos: { x: number; y: number; z: number }; face: number[] } | null {
	let closest: { pos: { x: number; y: number; z: number }; face: number[]; t: number } | null = null
	for (const blk of blocks.value) {
		const minX = blk.x - 0.5, maxX = blk.x + 0.5
		const minY = blk.y - 0.5, maxY = blk.y + 0.5
		const minZ = blk.z - 0.5, maxZ = blk.z + 0.5
		let tmin = -Infinity, tmax = Infinity
		let hitFace = [0, 0, 0]
		for (let i = 0; i < 3; i++) {
			const min = [minX, minY, minZ][i]
			const max = [maxX, maxY, maxZ][i]
			const o = origin[i]
			const d = dir[i]
			if (Math.abs(d) < 0.0001) {
				if (o < min || o > max) { tmin = Infinity; break }
			} else {
				let t1 = (min - o) / d
				let t2 = (max - o) / d
				let face1 = [0, 0, 0]
				let face2 = [0, 0, 0]
				face1[i] = -1
				face2[i] = 1
				if (t1 > t2) { [t1, t2] = [t2, t1]; [face1, face2] = [face2, face1] }
				if (t1 > tmin) { tmin = t1; hitFace = face1 }
				if (t2 < tmax) tmax = t2
			}
		}
		if (tmin <= tmax && tmin > 0.001 && (!closest || tmin < closest.t)) {
			closest = { pos: { x: blk.x, y: blk.y, z: blk.z }, face: hitFace, t: tmin }
		}
	}
	return closest
}

function updHoverPos(e: MouseEvent) {
	if (!cvRef.value) return
	const rect = cvRef.value.getBoundingClientRect()
	const x = e.clientX - rect.left
	const y = e.clientY - rect.top
	const ray = screenToRay(x, y)
	const hit = raycastBlocks(ray.origin, ray.dir)
	if (hit) {
		hoverPos.value = {
			x: hit.pos.x + hit.face[0],
			y: hit.pos.y + hit.face[1],
			z: hit.pos.z + hit.face[2]
		}
	} else {
		const ground = raycastGround(ray.origin, ray.dir)
		hoverPos.value = ground
	}
}

function placeBlock(e: MouseEvent) {
	if (!hoverPos.value) return
	const exists = blocks.value.some(b => b.x === hoverPos.value!.x && b.y === hoverPos.value!.y && b.z === hoverPos.value!.z)
	if (!exists) {
		blocks.value.push({ x: hoverPos.value.x, y: hoverPos.value.y, z: hoverPos.value.z, blockType: curBlockType.value })
	}
}

function delBlock(e: MouseEvent) {
	if (!cvRef.value) return
	const rect = cvRef.value.getBoundingClientRect()
	const x = e.clientX - rect.left
	const y = e.clientY - rect.top
	const ray = screenToRay(x, y)
	const hit = raycastBlocks(ray.origin, ray.dir)
	if (hit) {
		const idx = blocks.value.findIndex(b => b.x === hit.pos.x && b.y === hit.pos.y && b.z === hit.pos.z)
		if (idx >= 0) blocks.value.splice(idx, 1)
	}
}

function cleanup() {
	if (animId) cancelAnimationFrame(animId)
	if (gl && shdVoxel) gl.deleteProgram(shdVoxel)
	if (gl && shdGrid) gl.deleteProgram(shdGrid)
	if (gl && shdAxis) gl.deleteProgram(shdAxis)
	if (gl && vaoVoxel) gl.deleteVertexArray(vaoVoxel)
	if (gl && vaoGrid) gl.deleteVertexArray(vaoGrid)
	if (gl && vaoAxis) gl.deleteVertexArray(vaoAxis)
}

function savAndClose() {
	emit('save', blocks.value)
	emit('close')
}

function clrAll() {
	blocks.value = []
}

watch(() => props.item, (newItem) => {
	if (newItem && newItem.data) {
		blocks.value = [...newItem.data.blocks]
	} else {
		blocks.value = []
	}
}, { immediate: true })

onMounted(() => {
	ini()
	window.addEventListener('resize', resize)
})

onUnmounted(() => {
	cleanup()
	window.removeEventListener('resize', resize)
})

const blockCnt = computed(() => blocks.value.length)
const itemName = computed(() => props.item?.data?.name || '未命名')
</script>

<template>
	<div class="bld-edt">
		<div class="bld-edt-hdr">
			<div class="bld-edt-title">建筑编辑器 - {{ itemName }}</div>
			<div class="bld-edt-info">方块数量: {{ blockCnt }}</div>
			<div class="bld-edt-acts">
				<button class="bld-edt-btn clr" @click="clrAll">清空</button>
				<button class="bld-edt-btn sav" @click="savAndClose">保存并关闭</button>
				<button class="bld-edt-btn cls" @click="emit('close')">取消</button>
			</div>
		</div>
		<div class="bld-edt-bd">
			<div class="bld-edt-tools">
				<div class="bld-tool-sec">
					<div class="bld-tool-hd">方块类型</div>
					<div class="bld-tool-lst">
						<button v-for="bt in blockTypes" :key="bt.id" class="bld-tool-item" :class="{ sel: curBlockType === bt.id }" @click="curBlockType = bt.id">
							<div class="bld-tool-clr" :style="{ background: `rgb(${bt.clr[0] * 255}, ${bt.clr[1] * 255}, ${bt.clr[2] * 255})` }"></div>
							<span>{{ bt.name }}</span>
						</button>
					</div>
				</div>
				<div class="bld-tool-sec">
					<div class="bld-tool-hd">操作说明</div>
					<div class="bld-tool-tip">
						<p>左键: 放置方块</p>
						<p>右键: 删除方块</p>
						<p>中键/Shift+左键: 旋转视角</p>
						<p>滚轮: 缩放</p>
					</div>
				</div>
			</div>
			<div class="bld-edt-cv-ctn">
				<canvas ref="cvRef" class="bld-edt-cv" @mousedown="onMouseDown" @mousemove="onMouseMove" @mouseup="onMouseUp" @wheel="onWheel" @contextmenu="onCtxMn"></canvas>
			</div>
		</div>
	</div>
</template>

<style scoped>
.bld-edt {
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 100%;
	background: #1a1a1a;
}

.bld-edt-hdr {
	display: flex;
	align-items: center;
	gap: 16px;
	padding: 12px 16px;
	background: #222;
	border-bottom: 1px solid #333;
}

.bld-edt-title {
	font-size: 14px;
	font-weight: 500;
	color: #ddd;
}

.bld-edt-info {
	font-size: 12px;
	color: #6c9;
	font-family: monospace;
}

.bld-edt-acts {
	display: flex;
	gap: 8px;
	margin-left: auto;
}

.bld-edt-btn {
	height: 28px;
	padding: 0 12px;
	border: 1px solid #444;
	border-radius: 4px;
	font-size: 12px;
	cursor: pointer;
	transition: all 0.15s;
}

.bld-edt-btn.clr {
	background: #3a2222;
	border-color: #552222;
	color: #c66;
}

.bld-edt-btn.clr:hover {
	background: #4a2828;
	color: #f88;
}

.bld-edt-btn.sav {
	background: #1a3a2a;
	border-color: #166d3b;
	color: #6c9;
}

.bld-edt-btn.sav:hover {
	background: #1f4a35;
	color: #8ef;
}

.bld-edt-btn.cls {
	background: #2a2a2a;
	color: #888;
}

.bld-edt-btn.cls:hover {
	background: #333;
	color: #aaa;
}

.bld-edt-bd {
	display: flex;
	flex: 1;
	overflow: hidden;
}

.bld-edt-tools {
	width: 180px;
	background: #1e1e1e;
	border-right: 1px solid #333;
	overflow-y: auto;
}

.bld-tool-sec {
	border-bottom: 1px solid #333;
}

.bld-tool-hd {
	padding: 10px 12px;
	font-size: 11px;
	color: #888;
	text-transform: uppercase;
	letter-spacing: 1px;
}

.bld-tool-lst {
	padding: 0 8px 8px;
}

.bld-tool-item {
	display: flex;
	align-items: center;
	gap: 8px;
	width: 100%;
	height: 30px;
	padding: 0 8px;
	background: transparent;
	border: 1px solid transparent;
	border-radius: 3px;
	color: #aaa;
	font-size: 12px;
	cursor: pointer;
	transition: all 0.15s;
	text-align: left;
}

.bld-tool-item:hover {
	background: #252525;
}

.bld-tool-item.sel {
	background: #14291f;
	border-color: #166d3b;
	color: #6c9;
}

.bld-tool-clr {
	width: 16px;
	height: 16px;
	border-radius: 2px;
	flex-shrink: 0;
}

.bld-tool-tip {
	padding: 8px 12px;
	font-size: 11px;
	color: #666;
	line-height: 1.8;
}

.bld-tool-tip p {
	margin: 0;
}

.bld-edt-cv-ctn {
	flex: 1;
	position: relative;
	overflow: hidden;
}

.bld-edt-cv {
	width: 100%;
	height: 100%;
	display: block;
}
</style>
