import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
	root: '.',
	plugins: [viteSingleFile()],
	server: {
		port: 3001
	},
	build: {
		outDir: 'dist'
	}
})
