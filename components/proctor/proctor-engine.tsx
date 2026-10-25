"use client"

import { useEffect, useRef, useState } from "react"
import * as cocoSsd from "@tensorflow-models/coco-ssd"
import "@tensorflow/tfjs"
import { createFaceLandmarker } from "@/lib/face-landmarker"

type Props = { sessionId: string; retryKey?: number; onCameraStatus?: (ok: boolean) => void }
const allowedObjects = new Set(["cell phone", "book", "laptop", "tv", "remote"])
// Webcam names that belong to software cameras (a pre-recorded or remote person instead of the real candidate).
const VIRTUAL_CAMERA_PATTERN = /(obs|virtual|manycam|snap camera|droidcam|iriun|epoccam|xsplit|camo|splitcam|vcam|ndi|streamlabs|youcam|mmhmm|chromacam)/i
const EYE_SIDE_THRESHOLD = 0.55
const EYE_DOWN_THRESHOLD = 0.6
const faceApiModels = "/models"

export default function ProctorEngine({ sessionId, retryKey = 0, onCameraStatus }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [permissionError, setPermissionError] = useState("")
  const lastIncident = useRef<Record<string, number>>({})
  const noFaceChecks = useRef(0)
  const multipleFaceChecks = useRef(0)
  const gazeChecks = useRef(0)
  const sourceDescriptor = useRef<number[] | null>(null)
  const lastIdentityCheck = useRef(0)
  const identityStrikes = useRef(0)
  const personChecks = useRef(0)
  const previousFrame = useRef<Uint8ClampedArray | null>(null)
  const staticFrames = useRef(0)
  const darkFrames = useRef(0)
  const startedAt = useRef(0)

  async function emit(type: string, severity: string, confidence?: number, metadata?: Record<string, unknown>) {
    const now = Date.now()
    if (lastIncident.current[type] && now - lastIncident.current[type] < 10_000) return
    lastIncident.current[type] = now
    // Serious findings carry the webcam frame that triggered them, so a reviewer can see what happened.
    const snapshot = severity === "HIGH" || severity === "CRITICAL" ? captureSnapshot(videoRef.current) : undefined
    await fetch(`/api/exams/session/${sessionId}/incident`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, severity, confidence, metadata, snapshot }) }).catch(() => undefined)
  }

  useEffect(() => {
    let cancelled = false
    let faceTimer: number | undefined
    let objectTimer: number | undefined
    let frameTimer: number | undefined
    let stream: MediaStream | undefined
    let landmarker: import("@mediapipe/tasks-vision").FaceLandmarker | undefined
    let objectModel: cocoSsd.ObjectDetection | undefined
    let vad: { pause: () => void; destroy: () => void } | undefined
    async function start() {
      try {
        setPermissionError("")
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: true })
        } catch (cameraError) {
          // No camera means no proctoring: tell the exam screen (which blocks until it is back) and the invigilator.
          if (!cancelled) {
            setPermissionError(cameraError instanceof Error ? cameraError.message : "Camera or microphone is unavailable")
            onCameraStatus?.(false)
            void emit("CAMERA_LOST", "HIGH", undefined, { reason: "Camera or microphone permission denied or unavailable" })
          }
          return
        }
        if (cancelled) { stream.getTracks().forEach((track) => track.stop()); return }
        onCameraStatus?.(true)
        startedAt.current = Date.now()
        const cameraLabel = stream.getVideoTracks()[0]?.label ?? ""
        if (VIRTUAL_CAMERA_PATTERN.test(cameraLabel)) void emit("VIRTUAL_CAMERA", "CRITICAL", undefined, { reason: "Camera looks like virtual camera software", label: cameraLabel })
        stream.getVideoTracks().forEach((track) => {
          track.onended = () => {
            if (cancelled) return
            onCameraStatus?.(false)
            void emit("CAMERA_LOST", "HIGH", undefined, { reason: "Camera stopped during the exam" })
          }
        })
        if (!videoRef.current) return
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        landmarker = await createFaceLandmarker({ numFaces: 3, blendshapes: true })
        objectModel = await cocoSsd.load()
        const identityResponse = await fetch("/api/auth/face-embedding")
        if (identityResponse.ok) sourceDescriptor.current = (await identityResponse.json()).faceEmbedding
        const vadModule = await import("@ricky0123/vad-web") as typeof import("@ricky0123/vad-web")
        let speechTimes: number[] = []
        vad = await vadModule.MicVAD.new({ getStream: async () => stream!, onSpeechStart: () => { speechTimes = [...speechTimes.filter((time) => Date.now() - time < 3500), Date.now()]; if (speechTimes.length >= 2) void emit("AUDIO_ANOMALY", "MEDIUM", undefined, { reason: "Multiple speech segments in short window" }) } })
        faceTimer = window.setInterval(async () => {
          if (cancelled || !videoRef.current || !landmarker) return
          const result = landmarker.detectForVideo(videoRef.current, performance.now())
          const count = result.faceLandmarks.length
          if (count === 0) { noFaceChecks.current += 1; if (noFaceChecks.current > 5) await emit("NO_FACE", "HIGH", undefined, { consecutiveChecks: noFaceChecks.current }) } else noFaceChecks.current = 0
          if (count > 1) { multipleFaceChecks.current += 1; if (multipleFaceChecks.current > 2) await emit("MULTIPLE_FACES", "HIGH", undefined, { faceCount: count }) } else multipleFaceChecks.current = 0
          const matrix = result.facialTransformationMatrixes?.[0]?.data
          if (matrix && count === 1) {
            const yaw = Math.atan2(matrix[2], matrix[10]) * 180 / Math.PI
            const pitch = Math.atan2(-matrix[6], Math.sqrt(matrix[4] ** 2 + matrix[5] ** 2)) * 180 / Math.PI
            // Eye direction from the face model's blendshapes: catches sideways glances and reading from the lap
            // even when the head itself barely moves.
            const shapes = new Map((result.faceBlendshapes?.[0]?.categories ?? []).map((category) => [category.categoryName, category.score]))
            const shape = (name: string) => shapes.get(name) ?? 0
            const eyesSideways = Math.max((shape("eyeLookOutLeft") + shape("eyeLookInRight")) / 2, (shape("eyeLookInLeft") + shape("eyeLookOutRight")) / 2) > EYE_SIDE_THRESHOLD
            const eyesDown = (shape("eyeLookDownLeft") + shape("eyeLookDownRight")) / 2 > EYE_DOWN_THRESHOLD && pitch > 8
            const headTurned = Math.abs(yaw) > 25 || Math.abs(pitch) > 20
            if (headTurned || eyesSideways || eyesDown) {
              gazeChecks.current += 1
              if (gazeChecks.current > 8) await emit("GAZE_AWAY", "MEDIUM", Math.min(1, (Math.abs(yaw) + Math.abs(pitch)) / 90), { yaw, pitch, eyesSideways, eyesDown, headTurned, sustainedChecks: gazeChecks.current })
            } else gazeChecks.current = 0
          }
          // Identity: first check shortly after the exam starts, then every 90 s. Two mismatches in a row are needed.
          if (sourceDescriptor.current && Date.now() - lastIdentityCheck.current > (lastIdentityCheck.current === 0 ? 20_000 : 90_000) && Date.now() - startedAt.current > 20_000) {
            lastIdentityCheck.current = Date.now()
            void verifyIdentity(videoRef.current, sourceDescriptor.current, emit, identityStrikes)
          }
        }, 500)
        objectTimer = window.setInterval(async () => {
          if (!videoRef.current || !objectModel) return
          const predictions = await objectModel.detect(videoRef.current)
          // A second body in frame (even if the face detector missed it) means help in the room.
          const people = predictions.filter((prediction) => prediction.class === "person" && prediction.score > 0.6).length
          if (people > 1) { personChecks.current += 1; if (personChecks.current >= 2) await emit("MULTIPLE_FACES", "HIGH", undefined, { source: "person-detector", people }) } else personChecks.current = 0
          for (const prediction of predictions) if (allowedObjects.has(prediction.class) && prediction.score > 0.55) await emit("OBJECT_DETECTED", prediction.class === "cell phone" || prediction.class === "laptop" ? "HIGH" : "MEDIUM", prediction.score, { className: prediction.class, confidence: prediction.score })
        }, 3000)
        // Camera feed sanity: a covered lens (dark) or a frozen/pasted picture (no sensor noise at all) is not a live candidate.
        const probe = document.createElement("canvas")
        probe.width = 32
        probe.height = 24
        const probeContext = probe.getContext("2d", { willReadFrequently: true })
        frameTimer = window.setInterval(() => {
          const video = videoRef.current
          if (!video || !probeContext || video.readyState < 2) return
          probeContext.drawImage(video, 0, 0, 32, 24)
          const pixels = probeContext.getImageData(0, 0, 32, 24).data
          let brightness = 0
          for (let index = 0; index < pixels.length; index += 4) brightness += (pixels[index] + pixels[index + 1] + pixels[index + 2]) / 3
          brightness /= pixels.length / 4
          darkFrames.current = brightness < 18 ? darkFrames.current + 1 : 0
          if (darkFrames.current >= 5) void emit("CAMERA_LOST", "HIGH", undefined, { reason: "Camera image is black (lens covered?)", brightness })
          const previous = previousFrame.current
          if (previous) {
            let difference = 0
            for (let index = 0; index < pixels.length; index += 4) difference += Math.abs(pixels[index] - previous[index])
            staticFrames.current = difference === 0 ? staticFrames.current + 1 : 0
            if (staticFrames.current >= 15) void emit("VIRTUAL_CAMERA", "CRITICAL", undefined, { reason: "Camera image is perfectly static (frozen or fake feed)" })
          }
          previousFrame.current = new Uint8ClampedArray(pixels)
        }, 2000)
      } catch (error) {
        if (!cancelled) {
          const reason = error instanceof Error ? error.message : "Proctoring models could not start"
          setPermissionError(reason)
          // The camera works but the detectors failed to load (for example a blocked CDN): flag it for the invigilator.
          void emit("PROCTOR_UNAVAILABLE", "HIGH", undefined, { reason })
        }
      }
    }
    void start()
    return () => { cancelled = true; if (faceTimer) clearInterval(faceTimer); if (objectTimer) clearInterval(objectTimer); if (frameTimer) clearInterval(frameTimer); vad?.pause(); vad?.destroy(); stream?.getTracks().forEach((track) => track.stop()) }
  }, [sessionId, retryKey])

  return <>{permissionError && <div className="fixed bottom-4 left-4 z-50 rounded bg-yellow-100 p-3 text-sm text-yellow-900">Proctoring warning: {permissionError}</div>}<div className="pointer-events-none fixed bottom-3 left-3 z-40 overflow-hidden rounded-md border-2 border-white bg-black shadow-lg"><video ref={videoRef} muted playsInline className="h-24 w-32 -scale-x-100 object-cover" /><span className="absolute left-1 top-1 flex items-center gap-1 rounded bg-black/60 px-1.5 text-[10px] font-semibold text-white"><span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />LIVE</span></div></>
}

function captureSnapshot(video: HTMLVideoElement | null) {
  try {
    if (!video || video.readyState < 2 || !video.videoWidth) return undefined
    const canvas = document.createElement("canvas")
    canvas.width = 320
    canvas.height = Math.round((320 * video.videoHeight) / video.videoWidth)
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL("image/jpeg", 0.6)
  } catch {
    return undefined
  }
}

async function verifyIdentity(video: HTMLVideoElement, expected: number[], emit: (type: string, severity: string, confidence?: number, metadata?: Record<string, unknown>) => Promise<void>, strikes: { current: number }) {
  try {
    const faceapi = await import("@vladmandic/face-api")
    if (!faceapi.nets.tinyFaceDetector.isLoaded) await Promise.all([faceapi.nets.tinyFaceDetector.loadFromUri(faceApiModels), faceapi.nets.faceLandmark68Net.loadFromUri(faceApiModels), faceapi.nets.faceRecognitionNet.loadFromUri(faceApiModels)])
    const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224 })).withFaceLandmarks().withFaceDescriptor()
    if (!detection) return
    const distance = faceapi.euclideanDistance(expected, Array.from(detection.descriptor))
    if (distance > 0.6) {
      strikes.current += 1
      // One bad frame (blur, odd angle) is not enough; two consecutive checks that disagree are.
      if (strikes.current >= 2) await emit("IDENTITY_MISMATCH", "CRITICAL", distance, { distance, threshold: 0.6, consecutiveMismatches: strikes.current })
    } else strikes.current = 0
  } catch { /* Identity models are optional until registration has a descriptor. */ }
}
