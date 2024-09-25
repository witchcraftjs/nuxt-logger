import { useLogger } from "./useLogger.js"

// todo see about importing the composable from nuxt-electron
const isElectronClient = (typeof window !== "undefined" && "electron" in window && window.electron)

export function setupElectronMainToRendererLogging(): void {
	if (!isElectronClient) return
	const logger = useLogger()
	;(window as any).electron?.api._logs.on((level: string, data: any) => {
		(logger as any)[level](data)
	})
}
