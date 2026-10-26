"use client"

import { useEffect, useState } from "react"

type Props = { examId: string; onStatus?: (state: { connected: boolean; required: boolean }) => void }

/** Shown before the exam starts: a QR code that pairs the candidate's phone as a second, side-view camera. */
export default function PhonePairing({ examId, onStatus }: Props) {
  const [url, setUrl] = useState("")
  const [qr, setQr] = useState("")
  const [required, setRequired] = useState(false)
  const [secureEnough, setSecureEnough] = useState(true)
  const [connected, setConnected] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const response = await fetch(`/api/exams/${examId}/phone/token`, { method: "POST" })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error ?? "Unable to create the phone link")
        if (cancelled) return
        setUrl(data.url)
        setRequired(Boolean(data.required))
        setSecureEnough(Boolean(data.secureEnough))
        const QRCode = await import("qrcode")
        setQr(await QRCode.toDataURL(data.url, { width: 200, margin: 1 }))
      } catch (qrError) {
        if (!cancelled) setError(qrError instanceof Error ? qrError.message : "Unable to create the QR code")
      }
    })()
    return () => { cancelled = true }
  }, [examId])

  useEffect(() => {
    let cancelled = false
    const poll = async () => {
      const status = await fetch(`/api/exams/${examId}/phone/status`).then((response) => response.json()).catch(() => null)
      if (cancelled || !status) return
      setConnected(Boolean(status.connected))
      onStatus?.({ connected: Boolean(status.connected), required })
      if (status.connected) {
        const frame = await fetch(`/api/exams/${examId}/phone/frame`).then((response) => response.json()).catch(() => null)
        if (!cancelled) setPreview(frame?.image ?? null)
      }
    }
    void poll()
    const timer = window.setInterval(poll, 3000)
    return () => { cancelled = true; window.clearInterval(timer) }
  }, [examId, required, onStatus])

  return (
    <div className="mt-5 rounded-lg border bg-slate-50 p-4">
      <h2 className="text-sm font-semibold text-gray-800">Side camera (your phone) {required ? <span className="text-red-600">(required)</span> : <span className="text-gray-500">(recommended)</span>}</h2>
      <p className="mt-1 text-xs text-gray-600">Scan with your phone and place it to your side. The examiner sees your desk and hands, and the phone alerts if another person or a book or phone appears.</p>
      <div className="mt-3 flex items-start gap-4">
        {qr ? <img src={qr} alt="QR code to connect your phone as a side camera" className="h-36 w-36 rounded border bg-white" /> : <div className="flex h-36 w-36 items-center justify-center rounded border text-xs text-gray-400">{error ? "No QR" : "Preparing..."}</div>}
        <div className="min-w-0 flex-1 text-xs text-gray-600">
          {connected ? <p className="rounded bg-green-100 p-2 font-semibold text-green-800">Phone connected. Check the picture below shows your desk.</p> : <p className="rounded bg-amber-50 p-2 text-amber-800">Waiting for your phone...</p>}
          {preview && <img src={preview} alt="Side camera preview" className="mt-2 w-full max-w-[220px] rounded border" />}
          {!secureEnough && <p className="mt-2 rounded bg-red-50 p-2 text-red-700">Phones only allow the camera on HTTPS pages. Open the portal through an HTTPS tunnel and set PUBLIC_BASE_URL in .env (see the README).</p>}
          {url && <p className="mt-2 break-all text-[10px] text-gray-400">{url.slice(0, 60)}...</p>}
          {error && <p className="mt-2 text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  )
}
