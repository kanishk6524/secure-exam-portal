import { createServer } from "node:http"
import next from "next"
import { Server as SocketIOServer } from "socket.io"
import { prisma } from "./lib/prisma"

const port = Number(process.env.PORT ?? 3000)
const dev = process.env.NODE_ENV !== "production"
const app = next({ dev })
const requestHandler = app.getRequestHandler()
const heartbeatAt = new Map<string, number>()
const connectionLost = new Set<string>()

async function recordConnectionLost(sessionId: string, io: SocketIOServer) {
  if (connectionLost.has(sessionId)) return
  const session = await prisma.examSession.findUnique({ where: { id: sessionId }, include: { exam: true } })
  if (!session || session.status !== "IN_PROGRESS") return
  const incident = await prisma.incident.create({ data: { sessionId, type: "CONNECTION_LOST", severity: "HIGH", metadata: { reason: "No heartbeat for 45 seconds" } } })
  connectionLost.add(sessionId)
  io.to(`exam:${session.examId}:admin`).emit("incident:new", { ...incident, sessionId, examId: session.examId })
}

async function main() {
  await app.prepare()
  const httpServer = createServer((request, response) => requestHandler(request, response))
  const io = new SocketIOServer(httpServer, { cors: { origin: process.env.NEXT_PUBLIC_APP_URL ?? true } })
  globalThis.realtimeIO = io

  io.on("connection", (socket) => {
    socket.on("session:join", (sessionId: string) => {
      socket.join(`session:${sessionId}`)
      heartbeatAt.set(sessionId, Date.now())
      connectionLost.delete(sessionId)
    })
    socket.on("admin:join", (examId: string) => socket.join(`exam:${examId}:admin`))
    socket.on("heartbeat", (sessionId: string) => {
      heartbeatAt.set(sessionId, Date.now())
      connectionLost.delete(sessionId)
    })
  })

  setInterval(() => {
    const cutoff = Date.now() - 45_000
    for (const [sessionId, lastHeartbeat] of heartbeatAt) {
      if (lastHeartbeat < cutoff) void recordConnectionLost(sessionId, io)
    }
  }, 15_000)

  httpServer.listen(port, () => console.log(`> Ready on http://localhost:${port}`))
}

void main()