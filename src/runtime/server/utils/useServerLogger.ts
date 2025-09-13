import { useRuntimeConfig } from "#imports"

import { createUseLogger } from "../../shared/createUseLogger.js"

export const useServerLogger = createUseLogger(useRuntimeConfig)
