# @witchcraft/nuxt-logger

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]


Nuxt isomorphic-ish logging module (it can be used on the client/server/electron) and automatically adds a transport on the server and electron main to save logs to a file. 

It's simplified wrapper around pino that exposes only the default logger methods.


- [🏀 Online playground](https://stackblitz.com/github/witchcraftjs/nuxt-logger?file=playground%2Fapp.vue)

## Features

- Creates a nuxt plugin client side to log environment info (`info`).
- Creates a server middleware for logging requests (`trace`) with customizable redaction.
- `useLogger` composable for creating a client logger.
- `useServerLogger` composable for creating a server logger.
- `useElectronLogger` for electron + utilities for setting things up.

## Install
```bash
pnpx nuxi module add @witchcraft/nuxt-logger
```

## Usage

Just start using it with the `useLogger` or `useServerLogger` composable, they should be auto imported if you have auto imports on.

```ts
const logger = useLogger()
logger.info({ns:"namespace", msg:"hello world"})
```

### Redaction

By default redacts some known sensitive keys for the middleware logging requests.

Also redacts the `redact` key, but only in production, so you can put anything semi-sensitive in there that you need to inspect in development.

### Electron

The electron logger requires a bit of setup since electron's main cannot be passed the runtime config normally.

This assumes the usage of
[@witchcraft/nuxt-electron](todo) since it can handle this among other issues. Note this plugin needs to be before it in the plugins list.

There is a full example in the [@witchcraft/nuxt-electron playground](TODO).

```ts [main.ts]
import { STATIC, useDevDataDir } from "@witchcraft/nuxt-electron/electron"
import { ELECTRON } from "@witchcraft/nuxt-logger/electron"

// assuming you stick your active window instances here
const windows = []
const userDataDir = useDevDataDir() ?? parsed(args).userDataDir ?? app.getPath("appData")

// this only needs to be called like this the first time
const logger = useElectronLogger(
	{
		...STATIC.ELECTRON_RUNTIME_CONFIG.logger,
		// override the log path since with electron we only know it at runtime
		// this module sets it to undefined for electron anyways
		logPath: path.join(userDataDir, "log.txt"),
	},
	// give it a way to access windows to be able to communicate with them
	() => windows,
	{
		// true by default, allows recieving logs from the renderer
		recieveFromRenderer: true
	}
)
// later/elsewhere
// NOTE that the namespaces MUST begin with `main:`
useElectronLogger().debug({ns:"main:hello"}) // will work

```
We can setup the apis for two way communication in the preload script.

```ts
// preload.ts
import { contextBridge, ipcRenderer } from "electron"
import { createElectronLoggerApi, type ElectronLoggerApi } from "@witchcraft/nuxt-logger/electron"

declare global {
	interface Window {
		electron: {
			api: ElectronLoggerApi {
				//...
			}
		}
	}
}
// creates window.electron.api.log/_logs
// note the naming/structure must be like this, it's currently hardcoded
contextBridge.exposeInMainWorld("electron", {
	api: {
		...createElectronLoggerApi(ipcRenderer) 
	},
	meta: {
		env {
			// the regular useLogger in the renderer will look for this variable automatically
			LOG_LEVEL: process.env.LOG_LEVEL,
			WRITE_LEVEL: process.env.LOG_WRITE_LEVEL,
		}
	}
})
```

And receive `main`'s logs on the client. This must be called before other calls to `useLogger`.

```vue
// app.vue

<script lang="ts" setup>
// setup the regular client side logger
useLogger({
	// this is the default
	redirectTo: "electron",
	// prefixes all messages with `renderer:` so that they will be forwarded, can be a function
	redirectAll: true, 
})
setupElectronMainToRendererLogging()

useLogger().debug({ns: "renderer:hello"}) // will get forwarder
useLogger().debug({ns: "hello"}) // will also get forwarded if redirectAll is true
</script>
```


<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/@witchcraft/nuxt-logger/latest.svg?style=flat&colorA=020420&colorB=00DC82
[npm-version-href]: https://npmjs.com/package/@witchcraft/nuxt-logger

[npm-downloads-src]: https://img.shields.io/npm/dm/@witchcraft/nuxt-logger.svg?style=flat&colorA=020420&colorB=00DC82
[npm-downloads-href]: https://npmjs.com/package/@witchcraft/nuxt-logger

[license-src]: https://img.shields.io/npm/l/@witchcraft/nuxt-logger.svg?style=flat&colorA=020420&colorB=00DC82
[license-href]: https://npmjs.com/package/@witchcraft/nuxt-logger

[nuxt-src]: https://img.shields.io/badge/Nuxt-020420?logo=nuxt.js
[nuxt-href]: https://nuxt.com
