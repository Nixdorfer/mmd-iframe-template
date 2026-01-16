export interface ThemeColors {
	primary: string
	secondary: string
	accent: string
	success: string
	warning: string
	error: string
	info: string
	bgPrimary: string
	bgSecondary: string
	bgTertiary: string
	bgOverlay: string
	textPrimary: string
	textSecondary: string
	textDisabled: string
	textInverse: string
	borderPrimary: string
	borderSecondary: string
	borderFocus: string
	hpHigh: string
	hpMid: string
	hpLow: string
	mpFull: string
	shield: string
	cooldown: string
	shadow: string
}

export interface ThemeSpacing {
	xs: number
	sm: number
	md: number
	lg: number
	xl: number
}

export interface ThemeRadius {
	none: number
	sm: number
	md: number
	lg: number
	full: number
}

export interface ThemeFonts {
	primary: string
	secondary: string
	mono: string
}

export interface ThemeSizes {
	textXs: number
	textSm: number
	textMd: number
	textLg: number
	textXl: number
	iconSm: number
	iconMd: number
	iconLg: number
	btnSm: number
	btnMd: number
	btnLg: number
}

export interface ThemeShadows {
	sm: string
	md: string
	lg: string
}

export interface Theme {
	name: string
	colors: ThemeColors
	spacing: ThemeSpacing
	radius: ThemeRadius
	fonts: ThemeFonts
	sizes: ThemeSizes
	shadows: ThemeShadows
}

export const darkTheme: Theme = {
	name: 'dark',
	colors: {
		primary: '#4a9eff',
		secondary: '#6b7280',
		accent: '#f59e0b',
		success: '#22c55e',
		warning: '#eab308',
		error: '#ef4444',
		info: '#3b82f6',
		bgPrimary: '#1a1a1a',
		bgSecondary: '#242424',
		bgTertiary: '#2a2a2a',
		bgOverlay: 'rgba(0,0,0,0.7)',
		textPrimary: '#ffffff',
		textSecondary: '#a1a1aa',
		textDisabled: '#52525b',
		textInverse: '#000000',
		borderPrimary: '#333333',
		borderSecondary: '#444444',
		borderFocus: '#4a9eff',
		hpHigh: '#22c55e',
		hpMid: '#eab308',
		hpLow: '#ef4444',
		mpFull: '#3b82f6',
		shield: '#60a5fa',
		cooldown: 'rgba(0,0,0,0.6)',
		shadow: 'rgba(0,0,0,0.5)'
	},
	spacing: {
		xs: 4,
		sm: 8,
		md: 12,
		lg: 16,
		xl: 24
	},
	radius: {
		none: 0,
		sm: 2,
		md: 4,
		lg: 8,
		full: 9999
	},
	fonts: {
		primary: 'system-ui, sans-serif',
		secondary: 'Georgia, serif',
		mono: 'monospace'
	},
	sizes: {
		textXs: 10,
		textSm: 12,
		textMd: 14,
		textLg: 18,
		textXl: 24,
		iconSm: 16,
		iconMd: 24,
		iconLg: 32,
		btnSm: 24,
		btnMd: 32,
		btnLg: 40
	},
	shadows: {
		sm: '0 1px 2px rgba(0,0,0,0.3)',
		md: '0 2px 4px rgba(0,0,0,0.4)',
		lg: '0 4px 8px rgba(0,0,0,0.5)'
	}
}

export const lightTheme: Theme = {
	name: 'light',
	colors: {
		primary: '#2563eb',
		secondary: '#6b7280',
		accent: '#f59e0b',
		success: '#16a34a',
		warning: '#ca8a04',
		error: '#dc2626',
		info: '#2563eb',
		bgPrimary: '#ffffff',
		bgSecondary: '#f4f4f5',
		bgTertiary: '#e4e4e7',
		bgOverlay: 'rgba(0,0,0,0.5)',
		textPrimary: '#18181b',
		textSecondary: '#71717a',
		textDisabled: '#a1a1aa',
		textInverse: '#ffffff',
		borderPrimary: '#e4e4e7',
		borderSecondary: '#d4d4d8',
		borderFocus: '#2563eb',
		hpHigh: '#16a34a',
		hpMid: '#ca8a04',
		hpLow: '#dc2626',
		mpFull: '#2563eb',
		shield: '#3b82f6',
		cooldown: 'rgba(0,0,0,0.4)',
		shadow: 'rgba(0,0,0,0.2)'
	},
	spacing: {
		xs: 4,
		sm: 8,
		md: 12,
		lg: 16,
		xl: 24
	},
	radius: {
		none: 0,
		sm: 2,
		md: 4,
		lg: 8,
		full: 9999
	},
	fonts: {
		primary: 'system-ui, sans-serif',
		secondary: 'Georgia, serif',
		mono: 'monospace'
	},
	sizes: {
		textXs: 10,
		textSm: 12,
		textMd: 14,
		textLg: 18,
		textXl: 24,
		iconSm: 16,
		iconMd: 24,
		iconLg: 32,
		btnSm: 24,
		btnMd: 32,
		btnLg: 40
	},
	shadows: {
		sm: '0 1px 2px rgba(0,0,0,0.1)',
		md: '0 2px 4px rgba(0,0,0,0.15)',
		lg: '0 4px 8px rgba(0,0,0,0.2)'
	}
}

export const fantasyTheme: Theme = {
	name: 'fantasy',
	colors: {
		primary: '#c9a227',
		secondary: '#8b4513',
		accent: '#9b2335',
		success: '#228b22',
		warning: '#daa520',
		error: '#8b0000',
		info: '#4169e1',
		bgPrimary: '#1c1410',
		bgSecondary: '#2d2218',
		bgTertiary: '#3d3020',
		bgOverlay: 'rgba(28,20,16,0.85)',
		textPrimary: '#f5deb3',
		textSecondary: '#d2b48c',
		textDisabled: '#8b7355',
		textInverse: '#1c1410',
		borderPrimary: '#5c4033',
		borderSecondary: '#8b4513',
		borderFocus: '#c9a227',
		hpHigh: '#228b22',
		hpMid: '#daa520',
		hpLow: '#8b0000',
		mpFull: '#4169e1',
		shield: '#87ceeb',
		cooldown: 'rgba(0,0,0,0.7)',
		shadow: 'rgba(0,0,0,0.6)'
	},
	spacing: {
		xs: 4,
		sm: 8,
		md: 12,
		lg: 16,
		xl: 24
	},
	radius: {
		none: 0,
		sm: 2,
		md: 4,
		lg: 8,
		full: 9999
	},
	fonts: {
		primary: 'Georgia, serif',
		secondary: 'system-ui, sans-serif',
		mono: 'monospace'
	},
	sizes: {
		textXs: 10,
		textSm: 12,
		textMd: 14,
		textLg: 18,
		textXl: 24,
		iconSm: 16,
		iconMd: 24,
		iconLg: 32,
		btnSm: 24,
		btnMd: 32,
		btnLg: 40
	},
	shadows: {
		sm: '0 1px 2px rgba(0,0,0,0.4)',
		md: '0 2px 4px rgba(0,0,0,0.5)',
		lg: '0 4px 8px rgba(0,0,0,0.6)'
	}
}

export const scifiTheme: Theme = {
	name: 'scifi',
	colors: {
		primary: '#00ffff',
		secondary: '#4a5568',
		accent: '#ff00ff',
		success: '#00ff00',
		warning: '#ffff00',
		error: '#ff0040',
		info: '#00bfff',
		bgPrimary: '#0a0a0f',
		bgSecondary: '#12121a',
		bgTertiary: '#1a1a25',
		bgOverlay: 'rgba(10,10,15,0.9)',
		textPrimary: '#e0ffff',
		textSecondary: '#88cccc',
		textDisabled: '#446666',
		textInverse: '#0a0a0f',
		borderPrimary: '#1a3a3a',
		borderSecondary: '#2a5a5a',
		borderFocus: '#00ffff',
		hpHigh: '#00ff00',
		hpMid: '#ffff00',
		hpLow: '#ff0040',
		mpFull: '#00bfff',
		shield: '#00ffff',
		cooldown: 'rgba(0,20,40,0.8)',
		shadow: 'rgba(0,255,255,0.1)'
	},
	spacing: {
		xs: 4,
		sm: 8,
		md: 12,
		lg: 16,
		xl: 24
	},
	radius: {
		none: 0,
		sm: 2,
		md: 4,
		lg: 8,
		full: 9999
	},
	fonts: {
		primary: 'system-ui, sans-serif',
		secondary: 'monospace',
		mono: 'monospace'
	},
	sizes: {
		textXs: 10,
		textSm: 12,
		textMd: 14,
		textLg: 18,
		textXl: 24,
		iconSm: 16,
		iconMd: 24,
		iconLg: 32,
		btnSm: 24,
		btnMd: 32,
		btnLg: 40
	},
	shadows: {
		sm: '0 0 4px rgba(0,255,255,0.2)',
		md: '0 0 8px rgba(0,255,255,0.3)',
		lg: '0 0 16px rgba(0,255,255,0.4)'
	}
}

export type ThemeChangeCallback = (theme: Theme) => void

export class ThemeManager {
	private theme: Theme
	private themes: Map<string, Theme>
	private listeners: Set<ThemeChangeCallback>

	constructor(initialTheme: Theme = darkTheme) {
		this.theme = initialTheme
		this.themes = new Map()
		this.listeners = new Set()
		this.regTheme(darkTheme)
		this.regTheme(lightTheme)
		this.regTheme(fantasyTheme)
		this.regTheme(scifiTheme)
	}

	regTheme(theme: Theme) {
		this.themes.set(theme.name, theme)
	}

	getTheme(): Theme {
		return this.theme
	}

	setTheme(nameOrTheme: string | Theme) {
		if (typeof nameOrTheme === 'string') {
			const theme = this.themes.get(nameOrTheme)
			if (theme) {
				this.theme = theme
				this.notifyListeners()
			}
		} else {
			this.theme = nameOrTheme
			this.notifyListeners()
		}
	}

	getThemeByName(name: string): Theme | undefined {
		return this.themes.get(name)
	}

	getThemeNames(): string[] {
		return Array.from(this.themes.keys())
	}

	onThemeChange(callback: ThemeChangeCallback): () => void {
		this.listeners.add(callback)
		return () => this.listeners.delete(callback)
	}

	private notifyListeners() {
		for (const listener of this.listeners) {
			listener(this.theme)
		}
	}

	color(key: keyof ThemeColors): string {
		return this.theme.colors[key]
	}

	spacing(key: keyof ThemeSpacing): number {
		return this.theme.spacing[key]
	}

	radius(key: keyof ThemeRadius): number {
		return this.theme.radius[key]
	}

	font(key: keyof ThemeFonts): string {
		return this.theme.fonts[key]
	}

	size(key: keyof ThemeSizes): number {
		return this.theme.sizes[key]
	}

	shadow(key: keyof ThemeShadows): string {
		return this.theme.shadows[key]
	}

	createCustomTheme(name: string, base: Theme, overrides: Partial<Theme>): Theme {
		const custom: Theme = {
			name,
			colors: { ...base.colors, ...(overrides.colors || {}) },
			spacing: { ...base.spacing, ...(overrides.spacing || {}) },
			radius: { ...base.radius, ...(overrides.radius || {}) },
			fonts: { ...base.fonts, ...(overrides.fonts || {}) },
			sizes: { ...base.sizes, ...(overrides.sizes || {}) },
			shadows: { ...base.shadows, ...(overrides.shadows || {}) }
		}
		this.regTheme(custom)
		return custom
	}
}

export const globalTheme = new ThemeManager()
