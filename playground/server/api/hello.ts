const logger = useServerLogger()
export default defineEventHandler(() => {
	logger.info({
		ns: "server",
		msg: "Hello from server!"
	})

	return undefined
})
