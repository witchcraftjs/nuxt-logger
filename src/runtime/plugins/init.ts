
export default defineNuxtPlugin({
	name: "client-init-log",
	setup(nuxtApp) {
		if (import.meta.client) {
			nuxtApp.hook("app:created", () => {
				const config = useRuntimeConfig().public
				const initialLog: any = { appInfo: config.appInfo }
				if (window.navigator !== undefined) {
					initialLog.environmentInfo = {
						userAgent: navigator.userAgent,
					}
				}
				useLogger().info({ ns: "client:init", ...initialLog })
			})
		}
	},
	env: {
		// don't run when rendering server-only or island components.
		islands: false,
	},
})
