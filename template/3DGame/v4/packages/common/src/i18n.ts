export type Locale = string

export interface I18nCfg {
	defaultLocale: Locale
	fallbackLocale: Locale
	interpolation: {
		prefix: string
		suffix: string
	}
}

export const DEFAULT_I18N_CFG: I18nCfg = {
	defaultLocale: 'en',
	fallbackLocale: 'en',
	interpolation: {
		prefix: '{{',
		suffix: '}}'
	}
}

export interface TranslationDict {
	[key: string]: string | TranslationDict
}

export interface PluralRule {
	zero?: string
	one?: string
	two?: string
	few?: string
	many?: string
	other: string
}

export type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other'

export interface I18nEventMap {
	localeChange: { locale: Locale, prevLocale: Locale }
	missingKey: { key: string, locale: Locale }
	translationLoaded: { locale: Locale }
}

export type I18nEventCallback<K extends keyof I18nEventMap> = (data: I18nEventMap[K]) => void

export class I18n {
	cfg: I18nCfg
	locale: Locale
	translations: Map<Locale, TranslationDict>
	pluralRules: Map<Locale, (n: number) => PluralCategory>
	numberFormats: Map<Locale, Intl.NumberFormat>
	dateFormats: Map<Locale, Intl.DateTimeFormat>
	listeners: Map<keyof I18nEventMap, Set<I18nEventCallback<keyof I18nEventMap>>>

	constructor(cfg: Partial<I18nCfg> = {}) {
		this.cfg = { ...DEFAULT_I18N_CFG, ...cfg }
		this.locale = this.cfg.defaultLocale
		this.translations = new Map()
		this.pluralRules = new Map()
		this.numberFormats = new Map()
		this.dateFormats = new Map()
		this.listeners = new Map()
		this.iniDefaultPluralRules()
	}

	private iniDefaultPluralRules() {
		this.pluralRules.set('en', (n: number) => {
			if (n === 0) return 'zero'
			if (n === 1) return 'one'
			return 'other'
		})
		this.pluralRules.set('zh', (_n: number) => 'other')
		this.pluralRules.set('ja', (_n: number) => 'other')
		this.pluralRules.set('ko', (_n: number) => 'other')
		this.pluralRules.set('ru', (n: number) => {
			const mod10 = n % 10
			const mod100 = n % 100
			if (mod10 === 1 && mod100 !== 11) return 'one'
			if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'few'
			if (mod10 === 0 || (mod10 >= 5 && mod10 <= 9) || (mod100 >= 11 && mod100 <= 14)) return 'many'
			return 'other'
		})
		this.pluralRules.set('ar', (n: number) => {
			if (n === 0) return 'zero'
			if (n === 1) return 'one'
			if (n === 2) return 'two'
			const mod100 = n % 100
			if (mod100 >= 3 && mod100 <= 10) return 'few'
			if (mod100 >= 11 && mod100 <= 99) return 'many'
			return 'other'
		})
	}

	setLocale(locale: Locale) {
		const prevLocale = this.locale
		this.locale = locale
		this.emit('localeChange', { locale, prevLocale })
	}

	getLocale(): Locale {
		return this.locale
	}

	loadTranslations(locale: Locale, dict: TranslationDict) {
		const existing = this.translations.get(locale)
		if (existing) {
			this.mergeDict(existing, dict)
		} else {
			this.translations.set(locale, dict)
		}
		this.emit('translationLoaded', { locale })
	}

	private mergeDict(target: TranslationDict, source: TranslationDict) {
		for (const key in source) {
			const val = source[key]
			if (typeof val === 'object' && val !== null && typeof target[key] === 'object') {
				this.mergeDict(target[key] as TranslationDict, val)
			} else {
				target[key] = val
			}
		}
	}

	t(key: string, params?: Record<string, string | number>): string {
		let result = this.getTranslation(key, this.locale)
		if (result === null) {
			result = this.getTranslation(key, this.cfg.fallbackLocale)
		}
		if (result === null) {
			this.emit('missingKey', { key, locale: this.locale })
			return key
		}
		if (params) {
			result = this.interpolate(result, params)
		}
		return result
	}

	private getTranslation(key: string, locale: Locale): string | null {
		const dict = this.translations.get(locale)
		if (!dict) return null
		const parts = key.split('.')
		let current: TranslationDict | string = dict
		for (const part of parts) {
			if (typeof current !== 'object' || current === null) return null
			current = current[part] as TranslationDict | string
			if (current === undefined) return null
		}
		return typeof current === 'string' ? current : null
	}

	private interpolate(str: string, params: Record<string, string | number>): string {
		const { prefix, suffix } = this.cfg.interpolation
		let result = str
		for (const key in params) {
			const placeholder = prefix + key + suffix
			result = result.split(placeholder).join(String(params[key]))
		}
		return result
	}

	tp(key: string, count: number, params?: Record<string, string | number>): string {
		const pluralKey = this.getPluralKey(key, count)
		const allParams = { ...params, count }
		return this.t(pluralKey, allParams)
	}

	private getPluralKey(key: string, count: number): string {
		const category = this.getPluralCategory(count)
		return `${key}.${category}`
	}

	private getPluralCategory(n: number): PluralCategory {
		const rule = this.pluralRules.get(this.locale) ?? this.pluralRules.get('en')
		return rule ? rule(Math.abs(n)) : 'other'
	}

	setPluralRule(locale: Locale, rule: (n: number) => PluralCategory) {
		this.pluralRules.set(locale, rule)
	}

	formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
		const key = `${this.locale}-${JSON.stringify(options ?? {})}`
		let formatter = this.numberFormats.get(key)
		if (!formatter) {
			formatter = new Intl.NumberFormat(this.locale, options)
			this.numberFormats.set(key, formatter)
		}
		return formatter.format(value)
	}

	formatCurrency(value: number, currency: string): string {
		return this.formatNumber(value, { style: 'currency', currency })
	}

	formatPercent(value: number): string {
		return this.formatNumber(value, { style: 'percent' })
	}

	formatDate(date: Date, options?: Intl.DateTimeFormatOptions): string {
		const key = `${this.locale}-${JSON.stringify(options ?? {})}`
		let formatter = this.dateFormats.get(key)
		if (!formatter) {
			formatter = new Intl.DateTimeFormat(this.locale, options)
			this.dateFormats.set(key, formatter)
		}
		return formatter.format(date)
	}

	formatRelativeTime(value: number, unit: Intl.RelativeTimeFormatUnit): string {
		const formatter = new Intl.RelativeTimeFormat(this.locale, { numeric: 'auto' })
		return formatter.format(value, unit)
	}

	on<K extends keyof I18nEventMap>(event: K, callback: I18nEventCallback<K>): () => void {
		let set = this.listeners.get(event)
		if (!set) {
			set = new Set()
			this.listeners.set(event, set)
		}
		set.add(callback as I18nEventCallback<keyof I18nEventMap>)
		return () => set!.delete(callback as I18nEventCallback<keyof I18nEventMap>)
	}

	off<K extends keyof I18nEventMap>(event: K, callback: I18nEventCallback<K>) {
		const set = this.listeners.get(event)
		if (set) {
			set.delete(callback as I18nEventCallback<keyof I18nEventMap>)
		}
	}

	private emit<K extends keyof I18nEventMap>(event: K, data: I18nEventMap[K]) {
		const set = this.listeners.get(event)
		if (set) {
			for (const cb of set) {
				cb(data)
			}
		}
	}

	hasTranslation(key: string, locale?: Locale): boolean {
		const loc = locale ?? this.locale
		return this.getTranslation(key, loc) !== null
	}

	getAvailableLocales(): Locale[] {
		return Array.from(this.translations.keys())
	}

	clr() {
		this.translations.clear()
		this.numberFormats.clear()
		this.dateFormats.clear()
	}
}

export function detectBrowserLocale(): Locale {
	if (typeof navigator !== 'undefined') {
		const lang = navigator.language || (navigator as { userLanguage?: string }).userLanguage
		if (lang) {
			return lang.split('-')[0]
		}
	}
	return 'en'
}

export function createTranslationProxy(i18n: I18n): Record<string, string> {
	return new Proxy({} as Record<string, string>, {
		get(_target, prop: string) {
			return i18n.t(prop)
		}
	})
}

export const globalI18n = new I18n()
