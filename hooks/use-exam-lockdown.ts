"use client"

import { useCallback, useEffect, useRef, useState } from "react"

type LockdownIncident = "TAB_SWITCH" | "COPY_ATTEMPT" | "PASTE_ATTEMPT" | "CUT_ATTEMPT" | "FULLSCREEN_EXIT" | "MULTIPLE_MONITORS" | "CLIENT_INTEGRITY"

/** Events pushed by the Secure Exam Client (desktop app) through its preload bridge, when it is in use. */
type SecureClientEvent = { type: string; message: string; detail?: Record<string, unknown> }
declare global {
  interface Window {
    secureClient?: { version: string; onEvent: (callback: (event: SecureClientEvent) => void) => () => void; allowExit?: () => Promise<void> }
  }
}

type Options = {
  sessionId: string
  /** Turn lockdown on only once the exam is actually running. */
  active: boolean
  /** Called when the server says the violation limit was hit and the exam was auto-submitted. */
  onAutoSubmitted: () => void
}

/**
 * Browser lockdown for the exam screen: fullscreen enforcement, tab/window-switch
 * detection, and copy/cut/paste/right-click blocking. Each violation is POSTed to the
 * incident API, which counts them and auto-submits the exam at the configured limit.
 */
export function useExamLockdown({ sessionId, active, onAutoSubmitted }: Options) {
  const [violations, setViolations] = useState(0)
  const [maxViolations, setMaxViolations] = useState<number | null>(null)
  const [warning, setWarning] = useState("")
  const [isFullscreen, setIsFullscreen] = useState(true)
  const lastReported = useRef<Record<string, number>>({})
  const autoSubmitCallback = useRef(onAutoSubmitted)
  autoSubmitCallback.current = onAutoSubmitted

  const report = useCallback(
    async (type: LockdownIncident, message: string, severity: "LOW" | "MEDIUM" | "HIGH" = "MEDIUM", metadata?: Record<string, unknown>) => {
      if (!sessionId) return
      // Several browser events fire for one physical action (blur + visibilitychange, etc.)
      const now = Date.now()
      if (lastReported.current[type] && now - lastReported.current[type] < 1500) return
      lastReported.current[type] = now
      setWarning(message)
      try {
        const response = await fetch(`/api/exams/session/${sessionId}/incident`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, severity, metadata }),
        })
        if (!response.ok) return
        const data = await response.json()
        if (typeof data.violations === "number") setViolations(data.violations)
        if (typeof data.maxViolations === "number") setMaxViolations(data.maxViolations)
        if (data.autoSubmitted) autoSubmitCallback.current()
      } catch {
        /* a dropped report must never break the exam */
      }
    },
    [sessionId],
  )

  const enterFullscreen = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen()
      // Chromium only: while fullscreen, keep Esc/Alt/Meta/Tab for the page so they cannot be used to leave the exam.
      const keyboard = (navigator as Navigator & { keyboard?: { lock?: (keys: string[]) => Promise<void> } }).keyboard
      await keyboard?.lock?.(["Escape", "Tab", "AltLeft", "AltRight", "MetaLeft", "MetaRight"]).catch(() => undefined)
    } catch {
      /* browser refused; the overlay stays up and the student can retry */
    }
  }, [])

  useEffect(() => {
    if (!active) return
    setIsFullscreen(Boolean(document.fullscreenElement))

    const onFullscreenChange = () => {
      const full = Boolean(document.fullscreenElement)
      setIsFullscreen(full)
      if (!full) void report("FULLSCREEN_EXIT", "You left fullscreen mode.", "HIGH")
    }
    const onVisibility = () => {
      if (document.visibilityState === "hidden") void report("TAB_SWITCH", "You switched away from the exam tab.")
    }
    // Only count the window losing focus if it stays lost, so a brief browser popup is not held against the student.
    let blurTimer: number | undefined
    const onBlur = () => {
      window.clearTimeout(blurTimer)
      blurTimer = window.setTimeout(() => void report("TAB_SWITCH", "The exam window lost focus."), 1500)
    }
    const onFocus = () => window.clearTimeout(blurTimer)
    const onCopy = (event: ClipboardEvent) => {
      event.preventDefault()
      void report("COPY_ATTEMPT", "Copying is not allowed during the exam.", "LOW")
    }
    const onCut = (event: ClipboardEvent) => {
      event.preventDefault()
      void report("CUT_ATTEMPT", "Cutting is not allowed during the exam.", "LOW")
    }
    const onPaste = (event: ClipboardEvent) => {
      event.preventDefault()
      void report("PASTE_ATTEMPT", "Pasting is not allowed during the exam.", "LOW")
    }
    const onContextMenu = (event: MouseEvent) => event.preventDefault()
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      const mod = event.ctrlKey || event.metaKey
      const devTools = key === "f12" || (mod && event.shiftKey && ["i", "j", "c"].includes(key)) || (mod && event.altKey && key === "i")
      const blocked = devTools || (mod && ["u", "s", "p"].includes(key)) || key === "printscreen"
      if (blocked) {
        event.preventDefault()
        if (key === "printscreen") void navigator.clipboard?.writeText("").catch(() => undefined)
      }
    }
    const block = (event: Event) => event.preventDefault()
    // A second monitor lets someone read answers off another screen: Chromium exposes this without a permission prompt.
    let monitorTimer: number | undefined
    let lastMonitorReport = 0
    const checkMonitors = () => {
      // Report once, then again every minute while the extra display stays connected (not every 5 s).
      if ((window.screen as Screen & { isExtended?: boolean }).isExtended && Date.now() - lastMonitorReport > 60_000) {
        lastMonitorReport = Date.now()
        void report("MULTIPLE_MONITORS", "More than one display is connected. Disconnect the extra monitor.", "HIGH", { screens: "extended" })
      }
    }
    checkMonitors()
    monitorTimer = window.setInterval(checkMonitors, 5000)
    // Desktop-client events (extra display, screen recorder, remote-access tool, virtual machine, ...).
    const unsubscribeClient = window.secureClient?.onEvent((event) => {
      if (event.type === "MULTIPLE_MONITORS") void report("MULTIPLE_MONITORS", event.message, "HIGH", event.detail)
      else void report("CLIENT_INTEGRITY", event.message, "HIGH", { event: event.type, ...event.detail })
    })
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ""
    }

    document.addEventListener("fullscreenchange", onFullscreenChange)
    document.addEventListener("visibilitychange", onVisibility)
    window.addEventListener("blur", onBlur)
    window.addEventListener("focus", onFocus)
    document.addEventListener("copy", onCopy)
    document.addEventListener("cut", onCut)
    document.addEventListener("paste", onPaste)
    document.addEventListener("contextmenu", onContextMenu)
    document.addEventListener("keydown", onKeyDown, true)
    window.addEventListener("beforeunload", onBeforeUnload)
    document.addEventListener("dragstart", block)
    document.addEventListener("drop", block)
    return () => {
      window.clearInterval(monitorTimer)
      unsubscribeClient?.()
      document.removeEventListener("dragstart", block)
      document.removeEventListener("drop", block)
      document.removeEventListener("fullscreenchange", onFullscreenChange)
      document.removeEventListener("visibilitychange", onVisibility)
      window.removeEventListener("blur", onBlur)
      window.removeEventListener("focus", onFocus)
      window.clearTimeout(blurTimer)
      document.removeEventListener("copy", onCopy)
      document.removeEventListener("cut", onCut)
      document.removeEventListener("paste", onPaste)
      document.removeEventListener("contextmenu", onContextMenu)
      document.removeEventListener("keydown", onKeyDown, true)
      window.removeEventListener("beforeunload", onBeforeUnload)
    }
  }, [active, report])

  const dismissWarning = useCallback(() => setWarning(""), [])
  const exitFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined)
  }, [])

  return { violations, maxViolations, warning, dismissWarning, isFullscreen, enterFullscreen, exitFullscreen }
}
