import os from "os"

import { defineNitroPlugin, useRuntimeConfig, useServerLogger } from "#imports"

export default defineNitroPlugin(_nitroApp => {
	const cpus = os.cpus()
	const environmentInfo = {
		os: os.platform(),
		osType: os.type(),
		osVersion: os.release(),
		arch: os.arch(),
		nodeVersion: process.version,
		cpu: cpus?.[0].model,
		cpus: cpus.length,
		totalMem: os.totalmem(),
	}
	useServerLogger().info({
		ns: "server:init",
		appInfo: useRuntimeConfig().public,
		environmentInfo,
		isUsingTestingDb: process.env.LOCALSERVERDB
	})
})
