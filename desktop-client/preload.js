"use strict"
const { contextBridge, ipcRenderer } = require("electron")
const { version } = require("./package.json")

// Exam pages (the portal) get a tiny, read-only bridge: a version string, a stream of integrity events,
// and a way to unlock the app once the exam is submitted.
contextBridge.exposeInMainWorld("secureClient", {
  version,
  onEvent(callback) {
    const handler = (_event, payload) => callback(payload)
    ipcRenderer.on("secure-client:event", handler)
    return () => ipcRenderer.removeListener("secure-client:event", handler)
  },
  allowExit: () => ipcRenderer.invoke("secure-client:allow-exit"),
})

// Only the local preflight / PIN pages (file://) get these; main re-checks the sender before acting.
if (location.protocol === "file:") {
  contextBridge.exposeInMainWorld("secureClientLocal", {
    runChecks: () => ipcRenderer.invoke("secure-client:run-checks"),
    start: () => ipcRenderer.invoke("secure-client:start"),
    submitPin: (pin) => ipcRenderer.invoke("secure-client:pin", pin),
    cancelPin: () => ipcRenderer.invoke("secure-client:pin-cancel"),
    examUrl: () => ipcRenderer.invoke("secure-client:exam-url"),
  })
}
