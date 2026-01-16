<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useSceneStore } from '@/stores/useScene'

const store = useSceneStore()
const cvCtn = ref<HTMLDivElement>()
const cv = ref<HTMLCanvasElement>()
const statsEl = ref<HTMLDivElement>()

let gl: WebGL2RenderingContext | null = null
let animId = 0
let camPos = { x: 0, y: 5, z: 10 }
let camRot = { yaw: 0, pitch: -0.3 }
let camTgt = { x: 0, y: 0, z: 0 }
let dragging = false
let dragBtn = -1
let lastX = 0
let lastY = 0
let fps = 0
let frameCount = 0
let lastFpsTime = 0

const gridShd = { prog: null as WebGLProgram | null, locs: {} as Record<string, WebGLUniformLocation | null> }
const axisShd = { prog: null as WebGLProgram | null, locs: {} as Record<string, WebGLUniformLocation | null> }
const nodeShd = { prog: null as WebGLProgram | null, locs: {} as Record<string, WebGLUniformLocation | null> }
let gridVao: WebGLVertexArrayObject | null = null
let axisVao: WebGLVertexArrayObject | null = null
let cubeVao: WebGLVertexArrayObject | null = null
let gridVertCnt = 0
let cubeVertCnt = 0

function compileShader(src: string, type: number): WebGLShader | null {
	if (!gl) return null
	const shd = gl.createShader(type)
	if (!shd) return null
	gl.shaderSource(shd, src)
	gl.compileShader(shd)
	if (!gl.getShaderParameter(shd, gl.COMPILE_STATUS)) {
		console.error(gl.getShaderInfoLog(shd))
		gl.deleteShader(shd)
		return null
	}
	return shd
}

function createProgram(vs: string, fs: string): WebGLProgram | null {
	if (!gl) return null
	const vShd = compileShader(vs, gl.VERTEX_SHADER)
	const fShd = compileShader(fs, gl.FRAGMENT_SHADER)
	if (!vShd || !fShd) return null
	const prog = gl.createProgram()
	if (!prog) return null
	gl.attachShader(prog, vShd)
	gl.attachShader(prog, fShd)
	gl.linkProgram(prog)
	if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
		console.error(gl.getProgramInfoLog(prog))
		return null
	}
	gl.deleteShader(vShd)
	gl.deleteShader(fShd)
	return prog
}

function initShaders() {
	if (!gl) return
	const gridVS = `#version 300 es
		layout(location=0) in vec3 aPos;
		uniform mat4 uVP;
		out float vDist;
		void main() {
			gl_Position = uVP * vec4(aPos, 1.0);
			vDist = length(aPos.xz);
		}`
	const gridFS = `#version 300 es
		precision highp float;
		in float vDist;
		out vec4 fragColor;
		uniform vec4 uColor;
		uniform float uFadeStart;
		uniform float uFadeEnd;
		void main() {
			float alpha = uColor.a * (1.0 - smoothstep(uFadeStart, uFadeEnd, vDist));
			fragColor = vec4(uColor.rgb, alpha);
		}`
	gridShd.prog = createProgram(gridVS, gridFS)
	if (gridShd.prog) {
		gridShd.locs.uVP = gl.getUniformLocation(gridShd.prog, 'uVP')
		gridShd.locs.uColor = gl.getUniformLocation(gridShd.prog, 'uColor')
		gridShd.locs.uFadeStart = gl.getUniformLocation(gridShd.prog, 'uFadeStart')
		gridShd.locs.uFadeEnd = gl.getUniformLocation(gridShd.prog, 'uFadeEnd')
	}
	const axisVS = `#version 300 es
		layout(location=0) in vec3 aPos;
		layout(location=1) in vec3 aClr;
		uniform mat4 uVP;
		out vec3 vClr;
		void main() {
			gl_Position = uVP * vec4(aPos, 1.0);
			vClr = aClr;
		}`
	const axisFS = `#version 300 es
		precision highp float;
		in vec3 vClr;
		out vec4 fragColor;
		void main() {
			fragColor = vec4(vClr, 1.0);
		}`
	axisShd.prog = createProgram(axisVS, axisFS)
	if (axisShd.prog) {
		axisShd.locs.uVP = gl.getUniformLocation(axisShd.prog, 'uVP')
	}
	const nodeVS = `#version 300 es
		layout(location=0) in vec3 aPos;
		layout(location=1) in vec3 aNorm;
		uniform mat4 uVP;
		uniform mat4 uModel;
		out vec3 vNorm;
		out vec3 vWorldPos;
		void main() {
			vec4 worldPos = uModel * vec4(aPos, 1.0);
			gl_Position = uVP * worldPos;
			vNorm = mat3(uModel) * aNorm;
			vWorldPos = worldPos.xyz;
		}`
	const nodeFS = `#version 300 es
		precision highp float;
		in vec3 vNorm;
		in vec3 vWorldPos;
		out vec4 fragColor;
		uniform vec3 uColor;
		uniform vec3 uCamPos;
		uniform float uSelected;
		void main() {
			vec3 norm = normalize(vNorm);
			vec3 lightDir = normalize(vec3(0.5, 0.8, 0.3));
			float diff = max(dot(norm, lightDir), 0.0) * 0.6 + 0.4;
			vec3 viewDir = normalize(uCamPos - vWorldPos);
			vec3 reflDir = reflect(-lightDir, norm);
			float spec = pow(max(dot(viewDir, reflDir), 0.0), 32.0) * 0.3;
			vec3 color = uColor * diff + vec3(1.0) * spec;
			if (uSelected > 0.5) {
				color = mix(color, vec3(1.0, 0.6, 0.0), 0.3);
			}
			fragColor = vec4(color, 1.0);
		}`
	nodeShd.prog = createProgram(nodeVS, nodeFS)
	if (nodeShd.prog) {
		nodeShd.locs.uVP = gl.getUniformLocation(nodeShd.prog, 'uVP')
		nodeShd.locs.uModel = gl.getUniformLocation(nodeShd.prog, 'uModel')
		nodeShd.locs.uColor = gl.getUniformLocation(nodeShd.prog, 'uColor')
		nodeShd.locs.uCamPos = gl.getUniformLocation(nodeShd.prog, 'uCamPos')
		nodeShd.locs.uSelected = gl.getUniformLocation(nodeShd.prog, 'uSelected')
	}
}

function buildGrid(size: number, step: number): Float32Array {
	const lines: number[] = []
	for (let i = -size; i <= size; i += step) {
		lines.push(i, 0, -size, i, 0, size)
		lines.push(-size, 0, i, size, 0, i)
	}
	return new Float32Array(lines)
}

function buildAxis(len: number): Float32Array {
	return new Float32Array([
		0, 0, 0, 1, 0, 0, len, 0, 0, 1, 0, 0,
		0, 0, 0, 0, 1, 0, 0, len, 0, 0, 1, 0,
		0, 0, 0, 0, 0, 1, 0, 0, len, 0, 0, 1
	])
}

function buildCube(): Float32Array {
	const s = 0.5
	const verts = [
		-s,-s,-s, 0,0,-1, s,-s,-s, 0,0,-1, s,s,-s, 0,0,-1, -s,-s,-s, 0,0,-1, s,s,-s, 0,0,-1, -s,s,-s, 0,0,-1,
		-s,-s,s, 0,0,1, s,s,s, 0,0,1, s,-s,s, 0,0,1, -s,-s,s, 0,0,1, -s,s,s, 0,0,1, s,s,s, 0,0,1,
		-s,s,-s, 0,1,0, s,s,-s, 0,1,0, s,s,s, 0,1,0, -s,s,-s, 0,1,0, s,s,s, 0,1,0, -s,s,s, 0,1,0,
		-s,-s,-s, 0,-1,0, s,-s,s, 0,-1,0, s,-s,-s, 0,-1,0, -s,-s,-s, 0,-1,0, -s,-s,s, 0,-1,0, s,-s,s, 0,-1,0,
		s,-s,-s, 1,0,0, s,-s,s, 1,0,0, s,s,s, 1,0,0, s,-s,-s, 1,0,0, s,s,s, 1,0,0, s,s,-s, 1,0,0,
		-s,-s,-s, -1,0,0, -s,s,s, -1,0,0, -s,-s,s, -1,0,0, -s,-s,-s, -1,0,0, -s,s,-s, -1,0,0, -s,s,s, -1,0,0
	]
	return new Float32Array(verts)
}

function initGeometry() {
	if (!gl) return
	const gridData = buildGrid(50, store.gridSize)
	gridVertCnt = gridData.length / 3
	gridVao = gl.createVertexArray()
	gl.bindVertexArray(gridVao)
	const gridBuf = gl.createBuffer()
	gl.bindBuffer(gl.ARRAY_BUFFER, gridBuf)
	gl.bufferData(gl.ARRAY_BUFFER, gridData, gl.STATIC_DRAW)
	gl.enableVertexAttribArray(0)
	gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0)
	gl.bindVertexArray(null)
	const axisData = buildAxis(5)
	axisVao = gl.createVertexArray()
	gl.bindVertexArray(axisVao)
	const axisBuf = gl.createBuffer()
	gl.bindBuffer(gl.ARRAY_BUFFER, axisBuf)
	gl.bufferData(gl.ARRAY_BUFFER, axisData, gl.STATIC_DRAW)
	gl.enableVertexAttribArray(0)
	gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0)
	gl.enableVertexAttribArray(1)
	gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12)
	gl.bindVertexArray(null)
	const cubeData = buildCube()
	cubeVertCnt = cubeData.length / 6
	cubeVao = gl.createVertexArray()
	gl.bindVertexArray(cubeVao)
	const cubeBuf = gl.createBuffer()
	gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuf)
	gl.bufferData(gl.ARRAY_BUFFER, cubeData, gl.STATIC_DRAW)
	gl.enableVertexAttribArray(0)
	gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0)
	gl.enableVertexAttribArray(1)
	gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12)
	gl.bindVertexArray(null)
}

function perspective(fov: number, aspect: number, near: number, far: number): Float32Array {
	const f = 1.0 / Math.tan(fov / 2)
	const nf = 1 / (near - far)
	return new Float32Array([
		f / aspect, 0, 0, 0,
		0, f, 0, 0,
		0, 0, (far + near) * nf, -1,
		0, 0, 2 * far * near * nf, 0
	])
}

function lookAt(eye: { x: number, y: number, z: number }, tgt: { x: number, y: number, z: number }): Float32Array {
	const zx = eye.x - tgt.x, zy = eye.y - tgt.y, zz = eye.z - tgt.z
	const zl = Math.sqrt(zx*zx + zy*zy + zz*zz)
	const fz = { x: zx/zl, y: zy/zl, z: zz/zl }
	const ux = 0, uy = 1, uz = 0
	const rx = uy * fz.z - uz * fz.y
	const ry = uz * fz.x - ux * fz.z
	const rz = ux * fz.y - uy * fz.x
	const rl = Math.sqrt(rx*rx + ry*ry + rz*rz)
	const r = { x: rx/rl, y: ry/rl, z: rz/rl }
	const u = { x: fz.y * r.z - fz.z * r.y, y: fz.z * r.x - fz.x * r.z, z: fz.x * r.y - fz.y * r.x }
	return new Float32Array([
		r.x, u.x, fz.x, 0,
		r.y, u.y, fz.y, 0,
		r.z, u.z, fz.z, 0,
		-(r.x*eye.x + r.y*eye.y + r.z*eye.z),
		-(u.x*eye.x + u.y*eye.y + u.z*eye.z),
		-(fz.x*eye.x + fz.y*eye.y + fz.z*eye.z),
		1
	])
}

function mulMat4(a: Float32Array, b: Float32Array): Float32Array {
	const r = new Float32Array(16)
	for (let i = 0; i < 4; i++) {
		for (let j = 0; j < 4; j++) {
			r[i*4+j] = a[j]*b[i*4] + a[4+j]*b[i*4+1] + a[8+j]*b[i*4+2] + a[12+j]*b[i*4+3]
		}
	}
	return r
}

function modelMatrix(pos: { x: number, y: number, z: number }, scl: { x: number, y: number, z: number }): Float32Array {
	return new Float32Array([
		scl.x, 0, 0, 0,
		0, scl.y, 0, 0,
		0, 0, scl.z, 0,
		pos.x, pos.y, pos.z, 1
	])
}

function resize() {
	if (!cv.value || !cvCtn.value || !gl) return
	const w = cvCtn.value.clientWidth
	const h = cvCtn.value.clientHeight
	cv.value.width = w * devicePixelRatio
	cv.value.height = h * devicePixelRatio
	cv.value.style.width = w + 'px'
	cv.value.style.height = h + 'px'
	gl.viewport(0, 0, cv.value.width, cv.value.height)
}

function updateCamera() {
	const dist = 15
	camPos.x = camTgt.x + Math.sin(camRot.yaw) * Math.cos(camRot.pitch) * dist
	camPos.y = camTgt.y + Math.sin(camRot.pitch) * dist
	camPos.z = camTgt.z + Math.cos(camRot.yaw) * Math.cos(camRot.pitch) * dist
}

function render() {
	if (!gl || !cv.value) return
	const now = performance.now()
	frameCount++
	if (now - lastFpsTime >= 1000) {
		fps = frameCount
		frameCount = 0
		lastFpsTime = now
	}
	gl.clearColor(0.12, 0.12, 0.14, 1)
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
	gl.enable(gl.DEPTH_TEST)
	gl.enable(gl.BLEND)
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
	const aspect = cv.value.width / cv.value.height
	const proj = perspective(Math.PI / 4, aspect, 0.1, 500)
	const view = lookAt(camPos, camTgt)
	const vp = mulMat4(proj, view)
	if (store.showGrid && gridShd.prog && gridVao) {
		gl.useProgram(gridShd.prog)
		gl.uniformMatrix4fv(gridShd.locs.uVP, false, vp)
		gl.uniform4f(gridShd.locs.uColor, 0.3, 0.3, 0.3, 0.5)
		gl.uniform1f(gridShd.locs.uFadeStart, 30)
		gl.uniform1f(gridShd.locs.uFadeEnd, 50)
		gl.bindVertexArray(gridVao)
		gl.drawArrays(gl.LINES, 0, gridVertCnt)
	}
	if (store.showAxis && axisShd.prog && axisVao) {
		gl.useProgram(axisShd.prog)
		gl.uniformMatrix4fv(axisShd.locs.uVP, false, vp)
		gl.bindVertexArray(axisVao)
		gl.drawArrays(gl.LINES, 0, 6)
	}
	if (nodeShd.prog && cubeVao) {
		gl.useProgram(nodeShd.prog)
		gl.uniformMatrix4fv(nodeShd.locs.uVP, false, vp)
		gl.uniform3f(nodeShd.locs.uCamPos, camPos.x, camPos.y, camPos.z)
		for (const [id, node] of store.nodes) {
			if (!node.visible) continue
			const model = modelMatrix(node.transform.pos, node.transform.scl)
			gl.uniformMatrix4fv(nodeShd.locs.uModel, false, model)
			const isSelected = store.selectedIds.includes(id)
			gl.uniform1f(nodeShd.locs.uSelected, isSelected ? 1 : 0)
			const colors: Record<string, [number, number, number]> = {
				empty: [0.5, 0.5, 0.5],
				mesh: [0.4, 0.6, 0.9],
				light: [1, 0.9, 0.3],
				camera: [0.9, 0.4, 0.4],
				trigger: [0.3, 0.9, 0.5],
				spawn: [0.9, 0.5, 0.9],
				waypoint: [0.3, 0.7, 0.9],
				volume: [0.6, 0.6, 0.3]
			}
			const clr = colors[node.type] || [0.5, 0.5, 0.5]
			gl.uniform3f(nodeShd.locs.uColor, clr[0], clr[1], clr[2])
			gl.bindVertexArray(cubeVao)
			gl.drawArrays(gl.TRIANGLES, 0, cubeVertCnt)
		}
	}
	gl.bindVertexArray(null)
	if (statsEl.value && store.showStats) {
		statsEl.value.textContent = `FPS: ${fps} | 节点: ${store.nodeCount}`
	}
	animId = requestAnimationFrame(render)
}

function onMouseDown(e: MouseEvent) {
	dragging = true
	dragBtn = e.button
	lastX = e.clientX
	lastY = e.clientY
	if (e.button === 0 && !e.ctrlKey && !e.shiftKey) {
	}
}

function onMouseMove(e: MouseEvent) {
	if (!dragging) return
	const dx = e.clientX - lastX
	const dy = e.clientY - lastY
	lastX = e.clientX
	lastY = e.clientY
	if (dragBtn === 2 || (dragBtn === 0 && e.altKey)) {
		camRot.yaw -= dx * store.camSens
		camRot.pitch += dy * store.camSens
		camRot.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, camRot.pitch))
		updateCamera()
	} else if (dragBtn === 1) {
		const speed = 0.02
		const yaw = camRot.yaw
		camTgt.x -= (Math.cos(yaw) * dx + Math.sin(yaw) * dy) * speed
		camTgt.z -= (-Math.sin(yaw) * dx + Math.cos(yaw) * dy) * speed
		updateCamera()
	}
}

function onMouseUp() {
	dragging = false
	dragBtn = -1
}

function onWheel(e: WheelEvent) {
	e.preventDefault()
	const dir = { x: camTgt.x - camPos.x, y: camTgt.y - camPos.y, z: camTgt.z - camPos.z }
	const len = Math.sqrt(dir.x*dir.x + dir.y*dir.y + dir.z*dir.z)
	const speed = Math.max(0.5, len * 0.1)
	const delta = e.deltaY > 0 ? -speed : speed
	camTgt.x += dir.x / len * delta
	camTgt.y += dir.y / len * delta
	camTgt.z += dir.z / len * delta
	updateCamera()
}

function onKeyDown(e: KeyboardEvent) {
	if (e.target !== document.body) return
	if (e.key === 'Delete' || e.key === 'Backspace') {
		store.deleteSelection()
	}
	if (e.ctrlKey || e.metaKey) {
		if (e.key === 'z') {
			e.preventDefault()
			store.undo()
		}
		if (e.key === 'y') {
			e.preventDefault()
			store.redo()
		}
		if (e.key === 'c') {
			store.copySelection()
		}
		if (e.key === 'v') {
			store.pasteSelection()
		}
		if (e.key === 'a') {
			e.preventDefault()
			store.selectAll()
		}
		if (e.key === 'd') {
			e.preventDefault()
			for (const id of store.selectedIds) {
				store.duplicateNode(id)
			}
		}
	}
	if (e.key === 'Escape') {
		store.deselectAll()
	}
}

function onContextMenu(e: MouseEvent) {
	e.preventDefault()
}

onMounted(() => {
	if (!cv.value) return
	gl = cv.value.getContext('webgl2', { antialias: true })
	if (!gl) {
		console.error('WebGL2 not supported')
		return
	}
	initShaders()
	initGeometry()
	resize()
	updateCamera()
	render()
	window.addEventListener('resize', resize)
	window.addEventListener('keydown', onKeyDown)
})

onUnmounted(() => {
	cancelAnimationFrame(animId)
	window.removeEventListener('resize', resize)
	window.removeEventListener('keydown', onKeyDown)
})

watch(() => store.gridSize, () => {
	if (gl) initGeometry()
})
</script>

<template>
	<div ref="cvCtn" class="scene-viewport" @contextmenu="onContextMenu">
		<canvas
			ref="cv"
			@mousedown="onMouseDown"
			@mousemove="onMouseMove"
			@mouseup="onMouseUp"
			@mouseleave="onMouseUp"
			@wheel="onWheel"
		/>
		<div v-if="store.showStats" ref="statsEl" class="vp-stats"></div>
		<div class="vp-hint">
			<span>右键拖动: 旋转</span>
			<span>中键拖动: 平移</span>
			<span>滚轮: 缩放</span>
		</div>
	</div>
</template>

<style scoped>
.scene-viewport {
	position: relative;
	width: 100%;
	height: 100%;
	background: #1e1e1e;
	overflow: hidden;
}

.scene-viewport canvas {
	display: block;
}

.vp-stats {
	position: absolute;
	top: 8px;
	left: 8px;
	font-size: 12px;
	color: #0f0;
	background: rgba(0, 0, 0, 0.5);
	padding: 4px 8px;
	border-radius: 4px;
	font-family: monospace;
}

.vp-hint {
	position: absolute;
	bottom: 8px;
	left: 8px;
	display: flex;
	gap: 16px;
	font-size: 11px;
	color: #888;
}
</style>
