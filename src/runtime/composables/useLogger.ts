import { useRuntimeConfig } from "#app"

import { createUseLogger } from "../createUseLogger.js"
export const useLogger = createUseLogger(useRuntimeConfig)

