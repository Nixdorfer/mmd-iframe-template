export type LLMProvider = 'openai' | 'anthropic' | 'ollama' | 'custom'

export interface LLMConfig {
	provider: LLMProvider
	endpoint: string
	apiKey: string
	model: string
}

export interface DialogueReq {
	entityId: string
	personality: string
	knowledge: string[]
	history: Message[]
	playerMsg: string
	context: GameContext
}

export interface DialogueRes {
	reply: string
	emotion?: string
	action?: string
}

export interface Message {
	role: 'user' | 'assistant' | 'system'
	content: string
}

export interface GameContext {
	location?: string
	time?: string
	weather?: string
	nearbyEntities?: string[]
	playerState?: Record<string, any>
}

const defaultEndpoints: Record<LLMProvider, string> = {
	openai: 'https://api.openai.com/v1/chat/completions',
	anthropic: 'https://api.anthropic.com/v1/messages',
	ollama: 'http://localhost:11434/api/chat',
	custom: ''
}

export class LLMMiddleware {
	private cfg: LLMConfig

	constructor(cfg: LLMConfig) {
		this.cfg = cfg
	}

	setConfig(cfg: LLMConfig) {
		this.cfg = cfg
	}

	getEndpoint(): string {
		return this.cfg.endpoint || defaultEndpoints[this.cfg.provider]
	}

	async send(req: DialogueReq): Promise<DialogueRes> {
		const systemPrompt = this.buildSystemPrompt(req)
		const messages = this.buildMessages(systemPrompt, req.history, req.playerMsg)
		switch (this.cfg.provider) {
			case 'openai':
				return this.sendOpenAI(messages)
			case 'anthropic':
				return this.sendAnthropic(systemPrompt, req.history, req.playerMsg)
			case 'ollama':
				return this.sendOllama(messages)
			case 'custom':
				return this.sendCustom(messages)
			default:
				throw new Error(`Unknown provider: ${this.cfg.provider}`)
		}
	}

	private buildSystemPrompt(req: DialogueReq): string {
		let prompt = `你是一个游戏NPC角色。\n`
		if (req.personality) {
			prompt += `性格特点: ${req.personality}\n`
		}
		if (req.knowledge.length > 0) {
			prompt += `你了解以下知识领域: ${req.knowledge.join(', ')}\n`
		}
		if (req.context.location) {
			prompt += `当前位置: ${req.context.location}\n`
		}
		if (req.context.time) {
			prompt += `当前时间: ${req.context.time}\n`
		}
		if (req.context.weather) {
			prompt += `当前天气: ${req.context.weather}\n`
		}
		prompt += `请以角色身份回复玩家,保持简短自然的对话风格。回复格式为JSON: {"reply":"对话内容","emotion":"表情","action":"动作"}`
		return prompt
	}

	private buildMessages(systemPrompt: string, history: Message[], playerMsg: string): Message[] {
		const messages: Message[] = [
			{ role: 'system', content: systemPrompt },
			...history,
			{ role: 'user', content: playerMsg }
		]
		return messages
	}

	private async sendOpenAI(messages: Message[]): Promise<DialogueRes> {
		const res = await fetch(this.getEndpoint(), {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${this.cfg.apiKey}`
			},
			body: JSON.stringify({
				model: this.cfg.model || 'gpt-4',
				messages,
				temperature: 0.7,
				max_tokens: 256
			})
		})
		if (!res.ok) {
			throw new Error(`OpenAI API error: ${res.status}`)
		}
		const data = await res.json()
		return this.parseResponse(data.choices[0].message.content)
	}

	private async sendAnthropic(systemPrompt: string, history: Message[], playerMsg: string): Promise<DialogueRes> {
		const anthropicMessages = [
			...history.filter(m => m.role !== 'system').map(m => ({
				role: m.role,
				content: m.content
			})),
			{ role: 'user', content: playerMsg }
		]
		const res = await fetch(this.getEndpoint(), {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': this.cfg.apiKey,
				'anthropic-version': '2023-06-01'
			},
			body: JSON.stringify({
				model: this.cfg.model || 'claude-3-haiku-20240307',
				system: systemPrompt,
				messages: anthropicMessages,
				max_tokens: 256
			})
		})
		if (!res.ok) {
			throw new Error(`Anthropic API error: ${res.status}`)
		}
		const data = await res.json()
		return this.parseResponse(data.content[0].text)
	}

	private async sendOllama(messages: Message[]): Promise<DialogueRes> {
		const res = await fetch(this.getEndpoint(), {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				model: this.cfg.model || 'llama3',
				messages,
				stream: false
			})
		})
		if (!res.ok) {
			throw new Error(`Ollama API error: ${res.status}`)
		}
		const data = await res.json()
		return this.parseResponse(data.message.content)
	}

	private async sendCustom(messages: Message[]): Promise<DialogueRes> {
		if (!this.cfg.endpoint) {
			throw new Error('Custom endpoint not configured')
		}
		const headers: Record<string, string> = {
			'Content-Type': 'application/json'
		}
		if (this.cfg.apiKey) {
			headers['Authorization'] = `Bearer ${this.cfg.apiKey}`
		}
		const res = await fetch(this.cfg.endpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				model: this.cfg.model,
				messages
			})
		})
		if (!res.ok) {
			throw new Error(`Custom API error: ${res.status}`)
		}
		const data = await res.json()
		const content = data.choices?.[0]?.message?.content || data.message?.content || data.content?.[0]?.text || data.reply
		return this.parseResponse(content)
	}

	private parseResponse(content: string): DialogueRes {
		try {
			const jsonMatch = content.match(/\{[\s\S]*\}/)
			if (jsonMatch) {
				const parsed = JSON.parse(jsonMatch[0])
				return {
					reply: parsed.reply || content,
					emotion: parsed.emotion,
					action: parsed.action
				}
			}
		} catch {
		}
		return { reply: content }
	}
}

let instance: LLMMiddleware | null = null

export function getLLM(): LLMMiddleware | null {
	return instance
}

export function initLLM(cfg: LLMConfig): LLMMiddleware {
	instance = new LLMMiddleware(cfg)
	return instance
}
