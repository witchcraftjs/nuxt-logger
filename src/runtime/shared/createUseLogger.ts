import type { RuntimeConfig } from "nuxt/schema"
import { type Logger, pino } from "pino"

import { getBaseOptions } from "../helpers/getBaseOptions.js"
import type { Levels } from "../types.js"

export type BaseLogger = Record<Levels, ((data: any) => void)> & {
	flush: Logger["flush"]
}
const logger: BaseLogger = {} as any

/**
	* This exists to allow creating useLogger both on the client and the server since for the module to work on the server we must import from `#imports` and have the module transpile the files, but this is not neccesary from the composable.
	*
	* So they both create useLogger by passing in useRuntimeConfig how they can.
	*/
export function createUseLogger(
	rc: () => RuntimeConfig
) {
	let initiated = false
	return function useLogger({
		redirectTo,
		redirectAll = true
	}: {
		redirectTo?: "electron"
		/**
		 * Prefixes all messages not coming from main with `renderer:` so that they will be forwarded.
		 *
		 * Can also be a function to filter what gets forwarded.
		 */
		redirectAll?: boolean | ((level: keyof Logger, data: any) => boolean)
	} = {}) {
		const levels: (Levels)[] = ["error", "warn", "debug", "trace", "info", "fatal"] as const
		// there's a bit of a problem calling useRuntimeConfig/useNuxtApp outside the function
		// so doing initiated check instead
		if (!initiated) {
			initiated = true

			const config = rc().public
			const { opts, transports, browserOpts, debug } = getBaseOptions(config.logger)
			let transport: any
			if (import.meta.server) {
				transport = pino.transport(transports)
			}
			const pinoLogger = pino(
				{
					...opts,
					...(import.meta.client
						? browserOpts
						: {})
				},
				transport
			)
			for (const level of levels) {
				logger[level] = (data: any) => {
					if (redirectTo === "electron") {
						if (typeof data === "object" && typeof data.ns === "string" && !data.ns.startsWith("main:")) {
							if (data.ns.startsWith("renderer:")) {
								(window as any).electron?.api.log(level, data)
							} else if (typeof redirectAll === "function" ? redirectAll(level, data) : redirectAll) {
								data.ns = `renderer:${data.ns}`
								;(window as any).electron?.api.log(level, data)
							}
						}
					}
					(pinoLogger as any)[level](data)
				}
			}
			logger.debug({ ns: "log", ...debug, enabledTransportTargets: transports.targets.map(t => (t as any)?.target) })
			return logger
		}
		return logger
	}
}
