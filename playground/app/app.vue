<template>
<div :style="`display:flex; max-width: 100%; flex-direction: column; gap:5px;`">
	<button type="button" @click="logFromClient">Log from Client</button>
	<button type="button" @click="logFromServer">Log from Server</button>
	<!-- todo something borked here, if we read the logs (even wih cat), the logging breaks... -->
	<button type="button" @click="clearLogs">Clear Server Logs</button>
	Filter:
	<input id="filter" v-model="filter">
	<pre
		:style="`overflow:auto;`"
	>{{ filteredLogs }}</pre>
</div>
</template>

<script setup>
const logger = useLogger()
const loggerMessage = {
	ns: "client",
	msg: "Hello from web client!"
}
logger.debug(loggerMessage)

const filter = ref("")
const excludeMiddleware = ref(true)
const serverLogs = ref("")

const filteredLogs = computed(() => {
	if (filter.value === "") return serverLogs.value
	return serverLogs.data.value.split("\n").filter(line => line.includes(filter.value)).join("\n")
})

async function refresh() {
	serverLogs.value = (await $fetch("/api/serverLogs"))
}
void refresh()

async function logFromServer() {
	await $fetch("/api/hello")
	await refresh()
}

async function logFromClient() {
	logger.debug(loggerMessage)
}

async function clearLogs() {
	await $fetch("/api/clearServerLogs")
	await refresh()
}
</script>
