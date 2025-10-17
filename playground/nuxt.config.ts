export default defineNuxtConfig({
	modules: [
		"../src/module"
	],
	devtools: { enabled: true },
	future: {
		compatibilityVersion: 4 as const
	},
	compatibilityDate: "2024-09-23",
	logger: {
		serverLogPath: "./logs/server.log" // otherwise github action will fail since /var/log is not writable
	}
})
