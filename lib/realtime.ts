import type { Incident } from "@prisma/client"

type LiveIncident = Omit<Incident, "evidence"> & { examId: string; hasEvidence?: boolean }

export function emitIncident(incident: LiveIncident) {
  globalThis.realtimeIO?.to(`exam:${incident.examId}:admin`).emit("incident:new", incident)
}

export function emitSessionBlocked(sessionId: string) {
  globalThis.realtimeIO?.to(`session:${sessionId}`).emit("session:blocked")
}
export function emitToSession(sessionId: string, event: string, payload?: unknown) {
  globalThis.realtimeIO?.to(`session:${sessionId}`).emit(event, payload)
}

export function emitToExamAdmins(examId: string, event: string, payload?: unknown) {
  globalThis.realtimeIO?.to(`exam:${examId}:admin`).emit(event, payload)
}
