const rc = useRuntimeConfig()
const logPath = rc.public.logger.logPath
import fs from "fs/promises"
export default defineEventHandler(async () =>
	(await fs.readFile(logPath)).toString()
)
