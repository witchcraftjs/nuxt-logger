import type { Logger } from "pino"

export type Levels = "error" | "warn" | "debug" | "trace" | "info" | "fatal"

export type BaseLogger = Record<Levels, ((data: any) => void)> & {
	flush: Logger["flush"]
}
