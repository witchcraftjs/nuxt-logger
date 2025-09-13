import type { EnumLike } from "@alanscodelog/utils"
import { enumFromArray } from "@alanscodelog/utils/enumFromArray"

export const ELECTRON_LOG_TYPE = enumFromArray([
	"FROM_MAIN_ON_RENDERER",
	"TO_MAIN"
], "ELECTRON_LOG_TYPE.")

export type ElectronLogType = EnumLike<typeof ELECTRON_LOG_TYPE>
