import type { useElectronLogger } from "./useElectronLogger.js"
/**
 * Wraps a logger (prefixed the first argument's namespace key with "main:") for use in electron.
 */
export function wrapLoggerForElectron<T extends ReturnType<typeof useElectronLogger>>(
	logger: T,
	prefix: string = "main:"
): T {
	const res = {} as Record<keyof T, unknown>
	for (const key of Object.keys(logger) as (keyof T)[]) {
		res[key] = (...args: any[]) => {
			(logger[key] as (...args: any[]) => void)({ ...args[0], ns: prefix + args[0].ns }, ...args.slice(1))
		}
	}
	return res as T
}
