import { keys } from "@alanscodelog/utils/keys"
import type { PublicRuntimeConfig } from "@nuxt/schema"
import { app, type BrowserWindow } from "electron"
import path from "node:path"
import { type Logger, pino } from "pino"

import { receiveFromRendererOnMain } from "./receiveFromRendererOnMain.js"
import { ELECTRON_LOG_TYPE } from "./types.js"

import { getBaseOptions } from "../helpers/getBaseOptions.js"

declare const globalThis: any
globalThis.__bundlerPathsOverrides = {
	"pino-worker": `./node_modules/pino/lib/worker.js`,
	"pino-worker-pipeline": `./node_modules/pino/lib/worker-pipeline.js`,
	"thread-stream-worker": `./node_modules/thread-stream/lib/worker.js`,
	"pino/file": `./node_modules/pino/file.js`,
	"pino-pretty": `./node_modules/pino-pretty/index.js`
}
const bundlerOverrides = globalThis.__bundlerPathsOverrides

const appPath = app.getAppPath()
for (const key of keys(bundlerOverrides)) {
	bundlerOverrides[key] = path.resolve(appPath, bundlerOverrides[key])
}

let initiated = false
const levels: (keyof Logger)[] = ["error", "warn", "debug", "trace", "info", "fatal"] as const
const logger: Record<typeof levels[number], ((data: any) => void)> = {} as any

/**
 * A simplified wrapper around pino for use in electron main. Note that it does not support child logger and is actually a simple wrapper around just the basic levels.
 *
 * This is in part because pino might get swapped out (see @{link usePino}, but also to allow us to forward messages to the renderer easily because otherwise to do so we would have to use a custom pino transport that then communicates back again with the main process to send messages to the correct window which is a ridiculous round trip for no benefit.
 *
 * This is seperate since it requires special handling because of the following:
 * - We can't use useRuntimeConfig so it's injected by using vite define instead ({@link STATIC}).
 * - We need to pass the logPath which is defined at runtime.
 * - We need to use some electron only imports which causes problems for the regular server.
 * - Pino needs to be told were to find it's workers electron side in prod.
 * {@link https://github.com/pinojs/pino/blob/master/docs/bundling.md}
 * Using vite's ?worker&url imports almost works (the paths are correct) but something about the transpiling breaks things I think.
 */

export function useElectronLogger(
	pinoConfig?: PublicRuntimeConfig["logger"],
	windows?: () => BrowserWindow[], {
		receiveFromRenderer = true
	}: { receiveFromRenderer?: boolean } = {}
) {
	if (initiated && pinoConfig) {
		throw new Error("Config can only be passed the first time when initiating.")
	}
	// doing initiated check because we need to be able to pass config from electron
	if (!initiated) {
		if (!pinoConfig) {
			throw new Error("Config must be passed the first time using useElectronLogger.")
		}
		if (!windows) {
			throw new Error("windows getter must be passed the first time using useElectronLogger.")
		}
		initiated = true

		const { opts, transports, debug } = getBaseOptions(pinoConfig)

		const pinoLogger = pino(
			opts,
			pino.transport(transports)
		)

		for (const level of levels) {
			// the references are safe

			logger[level] = (data: any) => {
				if (typeof data === "object") {
					if (data.ns.startsWith("renderer:")) {
						(pinoLogger as any)[level](data)
						return
					} else if (!data.ns.startsWith("main:")) {
						throw new Error(`Namespace on electron's main side must start with "main:", got ${data.ns} instead in log: ${JSON.stringify(data)}.`)
					}
				}
				(pinoLogger as any)[level](data)
				const wins = windows()
				for (const win of wins) {
					win.webContents.send(ELECTRON_LOG_TYPE.FROM_MAIN_ON_RENDERER,
						level, data)
				}
			}
		}
		if (receiveFromRenderer) {
			receiveFromRendererOnMain(logger)
		}

		logger.debug({ ns: "main:log", ...debug })
	}
	return logger
}
