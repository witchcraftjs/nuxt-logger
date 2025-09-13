export default defineNuxtConfig({
	modules: [
		"../src/module"
		// the below also works, just remember to run the update-dep script and uncomment ../src/module above before attempting to use the file: linked module
		// "@witchcraft/nuxt-logger"
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
