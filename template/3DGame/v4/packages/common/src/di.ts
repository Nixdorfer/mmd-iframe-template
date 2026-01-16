export type ServiceKey<T> = symbol & { __type: T }

export function createKey<T>(name: string): ServiceKey<T> {
	return Symbol(name) as ServiceKey<T>
}

export class ServiceContainer {
	private svcs: Map<symbol, any>
	private facs: Map<symbol, () => any>

	constructor() {
		this.svcs = new Map()
		this.facs = new Map()
	}

	reg<T>(key: ServiceKey<T>, inst: T) {
		this.svcs.set(key, inst)
	}

	regFactory<T>(key: ServiceKey<T>, fac: () => T) {
		this.facs.set(key, fac)
	}

	get<T>(key: ServiceKey<T>): T {
		if (this.svcs.has(key)) return this.svcs.get(key)
		const fac = this.facs.get(key)
		if (fac) {
			const inst = fac()
			this.svcs.set(key, inst)
			return inst
		}
		throw new Error(`Service not found: ${key.toString()}`)
	}

	has<T>(key: ServiceKey<T>): boolean {
		return this.svcs.has(key) || this.facs.has(key)
	}

	clr() {
		this.svcs.clear()
		this.facs.clear()
	}
}

export const globalContainer = new ServiceContainer()
