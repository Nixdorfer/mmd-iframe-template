import { useConfigStore } from '@/stores/useConfig'

export function useConfigIO() {
	const store = useConfigStore()

	function saveConfig() {
		const cfg = store.collectAll()
		const json = JSON.stringify(cfg, null, 2)
		const blob = new Blob([json], { type: 'application/json' })
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = 'game.config.json'
		a.click()
		URL.revokeObjectURL(url)
	}

	function loadConfig() {
		const input = document.createElement('input')
		input.type = 'file'
		input.accept = '.json'
		input.onchange = (e) => {
			const file = (e.target as HTMLInputElement).files?.[0]
			if (!file) return
			const reader = new FileReader()
			reader.onload = (ev) => {
				try {
					const cfg = JSON.parse(ev.target?.result as string)
					store.loadAll(cfg)
				} catch (err) {
					console.error('Failed to load config:', err)
				}
			}
			reader.readAsText(file)
		}
		input.click()
	}

	function newConfig() {
		store.reset()
	}

	return { saveConfig, loadConfig, newConfig }
}
