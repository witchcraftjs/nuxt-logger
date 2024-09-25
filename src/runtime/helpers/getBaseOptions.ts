import { keys } from "@alanscodelog/utils/keys.js"
import { readable } from "@alanscodelog/utils/readable.js"
import type { PublicRuntimeConfig } from "@nuxt/schema"
import pino, { type LoggerOptions, type TransportMultiOptions } from "pino"

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

export function getBaseOptions(config: PublicRuntimeConfig["logger"]): {
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
	const { redact, logPath } = config
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
					send(level, logEvent) {
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
			],
		},
	}
}
