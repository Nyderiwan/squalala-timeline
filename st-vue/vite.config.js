import vue from '@vitejs/plugin-vue'

/**
 * @type {import('vite').UserConfig}
 */

export default {
	optimizeDeps: {
		include: ['dayjs', 'dayjs/locale/fr']
	},
	assetsInclude: 'mov',
	plugins: [vue()]
}
