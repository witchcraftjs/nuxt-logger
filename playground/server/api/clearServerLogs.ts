import fs from "fs/promises"
const rc = useRuntimeConfig()
const logPath = rc.public.logger.logPath

export default defineEventHandler(async () => {
	await fs.writeFile(logPath, "")
	return "Ok"
})
