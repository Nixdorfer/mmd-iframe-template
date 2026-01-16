export interface AIGenConfig {
	serverUrl: string
}

export interface ImageGenReq {
	prompt: string
	output?: string
	model?: string
}

export interface ImageGenRes {
	ok: boolean
	output?: string
	error?: string
}

export interface Model3DGenReq {
	image: string
	output?: string
}

export interface Model3DGenRes {
	ok: boolean
	output?: string
	error?: string
}

export interface RigReq {
	input: string
	output?: string
}

export interface RigRes {
	ok: boolean
	output?: string
	error?: string
}

export interface MotionGenReq {
	model: string
	motions: string[]
}

export interface MotionGenRes {
	ok: boolean
	output?: string
	error?: string
}

export interface VoiceGenReq {
	text: string
	output?: string
}

export interface VoiceGenRes {
	ok: boolean
	output?: string
	error?: string
}

export interface AudioGenReq {
	prompt: string
	output?: string
}

export interface AudioGenRes {
	ok: boolean
	output?: string
	error?: string
}

export interface ServerStatus {
	models: {
		name: string
		status: string
		port: number
		pid: number
	}[]
	stats: {
		cpuUsage: number
		memoryUsage: number
		gpuUsage: number
		gpuMemory: number
	}
	apiPort: number
	running: boolean
	helperDir: string
}

export interface CheckpointsRes {
	ok: boolean
	models: string[]
}

export class AIGenMiddleware {
	private cfg: AIGenConfig

	constructor(cfg: AIGenConfig) {
		this.cfg = cfg
	}

	setConfig(cfg: AIGenConfig) {
		this.cfg = cfg
	}

	getUrl(path: string): string {
		return `${this.cfg.serverUrl}${path}`
	}

	async getStatus(): Promise<ServerStatus> {
		const res = await fetch(this.getUrl('/api/status'))
		if (!res.ok) throw new Error(`Status request failed: ${res.status}`)
		return res.json()
	}

	async getCheckpoints(): Promise<string[]> {
		const res = await fetch(this.getUrl('/api/checkpoints'))
		if (!res.ok) throw new Error(`Checkpoints request failed: ${res.status}`)
		const data: CheckpointsRes = await res.json()
		return data.models || []
	}

	async deploy(): Promise<void> {
		const res = await fetch(this.getUrl('/api/deploy'))
		if (!res.ok) throw new Error(`Deploy request failed: ${res.status}`)
	}

	async stopModel(name: string): Promise<void> {
		const res = await fetch(this.getUrl(`/api/stop?name=${encodeURIComponent(name)}`))
		if (!res.ok) throw new Error(`Stop request failed: ${res.status}`)
	}

	async generateImage(req: ImageGenReq): Promise<ImageGenRes> {
		const res = await fetch(this.getUrl('/api/flux/generate'), {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(req)
		})
		if (!res.ok) throw new Error(`Image gen request failed: ${res.status}`)
		return res.json()
	}

	async generate3DModel(req: Model3DGenReq): Promise<Model3DGenRes> {
		const res = await fetch(this.getUrl('/api/hunyuan3d/generate'), {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(req)
		})
		if (!res.ok) throw new Error(`3D model gen request failed: ${res.status}`)
		return res.json()
	}

	async rig(req: RigReq): Promise<RigRes> {
		const res = await fetch(this.getUrl('/api/unirig/rig'), {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(req)
		})
		if (!res.ok) throw new Error(`Rig request failed: ${res.status}`)
		return res.json()
	}

	async generateMotion(req: MotionGenReq): Promise<MotionGenRes> {
		const res = await fetch(this.getUrl('/api/motion/generate'), {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(req)
		})
		if (!res.ok) throw new Error(`Motion gen request failed: ${res.status}`)
		return res.json()
	}

	async generateVoice(req: VoiceGenReq): Promise<VoiceGenRes> {
		const res = await fetch(this.getUrl('/api/voice/generate'), {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(req)
		})
		if (!res.ok) throw new Error(`Voice gen request failed: ${res.status}`)
		return res.json()
	}

	async generateAudio(req: AudioGenReq): Promise<AudioGenRes> {
		const res = await fetch(this.getUrl('/api/audio/generate'), {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(req)
		})
		if (!res.ok) throw new Error(`Audio gen request failed: ${res.status}`)
		return res.json()
	}
}

let instance: AIGenMiddleware | null = null

export function getAIGen(): AIGenMiddleware | null {
	return instance
}

export function initAIGen(cfg: AIGenConfig): AIGenMiddleware {
	instance = new AIGenMiddleware(cfg)
	return instance
}
