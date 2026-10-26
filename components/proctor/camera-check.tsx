"use client"

import { useEffect, useRef, useState } from "react"
import { createFaceLandmarker, describeError } from "@/lib/face-landmarker"
import { CHALLENGE_TEXT, ChallengeTracker, frameFromResult, pickChallenges, type ChallengeId } from "@/lib/liveness"

type Props = { onReady: () => void }
export default function CameraCheck({ onReady }: Props) {
  const [attempt, setAttempt] = useState(0)
  const [modelFailed, setModelFailed] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | undefined>(undefined)
  const [status, setStatus] = useState("Requesting camera and microphone access...")
  const [error, setError] = useState("")
  // Random challenge: the actions and their order change every attempt, so a recording or photo cannot be prepared.
  const [challenges, setChallenges] = useState<ChallengeId[]>([])
  const [stepsDone, setStepsDone] = useState(0)
  const [liveOk, setLiveOk] = useState(false)
  // Identity gate: a photo is taken after liveness and compared with the registration photo. It then stays the reference for the exam.
  const [identity, setIdentity] = useState<"idle" | "checking" | "ok" | "skipped" | "mismatch">("idle")
  const [identityNote, setIdentityNote] = useState("")

  async function verifyFace() {
    setIdentity("checking")
    setIdentityNote("Checking that you are the registered candidate...")
    try {
      const faceapi = await import("@vladmandic/face-api/dist/face-api.esm.js")
      if (!faceapi.nets.tinyFaceDetector.isLoaded) await Promise.all([faceapi.nets.tinyFaceDetector.loadFromUri("/models"), faceapi.nets.faceLandmark68Net.loadFromUri("/models"), faceapi.nets.faceRecognitionNet.loadFromUri("/models")])
      const video = videoRef.current
      if (!video) throw new Error("camera not ready")
      let detection = null
      for (let tries = 0; tries < 5 && !detection; tries += 1) {
        detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224 })).withFaceLandmarks().withFaceDescriptor()
        if (!detection) await new Promise((resolve) => setTimeout(resolve, 400))
      }
      if (!detection) { setIdentity("mismatch"); setIdentityNote("Your face could not be seen clearly. Face the camera in good light and try again"); return }
      const descriptor = Array.from(detection.descriptor)
      sessionStorage.setItem("examFaceRef", JSON.stringify(descriptor))
      const registered = await fetch("/api/auth/face-embedding").then((response) => (response.ok ? response.json() : null)).catch(() => null)
      if (Array.isArray(registered?.faceEmbedding)) {
        const distance = faceapi.euclideanDistance(registered.faceEmbedding, descriptor)
        if (distance > 0.6) { sessionStorage.removeItem("examFaceRef"); setIdentity("mismatch"); setIdentityNote("This face does not match the photo you registered with. Only the registered candidate can take the exam"); return }
      }
      setIdentity("ok")
      setIdentityNote(Array.isArray(registered?.faceEmbedding) ? "Identity confirmed. This photo is your reference for the whole exam" : "Reference photo taken. (No registration photo was on file, so it could not be compared.)")
    } catch (identityError) {
      console.warn("Identity check unavailable", identityError)
      setIdentity("skipped")
      setIdentityNote("Identity models could not be loaded. The exam will compare against your registration photo only")
    }
  }

  useEffect(() => {
    let cancelled = false
    let timer: number | undefined
    let detector: { close: () => void } | undefined
    async function run() {
      setError("")
      setIdentity("idle")
      setIdentityNote("")
      sessionStorage.removeItem("examFaceRef")
      setModelFailed(false)
      setStatus("Requesting camera and microphone access...")
      let stage: "camera" | "model" = "camera"
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: true })
        stage = "model"
        streamRef.current = stream
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play() }
        setStatus("Loading liveness model...")
        const landmarker = detector = await createFaceLandmarker({ numFaces: 1, blendshapes: true })
        let tracker = new ChallengeTracker(pickChallenges())
        setChallenges(tracker.challenges); setStepsDone(0); setLiveOk(false)
        setStatus("Do the actions below, in order. They are different every time")
        timer = window.setInterval(() => {
          if (cancelled || !videoRef.current) return
          const frame = frameFromResult(landmarker.detectForVideo(videoRef.current, performance.now()), performance.now())
          if (!frame) return
          tracker.update(frame)
          setStepsDone(tracker.completed)
          if (tracker.failed) { tracker = new ChallengeTracker(pickChallenges()); setChallenges(tracker.challenges); setStepsDone(0); setStatus("Too slow. Here are new actions: do each one within 8 seconds"); return }
          if (tracker.done) { window.clearInterval(timer); timer = undefined; setLiveOk(true); setStatus("Liveness verified."); void verifyFace() }
        }, 100)
      } catch (cameraError) {
        if (cancelled) return
        const detail = describeError(cameraError)
        if (stage === "camera") {
          setError(`${detail && !/denied/i.test(detail) ? detail : "Camera or microphone permission was denied"}. Allow both in the browser's address bar (camera icon), then press Try again`)
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

  const ready = liveOk && (identity === "ok" || identity === "skipped")
  return <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6"><div className="w-full max-w-2xl rounded-lg bg-white p-8 shadow-md"><h1 className="text-2xl font-bold">Camera and liveness check</h1><p className="mt-2 text-gray-600">Your camera and microphone stay on during the exam. Video is processed in this browser and is never uploaded.</p><video ref={videoRef} muted playsInline className="mx-auto mt-6 aspect-video w-full max-w-lg rounded-lg bg-gray-900 object-cover" />{error && <p className="mt-4 rounded-md bg-red-100 p-3 text-sm text-red-700">{error}.</p>}{error && <div className="mt-3 flex gap-2"><button onClick={() => setAttempt((n) => n + 1)} className="rounded-md border px-3 py-2 text-sm">Try again</button>{modelFailed && process.env.NODE_ENV !== "production" && <button onClick={onReady} className="rounded-md border border-amber-500 px-3 py-2 text-sm text-amber-700">Skip liveness (development only)</button>}</div>}<p className="mt-4 text-center text-sm text-gray-700">{status}</p>{identityNote && <p className={`mt-2 rounded-md p-2 text-center text-sm ${identity === "mismatch" ? "bg-red-100 text-red-700" : identity === "checking" ? "bg-blue-50 text-blue-700" : "bg-green-50 text-green-700"}`}>{identityNote}</p>}{identity === "mismatch" && <div className="mt-2 text-center"><button onClick={() => void verifyFace()} className="rounded-md border px-3 py-2 text-sm">Check my face again</button></div>}<ol className="mt-4 space-y-1 text-center text-sm">{challenges.map((id, index) => <li key={`${id}-${index}`} className={index < stepsDone ? "text-green-700" : index === stepsDone && !liveOk ? "font-semibold text-blue-700" : "text-gray-400"}>{index + 1}. {CHALLENGE_TEXT[id]} {index < stepsDone ? "(done)" : index === stepsDone && !liveOk ? "<- now" : ""}</li>)}</ol><button disabled={!ready} onClick={onReady} className={`mt-6 w-full rounded-md px-4 py-2 text-white ${ready ? "bg-green-600 hover:bg-green-700" : "cursor-not-allowed bg-gray-400"}`}>Start exam</button></div></div>
}