import { ipcMain } from "electron"

import { ELECTRON_LOG_TYPE } from "./types.js"
import type { useElectronLogger } from "./useElectronLogger.js"

export function receiveFromRendererOnMain(logger: ReturnType<typeof useElectronLogger>): void {
	ipcMain.on(ELECTRON_LOG_TYPE.TO_MAIN, (_event, message) => {
		if (typeof message.data === "object" && typeof message.level === "string") {
			logger[message.level as keyof typeof logger](message.data)
		}
	})
}
