export enum TransportState {
	Disconnected = 0,
	Connecting = 1,
	Connected = 2,
	Reconnecting = 3
}

export interface TransportCfg {
	url: string
	reconnect: boolean
	reconnectDelay: number
	reconnectMaxAttempts: number
	heartbeatInterval: number
	timeout: number
	binaryType: BinaryType
}

export const DEFAULT_TRANSPORT_CFG: TransportCfg = {
	url: 'ws://localhost:8080',
	reconnect: true,
	reconnectDelay: 1000,
	reconnectMaxAttempts: 5,
	heartbeatInterval: 30000,
	timeout: 10000,
	binaryType: 'arraybuffer'
}

export interface TransportEvents {
	open: () => void
	close: (code: number, reason: string) => void
	error: (error: Event) => void
	message: (data: ArrayBuffer | string) => void
	stateChange: (state: TransportState) => void
}

export class WebSocketTransport {
	cfg: TransportCfg
	ws: WebSocket | null
	state: TransportState
	reconnectAttempts: number
	heartbeatTimer: number | null
	reconnectTimer: number | null
	listeners: Map<keyof TransportEvents, Set<Function>>
	messageQueue: (ArrayBuffer | string)[]
	lastPingTime: number
	latency: number

	constructor(cfg: Partial<TransportCfg> = {}) {
		this.cfg = { ...DEFAULT_TRANSPORT_CFG, ...cfg }
		this.ws = null
		this.state = TransportState.Disconnected
		this.reconnectAttempts = 0
		this.heartbeatTimer = null
		this.reconnectTimer = null
		this.listeners = new Map()
		this.messageQueue = []
		this.lastPingTime = 0
		this.latency = 0
	}

	connect(url?: string) {
		if (url) this.cfg.url = url
		if (this.state === TransportState.Connected || this.state === TransportState.Connecting) {
			return
		}
		this.setState(TransportState.Connecting)
		try {
			this.ws = new WebSocket(this.cfg.url)
			this.ws.binaryType = this.cfg.binaryType
			this.ws.onopen = () => this.onOpen()
			this.ws.onclose = (e) => this.onClose(e)
			this.ws.onerror = (e) => this.onError(e)
			this.ws.onmessage = (e) => this.onMessage(e)
		} catch (err) {
			this.setState(TransportState.Disconnected)
			this.emit('error', new Event('connection_error'))
		}
	}

	disconnect(code: number = 1000, reason: string = 'Normal closure') {
		this.stopHeartbeat()
		this.stopReconnect()
		if (this.ws) {
			this.ws.close(code, reason)
			this.ws = null
		}
		this.setState(TransportState.Disconnected)
	}

	send(data: ArrayBuffer | string) {
		if (this.state !== TransportState.Connected || !this.ws) {
			this.messageQueue.push(data)
			return false
		}
		try {
			this.ws.send(data)
			return true
		} catch (err) {
			this.messageQueue.push(data)
			return false
		}
	}

	sendJson(obj: unknown) {
		return this.send(JSON.stringify(obj))
	}

	sendBinary(buffer: ArrayBuffer) {
		return this.send(buffer)
	}

	on<K extends keyof TransportEvents>(event: K, callback: TransportEvents[K]): () => void {
		let set = this.listeners.get(event)
		if (!set) {
			set = new Set()
			this.listeners.set(event, set)
		}
		set.add(callback)
		return () => set!.delete(callback)
	}

	off<K extends keyof TransportEvents>(event: K, callback: TransportEvents[K]) {
		const set = this.listeners.get(event)
		if (set) set.delete(callback)
	}

	private emit<K extends keyof TransportEvents>(event: K, ...args: Parameters<TransportEvents[K]>) {
		const set = this.listeners.get(event)
		if (set) {
			for (const cb of set) {
				(cb as Function)(...args)
			}
		}
	}

	private setState(state: TransportState) {
		if (this.state !== state) {
			this.state = state
			this.emit('stateChange', state)
		}
	}

	private onOpen() {
		this.setState(TransportState.Connected)
		this.reconnectAttempts = 0
		this.startHeartbeat()
		this.flushQueue()
		this.emit('open')
	}

	private onClose(e: CloseEvent) {
		this.stopHeartbeat()
		this.emit('close', e.code, e.reason)
		if (this.cfg.reconnect && this.state !== TransportState.Disconnected) {
			this.scheduleReconnect()
		} else {
			this.setState(TransportState.Disconnected)
		}
	}

	private onError(e: Event) {
		this.emit('error', e)
	}

	private onMessage(e: MessageEvent) {
		const data = e.data as ArrayBuffer | string
		if (typeof data === 'string' && data === 'pong') {
			this.latency = performance.now() - this.lastPingTime
			return
		}
		this.emit('message', data)
	}

	private startHeartbeat() {
		this.stopHeartbeat()
		this.heartbeatTimer = window.setInterval(() => {
			if (this.state === TransportState.Connected && this.ws) {
				this.lastPingTime = performance.now()
				this.ws.send('ping')
			}
		}, this.cfg.heartbeatInterval)
	}

	private stopHeartbeat() {
		if (this.heartbeatTimer !== null) {
			clearInterval(this.heartbeatTimer)
			this.heartbeatTimer = null
		}
	}

	private scheduleReconnect() {
		if (this.reconnectAttempts >= this.cfg.reconnectMaxAttempts) {
			this.setState(TransportState.Disconnected)
			return
		}
		this.setState(TransportState.Reconnecting)
		const delay = this.cfg.reconnectDelay * Math.pow(2, this.reconnectAttempts)
		this.reconnectTimer = window.setTimeout(() => {
			this.reconnectAttempts++
			this.connect()
		}, delay)
	}

	private stopReconnect() {
		if (this.reconnectTimer !== null) {
			clearTimeout(this.reconnectTimer)
			this.reconnectTimer = null
		}
	}

	private flushQueue() {
		while (this.messageQueue.length > 0) {
			const msg = this.messageQueue.shift()!
			this.send(msg)
		}
	}

	getState(): TransportState {
		return this.state
	}

	getLatency(): number {
		return this.latency
	}

	isConnected(): boolean {
		return this.state === TransportState.Connected
	}
}

export interface PacketHeader {
	type: number
	seq: number
	ack: number
	time: number
}

export class PacketEncoder {
	private buffer: ArrayBuffer
	private view: DataView
	private offset: number

	constructor(size: number = 1024) {
		this.buffer = new ArrayBuffer(size)
		this.view = new DataView(this.buffer)
		this.offset = 0
	}

	reset() {
		this.offset = 0
	}

	writeHeader(header: PacketHeader) {
		this.writeUint8(header.type)
		this.writeUint32(header.seq)
		this.writeUint32(header.ack)
		this.writeFloat64(header.time)
	}

	writeUint8(value: number) {
		this.ensureCapacity(1)
		this.view.setUint8(this.offset, value)
		this.offset += 1
	}

	writeUint16(value: number) {
		this.ensureCapacity(2)
		this.view.setUint16(this.offset, value, true)
		this.offset += 2
	}

	writeUint32(value: number) {
		this.ensureCapacity(4)
		this.view.setUint32(this.offset, value, true)
		this.offset += 4
	}

	writeFloat32(value: number) {
		this.ensureCapacity(4)
		this.view.setFloat32(this.offset, value, true)
		this.offset += 4
	}

	writeFloat64(value: number) {
		this.ensureCapacity(8)
		this.view.setFloat64(this.offset, value, true)
		this.offset += 8
	}

	writeString(str: string) {
		const encoded = new TextEncoder().encode(str)
		this.writeUint16(encoded.length)
		this.ensureCapacity(encoded.length)
		new Uint8Array(this.buffer, this.offset, encoded.length).set(encoded)
		this.offset += encoded.length
	}

	writeVec3(x: number, y: number, z: number) {
		this.writeFloat32(x)
		this.writeFloat32(y)
		this.writeFloat32(z)
	}

	writeBytes(data: Uint8Array) {
		this.writeUint16(data.length)
		this.ensureCapacity(data.length)
		new Uint8Array(this.buffer, this.offset, data.length).set(data)
		this.offset += data.length
	}

	getBuffer(): ArrayBuffer {
		return this.buffer.slice(0, this.offset)
	}

	private ensureCapacity(bytes: number) {
		if (this.offset + bytes > this.buffer.byteLength) {
			const newSize = Math.max(this.buffer.byteLength * 2, this.offset + bytes)
			const newBuffer = new ArrayBuffer(newSize)
			new Uint8Array(newBuffer).set(new Uint8Array(this.buffer))
			this.buffer = newBuffer
			this.view = new DataView(this.buffer)
		}
	}
}

export class PacketDecoder {
	private view: DataView
	private offset: number

	constructor(buffer: ArrayBuffer) {
		this.view = new DataView(buffer)
		this.offset = 0
	}

	readHeader(): PacketHeader {
		return {
			type: this.readUint8(),
			seq: this.readUint32(),
			ack: this.readUint32(),
			time: this.readFloat64()
		}
	}

	readUint8(): number {
		const value = this.view.getUint8(this.offset)
		this.offset += 1
		return value
	}

	readUint16(): number {
		const value = this.view.getUint16(this.offset, true)
		this.offset += 2
		return value
	}

	readUint32(): number {
		const value = this.view.getUint32(this.offset, true)
		this.offset += 4
		return value
	}

	readFloat32(): number {
		const value = this.view.getFloat32(this.offset, true)
		this.offset += 4
		return value
	}

	readFloat64(): number {
		const value = this.view.getFloat64(this.offset, true)
		this.offset += 8
		return value
	}

	readString(): string {
		const len = this.readUint16()
		const bytes = new Uint8Array(this.view.buffer, this.offset, len)
		this.offset += len
		return new TextDecoder().decode(bytes)
	}

	readVec3(): { x: number, y: number, z: number } {
		return {
			x: this.readFloat32(),
			y: this.readFloat32(),
			z: this.readFloat32()
		}
	}

	readBytes(): Uint8Array {
		const len = this.readUint16()
		const bytes = new Uint8Array(this.view.buffer, this.offset, len)
		this.offset += len
		return bytes
	}

	remaining(): number {
		return this.view.byteLength - this.offset
	}
}
