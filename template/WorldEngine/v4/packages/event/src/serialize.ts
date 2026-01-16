export function serializeData(d: any): any {
	if (d === null || typeof d !== 'object') return d
	if (d instanceof Map) {
		return {
			__t: 'Map',
			d: Array.from(d.entries()).map(([k, v]) => [serializeData(k), serializeData(v)])
		}
	}
	if (d instanceof Set) {
		return {
			__t: 'Set',
			d: Array.from(d).map(v => serializeData(v))
		}
	}
	if (d instanceof Date) {
		return { __t: 'Date', d: d.getTime() }
	}
	if (ArrayBuffer.isView(d)) {
		return {
			__t: 'TypedArray',
			typ: d.constructor.name,
			d: Array.from(d as any)
		}
	}
	if (Array.isArray(d)) {
		return d.map(v => serializeData(v))
	}
	const res: Record<string, any> = {}
	for (const key of Object.keys(d)) {
		res[key] = serializeData(d[key])
	}
	return res
}

export function deserializeData(d: any): any {
	if (d === null || typeof d !== 'object') return d
	if (d.__t === 'Map') {
		return new Map(d.d.map(([k, v]: [any, any]) => [deserializeData(k), deserializeData(v)]))
	}
	if (d.__t === 'Set') {
		return new Set(d.d.map((v: any) => deserializeData(v)))
	}
	if (d.__t === 'Date') {
		return new Date(d.d)
	}
	if (d.__t === 'TypedArray') {
		const TypedArrayCtor = (globalThis as any)[d.typ]
		if (TypedArrayCtor) return new TypedArrayCtor(d.d)
		return d.d
	}
	if (Array.isArray(d)) {
		return d.map(v => deserializeData(v))
	}
	const res: Record<string, any> = {}
	for (const key of Object.keys(d)) {
		res[key] = deserializeData(d[key])
	}
	return res
}

export function cloneData(d: any): any {
	return deserializeData(serializeData(d))
}

export function toJSON(d: any): string {
	return JSON.stringify(serializeData(d))
}

export function fromJSON(json: string): any {
	return deserializeData(JSON.parse(json))
}
