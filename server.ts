import { createServer } from "node:http"
import next from "next"
import { Server as SocketIOServer } from "socket.io"
import { getToken } from "next-auth/jwt"
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
  if (!session || session.status !== "IN_PROGRESS") {
    // Finished sessions no longer need heartbeat tracking.
    heartbeatAt.delete(sessionId)
    connectionLost.delete(sessionId)
    return
  }
  const incident = await prisma.incident.create({ data: { sessionId, type: "CONNECTION_LOST", severity: "HIGH", metadata: { reason: "No heartbeat for 45 seconds" } } })
  connectionLost.add(sessionId)
  io.to(`exam:${session.examId}:admin`).emit("incident:new", { ...incident, sessionId, examId: session.examId })
}

async function main() {
  await app.prepare()
  const httpServer = createServer((request, response) => requestHandler(request, response))
  const io = new SocketIOServer(httpServer, { cors: { origin: process.env.NEXT_PUBLIC_APP_URL ?? true } })
  globalThis.realtimeIO = io

  // Only signed-in users may connect; what they can join is checked per event below.
  io.use(async (socket, next) => {
    try {
      const token = await getToken({
        req: { headers: new Headers({ cookie: socket.request.headers.cookie ?? "" }) } as never,
        secret: process.env.AUTH_SECRET,
        secureCookie: (process.env.NEXT_PUBLIC_APP_URL ?? "").startsWith("https://"),
      })
      if (!token?.sub) return next(new Error("unauthorized"))
      socket.data.userId = token.sub
      socket.data.role = token.role
      socket.data.sessions = new Set<string>()
      next()
    } catch {
      next(new Error("unauthorized"))
    }
  })

  io.on("connection", (socket) => {
    socket.on("session:join", async (sessionId: string) => {
      // A student may only join their own exam session.
      const owned = await prisma.examSession.findFirst({ where: { id: String(sessionId), userId: socket.data.userId }, select: { id: true } })
      if (!owned) return
      socket.data.sessions.add(owned.id)
      socket.join(`session:${owned.id}`)
      heartbeatAt.set(owned.id, Date.now())
      connectionLost.delete(owned.id)
    })
    socket.on("admin:join", async (examId: string) => {
      const role = socket.data.role
      if (role !== "ADMIN" && role !== "COLLEGE_ADMIN") return
      if (role === "COLLEGE_ADMIN") {
        const [admin, exam] = await Promise.all([
          prisma.user.findUnique({ where: { id: socket.data.userId }, select: { collegeId: true } }),
          prisma.exam.findUnique({ where: { id: String(examId) }, select: { collegeId: true } }),
        ])
        if (!admin?.collegeId || admin.collegeId !== exam?.collegeId) return
      }
      socket.join(`exam:${examId}:admin`)
    })
    socket.on("heartbeat", (sessionId: string) => {
      if (!socket.data.sessions.has(sessionId)) return
      heartbeatAt.set(sessionId, Date.now())
      connectionLost.delete(sessionId)
    })
  })

  setInterval(() => {
    const cutoff = Date.now() - 45_000
    const forgetBefore = Date.now() - 6 * 60 * 60 * 1000
    for (const [sessionId, lastHeartbeat] of heartbeatAt) {
      if (lastHeartbeat < forgetBefore) {
        heartbeatAt.delete(sessionId)
        connectionLost.delete(sessionId)
      } else if (lastHeartbeat < cutoff) void recordConnectionLost(sessionId, io)
    }
  }, 15_000)

  httpServer.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE") {
      console.error(`\nPort ${port} is already used by another program (for example Grafana or an older dev server).\nStart the portal on a free port instead:  PORT=3001 npm run dev   (then open http://localhost:3001)\n`)
      process.exit(1)
    }
    throw error
  })
  httpServer.listen(port, () => console.log(`> Ready on http://localhost:${port}`))
}

void main()