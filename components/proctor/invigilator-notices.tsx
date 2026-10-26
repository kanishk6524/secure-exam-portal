"use client"

import { useEffect, useState } from "react"

type Props = {
  sessionId: string
  pausedAt: string | null
  notice: string | null
  deskCheckUntil: number
  onDismiss: () => void
}

/** What the candidate sees from the invigilator: a message (with a short reply box), a pause screen, and the desk-check prompt. */
export default function InvigilatorNotices({ sessionId, pausedAt, notice, deskCheckUntil, onDismiss }: Props) {
  const [now, setNow] = useState(Date.now())
  const [reply, setReply] = useState("")
  const [replyState, setReplyState] = useState<"" | "sent" | "error">("")
  useEffect(() => {
    if (deskCheckUntil <= Date.now()) return
    const timer = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(timer)
  }, [deskCheckUntil])
  useEffect(() => { setReply(""); setReplyState("") }, [notice])

  async function sendReply() {
    if (!reply.trim()) return
    const response = await fetch(`/api/exams/session/${sessionId}/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: reply }) }).catch(() => null)
    if (response?.ok) { setReplyState("sent"); setReply("") } else setReplyState("error")
  }
  const replyBox = (
    <div className="mt-3 flex gap-2">
      <input value={reply} onChange={(e) => { setReply(e.target.value); setReplyState("") }} maxLength={300} placeholder="Reply to the invigilator (optional)" className="flex-1 rounded border px-2 py-1 text-sm text-gray-900" />
      <button onClick={() => void sendReply()} className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700">Send</button>
      {replyState === "sent" && <span className="self-center text-xs text-green-700">Sent</span>}
      {replyState === "error" && <span className="self-center text-xs text-red-700">Could not send</span>}
    </div>
  )
  const deskSecondsLeft = Math.max(0, Math.ceil((deskCheckUntil - now) / 1000))

  return (
    <>
      {pausedAt && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-950/95 p-6">
          <div className="max-w-md rounded-lg bg-white p-8 text-center shadow-xl">
            <h2 className="text-xl font-bold text-gray-900">Your exam is paused</h2>
            <p className="mt-2 text-gray-600">The invigilator has paused your exam. Your timer is stopped and no time is lost. Please stay where you are; the exam continues when the invigilator resumes it.</p>
            {notice && <p className="mt-3 rounded bg-yellow-50 p-2 text-sm text-yellow-900">Invigilator: {notice}</p>}
            {replyBox}
          </div>
        </div>
      )}
      {!pausedAt && notice && (
        <div className="fixed left-1/2 top-3 z-[65] w-full max-w-xl -translate-x-1/2 rounded-lg border-2 border-yellow-500 bg-yellow-50 p-4 shadow-xl">
          <p className="text-sm font-semibold text-yellow-900">Message from the invigilator</p>
          <p className="mt-1 text-gray-900">{notice}</p>
          {replyBox}
          <button onClick={onDismiss} className="mt-3 rounded border border-yellow-700 px-3 py-1 text-sm text-yellow-900 hover:bg-yellow-100">I understand</button>
        </div>
      )}
      {deskSecondsLeft > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-[66] bg-blue-700 p-4 text-center text-white shadow-2xl">
          <p className="font-semibold">Desk check requested ({deskSecondsLeft}s)</p>
          <p className="text-sm">Slowly show your desk, keyboard, hands and the area around you to the camera. Three pictures are being saved for the invigilator.</p>
        </div>
      )}
    </>
  )
}
