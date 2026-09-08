"use client"

import { useEffect, useState } from "react"
import { io, type Socket } from "socket.io-client"

const socketUrl = typeof window === "undefined" ? undefined : window.location.origin

export function useAdminIncidentFeed(examId: string | undefined) {
  const [incidents, setIncidents] = useState<Array<Record<string, unknown>>>([])
  const [connected, setConnected] = useState(false)
  useEffect(() => {
    if (!examId) return
    const socket = io(socketUrl)
    const handleIncident = (incident: Record<string, unknown>) => setIncidents((previous) => [incident, ...previous])
    socket.on("connect", () => { setConnected(true); socket.emit("admin:join", examId) })
    socket.on("disconnect", () => setConnected(false))
    socket.on("incident:new", handleIncident)
    return () => { socket.off("incident:new", handleIncident); socket.disconnect() }
  }, [examId])
  return { incidents, connected }
}

export function useStudentRealtime(sessionId: string | undefined, onBlocked: () => void) {
  useEffect(() => {
    if (!sessionId) return
    const socket: Socket = io(socketUrl)
    socket.on("connect", () => socket.emit("session:join", sessionId))
    socket.on("session:blocked", onBlocked)
    const heartbeat = setInterval(() => socket.emit("heartbeat", sessionId), 15_000)
    return () => { clearInterval(heartbeat); socket.off("session:blocked", onBlocked); socket.disconnect() }
  }, [sessionId, onBlocked])
}