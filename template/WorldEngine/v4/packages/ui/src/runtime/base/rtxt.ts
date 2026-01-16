import { UINode, UINodeCfg } from './node'

export interface TextSpan {
	text: string
	color?: string
	fontSize?: number
	fontWeight?: string
	fontStyle?: string
	underline?: boolean
	strikethrough?: boolean
	link?: string
}

export interface UIRichTextCfg extends UINodeCfg {
	spans?: TextSpan[]
	fontFamily?: string
	fontSize?: number
	color?: string
	lineHeight?: number
	maxWidth?: number
	align?: 'left' | 'center' | 'right'
}

interface LayoutWord {
	span: TextSpan
	text: string
	x: number
	y: number
	w: number
	h: number
	baseline: number
}

export class UIRichText extends UINode {
	spans: TextSpan[]
	fontFamily: string
	fontSize: number
	color: string
	lineHeight: number
	maxWidth: number
	align: 'left' | 'center' | 'right'
	layoutWords: LayoutWord[]
	lines: LayoutWord[][]
	onLinkClick: ((link: string) => void) | null

	constructor(cfg?: UIRichTextCfg) {
		super(cfg)
		this.spans = cfg?.spans ?? []
		this.fontFamily = cfg?.fontFamily ?? 'sans-serif'
		this.fontSize = cfg?.fontSize ?? 14
		this.color = cfg?.color ?? '#fff'
		this.lineHeight = cfg?.lineHeight ?? 1.4
		this.maxWidth = cfg?.maxWidth ?? 0
		this.align = cfg?.align ?? 'left'
		this.layoutWords = []
		this.lines = []
		this.onLinkClick = null
		if (this.spans.length > 0) {
			this.layout()
		}
	}

	setSpans(spans: TextSpan[]) {
		this.spans = spans
		this.layout()
		this.dirty = true
	}

	setText(text: string) {
		this.spans = [{ text }]
		this.layout()
		this.dirty = true
	}

	appendSpan(span: TextSpan) {
		this.spans.push(span)
		this.layout()
		this.dirty = true
	}

	clear() {
		this.spans = []
		this.layoutWords = []
		this.lines = []
		this.dirty = true
	}

	private layout() {
		this.layoutWords = []
		this.lines = []
		const maxW = this.maxWidth > 0 ? this.maxWidth : (this.w > 0 ? this.w : 999999)
		let curX = 0
		let curY = 0
		let curLine: LayoutWord[] = []
		const ctx = this.getMeasureCtx()
		for (const span of this.spans) {
			const fs = span.fontSize ?? this.fontSize
			const fw = span.fontWeight ?? 'normal'
			const fi = span.fontStyle ?? 'normal'
			ctx.font = `${fi} ${fw} ${fs}px ${this.fontFamily}`
			const lineH = fs * this.lineHeight
			const words = this.tokenize(span.text)
			for (const word of words) {
				if (word === '\n') {
					this.finishLine(curLine, curY, maxW)
					curLine = []
					curX = 0
					curY += lineH
					continue
				}
				const metrics = ctx.measureText(word)
				const wordW = metrics.width
				if (curX + wordW > maxW && curX > 0) {
					this.finishLine(curLine, curY, maxW)
					curLine = []
					curX = 0
					curY += lineH
				}
				const lw: LayoutWord = {
					span,
					text: word,
					x: curX,
					y: curY,
					w: wordW,
					h: lineH,
					baseline: fs
				}
				curLine.push(lw)
				this.layoutWords.push(lw)
				curX += wordW
			}
		}
		if (curLine.length > 0) {
			this.finishLine(curLine, curY, maxW)
		}
		this.calSize()
	}

	private finishLine(line: LayoutWord[], _y: number, maxW: number) {
		if (line.length === 0) return
		this.lines.push(line)
		if (this.align === 'center' || this.align === 'right') {
			const lineW = line[line.length - 1].x + line[line.length - 1].w
			const offset = this.align === 'center' ? (maxW - lineW) / 2 : maxW - lineW
			for (const word of line) {
				word.x += offset
			}
		}
	}

	private calSize() {
		if (this.layoutWords.length === 0) {
			this.h = 0
			return
		}
		let maxW = 0
		let maxH = 0
		for (const word of this.layoutWords) {
			maxW = Math.max(maxW, word.x + word.w)
			maxH = Math.max(maxH, word.y + word.h)
		}
		if (this.maxWidth <= 0 && this.w <= 0) {
			this.w = maxW
		}
		this.h = maxH
	}

	private tokenize(text: string): string[] {
		const result: string[] = []
		let cur = ''
		for (let i = 0; i < text.length; i++) {
			const ch = text[i]
			if (ch === '\n') {
				if (cur) {
					result.push(cur)
					cur = ''
				}
				result.push('\n')
			} else if (ch === ' ') {
				if (cur) {
					result.push(cur)
					cur = ''
				}
				result.push(' ')
			} else if (this.isCJK(ch)) {
				if (cur) {
					result.push(cur)
					cur = ''
				}
				result.push(ch)
			} else {
				cur += ch
			}
		}
		if (cur) {
			result.push(cur)
		}
		return result
	}

	private isCJK(ch: string): boolean {
		const code = ch.charCodeAt(0)
		return (code >= 0x4E00 && code <= 0x9FFF) ||
			(code >= 0x3400 && code <= 0x4DBF) ||
			(code >= 0x3000 && code <= 0x303F) ||
			(code >= 0xFF00 && code <= 0xFFEF)
	}

	private measureCtx: CanvasRenderingContext2D | null = null
	private getMeasureCtx(): CanvasRenderingContext2D {
		if (!this.measureCtx) {
			const cv = document.createElement('canvas')
			this.measureCtx = cv.getContext('2d')!
		}
		return this.measureCtx
	}

	draw(ctx: CanvasRenderingContext2D) {
		const wx = this.getWorldX()
		const wy = this.getWorldY()
		for (const word of this.layoutWords) {
			const span = word.span
			const fs = span.fontSize ?? this.fontSize
			const fw = span.fontWeight ?? 'normal'
			const fi = span.fontStyle ?? 'normal'
			const clr = span.color ?? this.color
			ctx.font = `${fi} ${fw} ${fs}px ${this.fontFamily}`
			ctx.fillStyle = clr
			ctx.textBaseline = 'top'
			const x = wx + word.x
			const y = wy + word.y
			ctx.fillText(word.text, x, y)
			if (span.underline) {
				ctx.beginPath()
				ctx.strokeStyle = clr
				ctx.lineWidth = 1
				ctx.moveTo(x, y + word.baseline + 2)
				ctx.lineTo(x + word.w, y + word.baseline + 2)
				ctx.stroke()
			}
			if (span.strikethrough) {
				ctx.beginPath()
				ctx.strokeStyle = clr
				ctx.lineWidth = 1
				const midY = y + word.baseline * 0.5
				ctx.moveTo(x, midY)
				ctx.lineTo(x + word.w, midY)
				ctx.stroke()
			}
		}
	}

	onClick(x: number, y: number) {
		if (!this.onLinkClick) return
		const wx = this.getWorldX()
		const wy = this.getWorldY()
		for (const word of this.layoutWords) {
			if (word.span.link) {
				const lx = wx + word.x
				const ly = wy + word.y
				if (x >= lx && x <= lx + word.w && y >= ly && y <= ly + word.h) {
					this.onLinkClick(word.span.link)
					return
				}
			}
		}
	}

	getWordAt(x: number, y: number): LayoutWord | null {
		const wx = this.getWorldX()
		const wy = this.getWorldY()
		for (const word of this.layoutWords) {
			const lx = wx + word.x
			const ly = wy + word.y
			if (x >= lx && x <= lx + word.w && y >= ly && y <= ly + word.h) {
				return word
			}
		}
		return null
	}

	static parse(markup: string): TextSpan[] {
		const spans: TextSpan[] = []
		const tagRe = /<(\w+)(?:\s+([^>]*))?>([^<]*)<\/\1>|([^<]+)/g
		let match
		while ((match = tagRe.exec(markup)) !== null) {
			if (match[4]) {
				spans.push({ text: match[4] })
			} else {
				const tag = match[1]
				const attrs = match[2] || ''
				const text = match[3]
				const span: TextSpan = { text }
				if (tag === 'b') span.fontWeight = 'bold'
				if (tag === 'i') span.fontStyle = 'italic'
				if (tag === 'u') span.underline = true
				if (tag === 's') span.strikethrough = true
				const colorMatch = attrs.match(/color="([^"]+)"/)
				if (colorMatch) span.color = colorMatch[1]
				const sizeMatch = attrs.match(/size="(\d+)"/)
				if (sizeMatch) span.fontSize = parseInt(sizeMatch[1])
				const linkMatch = attrs.match(/link="([^"]+)"/)
				if (linkMatch) span.link = linkMatch[1]
				spans.push(span)
			}
		}
		return spans
	}
}
