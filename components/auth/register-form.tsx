"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

const MODEL_URL = "https://justadudewhohacks.github.io/face-api.js/models"

export default function RegisterForm({ role, onBack }: { role: "STUDENT" | "ADMIN"; onBack: () => void }) {
  const [form, setForm] = useState({ email: "", password: "", fullName: "", collegeId: "" })
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [faceEmbedding, setFaceEmbedding] = useState<number[] | null>(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [modelsReady, setModelsReady] = useState(false)
  const [cameraError, setCameraError] = useState("")
  const [captureStatus, setCaptureStatus] = useState("")
  const [capturing, setCapturing] = useState(false)
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
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      if (!videoRef.current) throw new Error("Camera preview is unavailable")
      videoRef.current.srcObject = stream
      await videoRef.current.play()
      setCameraOpen(true)
    } catch (openError) {
      setCameraError(openError instanceof Error ? openError.message : "Unable to access camera")
    }
  }

  useEffect(() => {
    let cancelled = false
    void openCamera()
    ;(async () => {
      try {
        setCaptureStatus("Loading face model...")
        const faceapi = await import("face-api.js")
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ])
        faceapiRef.current = faceapi
        setCaptureStatus("Warming up camera...")
        // The recognition model's first inference is slow (browser ML runtime
        // compiles kernels on first use). Run one throwaway pass now so the
        // real click-to-capture call later is fast.
        for (let attempt = 0; attempt < 15 && !cancelled; attempt += 1) {
          if (videoRef.current && videoRef.current.readyState >= 2) {
            try {
              const warmedUp = await faceapi
                .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 224 }))
                .withFaceLandmarks()
                .withFaceDescriptor()
              if (warmedUp) break
            } catch {
              // ignore warmup failures, real capture will surface any real error
            }
          }
          await new Promise((resolve) => window.setTimeout(resolve, 200))
        }
        if (!cancelled) {
          setModelsReady(true)
          setCaptureStatus("")
        }
      } catch (modelError) {
        if (!cancelled) {
          setCameraError(modelError instanceof Error ? modelError.message : "Unable to load face model")
          setCaptureStatus("")
        }
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
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 224 }))
        .withFaceLandmarks()
        .withFaceDescriptor()
      if (!detection) throw new Error("No clear face detected. Center your face in the frame and try again.")
      setFaceEmbedding(Array.from(detection.descriptor))
      setCaptureStatus("Selfie captured successfully")
      stopCamera()
    } catch (captureError) {
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
        <CardDescription>Camera permission is requested automatically. Center your face and click Capture when ready.</CardDescription>
      </CardHeader>
      <CardContent>
        {error && <p className="mb-4 rounded-md bg-red-100 p-3 text-sm text-red-700">{error}</p>}
        {message && <p className="mb-4 rounded-md bg-green-100 p-3 text-sm text-green-700">{message}</p>}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input required placeholder="Full name" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} />
          <Input required type="email" placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          {role === "STUDENT" && <Input required placeholder="College ID" value={form.collegeId} onChange={(event) => setForm({ ...form, collegeId: event.target.value })} />}
          <Input required type="password" minLength={8} placeholder="Password (8+ characters, including a number)" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />

          <video ref={videoRef} muted playsInline autoPlay className={`${cameraOpen ? "" : "hidden"} aspect-video w-full rounded-md bg-gray-900 object-cover`} />

          {captureStatus && <p className="text-sm text-gray-600">{captureStatus}</p>}
          {cameraError && <p className="text-sm text-red-700">{cameraError}</p>}

          {cameraOpen && (
            <Button type="button" variant="outline" className="w-full" disabled={!modelsReady || capturing} onClick={() => void handleCapture()}>
              {capturing ? "Capturing..." : modelsReady ? "Capture photo" : "Loading face model..."}
            </Button>
          )}

          {!cameraOpen && !faceEmbedding && (
            <Button type="button" variant="outline" className="w-full" onClick={() => void openCamera()}>
              Open camera
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

          <Button className="w-full" disabled={loading || !faceEmbedding}>
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
