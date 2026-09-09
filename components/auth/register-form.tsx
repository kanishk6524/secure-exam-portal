"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export default function RegisterForm({ role, onBack }: { role: "STUDENT" | "ADMIN"; onBack: () => void }) {
  const [form, setForm] = useState({ email: "", password: "", fullName: "", collegeId: "" })
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [faceEmbedding, setFaceEmbedding] = useState<number[] | null>(null)
  const [cameraError, setCameraError] = useState("")
  const [captureStatus, setCaptureStatus] = useState("")
  const [capturing, setCapturing] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const captureInProgress = useRef(false)

  function stopCamera() {
    const stream = videoRef.current?.srcObject as MediaStream | null
    stream?.getTracks().forEach((track) => track.stop())
    if (videoRef.current) videoRef.current.srcObject = null
  }

  useEffect(() => () => stopCamera(), [])

  async function captureFace() {
    if (captureInProgress.current) return
    captureInProgress.current = true
    setCapturing(true)
    setCameraError("")
    setFaceEmbedding(null)
    try {
      setCaptureStatus("Opening camera...")
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      if (!videoRef.current) throw new Error("Camera preview is unavailable")
      videoRef.current.srcObject = stream
      await videoRef.current.play()
      setCaptureStatus("Loading face model (first capture may take a few seconds)...")
      const faceapi = await import("face-api.js")
      const modelUrl = "https://justadudewhohacks.github.io/face-api.js/models"
      await Promise.all([faceapi.nets.ssdMobilenetv1.loadFromUri(modelUrl), faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl), faceapi.nets.faceRecognitionNet.loadFromUri(modelUrl)])
      setCaptureStatus("Looking for one clear face...")
      let detection
      for (let attempt = 0; attempt < 8 && !detection; attempt += 1) {
        detection = await faceapi.detectSingleFace(videoRef.current).withFaceLandmarks().withFaceDescriptor()
        if (!detection) await new Promise((resolve) => window.setTimeout(resolve, 250))
      }
      if (!detection) throw new Error("No clear face detected. Improve lighting and try again.")
      setFaceEmbedding(Array.from(detection.descriptor))
      setCaptureStatus("Selfie captured successfully")
    } catch (captureError) {
      setCaptureStatus("")
      setCameraError(captureError instanceof Error ? captureError.message : "Unable to capture selfie")
    } finally {
      stopCamera()
      setCapturing(false)
      captureInProgress.current = false
    }
  }

  useEffect(() => {
    void captureFace()
  }, [])

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

  return <Card className="w-full max-w-md"><CardHeader><CardTitle>{role === "STUDENT" ? "Create student account" : "Create admin account"}</CardTitle><CardDescription>Camera permission is requested automatically. Your face descriptor is stored securely for identity checks.</CardDescription></CardHeader><CardContent>{error && <p className="mb-4 rounded-md bg-red-100 p-3 text-sm text-red-700">{error}</p>}{message && <p className="mb-4 rounded-md bg-green-100 p-3 text-sm text-green-700">{message}</p>}<form className="space-y-4" onSubmit={handleSubmit}><Input required placeholder="Full name" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} /><Input required type="email" placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />{role === "STUDENT" && <Input required placeholder="College ID" value={form.collegeId} onChange={(event) => setForm({ ...form, collegeId: event.target.value })} />}<Input required type="password" minLength={8} placeholder="Password (8+ characters, including a number)" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /><video ref={videoRef} muted playsInline autoPlay className={`${capturing ? "" : "hidden"} aspect-video w-full rounded-md bg-gray-900 object-cover`} />{captureStatus && <p className="text-sm text-gray-600">{captureStatus}</p>}{!capturing && !faceEmbedding && <Button type="button" variant="outline" className="w-full" onClick={() => void captureFace()}>Retry camera capture</Button>}{faceEmbedding && <p className="text-sm text-green-700">Selfie captured successfully.</p>}{cameraError && <p className="text-sm text-red-700">{cameraError}</p>}<Button className="w-full" disabled={loading || !faceEmbedding}>{loading ? "Creating account..." : "Create account"}</Button><Button type="button" variant="link" className="w-full" onClick={onBack}>Back to login</Button></form></CardContent></Card>
}