import { defineEventHandler, useServerLogger } from "#imports"

export default defineEventHandler(event => {
	const logger = useServerLogger()
	logger.trace({
		ns: "server:req:all",
		req: {
			headers: event.node.req.headers,
			method: event.node.req.method,
			url: event.node.req.url
		}
	})
})
