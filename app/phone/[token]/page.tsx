"use client"

import { useEffect, useRef, useState } from "react"
import { useParams } from "next/navigation"

const WATCHED_OBJECTS = new Set(["cell phone", "book", "remote"])

export default function PhoneCameraPage() {
  const { token } = useParams<{ token: string }>()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timers = useRef<number[]>([])
  const [state, setState] = useState<"idle" | "starting" | "live" | "error">("idle")
  const [message, setMessage] = useState("")
  const [sent, setSent] = useState(0)
  const [detector, setDetector] = useState("")

  useEffect(() => () => { timers.current.forEach((timer) => window.clearInterval(timer)); streamRef.current?.getTracks().forEach((track) => track.stop()) }, [])

  function snapshot(width: number, quality: number) {
    const video = videoRef.current
    if (!video || !video.videoWidth) return null
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = Math.round((width * video.videoHeight) / video.videoWidth)
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL("image/jpeg", quality)
  }
  async function send(path: "frame" | "event", body: Record<string, unknown>) {
    const response = await fetch(`/api/phone/${token}/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null)
    if (response?.status === 401) { setState("error"); setMessage("This pairing link has expired or is invalid. Scan the QR code on the exam screen again.") }
    return response?.ok ?? false
  }

  async function start() {
    setState("starting")
    setMessage("")
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Your browser blocked the camera. This page must be opened over HTTPS (use the link from the QR code)")
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
      streamRef.current = stream
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play() }
      try { await (navigator as Navigator & { wakeLock?: { request: (type: string) => Promise<unknown> } }).wakeLock?.request("screen") } catch { /* optional */ }
      setState("live")
      // 1) a small picture every 2 seconds: this is the live side view for the invigilator and the heartbeat.
      timers.current.push(window.setInterval(async () => {
        const image = snapshot(320, 0.5)
        if (image && (await send("frame", { image }))) setSent((count) => count + 1)
      }, 2000))
      // 2) the phone runs its own person / object detector and reports what it sees.
      setDetector("Loading the detector...")
      await import("@tensorflow/tfjs")
      const cocoSsd = await import("@tensorflow-models/coco-ssd")
      const model = await cocoSsd.load()
      setDetector("Detector running")
      let crowded = 0
      let absent = 0
      let absentReported = false
      timers.current.push(window.setInterval(async () => {
        const video = videoRef.current
        if (!video || video.readyState < 2) return
        const predictions = await model.detect(video)
        const people = predictions.filter((prediction) => prediction.class === "person" && prediction.score > 0.6).length
        crowded = people > 1 ? crowded + 1 : 0
        if (crowded >= 2) void send("event", { type: "MULTIPLE_FACES", confidence: 0.8, metadata: { people, reason: "More than one person in the side view" }, snapshot: snapshot(320, 0.6) })
        for (const prediction of predictions) if (WATCHED_OBJECTS.has(prediction.class) && prediction.score > 0.55) void send("event", { type: "OBJECT_DETECTED", confidence: prediction.score, metadata: { className: prediction.class, reason: "Seen in the side view" }, snapshot: snapshot(320, 0.6) })
        absent = people === 0 ? absent + 1 : 0
        if (people > 0) absentReported = false
        if (absent >= 6 && !absentReported) { absentReported = true; void send("event", { type: "SIDE_CAMERA_LOST", confidence: 0.6, metadata: { reason: "Candidate not visible in the side view" }, snapshot: snapshot(320, 0.6) }) }
      }, 3000))
    } catch (error) {
      setState("error")
      setMessage(error instanceof Error ? error.message : "Could not start the camera")
    }
  }

  return (
    <main className="min-h-screen bg-slate-900 p-4 text-white">
      <div className="mx-auto max-w-md space-y-4">
        <h1 className="text-xl font-bold">Side camera for your exam</h1>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">
          <li>Place this phone about one metre to your side, propped up and plugged in.</li>
          <li>It should show you, your hands, your desk and your screen.</li>
          <li>Do not lock the phone or switch apps until the exam ends.</li>
          <li>Pictures go only to your examiner and are shown live; they are not recorded by this page.</li>
        </ul>
        <video ref={videoRef} muted playsInline className={`w-full rounded-lg bg-black ${state === "live" || state === "starting" ? "" : "hidden"}`} />
        {state !== "live" && state !== "starting" && <button onClick={() => void start()} className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold">Start side camera</button>}
        {state === "starting" && <p className="text-sm text-amber-300">Starting the camera...</p>}
        {state === "live" && <p className="rounded bg-green-900/60 p-3 text-sm text-green-200">Connected. {sent} pictures sent. {detector}. You can return to the exam on your computer.</p>}
        {message && <p className="rounded bg-red-900/60 p-3 text-sm text-red-200">{message}</p>}
      </div>
    </main>
  )
}
