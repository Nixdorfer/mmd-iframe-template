export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'

export interface BreakpointCfg {
	xs: number
	sm: number
	md: number
	lg: number
	xl: number
	xxl: number
}

export const DEFAULT_BREAKPOINTS: BreakpointCfg = {
	xs: 0,
	sm: 576,
	md: 768,
	lg: 992,
	xl: 1200,
	xxl: 1400
}

export interface ResponsiveValue<T> {
	xs?: T
	sm?: T
	md?: T
	lg?: T
	xl?: T
	xxl?: T
}

export interface ResponsiveStyles {
	width?: ResponsiveValue<string>
	height?: ResponsiveValue<string>
	padding?: ResponsiveValue<string>
	margin?: ResponsiveValue<string>
	fontSize?: ResponsiveValue<string>
	display?: ResponsiveValue<string>
	flexDirection?: ResponsiveValue<string>
	gap?: ResponsiveValue<string>
	gridTemplateColumns?: ResponsiveValue<string>
	visibility?: ResponsiveValue<string>
}

export type BreakpointChangeCallback = (breakpoint: Breakpoint, width: number) => void

export class ResponsiveManager {
	breakpoints: BreakpointCfg
	currentBreakpoint: Breakpoint
	width: number
	height: number
	callbacks: Set<BreakpointChangeCallback>
	mediaQueries: Map<Breakpoint, MediaQueryList>
	resizeObserver: ResizeObserver | null
	targetElement: HTMLElement | null

	constructor(breakpoints: BreakpointCfg = DEFAULT_BREAKPOINTS) {
		this.breakpoints = breakpoints
		this.currentBreakpoint = 'md'
		this.width = typeof window !== 'undefined' ? window.innerWidth : 1024
		this.height = typeof window !== 'undefined' ? window.innerHeight : 768
		this.callbacks = new Set()
		this.mediaQueries = new Map()
		this.resizeObserver = null
		this.targetElement = null
		if (typeof window !== 'undefined') {
			this.setupMediaQueries()
			this.currentBreakpoint = this.calBreakpoint(this.width)
		}
	}

	private setupMediaQueries() {
		const bps = Object.entries(this.breakpoints).sort((a, b) => a[1] - b[1])
		for (let i = 0; i < bps.length; i++) {
			const [name, minWidth] = bps[i]
			const maxWidth = i < bps.length - 1 ? bps[i + 1][1] - 1 : undefined
			let query: string
			if (maxWidth) {
				query = `(min-width: ${minWidth}px) and (max-width: ${maxWidth}px)`
			} else {
				query = `(min-width: ${minWidth}px)`
			}
			const mql = window.matchMedia(query)
			mql.addEventListener('change', this.onMediaChange.bind(this))
			this.mediaQueries.set(name as Breakpoint, mql)
		}
	}

	private onMediaChange() {
		const prevBp = this.currentBreakpoint
		this.width = window.innerWidth
		this.height = window.innerHeight
		this.currentBreakpoint = this.calBreakpoint(this.width)
		if (prevBp !== this.currentBreakpoint) {
			this.notifyCallbacks()
		}
	}

	attach(element: HTMLElement) {
		this.targetElement = element
		if (typeof ResizeObserver !== 'undefined') {
			this.resizeObserver = new ResizeObserver((entries) => {
				for (const entry of entries) {
					const { width, height } = entry.contentRect
					this.onResize(width, height)
				}
			})
			this.resizeObserver.observe(element)
		}
	}

	detach() {
		if (this.resizeObserver && this.targetElement) {
			this.resizeObserver.unobserve(this.targetElement)
			this.resizeObserver.disconnect()
		}
		this.resizeObserver = null
		this.targetElement = null
	}

	private onResize(width: number, height: number) {
		const prevBp = this.currentBreakpoint
		this.width = width
		this.height = height
		this.currentBreakpoint = this.calBreakpoint(width)
		if (prevBp !== this.currentBreakpoint) {
			this.notifyCallbacks()
		}
	}

	calBreakpoint(width: number): Breakpoint {
		if (width >= this.breakpoints.xxl) return 'xxl'
		if (width >= this.breakpoints.xl) return 'xl'
		if (width >= this.breakpoints.lg) return 'lg'
		if (width >= this.breakpoints.md) return 'md'
		if (width >= this.breakpoints.sm) return 'sm'
		return 'xs'
	}

	onChange(callback: BreakpointChangeCallback): () => void {
		this.callbacks.add(callback)
		return () => this.callbacks.delete(callback)
	}

	private notifyCallbacks() {
		for (const cb of this.callbacks) {
			cb(this.currentBreakpoint, this.width)
		}
	}

	getValue<T>(responsive: ResponsiveValue<T>, defaultValue: T): T {
		const order: Breakpoint[] = ['xxl', 'xl', 'lg', 'md', 'sm', 'xs']
		const bpIdx = order.indexOf(this.currentBreakpoint)
		for (let i = bpIdx; i < order.length; i++) {
			const bp = order[i]
			if (responsive[bp] !== undefined) {
				return responsive[bp]!
			}
		}
		return defaultValue
	}

	applyStyles(element: HTMLElement, styles: ResponsiveStyles) {
		if (styles.width) {
			element.style.width = this.getValue(styles.width, '')
		}
		if (styles.height) {
			element.style.height = this.getValue(styles.height, '')
		}
		if (styles.padding) {
			element.style.padding = this.getValue(styles.padding, '')
		}
		if (styles.margin) {
			element.style.margin = this.getValue(styles.margin, '')
		}
		if (styles.fontSize) {
			element.style.fontSize = this.getValue(styles.fontSize, '')
		}
		if (styles.display) {
			element.style.display = this.getValue(styles.display, '')
		}
		if (styles.flexDirection) {
			element.style.flexDirection = this.getValue(styles.flexDirection, '')
		}
		if (styles.gap) {
			element.style.gap = this.getValue(styles.gap, '')
		}
		if (styles.gridTemplateColumns) {
			element.style.gridTemplateColumns = this.getValue(styles.gridTemplateColumns, '')
		}
		if (styles.visibility) {
			element.style.visibility = this.getValue(styles.visibility, '')
		}
	}

	isBreakpoint(bp: Breakpoint): boolean {
		return this.currentBreakpoint === bp
	}

	isAtLeast(bp: Breakpoint): boolean {
		const order: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl']
		return order.indexOf(this.currentBreakpoint) >= order.indexOf(bp)
	}

	isAtMost(bp: Breakpoint): boolean {
		const order: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl']
		return order.indexOf(this.currentBreakpoint) <= order.indexOf(bp)
	}

	isMobile(): boolean {
		return this.isAtMost('sm')
	}

	isTablet(): boolean {
		return this.isBreakpoint('md') || this.isBreakpoint('lg')
	}

	isDesktop(): boolean {
		return this.isAtLeast('lg')
	}

	getAspectRatio(): number {
		return this.width / this.height
	}

	isPortrait(): boolean {
		return this.height > this.width
	}

	isLandscape(): boolean {
		return this.width >= this.height
	}

	dispose() {
		this.detach()
		for (const mql of this.mediaQueries.values()) {
			mql.removeEventListener('change', this.onMediaChange.bind(this))
		}
		this.mediaQueries.clear()
		this.callbacks.clear()
	}
}

export function responsive<T>(values: ResponsiveValue<T>): ResponsiveValue<T> {
	return values
}

export function createGridColumns(cols: ResponsiveValue<number>): ResponsiveValue<string> {
	const result: ResponsiveValue<string> = {}
	if (cols.xs !== undefined) result.xs = `repeat(${cols.xs}, 1fr)`
	if (cols.sm !== undefined) result.sm = `repeat(${cols.sm}, 1fr)`
	if (cols.md !== undefined) result.md = `repeat(${cols.md}, 1fr)`
	if (cols.lg !== undefined) result.lg = `repeat(${cols.lg}, 1fr)`
	if (cols.xl !== undefined) result.xl = `repeat(${cols.xl}, 1fr)`
	if (cols.xxl !== undefined) result.xxl = `repeat(${cols.xxl}, 1fr)`
	return result
}

export const globalResponsive = new ResponsiveManager()
