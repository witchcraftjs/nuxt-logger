import { useRuntimeConfig } from "#app"

import { createUseLogger } from "../shared/createUseLogger.js"
export const useLogger = createUseLogger(useRuntimeConfig)

