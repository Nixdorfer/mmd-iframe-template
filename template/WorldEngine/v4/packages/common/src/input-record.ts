export enum InputEventType {
	KeyDown = 1,
	KeyUp = 2,
	MouseDown = 3,
	MouseUp = 4,
	MouseMove = 5,
	Wheel = 6,
	TouchStart = 7,
	TouchEnd = 8,
	TouchMove = 9,
	GamepadButton = 10,
	GamepadAxis = 11
}

export interface InputEvent {
	type: InputEventType
	time: number
	data: unknown
}

export interface KeyEvent {
	key: string
	code: string
}

export interface MouseEvent {
	button: number
	x: number
	y: number
}

export interface MouseMoveEvent {
	x: number
	y: number
	dx: number
	dy: number
}

export interface WheelEvent {
	delta: number
	x: number
	y: number
}

export interface TouchEvent {
	id: number
	x: number
	y: number
}

export interface GamepadButtonEvent {
	gamepad: number
	button: number
	pressed: boolean
	value: number
}

export interface GamepadAxisEvent {
	gamepad: number
	axis: number
	value: number
}

export interface RecordingMeta {
	id: string
	name: string
	duration: number
	startTime: number
	endTime: number
	eventCount: number
	version: string
}

export interface Recording {
	meta: RecordingMeta
	events: InputEvent[]
}

export enum RecorderState {
	Idle = 0,
	Recording = 1,
	Playing = 2,
	Paused = 3
}

export interface RecorderCfg {
	maxEvents: number
	maxDuration: number
	captureKeys: boolean
	captureMouse: boolean
	captureTouch: boolean
	captureGamepad: boolean
	compressEvents: boolean
}

export const DEFAULT_RECORDER_CFG: RecorderCfg = {
	maxEvents: 100000,
	maxDuration: 3600000,
	captureKeys: true,
	captureMouse: true,
	captureTouch: true,
	captureGamepad: true,
	compressEvents: true
}

export class InputRecorder {
	cfg: RecorderCfg
	state: RecorderState
	events: InputEvent[]
	startTime: number
	pauseTime: number
	pausedDuration: number
	currentRecording: Recording | null
	playbackIndex: number
	playbackTime: number
	playbackSpeed: number
	onEvent: ((event: InputEvent) => void) | null
	onStateChange: ((state: RecorderState) => void) | null

	constructor(cfg: Partial<RecorderCfg> = {}) {
		this.cfg = { ...DEFAULT_RECORDER_CFG, ...cfg }
		this.state = RecorderState.Idle
		this.events = []
		this.startTime = 0
		this.pauseTime = 0
		this.pausedDuration = 0
		this.currentRecording = null
		this.playbackIndex = 0
		this.playbackTime = 0
		this.playbackSpeed = 1
		this.onEvent = null
		this.onStateChange = null
	}

	startRecording() {
		if (this.state !== RecorderState.Idle) return
		this.events = []
		this.startTime = performance.now()
		this.pausedDuration = 0
		this.setState(RecorderState.Recording)
	}

	stopRecording(): Recording | null {
		if (this.state !== RecorderState.Recording && this.state !== RecorderState.Paused) {
			return null
		}
		const endTime = performance.now()
		const duration = endTime - this.startTime - this.pausedDuration
		const recording: Recording = {
			meta: {
				id: `rec_${Date.now()}`,
				name: 'Recording',
				duration,
				startTime: this.startTime,
				endTime,
				eventCount: this.events.length,
				version: '1.0'
			},
			events: this.cfg.compressEvents ? this.compressEvents(this.events) : [...this.events]
		}
		this.currentRecording = recording
		this.setState(RecorderState.Idle)
		return recording
	}

	pauseRecording() {
		if (this.state !== RecorderState.Recording) return
		this.pauseTime = performance.now()
		this.setState(RecorderState.Paused)
	}

	resumeRecording() {
		if (this.state !== RecorderState.Paused) return
		this.pausedDuration += performance.now() - this.pauseTime
		this.setState(RecorderState.Recording)
	}

	record(type: InputEventType, data: unknown) {
		if (this.state !== RecorderState.Recording) return
		if (this.events.length >= this.cfg.maxEvents) return
		const time = performance.now() - this.startTime - this.pausedDuration
		if (time > this.cfg.maxDuration) {
			this.stopRecording()
			return
		}
		if (!this.shouldCapture(type)) return
		this.events.push({ type, time, data })
	}

	private shouldCapture(type: InputEventType): boolean {
		switch (type) {
			case InputEventType.KeyDown:
			case InputEventType.KeyUp:
				return this.cfg.captureKeys
			case InputEventType.MouseDown:
			case InputEventType.MouseUp:
			case InputEventType.MouseMove:
			case InputEventType.Wheel:
				return this.cfg.captureMouse
			case InputEventType.TouchStart:
			case InputEventType.TouchEnd:
			case InputEventType.TouchMove:
				return this.cfg.captureTouch
			case InputEventType.GamepadButton:
			case InputEventType.GamepadAxis:
				return this.cfg.captureGamepad
			default:
				return true
		}
	}

	recordKey(type: 'down' | 'up', key: string, code: string) {
		this.record(
			type === 'down' ? InputEventType.KeyDown : InputEventType.KeyUp,
			{ key, code } as KeyEvent
		)
	}

	recordMouse(type: 'down' | 'up', button: number, x: number, y: number) {
		this.record(
			type === 'down' ? InputEventType.MouseDown : InputEventType.MouseUp,
			{ button, x, y } as MouseEvent
		)
	}

	recordMouseMove(x: number, y: number, dx: number, dy: number) {
		this.record(InputEventType.MouseMove, { x, y, dx, dy } as MouseMoveEvent)
	}

	recordWheel(delta: number, x: number, y: number) {
		this.record(InputEventType.Wheel, { delta, x, y } as WheelEvent)
	}

	recordTouch(type: 'start' | 'end' | 'move', id: number, x: number, y: number) {
		const eventType = type === 'start' ? InputEventType.TouchStart :
			type === 'end' ? InputEventType.TouchEnd : InputEventType.TouchMove
		this.record(eventType, { id, x, y } as TouchEvent)
	}

	recordGamepadButton(gamepad: number, button: number, pressed: boolean, value: number) {
		this.record(InputEventType.GamepadButton, { gamepad, button, pressed, value } as GamepadButtonEvent)
	}

	recordGamepadAxis(gamepad: number, axis: number, value: number) {
		this.record(InputEventType.GamepadAxis, { gamepad, axis, value } as GamepadAxisEvent)
	}

	startPlayback(recording: Recording) {
		if (this.state !== RecorderState.Idle) return
		this.currentRecording = recording
		this.playbackIndex = 0
		this.playbackTime = 0
		this.setState(RecorderState.Playing)
	}

	stopPlayback() {
		if (this.state !== RecorderState.Playing && this.state !== RecorderState.Paused) return
		this.setState(RecorderState.Idle)
	}

	pausePlayback() {
		if (this.state !== RecorderState.Playing) return
		this.setState(RecorderState.Paused)
	}

	resumePlayback() {
		if (this.state !== RecorderState.Paused) return
		this.setState(RecorderState.Playing)
	}

	setPlaybackSpeed(speed: number) {
		this.playbackSpeed = Math.max(0.1, Math.min(10, speed))
	}

	seekTo(time: number) {
		if (!this.currentRecording) return
		this.playbackTime = Math.max(0, Math.min(time, this.currentRecording.meta.duration))
		this.playbackIndex = 0
		for (let i = 0; i < this.currentRecording.events.length; i++) {
			if (this.currentRecording.events[i].time > this.playbackTime) {
				break
			}
			this.playbackIndex = i + 1
		}
	}

	upd(dt: number) {
		if (this.state !== RecorderState.Playing || !this.currentRecording) return
		this.playbackTime += dt * 1000 * this.playbackSpeed
		while (this.playbackIndex < this.currentRecording.events.length) {
			const event = this.currentRecording.events[this.playbackIndex]
			if (event.time <= this.playbackTime) {
				if (this.onEvent) {
					this.onEvent(event)
				}
				this.playbackIndex++
			} else {
				break
			}
		}
		if (this.playbackIndex >= this.currentRecording.events.length) {
			this.stopPlayback()
		}
	}

	private setState(state: RecorderState) {
		if (this.state !== state) {
			this.state = state
			if (this.onStateChange) {
				this.onStateChange(state)
			}
		}
	}

	private compressEvents(events: InputEvent[]): InputEvent[] {
		const compressed: InputEvent[] = []
		let lastMoveEvent: InputEvent | null = null
		for (const event of events) {
			if (event.type === InputEventType.MouseMove) {
				if (lastMoveEvent && event.time - lastMoveEvent.time < 16) {
					lastMoveEvent = event
					continue
				}
				if (lastMoveEvent) {
					compressed.push(lastMoveEvent)
				}
				lastMoveEvent = event
			} else {
				if (lastMoveEvent) {
					compressed.push(lastMoveEvent)
					lastMoveEvent = null
				}
				compressed.push(event)
			}
		}
		if (lastMoveEvent) {
			compressed.push(lastMoveEvent)
		}
		return compressed
	}

	getState(): RecorderState {
		return this.state
	}

	getPlaybackProgress(): number {
		if (!this.currentRecording) return 0
		return this.playbackTime / this.currentRecording.meta.duration
	}

	getRecordingDuration(): number {
		if (this.state === RecorderState.Recording) {
			return performance.now() - this.startTime - this.pausedDuration
		}
		return this.currentRecording?.meta.duration ?? 0
	}

	getEventCount(): number {
		if (this.state === RecorderState.Recording) {
			return this.events.length
		}
		return this.currentRecording?.meta.eventCount ?? 0
	}

	exportRecording(): string | null {
		if (!this.currentRecording) return null
		return JSON.stringify(this.currentRecording)
	}

	importRecording(json: string): Recording | null {
		try {
			const recording = JSON.parse(json) as Recording
			if (recording.meta && recording.events) {
				this.currentRecording = recording
				return recording
			}
		} catch (e) {
		}
		return null
	}

	clr() {
		this.events = []
		this.currentRecording = null
		this.playbackIndex = 0
		this.playbackTime = 0
		this.setState(RecorderState.Idle)
	}
}

export const globalInputRecorder = new InputRecorder()
