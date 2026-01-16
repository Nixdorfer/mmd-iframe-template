export type KeyCode = string

export type GestureType = 'tap' | 'longPress' | 'swipe' | 'pinch' | 'pan' | 'rotate'

export type SwipeDir = 'up' | 'down' | 'left' | 'right'

export interface GestureCfg {
	tapMaxDist: number
	tapMaxTime: number
	longPressTime: number
	swipeMinDist: number
	swipeMinVel: number
	pinchThreshold: number
	rotThreshold: number
	inertiaDamp: number
	inertiaMinVel: number
	edgeThreshold: number
	touchThrottle: number
}

export interface GestureState {
	typ: GestureType
	act: boolean
	justSta: boolean
	justEnd: boolean
}

export interface TapGesture extends GestureState {
	typ: 'tap'
	x: number
	y: number
	cnt: number
}

export interface LongPressGesture extends GestureState {
	typ: 'longPress'
	x: number
	y: number
	dur: number
}

export interface SwipeGesture extends GestureState {
	typ: 'swipe'
	dir: SwipeDir
	dx: number
	dy: number
	velX: number
	velY: number
	dist: number
	fromEdge: boolean
}

export interface PinchGesture extends GestureState {
	typ: 'pinch'
	scl: number
	prvScl: number
	dScl: number
	cx: number
	cy: number
}

export interface PanGesture extends GestureState {
	typ: 'pan'
	dx: number
	dy: number
	x: number
	y: number
	fingers: number
	velX: number
	velY: number
	inertia: boolean
}

export interface RotGesture extends GestureState {
	typ: 'rotate'
	rot: number
	dRot: number
	cx: number
	cy: number
}

export interface GestureBinding {
	action: string
	gesture: GestureType
	fingers?: number
	dir?: SwipeDir
	type: 'start' | 'move' | 'end' | 'any'
}

export interface Gestures {
	tap: TapGesture | null
	longPress: LongPressGesture | null
	swipe: SwipeGesture | null
	pinch: PinchGesture | null
	pan: PanGesture | null
	rotate: RotGesture | null
}

export interface InputBinding {
	action: string
	keys: KeyCode[]
	modifiers?: ('ctrl' | 'shift' | 'alt')[]
	type: 'press' | 'hold' | 'release'
}

export interface InputState {
	keys: Set<KeyCode>
	mouse: {
		x: number
		y: number
		dx: number
		dy: number
		buttons: number
		wheel: number
	}
	touch: TouchState[]
	gamepad: GamepadState | null
}

export interface TouchState {
	id: number
	x: number
	y: number
	startX: number
	startY: number
	time: number
}

export interface GamepadState {
	axes: number[]
	buttons: boolean[]
	id: string
}

export interface InputAction {
	name: string
	value: number
	pressed: boolean
	justPressed: boolean
	justReleased: boolean
}

export class InputManager {
	bindings: Map<string, InputBinding>
	state: InputState
	actions: Map<string, InputAction>
	prevKeys: Set<KeyCode>
	prevButtons: number
	enabled: boolean
	canvas: HTMLElement | null
	mouseSensitivity: number
	deadzone: number
	gestureCfg!: GestureCfg
	gestureBindings: Map<string, GestureBinding>
	gestures: Gestures
	prvTouches: TouchState[]
	pinchPrvDist: number
	rotPrvAngle: number | null
	longPressTimer: number | null
	tapCnt: number
	lastTapTsp: number
	prvTouchCenter: { x: number; y: number } | null
	panVelX: number
	panVelY: number
	lastPanTsp: number
	inertiaAct: boolean
	lastTouchTsp: number
	screenW: number
	screenH: number

	constructor() {
		this.bindings = new Map()
		this.state = {
			keys: new Set(),
			mouse: { x: 0, y: 0, dx: 0, dy: 0, buttons: 0, wheel: 0 },
			touch: [],
			gamepad: null
		}
		this.actions = new Map()
		this.prevKeys = new Set()
		this.prevButtons = 0
		this.enabled = true
		this.canvas = null
		this.mouseSensitivity = 1.0
		this.deadzone = 0.1
		this.gestureBindings = new Map()
		this.prvTouches = []
		this.pinchPrvDist = 0
		this.rotPrvAngle = null
		this.longPressTimer = null
		this.tapCnt = 0
		this.lastTapTsp = 0
		this.prvTouchCenter = null
		this.panVelX = 0
		this.panVelY = 0
		this.lastPanTsp = 0
		this.inertiaAct = false
		this.lastTouchTsp = 0
		this.screenW = typeof window !== 'undefined' ? window.innerWidth : 1920
		this.screenH = typeof window !== 'undefined' ? window.innerHeight : 1080
		this.gestures = {
			tap: null,
			longPress: null,
			swipe: null,
			pinch: null,
			pan: null,
			rotate: null
		}
		this.iniGestureCfg()
		this.iniDefaultBindings()
		this.iniDefaultGestureBindings()
	}

	private iniDefaultBindings() {
		this.bind({ action: 'move_forward', keys: ['KeyW', 'ArrowUp'], type: 'hold' })
		this.bind({ action: 'move_back', keys: ['KeyS', 'ArrowDown'], type: 'hold' })
		this.bind({ action: 'move_left', keys: ['KeyA', 'ArrowLeft'], type: 'hold' })
		this.bind({ action: 'move_right', keys: ['KeyD', 'ArrowRight'], type: 'hold' })
		this.bind({ action: 'jump', keys: ['Space'], type: 'press' })
		this.bind({ action: 'sprint', keys: ['ShiftLeft', 'ShiftRight'], type: 'hold' })
		this.bind({ action: 'crouch', keys: ['ControlLeft', 'KeyC'], type: 'hold' })
		this.bind({ action: 'interact', keys: ['KeyE', 'KeyF'], type: 'press' })
		this.bind({ action: 'attack', keys: ['Mouse0'], type: 'press' })
		this.bind({ action: 'attack_alt', keys: ['Mouse2'], type: 'press' })
		this.bind({ action: 'ability_1', keys: ['Digit1'], type: 'press' })
		this.bind({ action: 'ability_2', keys: ['Digit2'], type: 'press' })
		this.bind({ action: 'ability_3', keys: ['Digit3'], type: 'press' })
		this.bind({ action: 'ability_4', keys: ['Digit4'], type: 'press' })
		this.bind({ action: 'inventory', keys: ['KeyI', 'Tab'], type: 'press' })
		this.bind({ action: 'menu', keys: ['Escape'], type: 'press' })
		this.bind({ action: 'map', keys: ['KeyM'], type: 'press' })
		this.bind({ action: 'quest', keys: ['KeyJ'], type: 'press' })
	}

	private iniGestureCfg() {
		this.gestureCfg = {
			tapMaxDist: 10,
			tapMaxTime: 200,
			longPressTime: 500,
			swipeMinDist: 50,
			swipeMinVel: 300,
			pinchThreshold: 0.02,
			rotThreshold: 0.05,
			inertiaDamp: 0.92,
			inertiaMinVel: 5,
			edgeThreshold: 30,
			touchThrottle: 16
		}
	}

	private iniDefaultGestureBindings() {
		this.bindGesture({ action: 'look', gesture: 'pan', fingers: 1, type: 'move' })
		this.bindGesture({ action: 'zoom', gesture: 'pinch', type: 'move' })
		this.bindGesture({ action: 'pan_view', gesture: 'pan', fingers: 2, type: 'move' })
		this.bindGesture({ action: 'attack', gesture: 'tap', type: 'end' })
		this.bindGesture({ action: 'interact', gesture: 'longPress', type: 'start' })
		this.bindGesture({ action: 'rotate_view', gesture: 'rotate', type: 'move' })
		this.bindGesture({ action: 'quick_up', gesture: 'swipe', dir: 'up', type: 'end' })
		this.bindGesture({ action: 'quick_down', gesture: 'swipe', dir: 'down', type: 'end' })
		this.bindGesture({ action: 'dodge_left', gesture: 'swipe', dir: 'left', type: 'end' })
		this.bindGesture({ action: 'dodge_right', gesture: 'swipe', dir: 'right', type: 'end' })
	}

	bind(binding: InputBinding) {
		this.bindings.set(binding.action, binding)
		this.actions.set(binding.action, {
			name: binding.action,
			value: 0,
			pressed: false,
			justPressed: false,
			justReleased: false
		})
	}

	unbind(action: string) {
		this.bindings.delete(action)
		this.actions.delete(action)
	}

	bindGesture(binding: GestureBinding) {
		this.gestureBindings.set(binding.action, binding)
		if (!this.actions.has(binding.action)) {
			this.actions.set(binding.action, {
				name: binding.action,
				value: 0,
				pressed: false,
				justPressed: false,
				justReleased: false
			})
		}
	}

	unbindGesture(action: string) {
		this.gestureBindings.delete(action)
	}

	private calTouchDist(t1: TouchState, t2: TouchState): number {
		const dx = t2.x - t1.x
		const dy = t2.y - t1.y
		return Math.sqrt(dx * dx + dy * dy)
	}

	private calTouchAngle(t1: TouchState, t2: TouchState): number {
		return Math.atan2(t2.y - t1.y, t2.x - t1.x)
	}

	private calTouchCenter(t1: TouchState, t2: TouchState): { x: number; y: number } {
		return { x: (t1.x + t2.x) / 2, y: (t1.y + t2.y) / 2 }
	}

	private calSwipeDir(dx: number, dy: number): SwipeDir {
		if (Math.abs(dx) > Math.abs(dy)) {
			return dx > 0 ? 'right' : 'left'
		}
		return dy > 0 ? 'down' : 'up'
	}

	attach(element: HTMLElement) {
		this.canvas = element
		element.addEventListener('keydown', this.onKeyDown.bind(this))
		element.addEventListener('keyup', this.onKeyUp.bind(this))
		element.addEventListener('mousedown', this.onMouseDown.bind(this))
		element.addEventListener('mouseup', this.onMouseUp.bind(this))
		element.addEventListener('mousemove', this.onMouseMove.bind(this))
		element.addEventListener('wheel', this.onWheel.bind(this))
		element.addEventListener('touchstart', this.onTouchStart.bind(this))
		element.addEventListener('touchend', this.onTouchEnd.bind(this))
		element.addEventListener('touchmove', this.onTouchMove.bind(this))
		element.addEventListener('contextmenu', (e) => e.preventDefault())
		window.addEventListener('gamepadconnected', this.onGamepadConnected.bind(this))
		window.addEventListener('gamepaddisconnected', this.onGamepadDisconnected.bind(this))
	}

	detach() {
		this.canvas = null
	}

	private onKeyDown(e: KeyboardEvent) {
		if (!this.enabled) return
		this.state.keys.add(e.code)
	}

	private onKeyUp(e: KeyboardEvent) {
		this.state.keys.delete(e.code)
	}

	private onMouseDown(e: MouseEvent) {
		if (!this.enabled) return
		this.state.mouse.buttons = e.buttons
		this.state.keys.add(`Mouse${e.button}`)
	}

	private onMouseUp(e: MouseEvent) {
		this.state.mouse.buttons = e.buttons
		this.state.keys.delete(`Mouse${e.button}`)
	}

	private onMouseMove(e: MouseEvent) {
		if (!this.enabled) return
		this.state.mouse.dx = e.movementX * this.mouseSensitivity
		this.state.mouse.dy = e.movementY * this.mouseSensitivity
		this.state.mouse.x = e.clientX
		this.state.mouse.y = e.clientY
	}

	private onWheel(e: WheelEvent) {
		if (!this.enabled) return
		this.state.mouse.wheel = e.deltaY
	}

	private onTouchStart(e: TouchEvent) {
		if (!this.enabled) return
		for (const touch of Array.from(e.changedTouches)) {
			this.state.touch.push({
				id: touch.identifier,
				x: touch.clientX,
				y: touch.clientY,
				startX: touch.clientX,
				startY: touch.clientY,
				time: Date.now()
			})
		}
	}

	private onTouchEnd(e: TouchEvent) {
		for (const touch of Array.from(e.changedTouches)) {
			const idx = this.state.touch.findIndex(t => t.id === touch.identifier)
			if (idx >= 0) {
				this.state.touch.splice(idx, 1)
			}
		}
	}

	private onTouchMove(e: TouchEvent) {
		if (!this.enabled) return
		const now = Date.now()
		if (now - this.lastTouchTsp < this.gestureCfg.touchThrottle) return
		this.lastTouchTsp = now
		for (const touch of Array.from(e.changedTouches)) {
			const state = this.state.touch.find(t => t.id === touch.identifier)
			if (state) {
				state.x = touch.clientX
				state.y = touch.clientY
			}
		}
	}

	private onGamepadConnected(e: GamepadEvent) {
		this.state.gamepad = {
			axes: Array.from(e.gamepad.axes),
			buttons: e.gamepad.buttons.map(b => b.pressed),
			id: e.gamepad.id
		}
	}

	private onGamepadDisconnected(_e: GamepadEvent) {
		this.state.gamepad = null
	}

	private rstGestureFlags() {
		if (this.gestures.tap) this.gestures.tap.justSta = false
		if (this.gestures.tap) this.gestures.tap.justEnd = false
		if (this.gestures.longPress) this.gestures.longPress.justSta = false
		if (this.gestures.longPress) this.gestures.longPress.justEnd = false
		if (this.gestures.swipe) this.gestures.swipe.justSta = false
		if (this.gestures.swipe) this.gestures.swipe.justEnd = false
		if (this.gestures.pinch) this.gestures.pinch.justSta = false
		if (this.gestures.pinch) this.gestures.pinch.justEnd = false
		if (this.gestures.pan) this.gestures.pan.justSta = false
		if (this.gestures.pan) this.gestures.pan.justEnd = false
		if (this.gestures.rotate) this.gestures.rotate.justSta = false
		if (this.gestures.rotate) this.gestures.rotate.justEnd = false
	}

	private detectTap() {
		const touches = this.state.touch
		const prv = this.prvTouches
		if (touches.length === 0 && prv.length === 1) {
			const t = prv[0]
			const dx = t.x - t.startX
			const dy = t.y - t.startY
			const dist = Math.sqrt(dx * dx + dy * dy)
			const dur = Date.now() - t.time
			if (dist < this.gestureCfg.tapMaxDist && dur < this.gestureCfg.tapMaxTime) {
				const now = Date.now()
				if (now - this.lastTapTsp < 300) {
					this.tapCnt++
				} else {
					this.tapCnt = 1
				}
				this.lastTapTsp = now
				this.gestures.tap = {
					typ: 'tap',
					act: false,
					justSta: true,
					justEnd: true,
					x: t.x,
					y: t.y,
					cnt: this.tapCnt
				}
				return
			}
		}
		if (this.gestures.tap && this.gestures.tap.justEnd) {
			this.gestures.tap = null
		}
	}

	private detectLongPress() {
		const touches = this.state.touch
		if (touches.length === 1) {
			const t = touches[0]
			const dx = t.x - t.startX
			const dy = t.y - t.startY
			const dist = Math.sqrt(dx * dx + dy * dy)
			const dur = Date.now() - t.time
			if (dist < this.gestureCfg.tapMaxDist && dur >= this.gestureCfg.longPressTime) {
				const wasAct = this.gestures.longPress?.act ?? false
				this.gestures.longPress = {
					typ: 'longPress',
					act: true,
					justSta: !wasAct,
					justEnd: false,
					x: t.x,
					y: t.y,
					dur: dur
				}
				return
			}
		}
		if (this.gestures.longPress?.act && touches.length === 0) {
			this.gestures.longPress.act = false
			this.gestures.longPress.justEnd = true
		} else if (this.gestures.longPress && !this.gestures.longPress.act) {
			this.gestures.longPress = null
		}
	}

	private isFromEdge(x: number, y: number): boolean {
		const th = this.gestureCfg.edgeThreshold
		return x < th || x > this.screenW - th || y < th || y > this.screenH - th
	}

	private detectSwipe() {
		const touches = this.state.touch
		const prv = this.prvTouches
		if (touches.length === 0 && prv.length === 1) {
			const t = prv[0]
			const dx = t.x - t.startX
			const dy = t.y - t.startY
			const dist = Math.sqrt(dx * dx + dy * dy)
			const dur = Math.max(1, Date.now() - t.time)
			const vel = dist / dur * 1000
			if (dist >= this.gestureCfg.swipeMinDist && vel >= this.gestureCfg.swipeMinVel) {
				this.gestures.swipe = {
					typ: 'swipe',
					act: false,
					justSta: true,
					justEnd: true,
					dir: this.calSwipeDir(dx, dy),
					dx: dx,
					dy: dy,
					velX: dx / dur * 1000,
					velY: dy / dur * 1000,
					dist: dist,
					fromEdge: this.isFromEdge(t.startX, t.startY)
				}
				return
			}
		}
		if (this.gestures.swipe && this.gestures.swipe.justEnd) {
			this.gestures.swipe = null
		}
	}

	private detectPinch() {
		const touches = this.state.touch
		if (touches.length === 2) {
			const curDist = this.calTouchDist(touches[0], touches[1])
			if (this.pinchPrvDist > 0) {
				const dScl = curDist / this.pinchPrvDist
				if (Math.abs(1 - dScl) > this.gestureCfg.pinchThreshold) {
					const wasAct = this.gestures.pinch?.act ?? false
					const prvScl = this.gestures.pinch?.scl ?? 1
					const center = this.calTouchCenter(touches[0], touches[1])
					this.gestures.pinch = {
						typ: 'pinch',
						act: true,
						justSta: !wasAct,
						justEnd: false,
						scl: wasAct ? prvScl * dScl : 1,
						prvScl: prvScl,
						dScl: dScl,
						cx: center.x,
						cy: center.y
					}
				}
			}
			this.pinchPrvDist = curDist
		} else {
			if (this.gestures.pinch?.act) {
				this.gestures.pinch.act = false
				this.gestures.pinch.justEnd = true
			} else if (this.gestures.pinch) {
				this.gestures.pinch = null
			}
			this.pinchPrvDist = 0
		}
	}

	private detectPan() {
		const touches = this.state.touch
		const now = Date.now()
		if (touches.length >= 1) {
			this.inertiaAct = false
			let cx = 0, cy = 0
			for (const t of touches) {
				cx += t.x
				cy += t.y
			}
			cx /= touches.length
			cy /= touches.length
			if (this.prvTouchCenter) {
				const dx = cx - this.prvTouchCenter.x
				const dy = cy - this.prvTouchCenter.y
				const dt = Math.max(1, now - this.lastPanTsp) / 1000
				this.panVelX = dx / dt
				this.panVelY = dy / dt
				if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
					const wasAct = this.gestures.pan?.act ?? false
					this.gestures.pan = {
						typ: 'pan',
						act: true,
						justSta: !wasAct,
						justEnd: false,
						dx: dx,
						dy: dy,
						x: cx,
						y: cy,
						fingers: touches.length,
						velX: this.panVelX,
						velY: this.panVelY,
						inertia: false
					}
				}
			}
			this.prvTouchCenter = { x: cx, y: cy }
			this.lastPanTsp = now
		} else {
			if (this.gestures.pan?.act && !this.inertiaAct) {
				const vel = Math.sqrt(this.panVelX ** 2 + this.panVelY ** 2)
				if (vel > this.gestureCfg.inertiaMinVel) {
					this.inertiaAct = true
				} else {
					this.gestures.pan.act = false
					this.gestures.pan.justEnd = true
					this.panVelX = 0
					this.panVelY = 0
				}
			}
			if (this.inertiaAct) {
				this.panVelX *= this.gestureCfg.inertiaDamp
				this.panVelY *= this.gestureCfg.inertiaDamp
				const vel = Math.sqrt(this.panVelX ** 2 + this.panVelY ** 2)
				if (vel < this.gestureCfg.inertiaMinVel) {
					this.inertiaAct = false
					if (this.gestures.pan) {
						this.gestures.pan.act = false
						this.gestures.pan.justEnd = true
					}
					this.panVelX = 0
					this.panVelY = 0
				} else {
					const dt = 0.016
					this.gestures.pan = {
						typ: 'pan',
						act: true,
						justSta: false,
						justEnd: false,
						dx: this.panVelX * dt,
						dy: this.panVelY * dt,
						x: this.gestures.pan?.x ?? 0,
						y: this.gestures.pan?.y ?? 0,
						fingers: 0,
						velX: this.panVelX,
						velY: this.panVelY,
						inertia: true
					}
				}
			} else if (this.gestures.pan && !this.gestures.pan.act) {
				this.gestures.pan = null
			}
			this.prvTouchCenter = null
		}
	}

	private detectRot() {
		const touches = this.state.touch
		if (touches.length === 2) {
			const curAngle = this.calTouchAngle(touches[0], touches[1])
			if (this.rotPrvAngle !== null) {
				let dRot = curAngle - this.rotPrvAngle
				if (dRot > Math.PI) dRot -= 2 * Math.PI
				if (dRot < -Math.PI) dRot += 2 * Math.PI
				if (Math.abs(dRot) > this.gestureCfg.rotThreshold) {
					const wasAct = this.gestures.rotate?.act ?? false
					const prvRot = this.gestures.rotate?.rot ?? 0
					const center = this.calTouchCenter(touches[0], touches[1])
					this.gestures.rotate = {
						typ: 'rotate',
						act: true,
						justSta: !wasAct,
						justEnd: false,
						rot: prvRot + dRot,
						dRot: dRot,
						cx: center.x,
						cy: center.y
					}
				}
			}
			this.rotPrvAngle = curAngle
		} else {
			if (this.gestures.rotate?.act) {
				this.gestures.rotate.act = false
				this.gestures.rotate.justEnd = true
			} else if (this.gestures.rotate) {
				this.gestures.rotate = null
			}
			this.rotPrvAngle = null
		}
	}

	private updGestures() {
		this.rstGestureFlags()
		this.detectTap()
		this.detectLongPress()
		this.detectSwipe()
		this.detectPinch()
		this.detectPan()
		this.detectRot()
		this.applyGestureActions()
		this.prvTouches = this.state.touch.map(t => ({ ...t }))
	}

	private applyGestureActions() {
		for (const [action, binding] of this.gestureBindings) {
			const gesture = this.gestures[binding.gesture]
			if (!gesture) continue
			const actionState = this.actions.get(action)
			if (!actionState) continue
			let shouldTrg = false
			if (binding.type === 'start' && gesture.justSta) shouldTrg = true
			else if (binding.type === 'end' && gesture.justEnd) shouldTrg = true
			else if (binding.type === 'move' && gesture.act) shouldTrg = true
			else if (binding.type === 'any' && (gesture.act || gesture.justSta || gesture.justEnd)) shouldTrg = true
			if (binding.fingers !== undefined && gesture.typ === 'pan') {
				if ((gesture as PanGesture).fingers !== binding.fingers) shouldTrg = false
			}
			if (binding.dir !== undefined && gesture.typ === 'swipe') {
				if ((gesture as SwipeGesture).dir !== binding.dir) shouldTrg = false
			}
			if (shouldTrg) {
				const wasPressed = actionState.pressed
				actionState.pressed = true
				actionState.justPressed = !wasPressed
				actionState.value = this.getGestureVal(gesture)
			}
		}
	}

	private getGestureVal(gesture: GestureState): number {
		switch (gesture.typ) {
			case 'pinch':
				return (gesture as PinchGesture).dScl
			case 'rotate':
				return (gesture as RotGesture).dRot
			case 'swipe':
				return (gesture as SwipeGesture).dist
			case 'tap':
				return (gesture as TapGesture).cnt
			case 'longPress':
				return (gesture as LongPressGesture).dur / 1000
			case 'pan':
				return Math.sqrt((gesture as PanGesture).dx ** 2 + (gesture as PanGesture).dy ** 2)
			default:
				return 1
		}
	}

	upd() {
		for (const [action, binding] of this.bindings) {
			const actionState = this.actions.get(action)!
			const wasPressed = actionState.pressed
			let isPressed = false
			for (const key of binding.keys) {
				if (this.state.keys.has(key)) {
					isPressed = true
					break
				}
			}
			if (binding.modifiers) {
				for (const mod of binding.modifiers) {
					const modPressed = mod === 'ctrl' ? (this.state.keys.has('ControlLeft') || this.state.keys.has('ControlRight')) :
						mod === 'shift' ? (this.state.keys.has('ShiftLeft') || this.state.keys.has('ShiftRight')) :
						(this.state.keys.has('AltLeft') || this.state.keys.has('AltRight'))
					if (!modPressed) {
						isPressed = false
						break
					}
				}
			}
			actionState.pressed = isPressed
			actionState.justPressed = isPressed && !wasPressed
			actionState.justReleased = !isPressed && wasPressed
			actionState.value = isPressed ? 1 : 0
		}
		this.updGamepad()
		this.updGestures()
		this.prevKeys = new Set(this.state.keys)
		this.prevButtons = this.state.mouse.buttons
		this.state.mouse.dx = 0
		this.state.mouse.dy = 0
		this.state.mouse.wheel = 0
	}

	private updGamepad() {
		const gamepads = navigator.getGamepads?.() ?? []
		for (const gp of gamepads) {
			if (!gp) continue
			this.state.gamepad = {
				axes: Array.from(gp.axes),
				buttons: gp.buttons.map(b => b.pressed),
				id: gp.id
			}
			break
		}
		if (this.state.gamepad) {
			const gp = this.state.gamepad
			this.applyAxisToAction('move_forward', -gp.axes[1])
			this.applyAxisToAction('move_right', gp.axes[0])
			if (gp.buttons[0]) this.setAction('jump', true)
			if (gp.buttons[2]) this.setAction('interact', true)
			if (gp.buttons[5]) this.setAction('attack', true)
			if (gp.buttons[4]) this.setAction('attack_alt', true)
		}
	}

	private applyAxisToAction(action: string, value: number) {
		const state = this.actions.get(action)
		if (!state) return
		if (Math.abs(value) < this.deadzone) value = 0
		if (Math.abs(value) > state.value) {
			state.value = value
			state.pressed = value > 0.5
		}
	}

	private setAction(action: string, pressed: boolean) {
		const state = this.actions.get(action)
		if (!state) return
		if (!state.pressed && pressed) {
			state.justPressed = true
		}
		state.pressed = pressed
		state.value = pressed ? 1 : 0
	}

	isPressed(action: string): boolean {
		return this.actions.get(action)?.pressed ?? false
	}

	justPressed(action: string): boolean {
		return this.actions.get(action)?.justPressed ?? false
	}

	justReleased(action: string): boolean {
		return this.actions.get(action)?.justReleased ?? false
	}

	getValue(action: string): number {
		return this.actions.get(action)?.value ?? 0
	}

	getAxis(positive: string, negative: string): number {
		return this.getValue(positive) - this.getValue(negative)
	}

	getMousePos(): { x: number; y: number } {
		return { x: this.state.mouse.x, y: this.state.mouse.y }
	}

	getMouseDelta(): { dx: number; dy: number } {
		return { dx: this.state.mouse.dx, dy: this.state.mouse.dy }
	}

	getMouseWheel(): number {
		return this.state.mouse.wheel
	}

	isKeyDown(key: KeyCode): boolean {
		return this.state.keys.has(key)
	}

	getTouches(): TouchState[] {
		return this.state.touch
	}

	getGesture<T extends GestureType>(typ: T): Gestures[T] {
		return this.gestures[typ]
	}

	isGestureAct(typ: GestureType): boolean {
		return this.gestures[typ]?.act ?? false
	}

	setEnabled(enabled: boolean) {
		this.enabled = enabled
	}

	clr() {
		this.state.keys.clear()
		this.state.mouse = { x: 0, y: 0, dx: 0, dy: 0, buttons: 0, wheel: 0 }
		this.state.touch = []
		this.prvTouches = []
		this.prvTouchCenter = null
		this.pinchPrvDist = 0
		this.rotPrvAngle = null
		this.panVelX = 0
		this.panVelY = 0
		this.inertiaAct = false
		this.gestures = {
			tap: null,
			longPress: null,
			swipe: null,
			pinch: null,
			pan: null,
			rotate: null
		}
		for (const action of this.actions.values()) {
			action.pressed = false
			action.justPressed = false
			action.justReleased = false
			action.value = 0
		}
	}
}

export const globalInput = new InputManager()
