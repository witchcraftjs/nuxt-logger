import type { RuntimeConfig } from "nuxt/schema"
import pino, { type Logger } from "pino"

import { useRuntimeConfig } from "#app"

import { getBaseOptions } from "../helpers/getBaseOptions.js"
import type { Levels } from "../types.js"


export type BaseLogger = Record<Levels, ((data: any) => void)> & {
	flush: Logger["flush"]
}
const logger: BaseLogger = {} as any

let initiated = false

export function useNewLogger({
	redirectTo,
	redirectAll = true,
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
	if (!initiated || Object.keys(logger).length === 0) {
		initiated = true

		const config = useRuntimeConfig().public
		const { opts, transports, browserOpts, debug } = getBaseOptions(config.logger)
		let transport: any
		if(import.meta.server) {
			transport = pino.transport(transports)
		}
		const pinoLogger = pino(
			{
				...opts,
				...(import.meta.client
				? browserOpts
				: {}),
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
		logger.debug({ ns: "log", ...debug })
		return logger
	}
	return logger
}

