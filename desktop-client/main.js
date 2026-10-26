"use strict"
const { app, BrowserWindow, Menu, clipboard, ipcMain, screen, session } = require("electron")
const crypto = require("crypto")
const path = require("path")
const fs = require("fs")
const { runChecks } = require("./checks")

function loadConfig() {
  let config = {}
  try { config = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf8")) } catch { /* use defaults/env */ }
  return {
    examUrl: process.env.EXAM_URL || config.examUrl || "http://localhost:3000",
    secret: process.env.SECURE_CLIENT_SECRET || config.secret || "",
    invigilatorPin: process.env.INVIGILATOR_PIN || config.invigilatorPin || "",
    blockedProcesses: config.blockedProcesses || [],
    // SECURE_CLIENT_DEV=1 turns the kiosk into a normal window so the client can be developed and tested.
    dev: process.env.SECURE_CLIENT_DEV === "1",
  }
}

const config = loadConfig()
const examOrigin = new URL(config.examUrl).origin
let mainWindow = null
let pinWindow = null
let allowQuit = false
let examStarted = false
let monitorTimer = null
let clipboardTimer = null
const lastNotified = new Map()

if (!app.requestSingleInstanceLock()) app.quit()

function signedHeader() {
  const timestamp = String(Date.now())
  return `${timestamp}.${crypto.createHmac("sha256", config.secret).update(timestamp).digest("hex")}`
}

function notify(event) {
  // The same finding is re-sent at most once a minute, so a monitor left plugged in is not a flood.
  const key = event.type + (event.detail && event.detail.apps ? event.detail.apps.join(",") : "")
  if (Date.now() - (lastNotified.get(key) || 0) < 60000) return
  lastNotified.set(key, Date.now())
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send("secure-client:event", event)
}

function isFromLocalPage(event) {
  const url = (event.senderFrame && event.senderFrame.url) || ""
  return url.startsWith("file://")
}

function isFromExamPage(event) {
  const url = (event.senderFrame && event.senderFrame.url) || ""
  return url.startsWith(examOrigin)
}

function createWindow() {
  mainWindow = new BrowserWindow({
    fullscreen: !config.dev,
    kiosk: !config.dev,
    alwaysOnTop: !config.dev,
    frame: config.dev,
    autoHideMenuBar: true,
    backgroundColor: "#0f172a",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // the preload needs require("./package.json"); it exposes only the small bridge above
      devTools: config.dev,
      spellcheck: false,
    },
  })
  Menu.setApplicationMenu(null)
  if (!config.dev) {
    mainWindow.setAlwaysOnTop(true, "screen-saver")
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
    // Screenshots and screen recordings of this window come out black (Windows and macOS).
    mainWindow.setContentProtection(true)
  }

  mainWindow.on("close", (event) => {
    if (!allowQuit && !config.dev) event.preventDefault()
  })
  // Losing focus (Alt+Tab, another app grabbing the foreground) is reported and focus is taken straight back.
  mainWindow.on("blur", () => {
    if (!examStarted || config.dev) return
    notify({ type: "FOCUS_LOST", message: "The exam window lost focus.", detail: {} })
    setTimeout(() => { if (mainWindow && !mainWindow.isDestroyed() && !allowQuit) mainWindow.focus() }, 150)
  })
  mainWindow.on("minimize", () => { if (!config.dev) mainWindow.restore() })

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }))
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!(url.startsWith(examOrigin) || url.startsWith("file://"))) event.preventDefault()
  })
  // Keyboard: block reload, close, devtools, print, save, find, new window/tab shortcuts.
  mainWindow.webContents.on("before-input-event", (event, input) => {
    if (config.dev || input.type !== "keyDown") return
    const key = String(input.key).toLowerCase()
    const mod = input.control || input.meta
    const blocked =
      key === "f12" || key === "f5" || key === "f11" ||
      (mod && ["r", "w", "q", "n", "t", "p", "s", "u", "f", "l", "o"].includes(key)) ||
      (mod && input.shift && ["i", "j", "c", "r", "n", "t"].includes(key)) ||
      (input.alt && (key === "f4" || key === "arrowleft" || key === "arrowright") && !allowQuit)
    if (blocked) event.preventDefault()
    // Invigilator emergency exit: Ctrl/Cmd + Shift + Alt + Q
    if (mod && input.shift && input.alt && key === "q") { event.preventDefault(); openPinWindow() }
  })
  showPreflight()
}

function showPreflight() {
  examStarted = false
  mainWindow.loadFile(path.join(__dirname, "preflight.html"))
}

function startExamPortal() {
  examStarted = true
  mainWindow.loadURL(config.examUrl)
  clearInterval(monitorTimer)
  // Re-check the machine while the exam runs; findings go to the portal, which records them as incidents.
  monitorTimer = setInterval(async () => {
    const result = await runChecks(config)
    for (const issue of result.issues) {
      const type = issue.id === "MULTIPLE_MONITORS" ? "MULTIPLE_MONITORS" : issue.id
      notify({ type, message: issue.label + ". " + issue.detail, detail: { detail: issue.detail, apps: issue.apps } })
    }
  }, 8000)
}

function openPinWindow() {
  if (pinWindow && !pinWindow.isDestroyed()) return
  if (!config.invigilatorPin) return
  pinWindow = new BrowserWindow({ parent: mainWindow, modal: true, width: 340, height: 210, resizable: false, minimizable: false, maximizable: false, autoHideMenuBar: true, webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false, sandbox: false, devTools: false } })
  pinWindow.loadFile(path.join(__dirname, "pin.html"))
}

function quitApp() {
  allowQuit = true
  clearInterval(monitorTimer)
  clearInterval(clipboardTimer)
  app.quit()
}

// ---- IPC -----------------------------------------------------------------------------------
ipcMain.handle("secure-client:run-checks", async (event) => {
  if (!isFromLocalPage(event)) return { ok: false, issues: [], info: {} }
  return runChecks(config)
})
ipcMain.handle("secure-client:start", async (event) => {
  if (!isFromLocalPage(event)) return false
  const result = await runChecks(config) // never trust the page's "all clear"
  if (!result.ok && !config.dev) return false
  startExamPortal()
  return true
})
ipcMain.handle("secure-client:exam-url", (event) => (isFromLocalPage(event) ? config.examUrl : ""))
ipcMain.handle("secure-client:allow-exit", (event) => {
  if (!isFromExamPage(event)) return
  allowQuit = true // the portal calls this only on the "exam submitted" screen
  clearInterval(monitorTimer)
  if (mainWindow && !mainWindow.isDestroyed() && !config.dev) { mainWindow.setKiosk(false); mainWindow.setAlwaysOnTop(false) }
})
ipcMain.handle("secure-client:pin", (event, pin) => {
  if (!isFromLocalPage(event) || !config.invigilatorPin) return false
  const a = Buffer.from(String(pin))
  const b = Buffer.from(config.invigilatorPin)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false
  quitApp()
  return true
})
ipcMain.handle("secure-client:pin-cancel", (event) => {
  if (!isFromLocalPage(event)) return
  if (pinWindow && !pinWindow.isDestroyed()) pinWindow.close()
})

app.on("second-instance", () => { if (mainWindow) mainWindow.focus() })
app.on("before-quit", (event) => { if (!allowQuit && !config.dev) event.preventDefault() })
app.on("window-all-closed", () => { if (allowQuit) app.quit() })

app.whenReady().then(() => {
  if (!config.secret) console.warn("[secure-client] No SECURE_CLIENT_SECRET configured: the portal will reject this client if REQUIRE_SECURE_CLIENT=1.")
  const ses = session.defaultSession
  ses.setUserAgent(`${ses.getUserAgent()} SecureExamClient/1.0`)
  // Prove to the portal that requests come from this app.
  ses.webRequest.onBeforeSendHeaders({ urls: [`${examOrigin}/*`] }, (details, callback) => {
    callback({ requestHeaders: { ...details.requestHeaders, "X-Secure-Client": signedHeader() } })
  })
  // Only camera / microphone / fullscreen are ever granted; and only to the exam origin.
  const allowed = new Set(["media", "fullscreen", "mediaKeySystem"])
  ses.setPermissionRequestHandler((webContents, permission, callback, details) => callback(allowed.has(permission) && String(details.requestingUrl || "").startsWith(examOrigin)))
  ses.setPermissionCheckHandler((webContents, permission, requestingOrigin) => allowed.has(permission) && String(requestingOrigin || "").startsWith(examOrigin))

  // Whatever was copied before the exam (notes, answers) cannot be pasted into the exam.
  clipboardTimer = setInterval(() => { try { clipboard.clear() } catch { /* ignore */ } }, 2000)

  screen.on("display-added", () => notify({ type: "MULTIPLE_MONITORS", message: "A display was connected.", detail: { displays: screen.getAllDisplays().length } }))
  createWindow()
})
