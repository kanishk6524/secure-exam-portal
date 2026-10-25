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
  const [form, setForm] = useState({ email: "", password: "", fullName: "", collegeId: "", adminCode: "" })
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [faceEmbedding, setFaceEmbedding] = useState<number[] | null>(null)
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [modelStatus, setModelStatus] = useState<"loading" | "ready" | "failed">("loading")
  const [cameraError, setCameraError] = useState("")
  const [captureStatus, setCaptureStatus] = useState("")
  const [capturing, setCapturing] = useState(false)
  const [openingCamera, setOpeningCamera] = useState(false)
  const [photoSkipped, setPhotoSkipped] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const faceapiRef = useRef<typeof import("@vladmandic/face-api/dist/face-api.esm.js") | null>(null)

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
        const faceapi = await import("@vladmandic/face-api/dist/face-api.esm.js")
        // Import the browser (ESM) build explicitly: the package's default entry is its Node build, which needs
        // @tensorflow/tfjs-node and breaks the production build. @vladmandic/face-api is built on the same TensorFlow.js 4.x as the rest of the app. The old
        // face-api.js bundled tfjs-core 1.7, which clashes with it ("forwardFunc is not a function") and made
        // face capture hang. Prefer WebGL and fall back to CPU if the browser cannot provide it.
        const tf = faceapi.tf as unknown as { setBackend: (name: string) => Promise<boolean>; ready: () => Promise<void> }
        if (!(await tf.setBackend("webgl").catch(() => false))) await tf.setBackend("cpu")
        await tf.ready()
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
    const video = videoRef.current
    if (!video) return
    setCapturing(true)
    setCameraError("")
    setCaptureStatus("")
    try {
      if (!video.videoWidth || !video.videoHeight) {
        throw new Error("Camera is still starting. Wait a moment, then try again.")
      }

      // Save a real, reasonably small image as well as the descriptor used for
      // identity verification. Previously this flow only saved the descriptor,
      // so a successful capture did not result in a profile photo.
      const canvas = document.createElement("canvas")
      const scale = Math.min(1, 640 / video.videoWidth)
      canvas.width = Math.round(video.videoWidth * scale)
      canvas.height = Math.round(video.videoHeight * scale)
      const context = canvas.getContext("2d")
      if (!context) throw new Error("Unable to create the photo preview.")
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      const photo = canvas.toDataURL("image/jpeg", 0.82)
      setProfilePhotoUrl(photo)
      setPhotoSkipped(false)

      // A profile photo must not depend on the optional face-recognition model.
      // This model can be slow or unavailable on some browsers, while canvas
      // capture works everywhere a camera preview is available.
      if (!faceapi) {
        setCaptureStatus("Photo captured and ready to save. Face verification is unavailable on this browser.")
        stopCamera()
        return
      }

      const runDetection = async () =>
        faceapi
          .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224 }))
          .withFaceLandmarks()
          .withFaceDescriptor()
      try {
        const detection = await withTimeout(
          runDetection(),
          10000,
          "Face verification timed out.",
        )
        if (detection) {
          setFaceEmbedding(Array.from(detection.descriptor))
          setCaptureStatus("Photo captured and face verification saved. Create your account to finish saving it.")
        } else {
          setCaptureStatus("Photo captured and ready to save. No clear face was found for face verification.")
        }
      } catch (verificationError) {
        console.error("Face verification error", verificationError)
        setCaptureStatus("Photo captured and ready to save. Face verification could not be completed.")
      }
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
    setProfilePhotoUrl(null)
    setCaptureStatus("")
    setCameraError("")
    void openCamera()
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setMessage("")
    setError("")
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, role, faceEmbedding, profilePhotoUrl }),
      })
      const data = await response.json()
      if (!response.ok) setError(data.error ?? "Registration failed")
      else setMessage(data.message)
    } catch {
      setError("Registration could not be completed. Check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{role === "STUDENT" ? "Create student account" : "Create admin account"}</CardTitle>
        <CardDescription>Click "Enable camera" to capture a verification selfie, or skip it for now.</CardDescription>
      </CardHeader>
      <CardContent>
        {error && <p role="alert" className="mb-4 rounded-md bg-red-100 p-3 text-sm text-red-700">{error}</p>}
        {message && <p role="alert" className="mb-4 rounded-md bg-green-100 p-3 text-sm text-green-700">{message}</p>}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input required placeholder="Full name" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} />
          <Input required type="email" placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          {role === "STUDENT" && <Input required placeholder="College code (ask your admin, e.g. DEMO-001)" value={form.collegeId} onChange={(event) => setForm({ ...form, collegeId: event.target.value })} />}
          {role === "ADMIN" && <Input required type="password" placeholder="Admin registration code" value={form.adminCode} onChange={(event) => setForm({ ...form, adminCode: event.target.value })} />}
          <Input required type="password" minLength={8} placeholder="Password (8+ characters, including a number)" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />

          <video ref={videoRef} muted playsInline autoPlay className={`${cameraOpen ? "" : "hidden"} aspect-video w-full rounded-md bg-gray-900 object-cover`} />

          {modelStatus === "loading" && <p className="text-sm text-gray-600">Loading face recognition model in the background...</p>}
          {modelStatus === "failed" && (
            <p className="text-sm text-amber-700">Face recognition is unavailable, but you can still capture and save a profile photo.</p>
          )}
          {captureStatus && <p role="alert" className="rounded-md bg-green-50 p-3 text-sm text-green-800">{captureStatus}</p>}
          {cameraError && <p role="alert" className="rounded-md bg-red-100 p-3 text-sm text-red-700">{cameraError}</p>}

          {cameraOpen && (
            <Button type="button" variant="outline" className="w-full" disabled={capturing} onClick={() => void handleCapture()}>
              {capturing ? "Capturing..." : "Capture photo"}
            </Button>
          )}

          {!cameraOpen && !profilePhotoUrl && !photoSkipped && (
            <Button type="button" variant="outline" className="w-full" disabled={openingCamera} onClick={() => void openCamera()}>
              {openingCamera ? "Requesting camera access..." : "Enable camera"}
            </Button>
          )}

          {profilePhotoUrl && (
            <div className="space-y-2">
              {profilePhotoUrl && <img src={profilePhotoUrl} alt="Captured verification selfie" className="aspect-video w-full rounded-md object-cover" />}
              <p className="text-sm text-green-700">Photo captured. It will be saved when you create the account.</p>
              <Button type="button" variant="outline" className="w-full" onClick={handleRetake}>
                Retake photo
              </Button>
            </div>
          )}

          {!profilePhotoUrl && !photoSkipped && (
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

          <Button className="w-full" disabled={loading || (!profilePhotoUrl && !photoSkipped)}>
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
