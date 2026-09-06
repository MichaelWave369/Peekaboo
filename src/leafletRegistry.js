import L from 'leaflet'

let currentMap = null
let installed = false

if (!installed) {
  installed = true
  L.Map.addInitHook(function registerPeekabooMap() {
    currentMap = this
    queueMicrotask(() => {
      try {
        globalThis.window?.dispatchEvent(new CustomEvent('peekaboo:leaflet-map-ready'))
      } catch {
        // Non-browser test environments do not need the registry event.
      }
    })
  })
}

export function getPeekabooMap() {
  return currentMap
}
