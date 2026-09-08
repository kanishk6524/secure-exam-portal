import type { Server as SocketIOServer } from "socket.io"

declare global {
  var realtimeIO: SocketIOServer | undefined
}

export {}