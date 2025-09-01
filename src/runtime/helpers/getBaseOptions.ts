import { get } from "@alanscodelog/utils/get.js"
import { keys } from "@alanscodelog/utils/keys.js"
import { readable } from "@alanscodelog/utils/readable.js"
import { set } from "@alanscodelog/utils/set.js"
import { walk } from "@alanscodelog/utils/walk.js"
import type { PublicRuntimeConfig } from "@nuxt/schema"
import pino, { type LoggerOptions, type TransportMultiOptions } from "pino"
import {inspect} from "@alanscodelog/utils/inspect.js"

// normally we would access logger.levels, but because we create
// the shared config here we can't
const levels = {
	values: {
		fatal: 60,
		error: 50,
		warn: 40,
		info: 30,
		debug: 20,
		trace: 10,
	},
	labels: {
		10: "trace",
		20: "debug",
		30: "info",
		40: "warn",
		50: "error",
		60: "fatal",
	},
}


const isElectronClient = (typeof window !== "undefined" && "electron" in window && window.electron)

export function getBaseOptions(
	config: PublicRuntimeConfig["logger"],
): {
		opts: LoggerOptions
		browserOpts: LoggerOptions
		transports: TransportMultiOptions
		debug: {
			logPath: string
			writeLevel: string
			logLevel: string
		}
	} {
	// @ts-expect-error the path is wrong on electron's client side
	// but it's not used anyways
	if (isElectronClient) { delete config.logPath }
	const {
		redact,
		logPath,
		additionalServerTransportTargets,
		disabledServerTransportTargets
	} = config
	const validLevels = keys(levels.values)
	if (process.env.LOG_LEVEL && !validLevels.includes(process.env.LOG_LEVEL as any)) {
		throw new Error(`logLevel is not a valid level: ${readable(validLevels)}`)
	}
	const maybeElectronLogLevel = import.meta.client
		? (window as any).electron?.meta?.env?.LOG_LEVEL
		: undefined
	const maybeElectronLogWriteLevel = import.meta.client
		? (window as any).electron?.meta?.env?.LOG_WRITE_LEVEL
		: undefined
	const writeLevel: (typeof validLevels)[number] =
		maybeElectronLogWriteLevel
		?? maybeElectronLogLevel
		?? process.env.LOG_WRITE_LEVEL as any
		?? process.env.LOG_LEVEL as any
		?? (import.meta.dev ? "debug" : undefined)
		?? "warn"
	const logLevel: (typeof validLevels)[number] =
		maybeElectronLogWriteLevel
		?? process.env.LOG_LEVEL as any
		?? (import.meta.dev ? "debug" : undefined)
		?? "debug"

	const processedAdditionalServerTransportTargets = []
	const thisContexts =[
		...(isElectronClient ? ["electron-client"] : []),
		// might not be available, careful
		...((import.meta as any)?.electron ? ["electron-main"] : []),
		...(import.meta.client ? ["client"] : []),
		...(import.meta.server ? ["server"] : []),
	]
	for (const target of additionalServerTransportTargets ?? []) {
		const contexts = (target as any)._contexts as string[]
		const contextMatches = contexts === undefined || contexts.find(c => thisContexts.includes(c))
		if (!contextMatches) continue
		const propPaths = (target as any)._loadFromEnv as string[]
		// we have to clone because we can't write to runtimeConfig
		const clone = walk(target, undefined, { save: true })
		processedAdditionalServerTransportTargets.push(clone)
		for (const propPath of propPaths) {
			const splitPath = propPath.split(".")
			if (propPath) {
				set(clone, splitPath, process.env[get(clone, splitPath)])
			}
		}
		delete (clone as any)._loadFromEnv
	}

	return {
		debug: {
			logPath,
			writeLevel,
			logLevel,
		},
		opts: {
			redact,
			// do not under any circumstances change how level looks, it breaks the logging ??? :/
			level: logLevel,
			formatters: {
				bindings: () => ({}),
			},
			timestamp: pino.stdTimeFunctions.isoTime,
		},
		browserOpts: {
			browser: {
				asObject: false,
				transmit: isElectronClient
				? {
					level: logLevel,
					send: (level, logEvent) => {
						if (!logEvent.messages[0]?.ns?.startsWith("main") && levels.values[level] < levels.values[writeLevel]) {
							logEvent.messages[0].ns &&= `renderer:${logEvent.messages[0].ns}`
							;(window as any).electron.api.log(logEvent)
						}
					},
				} : undefined,
			},
		},
		transports: {
			targets: [
				{
					level: writeLevel,
					target: "pino/file",
					options: {
						destination: logPath,
						mkdir: true,
					},
				},
				{
					level: logLevel,
					target: "pino-pretty",
					options: {
						colorize: true,
					},
				},
				...(processedAdditionalServerTransportTargets ?? []),
			// not sure when target doesn't exist, #future investigate
			].filter(t => !disabledServerTransportTargets?.includes((t as any).target)),
		},
	}
}
