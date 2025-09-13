import type {	ipcRenderer as IpcRenderer } from "electron"

import { ELECTRON_LOG_TYPE } from "./types.js"

import type { Levels } from "../types.js"

export type ElectronLoggerApi = {
	log: (level: Levels, data: any) => void
	_logs: { on(cb: (level: Levels, data: any) => void): void }
}

export function createElectronLoggerApi(ipcRenderer: typeof IpcRenderer): ElectronLoggerApi {
	return {
		log: (level: Levels, data: any) => ipcRenderer.send(ELECTRON_LOG_TYPE.TO_MAIN, { level, data }),
		_logs: {
			on(cb: (level: Levels, data: any) => void) {
				ipcRenderer.on(ELECTRON_LOG_TYPE.FROM_MAIN_ON_RENDERER, (_event, level, data) => {
					cb(level, data)
				})
			}
		}
	}
}
