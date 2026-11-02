import type {	ipcRenderer as IpcRenderer } from "electron"

import type { Levels } from "../../types.js"
import { ELECTRON_LOG_TYPE } from "../types.js"

export type ElectronLoggerApi = {
	log: (level: Levels, data: any) => void
	_logs: { on(cb: (level: Levels, data: any) => void): void }
}

export function createElectronLoggerApi(ipcRenderer: typeof IpcRenderer): ElectronLoggerApi {
	return {
		log: (level: Levels, data: any) => {
			try {
				ipcRenderer.send(ELECTRON_LOG_TYPE.TO_MAIN, { level, data })
			} catch (error) {
				throw new Error(`[nuxt-logger] could not forward a "${level}" log to electron's main process, its payload must be cloneable, pass raw values (e.g. \`toRaw\` on a reactive object). Log: ${JSON.stringify(data)}`, { cause: error })
			}
		},
		_logs: {
			on(cb: (level: Levels, data: any) => void) {
				ipcRenderer.on(ELECTRON_LOG_TYPE.FROM_MAIN_ON_RENDERER, (_event, level, data) => {
					cb(level, data)
				})
			}
		}
	}
}
