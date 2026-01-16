import type { Vec3 } from './types'

export enum SndCategory {
	BGM = 'bgm',
	SFX = 'sfx',
	Voice = 'voice',
	Ambient = 'ambient'
}

export interface SndOpt {
	vol?: number
	loop?: boolean
	category?: SndCategory
}

export interface PlayingSnd {
	id: string
	src: AudioBufferSourceNode
	gain: GainNode
	panner: PannerNode | null
	category: SndCategory
	loop: boolean
	paused: boolean
	staTime: number
	pauOffset: number
	bufferId: string
}

export class AudioManager {
	ctx: AudioContext | null = null
	masterGain: GainNode | null = null
	catGains: Map<SndCategory, GainNode> = new Map()
	buffers: Map<string, AudioBuffer> = new Map()
	playing: Map<string, PlayingSnd> = new Map()
	curBgm: PlayingSnd | null = null
	lstPos: Vec3 = { x: 0, y: 0, z: 0 }
	lstFwd: Vec3 = { x: 0, y: 0, z: -1 }
	lstUp: Vec3 = { x: 0, y: 1, z: 0 }
	nxtId: number = 0
	muted: boolean = false
	volumes: Map<SndCategory, number> = new Map()
	masterVol: number = 1

	constructor() {
		this.volumes.set(SndCategory.BGM, 1)
		this.volumes.set(SndCategory.SFX, 1)
		this.volumes.set(SndCategory.Voice, 1)
		this.volumes.set(SndCategory.Ambient, 1)
	}

	ini() {
		if (this.ctx) return
		this.ctx = new AudioContext()
		this.masterGain = this.ctx.createGain()
		this.masterGain.connect(this.ctx.destination)
		this.masterGain.gain.value = this.masterVol
		for (const cat of Object.values(SndCategory)) {
			const gain = this.ctx.createGain()
			gain.connect(this.masterGain)
			gain.gain.value = this.volumes.get(cat) ?? 1
			this.catGains.set(cat, gain)
		}
	}

	ensureCtx() {
		if (!this.ctx) this.ini()
		if (this.ctx?.state === 'suspended') {
			this.ctx.resume()
		}
	}

	addBuffer(id: string, buffer: AudioBuffer) {
		this.buffers.set(id, buffer)
	}

	getBuffer(id: string): AudioBuffer | undefined {
		return this.buffers.get(id)
	}

	hasBuffer(id: string): boolean {
		return this.buffers.has(id)
	}

	play(bufferId: string, pos?: Vec3, opt?: SndOpt): string | null {
		this.ensureCtx()
		if (!this.ctx) return null
		const buffer = this.buffers.get(bufferId)
		if (!buffer) return null
		const instId = `snd_${this.nxtId++}`
		const category = opt?.category ?? SndCategory.SFX
		const loop = opt?.loop ?? false
		const vol = opt?.vol ?? 1
		const src = this.ctx.createBufferSource()
		src.buffer = buffer
		src.loop = loop
		const gain = this.ctx.createGain()
		gain.gain.value = vol
		let panner: PannerNode | null = null
		if (pos) {
			panner = this.ctx.createPanner()
			panner.panningModel = 'HRTF'
			panner.distanceModel = 'inverse'
			panner.refDistance = 1
			panner.maxDistance = 100
			panner.rolloffFactor = 1
			panner.positionX.value = pos.x
			panner.positionY.value = pos.y
			panner.positionZ.value = pos.z
			src.connect(gain)
			gain.connect(panner)
			panner.connect(this.catGains.get(category)!)
		} else {
			src.connect(gain)
			gain.connect(this.catGains.get(category)!)
		}
		const snd: PlayingSnd = {
			id: instId,
			src,
			gain,
			panner,
			category,
			loop,
			paused: false,
			staTime: this.ctx.currentTime,
			pauOffset: 0,
			bufferId
		}
		this.playing.set(instId, snd)
		src.onended = () => {
			if (!snd.paused) {
				this.playing.delete(instId)
			}
		}
		src.start(0)
		return instId
	}

	playBgm(bufferId: string, fadeIn: number = 0) {
		this.ensureCtx()
		if (!this.ctx) return
		if (this.curBgm) {
			this.stopBgm(fadeIn > 0 ? fadeIn * 0.5 : 0)
		}
		const buffer = this.buffers.get(bufferId)
		if (!buffer) return
		const instId = `bgm_${this.nxtId++}`
		const src = this.ctx.createBufferSource()
		src.buffer = buffer
		src.loop = true
		const gain = this.ctx.createGain()
		if (fadeIn > 0) {
			gain.gain.value = 0
			gain.gain.linearRampToValueAtTime(1, this.ctx.currentTime + fadeIn / 1000)
		} else {
			gain.gain.value = 1
		}
		src.connect(gain)
		gain.connect(this.catGains.get(SndCategory.BGM)!)
		const snd: PlayingSnd = {
			id: instId,
			src,
			gain,
			panner: null,
			category: SndCategory.BGM,
			loop: true,
			paused: false,
			staTime: this.ctx.currentTime,
			pauOffset: 0,
			bufferId
		}
		this.playing.set(instId, snd)
		this.curBgm = snd
		src.start(0)
	}

	stopBgm(fadeOut: number = 0) {
		if (!this.curBgm || !this.ctx) return
		const snd = this.curBgm
		if (fadeOut > 0) {
			snd.gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + fadeOut / 1000)
			setTimeout(() => {
				snd.src.stop()
				this.playing.delete(snd.id)
			}, fadeOut)
		} else {
			snd.src.stop()
			this.playing.delete(snd.id)
		}
		this.curBgm = null
	}

	pauseBgm() {
		if (!this.curBgm || !this.ctx || this.curBgm.paused) return
		const snd = this.curBgm
		snd.pauOffset = this.ctx.currentTime - snd.staTime
		snd.src.stop()
		snd.paused = true
	}

	resumeBgm() {
		if (!this.curBgm || !this.ctx || !this.curBgm.paused) return
		const snd = this.curBgm
		const buffer = this.buffers.get(snd.bufferId)
		if (!buffer) return
		const src = this.ctx.createBufferSource()
		src.buffer = buffer
		src.loop = true
		src.connect(snd.gain)
		snd.src = src
		snd.staTime = this.ctx.currentTime - snd.pauOffset
		snd.paused = false
		src.start(0, snd.pauOffset)
	}

	stop(instId: string, fadeOut: number = 0) {
		const snd = this.playing.get(instId)
		if (!snd || !this.ctx) return
		if (snd === this.curBgm) {
			this.stopBgm(fadeOut)
			return
		}
		if (fadeOut > 0) {
			snd.gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + fadeOut / 1000)
			setTimeout(() => {
				snd.src.stop()
				this.playing.delete(instId)
			}, fadeOut)
		} else {
			snd.src.stop()
			this.playing.delete(instId)
		}
	}

	stopCat(category: SndCategory, fadeOut: number = 0) {
		for (const [id, snd] of this.playing) {
			if (snd.category === category) {
				this.stop(id, fadeOut)
			}
		}
	}

	stopAll(fadeOut: number = 0) {
		for (const id of this.playing.keys()) {
			this.stop(id, fadeOut)
		}
	}

	setVol(category: SndCategory, vol: number) {
		this.volumes.set(category, vol)
		const gain = this.catGains.get(category)
		if (gain) {
			gain.gain.value = this.muted ? 0 : vol
		}
	}

	getVol(category: SndCategory): number {
		return this.volumes.get(category) ?? 1
	}

	setMasterVol(vol: number) {
		this.masterVol = vol
		if (this.masterGain) {
			this.masterGain.gain.value = this.muted ? 0 : vol
		}
	}

	getMasterVol(): number {
		return this.masterVol
	}

	setMuted(muted: boolean) {
		this.muted = muted
		if (this.masterGain) {
			this.masterGain.gain.value = muted ? 0 : this.masterVol
		}
	}

	isMuted(): boolean {
		return this.muted
	}

	setLstPos(pos: Vec3, fwd: Vec3, up: Vec3) {
		this.lstPos = pos
		this.lstFwd = fwd
		this.lstUp = up
		if (!this.ctx) return
		const listener = this.ctx.listener
		if (listener.positionX) {
			listener.positionX.value = pos.x
			listener.positionY.value = pos.y
			listener.positionZ.value = pos.z
			listener.forwardX.value = fwd.x
			listener.forwardY.value = fwd.y
			listener.forwardZ.value = fwd.z
			listener.upX.value = up.x
			listener.upY.value = up.y
			listener.upZ.value = up.z
		}
	}

	updSndPos(instId: string, pos: Vec3) {
		const snd = this.playing.get(instId)
		if (!snd || !snd.panner) return
		snd.panner.positionX.value = pos.x
		snd.panner.positionY.value = pos.y
		snd.panner.positionZ.value = pos.z
	}

	upd(_dt: number) {
		if (!this.ctx) return
		const toRemove: string[] = []
		for (const [id, snd] of this.playing) {
			if (!snd.loop && !snd.paused) {
				const buffer = this.buffers.get(snd.bufferId)
				if (buffer) {
					const elapsed = this.ctx.currentTime - snd.staTime
					if (elapsed >= buffer.duration) {
						toRemove.push(id)
					}
				}
			}
		}
		for (const id of toRemove) {
			this.playing.delete(id)
		}
	}

	isPlaying(instId: string): boolean {
		return this.playing.has(instId)
	}

	getPlayingCnt(category?: SndCategory): number {
		if (!category) return this.playing.size
		let cnt = 0
		for (const snd of this.playing.values()) {
			if (snd.category === category) cnt++
		}
		return cnt
	}

	clr() {
		this.stopAll()
		this.buffers.clear()
	}

	dst() {
		this.stopAll()
		this.buffers.clear()
		this.catGains.clear()
		if (this.ctx) {
			this.ctx.close()
			this.ctx = null
		}
		this.masterGain = null
	}

	async decodeBuffer(arrayBuffer: ArrayBuffer): Promise<AudioBuffer | null> {
		this.ensureCtx()
		if (!this.ctx) return null
		return this.ctx.decodeAudioData(arrayBuffer)
	}
}

export const globalAudio = new AudioManager()
