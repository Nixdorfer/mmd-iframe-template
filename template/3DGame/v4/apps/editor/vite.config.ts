import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
	root: '.',
	plugins: [vue(), viteSingleFile()],
	server: {
		port: 3000
	},
	build: {
		outDir: 'dist'
	},
	resolve: {
		alias: {
			'@': '/src'
		}
	}
})
