"use client"

import { useEffect, useRef, useState } from "react"
import { createFaceLandmarker, describeError } from "@/lib/face-landmarker"

type Props = { onReady: () => void }
const LEFT_EYE = [362, 385, 387, 263, 373, 380]
const RIGHT_EYE = [33, 160, 158, 133, 153, 144]

function distance(a: { x: number; y: number }, b: { x: number; y: number }) { return Math.hypot(a.x - b.x, a.y - b.y) }
function ear(points: Array<{ x: number; y: number }>, indexes: number[]) { const [p1, p2, p3, p4, p5, p6] = indexes.map((index) => points[index]); return (distance(p2, p6) + distance(p3, p5)) / (2 * distance(p1, p4)) }

export default function CameraCheck({ onReady }: Props) {
  const [attempt, setAttempt] = useState(0)
  const [modelFailed, setModelFailed] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | undefined>(undefined)
  const [status, setStatus] = useState("Requesting camera and microphone access...")
  const [error, setError] = useState("")
  const [blink, setBlink] = useState(false)
  const [turnedLeft, setTurnedLeft] = useState(false)
  const [turnedRight, setTurnedRight] = useState(false)
  const blinkRef = useRef(false)
  const leftRef = useRef(false)
  const rightRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    let timer: number | undefined
    let detector: { close: () => void } | undefined
    async function run() {
      setError("")
      setModelFailed(false)
      setStatus("Requesting camera and microphone access...")
      let stage: "camera" | "model" = "camera"
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: true })
        stage = "model"
        streamRef.current = stream
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play() }
        setStatus("Loading liveness model...")
        const landmarker = detector = await createFaceLandmarker({ numFaces: 1, blendshapes: false })
        setStatus("Blink once, then turn your head slightly left and right")
        const started = Date.now()
        let wasClosed = false
        timer = window.setInterval(() => {
          if (cancelled || !videoRef.current) return
          const result = landmarker.detectForVideo(videoRef.current, performance.now())
          const points = result.faceLandmarks[0]
          if (!points) return
          const currentEar = (ear(points, LEFT_EYE) + ear(points, RIGHT_EYE)) / 2
          if (currentEar < 0.2) wasClosed = true
          if (wasClosed && currentEar > 0.24) { blinkRef.current = true; setBlink(true); wasClosed = false }
          const matrix = result.facialTransformationMatrixes?.[0]?.data
          if (matrix) {
            const yaw = Math.atan2(matrix[2], matrix[10]) * 180 / Math.PI
            if (yaw < -10) { leftRef.current = true; setTurnedLeft(true) }
            if (yaw > 10) { rightRef.current = true; setTurnedRight(true) }
          }
          if (Date.now() - started > 3000 && blinkRef.current && leftRef.current && rightRef.current) { window.clearInterval(timer); timer = undefined; setStatus("Liveness verified. You can start the exam.") }
        }, 500)
      } catch (cameraError) {
        if (cancelled) return
        const detail = describeError(cameraError)
        if (stage === "camera") {
          setError(detail || "Camera permission was denied")
          setStatus("Camera and microphone access are required")
        } else {
          // The camera works; the face model (downloaded from a CDN) is what failed. Say so, instead of blaming permissions.
          setModelFailed(true)
          setError(`The liveness model could not be loaded${detail ? ` (${detail})` : ""}. Run scripts/fetch-mediapipe.sh once, or check your internet connection`)
          setStatus("Liveness check unavailable")
        }
      }
    }
    void run()
    return () => { cancelled = true; if (timer) window.clearInterval(timer); detector?.close(); streamRef.current?.getTracks().forEach((track) => track.stop()) }
  }, [attempt])

  const ready = blink && turnedLeft && turnedRight
  return <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6"><div className="w-full max-w-2xl rounded-lg bg-white p-8 shadow-md"><h1 className="text-2xl font-bold">Camera and liveness check</h1><p className="mt-2 text-gray-600">Your camera and microphone stay on during the exam. Video is processed in this browser and is never uploaded.</p><video ref={videoRef} muted playsInline className="mx-auto mt-6 aspect-video w-full max-w-lg rounded-lg bg-gray-900 object-cover" />{error && <p className="mt-4 rounded-md bg-red-100 p-3 text-sm text-red-700">{error}.</p>}{error && <div className="mt-3 flex gap-2"><button onClick={() => setAttempt((n) => n + 1)} className="rounded-md border px-3 py-2 text-sm">Try again</button>{modelFailed && process.env.NODE_ENV !== "production" && <button onClick={onReady} className="rounded-md border border-amber-500 px-3 py-2 text-sm text-amber-700">Skip liveness (development only)</button>}</div>}<p className="mt-4 text-center text-sm text-gray-700">{status}</p><div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm"><span className={blink ? "text-green-700" : "text-gray-400"}>Blink {blink ? "verified" : "pending"}</span><span className={turnedLeft ? "text-green-700" : "text-gray-400"}>Left turn {turnedLeft ? "verified" : "pending"}</span><span className={turnedRight ? "text-green-700" : "text-gray-400"}>Right turn {turnedRight ? "verified" : "pending"}</span></div><button disabled={!ready} onClick={onReady} className={`mt-6 w-full rounded-md px-4 py-2 text-white ${ready ? "bg-green-600 hover:bg-green-700" : "cursor-not-allowed bg-gray-400"}`}>Start exam</button></div></div>
}