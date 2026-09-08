import type { Incident } from "@prisma/client"

export function emitIncident(incident: Incident & { examId: string }) {
  globalThis.realtimeIO?.to(`exam:${incident.examId}:admin`).emit("incident:new", incident)
}

export function emitSessionBlocked(sessionId: string) {
  globalThis.realtimeIO?.to(`session:${sessionId}`).emit("session:blocked")
}