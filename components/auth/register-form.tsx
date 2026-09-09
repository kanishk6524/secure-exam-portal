"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

const MODEL_URL = "/models"

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), ms)
    promise.then(
      (value) => {
        window.clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        window.clearTimeout(timer)
        reject(error)
      },
    )
  })
}

function describeCameraError(err: unknown): string {
  const name = err instanceof DOMException ? err.name : ""
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "Camera permission was denied. Allow camera access in your browser's site settings, then click Enable camera again."
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "No camera was found on this device. You can skip the photo and add it later."
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "The camera is already in use by another app or tab. Close it and try again, or skip the photo."
  }
  return err instanceof Error ? err.message : "Unable to access camera"
}

export default function RegisterForm({ role, onBack }: { role: "STUDENT" | "ADMIN"; onBack: () => void }) {
  const [form, setForm] = useState({ email: "", password: "", fullName: "", collegeId: "" })
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [faceEmbedding, setFaceEmbedding] = useState<number[] | null>(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [modelStatus, setModelStatus] = useState<"loading" | "ready" | "failed">("loading")
  const [cameraError, setCameraError] = useState("")
  const [captureStatus, setCaptureStatus] = useState("")
  const [capturing, setCapturing] = useState(false)
  const [openingCamera, setOpeningCamera] = useState(false)
  const [photoSkipped, setPhotoSkipped] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const faceapiRef = useRef<typeof import("face-api.js") | null>(null)

  function stopCamera() {
    const stream = videoRef.current?.srcObject as MediaStream | null
    stream?.getTracks().forEach((track) => track.stop())
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraOpen(false)
  }

  async function openCamera() {
    setCameraError("")
    setOpeningCamera(true)
    stopCamera()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } })
      if (!videoRef.current) {
        stream.getTracks().forEach((track) => track.stop())
        throw new Error("Camera preview is unavailable")
      }
      videoRef.current.srcObject = stream
      await videoRef.current.play()
      setCameraOpen(true)
    } catch (openError) {
      setCameraError(describeCameraError(openError))
    } finally {
      setOpeningCamera(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const faceapi = await import("face-api.js")
        // face-api.js bundles an old tfjs-core (1.7.0) whose WebGL backend
        // frequently hangs mid-inference on modern browsers/GPUs. The CPU
        // backend is slower per call but reliably completes for a single
        // 224px frame, and this is what was causing capture to time out.
        await faceapi.tf.setBackend("cpu")
        await faceapi.tf.ready()
        await withTimeout(
          Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          ]),
          15000,
          "Face recognition model failed to load in time.",
        )
        faceapiRef.current = faceapi
        if (!cancelled) setModelStatus("ready")
      } catch (modelError) {
        console.error("Face model load error", modelError)
        if (!cancelled) setModelStatus("failed")
      }
    })()
    return () => {
      cancelled = true
      stopCamera()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleCapture() {
    const faceapi = faceapiRef.current
    if (!faceapi || !videoRef.current) return
    setCapturing(true)
    setCameraError("")
    try {
      const runDetection = async () =>
        faceapi
          .detectSingleFace(videoRef.current!, new faceapi.TinyFaceDetectorOptions({ inputSize: 224 }))
          .withFaceLandmarks()
          .withFaceDescriptor()
      const detection = await withTimeout(
        runDetection(),
        10000,
        "Face capture timed out on this device/browser. You can retry, or skip the photo below and add it later.",
      )
      if (!detection) throw new Error("No clear face detected. Center your face in the frame and try again.")
      setFaceEmbedding(Array.from(detection.descriptor))
      setCaptureStatus("Selfie captured successfully")
      stopCamera()
    } catch (captureError) {
      console.error("Face capture error", captureError)
      setCameraError(captureError instanceof Error ? captureError.message : "Unable to capture selfie")
    } finally {
      setCapturing(false)
    }
  }

  function handleRetake() {
    setFaceEmbedding(null)
    setCaptureStatus("")
    setCameraError("")
    void openCamera()
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setMessage("")
    setError("")
    const response = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, role, faceEmbedding }) })
    const data = await response.json()
    setLoading(false)
    if (!response.ok) setError(data.error ?? "Registration failed")
    else setMessage(data.message)
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{role === "STUDENT" ? "Create student account" : "Create admin account"}</CardTitle>
        <CardDescription>Click "Enable camera" to capture a verification selfie, or skip it for now.</CardDescription>
      </CardHeader>
      <CardContent>
        {error && <p className="mb-4 rounded-md bg-red-100 p-3 text-sm text-red-700">{error}</p>}
        {message && <p className="mb-4 rounded-md bg-green-100 p-3 text-sm text-green-700">{message}</p>}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input required placeholder="Full name" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} />
          <Input required type="email" placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          {role === "STUDENT" && <Input required placeholder="College code (ask your admin, e.g. DEMO-001)" value={form.collegeId} onChange={(event) => setForm({ ...form, collegeId: event.target.value })} />}
          <Input required type="password" minLength={8} placeholder="Password (8+ characters, including a number)" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />

          <video ref={videoRef} muted playsInline autoPlay className={`${cameraOpen ? "" : "hidden"} aspect-video w-full rounded-md bg-gray-900 object-cover`} />

          {modelStatus === "loading" && <p className="text-sm text-gray-600">Loading face recognition model in the background...</p>}
          {modelStatus === "failed" && (
            <p className="text-sm text-amber-700">Face recognition model failed to load. You can still skip the photo and register.</p>
          )}
          {captureStatus && <p className="text-sm text-gray-600">{captureStatus}</p>}
          {cameraError && <p className="text-sm text-red-700">{cameraError}</p>}

          {cameraOpen && (
            <Button type="button" variant="outline" className="w-full" disabled={modelStatus !== "ready" || capturing} onClick={() => void handleCapture()}>
              {capturing ? "Capturing..." : modelStatus === "ready" ? "Capture photo" : "Loading face model..."}
            </Button>
          )}

          {!cameraOpen && !faceEmbedding && !photoSkipped && (
            <Button type="button" variant="outline" className="w-full" disabled={openingCamera} onClick={() => void openCamera()}>
              {openingCamera ? "Requesting camera access..." : "Enable camera"}
            </Button>
          )}

          {faceEmbedding && (
            <div className="space-y-2">
              <p className="text-sm text-green-700">Selfie captured successfully.</p>
              <Button type="button" variant="outline" className="w-full" onClick={handleRetake}>
                Retake photo
              </Button>
            </div>
          )}

          {!faceEmbedding && !photoSkipped && (
            <Button
              type="button"
              variant="link"
              className="w-full text-sm text-gray-500"
              onClick={() => {
                stopCamera()
                setCameraError("")
                setPhotoSkipped(true)
              }}
            >
              Skip photo for now
            </Button>
          )}

          {photoSkipped && <p className="text-sm text-gray-600">Photo skipped. You can add it later from your profile.</p>}

          <Button className="w-full" disabled={loading || (!faceEmbedding && !photoSkipped)}>
            {loading ? "Creating account..." : "Create account"}
          </Button>
          <Button type="button" variant="link" className="w-full" onClick={onBack}>
            Back to login
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
