"use client"

import { useEffect, useRef, useState } from "react"
import { io, type Socket } from "socket.io-client"

const socketUrl = typeof window === "undefined" ? undefined : window.location.origin

export function useAdminIncidentFeed(examId: string | undefined) {
  const [incidents, setIncidents] = useState<Array<Record<string, unknown>>>([])
  const [replies, setReplies] = useState<Array<{ sessionId: string; text: string; at: string }>>([])
  const [connected, setConnected] = useState(false)
  useEffect(() => {
    if (!examId) return
    const socket = io(socketUrl, { reconnectionAttempts: 5 })
    const handleIncident = (incident: Record<string, unknown>) => setIncidents((previous) => [incident, ...previous])
    socket.on("connect", () => { setConnected(true); socket.emit("admin:join", examId) })
    socket.on("disconnect", () => setConnected(false))
    const handleReply = (reply: { sessionId: string; text: string; at: string }) => setReplies((previous) => [reply, ...previous])
    socket.on("incident:new", handleIncident)
    socket.on("chat:message", handleReply)
    return () => { socket.off("incident:new", handleIncident); socket.off("chat:message", handleReply); socket.disconnect() }
  }, [examId])
  return { incidents, replies, connected }
}

export type StudentHandlers = {
  onMessage?: (message: { text: string; seq?: number | null }) => void
  onPaused?: (info: { pausedAt: string }) => void
  onResumed?: (info: { serverEndsAt: string }) => void
  onDeskCheck?: (info?: { seq?: number | null }) => void
}

export function useStudentRealtime(sessionId: string | undefined, onBlocked: () => void, handlers?: StudentHandlers) {
  const handlersRef = useRef<StudentHandlers | undefined>(handlers)
  handlersRef.current = handlers
  useEffect(() => {
    if (!sessionId) return
    const socket: Socket = io(socketUrl, { reconnectionAttempts: 5 })
    socket.on("connect", () => socket.emit("session:join", sessionId))
    socket.on("session:blocked", onBlocked)
    const message = (m: { text: string; seq?: number | null }) => handlersRef.current?.onMessage?.(m)
    const paused = (p: { pausedAt: string }) => handlersRef.current?.onPaused?.(p)
    const resumed = (r: { serverEndsAt: string }) => handlersRef.current?.onResumed?.(r)
    const deskCheck = (info?: { seq?: number | null }) => handlersRef.current?.onDeskCheck?.(info)
    socket.on("invigilator:message", message)
    socket.on("session:paused", paused)
    socket.on("session:resumed", resumed)
    socket.on("invigilator:deskcheck", deskCheck)
    const heartbeat = setInterval(() => socket.emit("heartbeat", sessionId), 15_000)
    return () => { clearInterval(heartbeat); socket.off("session:blocked", onBlocked); socket.disconnect() }
  }, [sessionId, onBlocked])
}
