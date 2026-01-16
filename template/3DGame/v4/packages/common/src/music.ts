import { globalAudio, SndCategory } from './audio'

export interface MusicLayer {
	id: string
	bufferId: string
	vol: number
	targetVol: number
	fadeSpeed: number
	instId: string | null
	src: AudioBufferSourceNode | null
	gain: GainNode | null
	active: boolean
}

export interface MusicCue {
	id: string
	layers: string[]
	volumes: Map<string, number>
	fadeTime: number
	loopStart?: number
	loopEnd?: number
}

export interface MusicTransition {
	from: string
	to: string
	type: TransitionType
	duration: number
	syncBeat?: boolean
	beatInterval?: number
}

export enum TransitionType {
	Crossfade = 'crossfade',
	FadeOutIn = 'fadeoutin',
	Cut = 'cut',
	Stinger = 'stinger'
}

export interface DynamicMusicCfg {
	defFadeTime: number
	syncLayers: boolean
	beatInterval: number
	intensityRange: [number, number]
}

export function defMusicCfg(): DynamicMusicCfg {
	return {
		defFadeTime: 1000,
		syncLayers: true,
		beatInterval: 0.5,
		intensityRange: [0, 1]
	}
}

export class DynamicMusicMgr {
	cfg: DynamicMusicCfg
	layers: Map<string, MusicLayer>
	cues: Map<string, MusicCue>
	transitions: Map<string, MusicTransition>
	curCue: string | null
	intensity: number
	playing: boolean
	paused: boolean
	staTime: number
	pauOffset: number
	ctx: AudioContext | null
	masterGain: GainNode | null
	nxtLayerId: number

	constructor(cfg?: Partial<DynamicMusicCfg>) {
		this.cfg = { ...defMusicCfg(), ...cfg }
		this.layers = new Map()
		this.cues = new Map()
		this.transitions = new Map()
		this.curCue = null
		this.intensity = 0.5
		this.playing = false
		this.paused = false
		this.staTime = 0
		this.pauOffset = 0
		this.ctx = null
		this.masterGain = null
		this.nxtLayerId = 0
	}

	ini() {
		globalAudio.ensureCtx()
		this.ctx = globalAudio.ctx
		if (!this.ctx) return
		this.masterGain = this.ctx.createGain()
		this.masterGain.connect(globalAudio.catGains.get(SndCategory.BGM)!)
	}

	addLayer(id: string, bufferId: string, vol: number = 1): MusicLayer {
		const layer: MusicLayer = {
			id,
			bufferId,
			vol,
			targetVol: vol,
			fadeSpeed: 1,
			instId: null,
			src: null,
			gain: null,
			active: false
		}
		this.layers.set(id, layer)
		return layer
	}

	removeLayer(id: string) {
		const layer = this.layers.get(id)
		if (layer) {
			this.stopLayer(layer)
			this.layers.delete(id)
		}
	}

	addCue(cue: MusicCue) {
		this.cues.set(cue.id, cue)
	}

	addTransition(trans: MusicTransition) {
		const key = `${trans.from}_${trans.to}`
		this.transitions.set(key, trans)
	}

	private startLayer(layer: MusicLayer, offset: number = 0) {
		if (!this.ctx || !this.masterGain) return
		const buffer = globalAudio.getBuffer(layer.bufferId)
		if (!buffer) return
		if (layer.src) {
			try { layer.src.stop() } catch {}
		}
		const src = this.ctx.createBufferSource()
		src.buffer = buffer
		src.loop = true
		const gain = this.ctx.createGain()
		gain.gain.value = layer.active ? layer.vol : 0
		src.connect(gain)
		gain.connect(this.masterGain)
		layer.src = src
		layer.gain = gain
		src.start(0, offset)
	}

	private stopLayer(layer: MusicLayer) {
		if (layer.src) {
			try { layer.src.stop() } catch {}
			layer.src = null
		}
		layer.gain = null
		layer.active = false
	}

	play(cueId?: string) {
		if (!this.ctx) this.ini()
		if (!this.ctx || !this.masterGain) return
		this.playing = true
		this.paused = false
		this.staTime = this.ctx.currentTime
		if (cueId) {
			this.switchCue(cueId)
		} else if (this.curCue) {
			const cue = this.cues.get(this.curCue)
			if (cue) {
				this.applyCue(cue, 0)
			}
		} else {
			for (const layer of this.layers.values()) {
				this.startLayer(layer)
			}
		}
	}

	stop(fadeOut: number = 0) {
		if (!this.ctx) return
		const fadeTime = fadeOut / 1000
		for (const layer of this.layers.values()) {
			if (layer.gain && fadeOut > 0) {
				layer.gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + fadeTime)
			}
		}
		if (fadeOut > 0) {
			setTimeout(() => {
				for (const layer of this.layers.values()) {
					this.stopLayer(layer)
				}
				this.playing = false
			}, fadeOut)
		} else {
			for (const layer of this.layers.values()) {
				this.stopLayer(layer)
			}
			this.playing = false
		}
		this.curCue = null
	}

	pause() {
		if (!this.playing || this.paused || !this.ctx) return
		this.pauOffset = this.ctx.currentTime - this.staTime
		for (const layer of this.layers.values()) {
			this.stopLayer(layer)
		}
		this.paused = true
	}

	resume() {
		if (!this.paused || !this.ctx) return
		this.paused = false
		this.staTime = this.ctx.currentTime - this.pauOffset
		for (const layer of this.layers.values()) {
			this.startLayer(layer, this.pauOffset)
			if (layer.gain) {
				layer.gain.gain.value = layer.active ? layer.vol : 0
			}
		}
	}

	switchCue(cueId: string, transTime?: number) {
		const cue = this.cues.get(cueId)
		if (!cue) return
		const prevCue = this.curCue
		const transKey = prevCue ? `${prevCue}_${cueId}` : null
		const trans = transKey ? this.transitions.get(transKey) : null
		const fadeTime = transTime ?? trans?.duration ?? cue.fadeTime ?? this.cfg.defFadeTime
		this.curCue = cueId
		if (trans && trans.type === TransitionType.FadeOutIn) {
			this.fadeOutAllLayers(fadeTime / 2, () => {
				this.applyCue(cue, fadeTime / 2)
			})
		} else {
			this.applyCue(cue, fadeTime)
		}
	}

	private applyCue(cue: MusicCue, fadeTime: number) {
		if (!this.ctx) return
		const fadeTimeSec = fadeTime / 1000
		const activeLayers = new Set(cue.layers)
		for (const layer of this.layers.values()) {
			const shouldBeActive = activeLayers.has(layer.id)
			const targetVol = shouldBeActive ? (cue.volumes.get(layer.id) ?? layer.vol) : 0
			if (!layer.src && this.playing) {
				this.startLayer(layer, this.ctx.currentTime - this.staTime)
			}
			if (layer.gain) {
				if (fadeTime > 0) {
					layer.gain.gain.linearRampToValueAtTime(targetVol, this.ctx.currentTime + fadeTimeSec)
				} else {
					layer.gain.gain.value = targetVol
				}
			}
			layer.active = shouldBeActive
			layer.targetVol = targetVol
		}
	}

	private fadeOutAllLayers(fadeTime: number, callback: () => void) {
		if (!this.ctx) return
		const fadeTimeSec = fadeTime / 1000
		for (const layer of this.layers.values()) {
			if (layer.gain) {
				layer.gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + fadeTimeSec)
			}
		}
		setTimeout(callback, fadeTime)
	}

	setLayerVol(layerId: string, vol: number, fadeTime: number = 0) {
		const layer = this.layers.get(layerId)
		if (!layer || !this.ctx) return
		layer.vol = vol
		layer.targetVol = vol
		if (layer.gain) {
			if (fadeTime > 0) {
				layer.gain.gain.linearRampToValueAtTime(vol, this.ctx.currentTime + fadeTime / 1000)
			} else {
				layer.gain.gain.value = vol
			}
		}
	}

	setLayerActive(layerId: string, active: boolean, fadeTime: number = 500) {
		const layer = this.layers.get(layerId)
		if (!layer || !this.ctx) return
		layer.active = active
		const targetVol = active ? layer.vol : 0
		if (layer.gain) {
			if (fadeTime > 0) {
				layer.gain.gain.linearRampToValueAtTime(targetVol, this.ctx.currentTime + fadeTime / 1000)
			} else {
				layer.gain.gain.value = targetVol
			}
		}
	}

	setIntensity(intensity: number, fadeTime: number = 500) {
		const [min, max] = this.cfg.intensityRange
		this.intensity = Math.max(min, Math.min(max, intensity))
		const layerArr = Array.from(this.layers.values())
		const layerCnt = layerArr.length
		if (layerCnt === 0) return
		for (let i = 0; i < layerCnt; i++) {
			const layer = layerArr[i]
			const threshold = i / layerCnt
			const active = this.intensity >= threshold
			this.setLayerActive(layer.id, active, fadeTime)
		}
	}

	getIntensity(): number {
		return this.intensity
	}

	getCurrentTime(): number {
		if (!this.ctx || !this.playing) return 0
		if (this.paused) return this.pauOffset
		return this.ctx.currentTime - this.staTime
	}

	getDuration(): number {
		let maxDur = 0
		for (const layer of this.layers.values()) {
			const buffer = globalAudio.getBuffer(layer.bufferId)
			if (buffer && buffer.duration > maxDur) {
				maxDur = buffer.duration
			}
		}
		return maxDur
	}

	seek(time: number) {
		if (!this.playing) return
		const wasPaused = this.paused
		this.pauOffset = time
		if (!wasPaused) {
			this.pause()
			this.resume()
		}
	}

	isPlaying(): boolean {
		return this.playing && !this.paused
	}

	isPaused(): boolean {
		return this.paused
	}

	upd(dt: number) {
		if (!this.playing || this.paused) return
		for (const layer of this.layers.values()) {
			if (layer.gain && Math.abs(layer.gain.gain.value - layer.targetVol) > 0.001) {
				const diff = layer.targetVol - layer.gain.gain.value
				const step = diff * layer.fadeSpeed * dt
				layer.gain.gain.value += step
			}
		}
	}

	dst() {
		this.stop()
		this.layers.clear()
		this.cues.clear()
		this.transitions.clear()
		this.masterGain = null
	}
}

export const globalMusic = new DynamicMusicMgr()

export function createMusicCue(
	id: string,
	layers: string[],
	volumes?: Record<string, number>,
	fadeTime: number = 1000
): MusicCue {
	const volMap = new Map<string, number>()
	if (volumes) {
		for (const [k, v] of Object.entries(volumes)) {
			volMap.set(k, v)
		}
	}
	return { id, layers, volumes: volMap, fadeTime }
}

export function createIntensityLayers(
	bufferIds: string[],
	baseVol: number = 1
): MusicLayer[] {
	const layers: MusicLayer[] = []
	for (let i = 0; i < bufferIds.length; i++) {
		layers.push({
			id: `intensity_${i}`,
			bufferId: bufferIds[i],
			vol: baseVol,
			targetVol: i === 0 ? baseVol : 0,
			fadeSpeed: 1,
			instId: null,
			src: null,
			gain: null,
			active: i === 0
		})
	}
	return layers
}
