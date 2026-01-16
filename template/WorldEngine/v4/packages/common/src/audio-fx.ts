import type { Vec3 } from './types'

export interface AudioMixerCfg {
	masterVol: number
	categories: Map<string, number>
	compressor: boolean
	compressorThreshold: number
	compressorRatio: number
	limiter: boolean
	limiterThreshold: number
}

export interface AudioChannel {
	id: string
	name: string
	gain: GainNode
	parent: string | null
	children: string[]
	vol: number
	muted: boolean
	solo: boolean
}

export class AudioMixer {
	ctx: AudioContext | null
	channels: Map<string, AudioChannel>
	masterGain: GainNode | null
	compressor: DynamicsCompressorNode | null
	limiter: DynamicsCompressorNode | null
	soloActive: boolean

	constructor() {
		this.ctx = null
		this.channels = new Map()
		this.masterGain = null
		this.compressor = null
		this.limiter = null
		this.soloActive = false
	}

	ini(ctx: AudioContext) {
		this.ctx = ctx
		this.masterGain = ctx.createGain()
		this.compressor = ctx.createDynamicsCompressor()
		this.compressor.threshold.value = -24
		this.compressor.ratio.value = 4
		this.compressor.attack.value = 0.003
		this.compressor.release.value = 0.25
		this.limiter = ctx.createDynamicsCompressor()
		this.limiter.threshold.value = -0.5
		this.limiter.ratio.value = 20
		this.limiter.attack.value = 0.001
		this.limiter.release.value = 0.01
		this.masterGain.connect(this.compressor)
		this.compressor.connect(this.limiter)
		this.limiter.connect(ctx.destination)
		this.createChannel('master', null)
		this.createChannel('music', 'master')
		this.createChannel('sfx', 'master')
		this.createChannel('voice', 'master')
		this.createChannel('ambient', 'master')
		this.createChannel('ui', 'sfx')
	}

	createChannel(id: string, parentId: string | null): AudioChannel | null {
		if (!this.ctx) return null
		if (this.channels.has(id)) return this.channels.get(id)!
		const gain = this.ctx.createGain()
		const channel: AudioChannel = {
			id,
			name: id,
			gain,
			parent: parentId,
			children: [],
			vol: 1,
			muted: false,
			solo: false
		}
		if (parentId && this.channels.has(parentId)) {
			const parent = this.channels.get(parentId)!
			gain.connect(parent.gain)
			parent.children.push(id)
		} else if (this.masterGain) {
			gain.connect(this.masterGain)
		}
		this.channels.set(id, channel)
		return channel
	}

	removeChannel(id: string) {
		const channel = this.channels.get(id)
		if (!channel) return
		for (const childId of channel.children) {
			this.removeChannel(childId)
		}
		if (channel.parent && this.channels.has(channel.parent)) {
			const parent = this.channels.get(channel.parent)!
			const idx = parent.children.indexOf(id)
			if (idx >= 0) parent.children.splice(idx, 1)
		}
		channel.gain.disconnect()
		this.channels.delete(id)
	}

	getChannel(id: string): AudioChannel | null {
		return this.channels.get(id) ?? null
	}

	getOutput(channelId: string): GainNode | null {
		const channel = this.channels.get(channelId)
		return channel?.gain ?? null
	}

	setVol(channelId: string, vol: number) {
		const channel = this.channels.get(channelId)
		if (!channel) return
		channel.vol = Math.max(0, Math.min(1, vol))
		this.updChannelGain(channel)
	}

	getVol(channelId: string): number {
		return this.channels.get(channelId)?.vol ?? 1
	}

	setMuted(channelId: string, muted: boolean) {
		const channel = this.channels.get(channelId)
		if (!channel) return
		channel.muted = muted
		this.updChannelGain(channel)
	}

	isMuted(channelId: string): boolean {
		return this.channels.get(channelId)?.muted ?? false
	}

	setSolo(channelId: string, solo: boolean) {
		const channel = this.channels.get(channelId)
		if (!channel) return
		channel.solo = solo
		this.updSoloState()
	}

	isSolo(channelId: string): boolean {
		return this.channels.get(channelId)?.solo ?? false
	}

	private updSoloState() {
		this.soloActive = false
		for (const ch of this.channels.values()) {
			if (ch.solo) {
				this.soloActive = true
				break
			}
		}
		for (const ch of this.channels.values()) {
			this.updChannelGain(ch)
		}
	}

	private updChannelGain(channel: AudioChannel) {
		let vol = channel.vol
		if (channel.muted) vol = 0
		if (this.soloActive && !this.isInSoloChain(channel)) vol = 0
		if (this.ctx) {
			channel.gain.gain.setValueAtTime(vol, this.ctx.currentTime)
		}
	}

	private isInSoloChain(channel: AudioChannel): boolean {
		if (channel.solo) return true
		for (const childId of channel.children) {
			const child = this.channels.get(childId)
			if (child && this.isInSoloChain(child)) return true
		}
		return false
	}

	setCompressor(enabled: boolean, threshold?: number, ratio?: number) {
		if (!this.compressor || !this.masterGain || !this.limiter || !this.ctx) return
		if (enabled) {
			if (threshold !== undefined) this.compressor.threshold.value = threshold
			if (ratio !== undefined) this.compressor.ratio.value = ratio
			this.masterGain.disconnect()
			this.masterGain.connect(this.compressor)
			this.compressor.connect(this.limiter)
		} else {
			this.masterGain.disconnect()
			this.masterGain.connect(this.limiter)
		}
	}

	dispose() {
		for (const channel of this.channels.values()) {
			channel.gain.disconnect()
		}
		this.channels.clear()
		this.masterGain?.disconnect()
		this.compressor?.disconnect()
		this.limiter?.disconnect()
		this.ctx = null
	}
}

export interface AudioOcclusionCfg {
	enabled: boolean
	maxOcclusion: number
	lowpassFreq: number
	highpassFreq: number
}

export class AudioOcclusion {
	ctx: AudioContext | null
	occlusionMap: Map<string, number>
	cfg: AudioOcclusionCfg
	filters: Map<string, { lowpass: BiquadFilterNode, highpass: BiquadFilterNode }>

	constructor() {
		this.ctx = null
		this.occlusionMap = new Map()
		this.cfg = {
			enabled: true,
			maxOcclusion: 0.9,
			lowpassFreq: 800,
			highpassFreq: 200
		}
		this.filters = new Map()
	}

	ini(ctx: AudioContext) {
		this.ctx = ctx
	}

	createFilters(id: string): { lowpass: BiquadFilterNode, highpass: BiquadFilterNode } | null {
		if (!this.ctx) return null
		const lowpass = this.ctx.createBiquadFilter()
		lowpass.type = 'lowpass'
		lowpass.frequency.value = 22050
		const highpass = this.ctx.createBiquadFilter()
		highpass.type = 'highpass'
		highpass.frequency.value = 0
		lowpass.connect(highpass)
		this.filters.set(id, { lowpass, highpass })
		return { lowpass, highpass }
	}

	setOcclusion(id: string, occlusion: number) {
		if (!this.cfg.enabled) return
		const o = Math.max(0, Math.min(this.cfg.maxOcclusion, occlusion))
		this.occlusionMap.set(id, o)
		const filter = this.filters.get(id)
		if (filter && this.ctx) {
			const lowFreq = 22050 - (22050 - this.cfg.lowpassFreq) * o
			const highFreq = this.cfg.highpassFreq * o
			filter.lowpass.frequency.setValueAtTime(lowFreq, this.ctx.currentTime)
			filter.highpass.frequency.setValueAtTime(highFreq, this.ctx.currentTime)
		}
	}

	getOcclusion(id: string): number {
		return this.occlusionMap.get(id) ?? 0
	}

	raycastOcclusion(from: Vec3, to: Vec3, obstacles: { pos: Vec3, radius: number }[]): number {
		let occlusion = 0
		for (const obs of obstacles) {
			if (this.rayIntersectsSphere(from, to, obs.pos, obs.radius)) {
				occlusion += 0.3
			}
		}
		return Math.min(this.cfg.maxOcclusion, occlusion)
	}

	private rayIntersectsSphere(from: Vec3, to: Vec3, center: Vec3, radius: number): boolean {
		const dx = to.x - from.x
		const dy = to.y - from.y
		const dz = to.z - from.z
		const fx = from.x - center.x
		const fy = from.y - center.y
		const fz = from.z - center.z
		const a = dx * dx + dy * dy + dz * dz
		const b = 2 * (fx * dx + fy * dy + fz * dz)
		const c = fx * fx + fy * fy + fz * fz - radius * radius
		const disc = b * b - 4 * a * c
		if (disc < 0) return false
		const t = (-b - Math.sqrt(disc)) / (2 * a)
		return t >= 0 && t <= 1
	}

	removeFilters(id: string) {
		const filter = this.filters.get(id)
		if (filter) {
			filter.lowpass.disconnect()
			filter.highpass.disconnect()
			this.filters.delete(id)
		}
		this.occlusionMap.delete(id)
	}

	dispose() {
		for (const [id] of this.filters) {
			this.removeFilters(id)
		}
	}
}

export interface DopplerCfg {
	enabled: boolean
	speedOfSound: number
	maxShift: number
}

export class DopplerEffect {
	cfg: DopplerCfg
	sources: Map<string, { pos: Vec3, vel: Vec3, panner: PannerNode }>
	listenerPos: Vec3
	listenerVel: Vec3

	constructor() {
		this.cfg = {
			enabled: true,
			speedOfSound: 343,
			maxShift: 2
		}
		this.sources = new Map()
		this.listenerPos = { x: 0, y: 0, z: 0 }
		this.listenerVel = { x: 0, y: 0, z: 0 }
	}

	setListener(pos: Vec3, vel: Vec3) {
		this.listenerPos = { ...pos }
		this.listenerVel = { ...vel }
	}

	addSource(id: string, pos: Vec3, vel: Vec3, panner: PannerNode) {
		this.sources.set(id, { pos: { ...pos }, vel: { ...vel }, panner })
	}

	updSource(id: string, pos: Vec3, vel: Vec3) {
		const src = this.sources.get(id)
		if (src) {
			src.pos = { ...pos }
			src.vel = { ...vel }
		}
	}

	removeSource(id: string) {
		this.sources.delete(id)
	}

	calDopplerShift(sourceId: string): number {
		if (!this.cfg.enabled) return 1
		const src = this.sources.get(sourceId)
		if (!src) return 1
		const dx = src.pos.x - this.listenerPos.x
		const dy = src.pos.y - this.listenerPos.y
		const dz = src.pos.z - this.listenerPos.z
		const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
		if (dist < 0.001) return 1
		const dirX = dx / dist
		const dirY = dy / dist
		const dirZ = dz / dist
		const srcVelToward = src.vel.x * dirX + src.vel.y * dirY + src.vel.z * dirZ
		const lstVelToward = this.listenerVel.x * dirX + this.listenerVel.y * dirY + this.listenerVel.z * dirZ
		const c = this.cfg.speedOfSound
		const numerator = c + lstVelToward
		const denominator = c + srcVelToward
		if (denominator === 0) return 1
		let shift = numerator / denominator
		shift = Math.max(1 / this.cfg.maxShift, Math.min(this.cfg.maxShift, shift))
		return shift
	}

	applyDoppler(sourceId: string, source: AudioBufferSourceNode) {
		const shift = this.calDopplerShift(sourceId)
		source.playbackRate.value = shift
	}

	clr() {
		this.sources.clear()
	}
}

export const globalMixer = new AudioMixer()
export const globalOcclusion = new AudioOcclusion()
export const globalDoppler = new DopplerEffect()
