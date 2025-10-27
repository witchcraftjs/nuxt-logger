import {
	addImportsDir,
	addPlugin,
	addServerHandler,
	addServerImportsDir,
	createResolver,
	defineNuxtModule,
	resolveAlias,
	resolvePath
} from "@nuxt/kit"
import { defu } from "defu"
import fs from "node:fs/promises"
import path from "node:path"
import type { TransportMultiOptions } from "pino"

declare module "@nuxt/schema" {
	interface PublicRuntimeConfig {
		logger: Pick<ModuleOptions, "redact" | "additionalServerTransportTargets" | "disabledServerTransportTargets"> & {
			logPath: string
		}
	}
}

export interface ModuleOptions {
	/**
	 * See {@link https://getpino.io/#/docs/redaction?id=redaction Pino redaction options}.
	 */
	redact: string[]
	/** This is "~~/logs/${appName}.log" by default. It's recommended you change it to something like "/var/log/${appName}.log" in production. */
	serverLogPath?: string
	/** This is "~~/logs/server.log" by default. */
	devServerLogPath?: string
	/** The module tries to get the app name from `runtimeConfig.appInfo.name`, otherwise it uses the name of the `~~` directory by default. */
	appName?: string
	/** @default false */
	enableServerRequestLogging?: boolean
	/**
	 * Additional transport targets to add to the server transport.
	 * File and console + pino-pretty are added by default. See disabledServerTransportTargets for disabling a transport.
	 *
	 * Since some transports will require options, but passing them via the nuxt config will hard code them, there is an additional `_loadFromEnv` property that can list a list of dot seperated properties to load from `process.env` and `_contexts` to set what context it will run in.
	 *
	 * For example, to add `pino-loki`:
	 * ```ts
	 * additionalServerTransportTargets: [
	 *		{
	 *			target: "pino-loki",
	 * 		_contexts: ["server"], // can be any of ["server", "client", "electron-client", "electron-main"] (all by default)
	 *			_loadFromEnv: ["options.host", "options.basicAuth.username", "options.basicAuth.password"],
	 *			options: {
	 *				//...
	 *				labels: {
	 * 				// set additional labels
	 *					application: "...",
	 * 			},
	 * 			propsToLabels: ["level", ...don't forget to set your labels ],
	 * 			replaceTimestamp: true, // loki requires timestamps in a specific format
	 *				host: "PINO_LOKI_HOST",
	 *				basicAuth: {
	 * 				// don't forget the quotes!
	 *					username: "PINO_LOKI_BASIC_AUTH_USERNAME",
	 *					password: "PINO_LOKI_BASIC_AUTH_PASSWORD",
	 *				},
	 *			},
	 *		},
	 * ]
	 * ```
	 * The location for the auth part on grafana cloud is confusing as fuck, leaving this here for posterity.
	 *
	 * Go to https://grafana.com/orgs/YOURORGHERE/stacks => Details => Loki => Send Logs
	 *
	 * There you can get the user and create a token with write access and it sets the right stuff. It will then appear in https://YOURORGHERE.grafana.net/a/grafana-auth-app
	 *
	 * If nothing is erroring, you should be able to see grafana receiving logs in Drilldown => Logs => Logs (https://YOURORGHERE.grafana.net/drilldown).
	 *
	 * You can then create a dashboard based on your labels.
	 */
	additionalServerTransportTargets?: (TransportMultiOptions["targets"][number] & {
		_contexts?: ("server" | "client" | "electron-client" | "electron-main")[]
		_loadFromEnv: string[]
	})[]
	/** Disable a transport target by it's target name. */
	disabledServerTransportTargets?: string[]
	/** Whether to ensure the log dirs exist (for disabling when using the module in layers) */
	ensureLogDirs?: boolean
}

export default defineNuxtModule<ModuleOptions>({
	meta: {
		name: "logger",
		configKey: "logger"
	},
	defaults: {
		redact: [
			...(process.env.NODE_ENV === "development" ? [] : ["redact"]),
			`req.headers["sec-ch-ua"]`,
			`req.headers.cookie`,
			`req.headers["user-agent"]`,
			`req.headers.authorization`,
			`req.headers.referer`,
			`req.headers["x-forwarded-for"]`,
			`req.headers["set-cookie"]`,
			// i don't think this is actually sensitive, but just in case
			`req["sec-websocket-key"]`
		] as string[],
		enableServerRequestLogging: false,
		additionalServerTransportTargets: [],
		disabledServerTransportTargets: [],
		ensureLogDirs: true
	},
	async setup(options, nuxt) {
		const { resolve } = createResolver(import.meta.url)
		options.devServerLogPath ??= path.relative(nuxt.options.rootDir, resolveAlias("~~/logs/server.log", nuxt.options.alias))
		const maybeAppName = (nuxt.options.runtimeConfig.public as any)?.appInfo?.name
		const appName = options.appName ?? maybeAppName ?? path.basename(await resolvePath("~~", { alias: nuxt.options.alias }))
		options.serverLogPath ??= path.relative(nuxt.options.rootDir, resolveAlias(`~~/logs/${appName}.log`, nuxt.options.alias))
		if (options.ensureLogDirs) {
			if (process.env.NODE_ENV === "development") {
				if (!await fs.stat(options.devServerLogPath).then(() => true).catch(() => false)) {
					await fs.mkdir(path.dirname(options.devServerLogPath), {
						recursive: true
					})
					await fs.writeFile(options.devServerLogPath, "")
				}
			} else {
				if (!await fs.stat(options.serverLogPath).then(() => true).catch(() => false)) {
					await fs.mkdir(path.dirname(options.serverLogPath), { recursive: true })
					await fs.writeFile(options.serverLogPath, "")
				}
			}
		}

		nuxt.options.runtimeConfig.public.logger = defu(
			nuxt.options.runtimeConfig.public.logger as any,
			{
				redact: options.redact,
				logPath: nuxt.options.dev ? options.devServerLogPath : options.serverLogPath,
				additionalServerTransportTargets: options.additionalServerTransportTargets,
				disabledServerTransportTargets: options.disabledServerTransportTargets
			}
		)
		if (nuxt.options.modules.includes("@witchcraft/nuxt-electron")) {
			const opts = nuxt.options as any
			opts.electron ??= {}
			opts.electron.electronOnlyRuntimeConfig ??= {}
			opts.electron.electronOnlyRuntimeConfig.logger ??= {}
			opts.electron.electronOnlyRuntimeConfig.logger.logPath = undefined
		}
		// the server files require transpilation to use #imports and #logger
		// they are needed, otherwise I can't seem to get the imports to resolve correctly
		// see also runtime/shared/createUseLogger.ts
		for (const file of [
			"./runtime",
			"./runtime/server/middleware/log",
			"./runtime/server/utils/useServerLogger"
		]) {
			nuxt.options.build.transpile.push(resolve(file))
		}

		addImportsDir(resolve("./runtime/composables"))
		addServerImportsDir(resolve("./runtime/server/utils"))

		if (options.enableServerRequestLogging) {
			addServerHandler({
				middleware: true,
				handler: resolve("./runtime/server/middleware/log")
			})
		}
		addPlugin(resolve("./runtime/plugins/init"))

		nuxt.options.alias["#logger"] = resolve("./runtime")
		nuxt.hook("vite:extendConfig", config => {
		// fixes https://github.com/nuxt/nuxt/issues/13247 partially (also transpiling it breaks it)
			config.optimizeDeps ??= {}
			config.optimizeDeps.include ??= []
			config.optimizeDeps.include.push("pino")
		})
	}
})
