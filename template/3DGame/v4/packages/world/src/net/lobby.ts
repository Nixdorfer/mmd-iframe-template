import { WebSocketTransport, TransportState } from './transport'

export interface PlayerInfo {
	id: string
	name: string
	avatar: string
	level: number
	status: PlayerStatus
	ping: number
	joinTime: number
}

export enum PlayerStatus {
	Idle = 0,
	Ready = 1,
	InGame = 2,
	Away = 3
}

export interface RoomInfo {
	id: string
	name: string
	host: string
	players: PlayerInfo[]
	maxPlayers: number
	status: RoomStatus
	gameMode: string
	map: string
	password: boolean
	createdAt: number
	settings: Record<string, unknown>
}

export enum RoomStatus {
	Waiting = 0,
	Starting = 1,
	InProgress = 2,
	Finished = 3
}

export interface LobbyCfg {
	maxRooms: number
	maxPlayersPerRoom: number
	roomTimeout: number
	heartbeatInterval: number
}

export const DEFAULT_LOBBY_CFG: LobbyCfg = {
	maxRooms: 100,
	maxPlayersPerRoom: 16,
	roomTimeout: 300000,
	heartbeatInterval: 10000
}

export enum LobbyMsgType {
	Login = 1,
	LoginResponse = 2,
	Logout = 3,
	RoomList = 10,
	RoomListResponse = 11,
	CreateRoom = 20,
	CreateRoomResponse = 21,
	JoinRoom = 22,
	JoinRoomResponse = 23,
	LeaveRoom = 24,
	LeaveRoomResponse = 25,
	RoomUpdate = 26,
	PlayerJoined = 30,
	PlayerLeft = 31,
	PlayerReady = 32,
	PlayerUpdate = 33,
	Chat = 40,
	ChatResponse = 41,
	StartGame = 50,
	StartGameResponse = 51,
	GameStarted = 52,
	Kick = 60,
	KickResponse = 61,
	Error = 255
}

export interface LobbyMsg {
	type: LobbyMsgType
	data: unknown
}

export interface LobbyEvents {
	connected: () => void
	disconnected: () => void
	loginSuccess: (player: PlayerInfo) => void
	loginFailed: (reason: string) => void
	roomList: (rooms: RoomInfo[]) => void
	roomCreated: (room: RoomInfo) => void
	roomJoined: (room: RoomInfo) => void
	roomLeft: () => void
	roomUpdated: (room: RoomInfo) => void
	playerJoined: (player: PlayerInfo) => void
	playerLeft: (playerId: string) => void
	playerUpdated: (player: PlayerInfo) => void
	chat: (senderId: string, message: string) => void
	gameStarting: (countdown: number) => void
	gameStarted: (gameData: unknown) => void
	kicked: (reason: string) => void
	error: (code: number, message: string) => void
}

export class LobbyClient {
	cfg: LobbyCfg
	transport: WebSocketTransport
	localPlayer: PlayerInfo | null
	currentRoom: RoomInfo | null
	rooms: Map<string, RoomInfo>
	players: Map<string, PlayerInfo>
	listeners: Map<keyof LobbyEvents, Set<Function>>
	heartbeatTimer: number | null

	constructor(transport: WebSocketTransport, cfg: Partial<LobbyCfg> = {}) {
		this.cfg = { ...DEFAULT_LOBBY_CFG, ...cfg }
		this.transport = transport
		this.localPlayer = null
		this.currentRoom = null
		this.rooms = new Map()
		this.players = new Map()
		this.listeners = new Map()
		this.heartbeatTimer = null
		this.setupTransport()
	}

	private setupTransport() {
		this.transport.on('open', () => {
			this.startHeartbeat()
			this.emit('connected')
		})
		this.transport.on('close', () => {
			this.stopHeartbeat()
			this.emit('disconnected')
		})
		this.transport.on('message', (data) => {
			if (typeof data === 'string') {
				this.handleMessage(JSON.parse(data) as LobbyMsg)
			}
		})
	}

	private handleMessage(msg: LobbyMsg) {
		switch (msg.type) {
			case LobbyMsgType.LoginResponse:
				this.handleLoginResponse(msg.data as { success: boolean, player?: PlayerInfo, reason?: string })
				break
			case LobbyMsgType.RoomListResponse:
				this.handleRoomList(msg.data as RoomInfo[])
				break
			case LobbyMsgType.CreateRoomResponse:
				this.handleCreateRoom(msg.data as { success: boolean, room?: RoomInfo, reason?: string })
				break
			case LobbyMsgType.JoinRoomResponse:
				this.handleJoinRoom(msg.data as { success: boolean, room?: RoomInfo, reason?: string })
				break
			case LobbyMsgType.LeaveRoomResponse:
				this.handleLeaveRoom()
				break
			case LobbyMsgType.RoomUpdate:
				this.handleRoomUpdate(msg.data as RoomInfo)
				break
			case LobbyMsgType.PlayerJoined:
				this.handlePlayerJoined(msg.data as PlayerInfo)
				break
			case LobbyMsgType.PlayerLeft:
				this.handlePlayerLeft(msg.data as { playerId: string })
				break
			case LobbyMsgType.PlayerUpdate:
				this.handlePlayerUpdate(msg.data as PlayerInfo)
				break
			case LobbyMsgType.ChatResponse:
				this.handleChat(msg.data as { senderId: string, message: string })
				break
			case LobbyMsgType.StartGameResponse:
				this.handleStartGameResponse(msg.data as { success: boolean, countdown?: number })
				break
			case LobbyMsgType.GameStarted:
				this.handleGameStarted(msg.data)
				break
			case LobbyMsgType.KickResponse:
				this.handleKicked(msg.data as { reason: string })
				break
			case LobbyMsgType.Error:
				this.handleError(msg.data as { code: number, message: string })
				break
		}
	}

	private handleLoginResponse(data: { success: boolean, player?: PlayerInfo, reason?: string }) {
		if (data.success && data.player) {
			this.localPlayer = data.player
			this.emit('loginSuccess', data.player)
		} else {
			this.emit('loginFailed', data.reason ?? 'Unknown error')
		}
	}

	private handleRoomList(rooms: RoomInfo[]) {
		this.rooms.clear()
		for (const room of rooms) {
			this.rooms.set(room.id, room)
		}
		this.emit('roomList', rooms)
	}

	private handleCreateRoom(data: { success: boolean, room?: RoomInfo, reason?: string }) {
		if (data.success && data.room) {
			this.currentRoom = data.room
			this.rooms.set(data.room.id, data.room)
			this.emit('roomCreated', data.room)
		}
	}

	private handleJoinRoom(data: { success: boolean, room?: RoomInfo, reason?: string }) {
		if (data.success && data.room) {
			this.currentRoom = data.room
			this.players.clear()
			for (const p of data.room.players) {
				this.players.set(p.id, p)
			}
			this.emit('roomJoined', data.room)
		}
	}

	private handleLeaveRoom() {
		this.currentRoom = null
		this.players.clear()
		this.emit('roomLeft')
	}

	private handleRoomUpdate(room: RoomInfo) {
		this.currentRoom = room
		this.rooms.set(room.id, room)
		this.emit('roomUpdated', room)
	}

	private handlePlayerJoined(player: PlayerInfo) {
		this.players.set(player.id, player)
		if (this.currentRoom) {
			this.currentRoom.players.push(player)
		}
		this.emit('playerJoined', player)
	}

	private handlePlayerLeft(data: { playerId: string }) {
		this.players.delete(data.playerId)
		if (this.currentRoom) {
			this.currentRoom.players = this.currentRoom.players.filter(p => p.id !== data.playerId)
		}
		this.emit('playerLeft', data.playerId)
	}

	private handlePlayerUpdate(player: PlayerInfo) {
		this.players.set(player.id, player)
		this.emit('playerUpdated', player)
	}

	private handleChat(data: { senderId: string, message: string }) {
		this.emit('chat', data.senderId, data.message)
	}

	private handleStartGameResponse(data: { success: boolean, countdown?: number }) {
		if (data.success && data.countdown !== undefined) {
			this.emit('gameStarting', data.countdown)
		}
	}

	private handleGameStarted(gameData: unknown) {
		if (this.currentRoom) {
			this.currentRoom.status = RoomStatus.InProgress
		}
		this.emit('gameStarted', gameData)
	}

	private handleKicked(data: { reason: string }) {
		this.currentRoom = null
		this.players.clear()
		this.emit('kicked', data.reason)
	}

	private handleError(data: { code: number, message: string }) {
		this.emit('error', data.code, data.message)
	}

	private send(type: LobbyMsgType, data: unknown) {
		this.transport.sendJson({ type, data })
	}

	connect(url?: string) {
		this.transport.connect(url)
	}

	disconnect() {
		this.transport.disconnect()
	}

	login(name: string, avatar: string = '') {
		this.send(LobbyMsgType.Login, { name, avatar })
	}

	logout() {
		this.send(LobbyMsgType.Logout, {})
	}

	requestRoomList() {
		this.send(LobbyMsgType.RoomList, {})
	}

	createRoom(name: string, gameMode: string, map: string, maxPlayers: number, password?: string, settings?: Record<string, unknown>) {
		this.send(LobbyMsgType.CreateRoom, { name, gameMode, map, maxPlayers, password, settings })
	}

	joinRoom(roomId: string, password?: string) {
		this.send(LobbyMsgType.JoinRoom, { roomId, password })
	}

	leaveRoom() {
		this.send(LobbyMsgType.LeaveRoom, {})
	}

	setReady(ready: boolean) {
		this.send(LobbyMsgType.PlayerReady, { ready })
	}

	sendChat(message: string) {
		this.send(LobbyMsgType.Chat, { message })
	}

	startGame() {
		this.send(LobbyMsgType.StartGame, {})
	}

	kickPlayer(playerId: string, reason: string = '') {
		this.send(LobbyMsgType.Kick, { playerId, reason })
	}

	on<K extends keyof LobbyEvents>(event: K, callback: LobbyEvents[K]): () => void {
		let set = this.listeners.get(event)
		if (!set) {
			set = new Set()
			this.listeners.set(event, set)
		}
		set.add(callback)
		return () => set!.delete(callback)
	}

	off<K extends keyof LobbyEvents>(event: K, callback: LobbyEvents[K]) {
		const set = this.listeners.get(event)
		if (set) set.delete(callback)
	}

	private emit<K extends keyof LobbyEvents>(event: K, ...args: Parameters<LobbyEvents[K]>) {
		const set = this.listeners.get(event)
		if (set) {
			for (const cb of set) {
				(cb as Function)(...args)
			}
		}
	}

	private startHeartbeat() {
		this.stopHeartbeat()
		this.heartbeatTimer = window.setInterval(() => {
			if (this.transport.isConnected()) {
				this.transport.send('ping')
			}
		}, this.cfg.heartbeatInterval)
	}

	private stopHeartbeat() {
		if (this.heartbeatTimer !== null) {
			clearInterval(this.heartbeatTimer)
			this.heartbeatTimer = null
		}
	}

	isConnected(): boolean {
		return this.transport.getState() === TransportState.Connected
	}

	isInRoom(): boolean {
		return this.currentRoom !== null
	}

	isHost(): boolean {
		return this.currentRoom !== null && this.localPlayer !== null && this.currentRoom.host === this.localPlayer.id
	}

	getRoom(): RoomInfo | null {
		return this.currentRoom
	}

	getPlayer(id: string): PlayerInfo | null {
		return this.players.get(id) ?? null
	}

	getLocalPlayer(): PlayerInfo | null {
		return this.localPlayer
	}

	getRooms(): RoomInfo[] {
		return Array.from(this.rooms.values())
	}

	getPlayers(): PlayerInfo[] {
		return Array.from(this.players.values())
	}
}
