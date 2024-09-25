import { useRuntimeConfig } from "#imports"
import { createUseLogger } from "#logger/createUseLogger.js"
export const useServerLogger = createUseLogger(useRuntimeConfig)
