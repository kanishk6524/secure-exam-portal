"use client"

import { useEffect, useRef, useState } from "react"
import { createFaceLandmarker, describeError } from "@/lib/face-landmarker"
import { extractFeatures, fitBaseline, saveBaseline, trainAutoencoder, type Features } from "@/lib/gaze-baseline"

type Props = { onDone: () => void }
// Where the candidate is asked to look. Together they cover the whole screen, i.e. everywhere a person reading the exam looks.
const TARGETS = [
  { label: "the centre", x: 50, y: 50 },
  { label: "the top-left corner", x: 6, y: 8 },
  { label: "the top-right corner", x: 94, y: 8 },
  { label: "the bottom-right corner", x: 94, y: 90 },
  { label: "the bottom-left corner", x: 6, y: 90 },
  { label: "the centre", x: 50, y: 50 },
]
const SETTLE_MS = 1000
const COLLECT_MS = 2000

export default function GazeCalibration({ onDone }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [attempt, setAttempt] = useState(0)
  const [step, setStep] = useState(-1)
  const [message, setMessage] = useState("Starting the camera...")
  const [error, setError] = useState("")
  const [summary, setSummary] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let stream: MediaStream | undefined
    let landmarker: { detectForVideo: (v: HTMLVideoElement, t: number) => import("@mediapipe/tasks-vision").FaceLandmarkerResult; close: () => void } | undefined
    async function run() {
      setError("")
      setSummary(null)
      setStep(-1)
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false })
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play() }
        setMessage("Loading the eye-tracking model...")
        landmarker = await createFaceLandmarker({ numFaces: 1, blendshapes: true })
        const samples: Features[] = []
        for (let index = 0; index < TARGETS.length; index += 1) {
          if (cancelled) return
          setStep(index)
          setMessage(`Keep your head still and look at the dot (${TARGETS[index].label})`)
          await new Promise((resolve) => setTimeout(resolve, SETTLE_MS))
          const until = Date.now() + COLLECT_MS
          while (Date.now() < until && !cancelled) {
            const features = videoRef.current ? extractFeatures(landmarker.detectForVideo(videoRef.current, performance.now())) : null
            if (features) samples.push(features)
            await new Promise((resolve) => setTimeout(resolve, 100))
          }
        }
        if (cancelled) return
        if (samples.length < 40) throw new Error("Your face was not visible for long enough. Sit in good light, facing the camera, and try again")
        setStep(TARGETS.length)
        setMessage("Learning your normal eye and head movement...")
        let baseline = fitBaseline(samples)
        try {
          const tf = await import("@tensorflow/tfjs")
          baseline = await trainAutoencoder(tf, baseline, samples)
        } catch (trainError) {
          console.warn("Autoencoder training failed; using the personal range only.", trainError)
        }
        saveBaseline(baseline)
        const range = baseline.lo.map((low, index) => `${low.toFixed(index < 2 ? 0 : 2)} to ${baseline.hi[index].toFixed(index < 2 ? 0 : 2)}`)
        setSummary(`Personal baseline created from ${baseline.samples} frames${baseline.aeTrained ? " and a neural network trained on them" : ""}. Normal head yaw: ${range[0]} degrees, pitch: ${range[1]} degrees.`)
        setMessage("Calibration complete")
      } catch (calibrationError) {
        if (!cancelled) setError(describeError(calibrationError) || "Calibration failed")
      } finally {
        stream?.getTracks().forEach((track) => track.stop())
        landmarker?.close()
      }
    }
    void run()
    return () => { cancelled = true; stream?.getTracks().forEach((track) => track.stop()) }
  }, [attempt])

  const target = TARGETS[step]
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900 text-white">
      {target && <div className="absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.9)]" style={{ left: `${target.x}%`, top: `${target.y}%` }} />}
      <div className="z-10 max-w-lg rounded-lg bg-slate-800/90 p-6 text-center shadow-xl">
        <h1 className="text-xl font-bold">Personal gaze calibration</h1>
        <p className="mt-2 text-sm text-slate-300">The portal learns how <em>you</em> normally look at the screen, so that alerts are based on your own movement and not one fixed rule. Video stays in this browser.</p>
        <video ref={videoRef} muted playsInline className="mx-auto mt-4 h-28 w-40 -scale-x-100 rounded-md bg-black object-cover" />
        <p className="mt-4 text-sm font-medium text-amber-300">{message}</p>
        {step >= 0 && step < TARGETS.length && <p className="mt-1 text-xs text-slate-400">Step {step + 1} of {TARGETS.length}</p>}
        {summary && <p className="mt-3 rounded bg-green-900/60 p-3 text-xs text-green-200">{summary}</p>}
        {error && <p className="mt-3 rounded bg-red-900/60 p-3 text-xs text-red-200">{error}.</p>}
        <div className="mt-4 flex justify-center gap-2">
          {error && <button onClick={() => setAttempt((n) => n + 1)} className="rounded-md border border-slate-500 px-3 py-2 text-sm">Try again</button>}
          {error && <button onClick={onDone} className="rounded-md border border-amber-500 px-3 py-2 text-sm text-amber-300">Continue with standard thresholds</button>}
          {summary && <button onClick={onDone} className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold">Start exam</button>}
        </div>
      </div>
    </div>
  )
}
