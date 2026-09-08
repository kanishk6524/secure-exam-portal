"use client"

import { useEffect, useRef, useState } from "react"
import * as cocoSsd from "@tensorflow-models/coco-ssd"
import "@tensorflow/tfjs"

type Props = { sessionId: string }
const allowedObjects = new Set(["cell phone", "book", "laptop", "tv", "remote"])
const faceApiModels = "https://justadudewhohacks.github.io/face-api.js/models"

export default function ProctorEngine({ sessionId }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [permissionError, setPermissionError] = useState("")
  const lastIncident = useRef<Record<string, number>>({})
  const noFaceChecks = useRef(0)
  const multipleFaceChecks = useRef(0)
  const gazeChecks = useRef(0)
  const sourceDescriptor = useRef<number[] | null>(null)
  const lastIdentityCheck = useRef(0)

  async function emit(type: string, severity: string, confidence?: number, metadata?: Record<string, unknown>) {
    const now = Date.now()
    if (lastIncident.current[type] && now - lastIncident.current[type] < 10_000) return
    lastIncident.current[type] = now
    await fetch(`/api/exams/session/${sessionId}/incident`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, severity, confidence, metadata }) }).catch(() => undefined)
  }

  useEffect(() => {
    let cancelled = false
    let faceTimer: number | undefined
    let objectTimer: number | undefined
    let stream: MediaStream | undefined
    let landmarker: import("@mediapipe/tasks-vision").FaceLandmarker | undefined
    let objectModel: cocoSsd.ObjectDetection | undefined
    let vad: { pause: () => void; destroy: () => void } | undefined
    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: true })
        if (!videoRef.current) return
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision")
        const fileset = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm")
        landmarker = await FaceLandmarker.createFromOptions(fileset, { baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task", delegate: "GPU" }, runningMode: "VIDEO", numFaces: 3, outputFaceBlendshapes: true, outputFacialTransformationMatrixes: true })
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
          if (matrix) {
            const yaw = Math.atan2(matrix[2], matrix[10]) * 180 / Math.PI
            const pitch = Math.atan2(-matrix[6], Math.sqrt(matrix[4] ** 2 + matrix[5] ** 2)) * 180 / Math.PI
            if (Math.abs(yaw) > 25 || Math.abs(pitch) > 20) { gazeChecks.current += 1; if (gazeChecks.current > 8) await emit("GAZE_AWAY", "MEDIUM", Math.min(1, (Math.abs(yaw) + Math.abs(pitch)) / 90), { yaw, pitch, sustainedChecks: gazeChecks.current }) } else gazeChecks.current = 0
          }
          if (sourceDescriptor.current && Date.now() - lastIdentityCheck.current > 180_000) {
            lastIdentityCheck.current = Date.now()
            void verifyIdentity(videoRef.current, sourceDescriptor.current, emit)
          }
        }, 500)
        objectTimer = window.setInterval(async () => {
          if (!videoRef.current || !objectModel) return
          const predictions = await objectModel.detect(videoRef.current)
          for (const prediction of predictions) if (allowedObjects.has(prediction.class) && prediction.score > 0.55) await emit("OBJECT_DETECTED", prediction.class === "cell phone" || prediction.class === "laptop" ? "HIGH" : "MEDIUM", prediction.score, { className: prediction.class, confidence: prediction.score })
        }, 3000)
      } catch (error) { if (!cancelled) setPermissionError(error instanceof Error ? error.message : "Proctoring models could not start") }
    }
    void start()
    return () => { cancelled = true; if (faceTimer) clearInterval(faceTimer); if (objectTimer) clearInterval(objectTimer); vad?.pause(); vad?.destroy(); stream?.getTracks().forEach((track) => track.stop()) }
  }, [sessionId])

  return <>{permissionError && <div className="fixed bottom-4 left-4 z-50 rounded bg-yellow-100 p-3 text-sm text-yellow-900">Proctoring warning: {permissionError}</div>}<video ref={videoRef} muted playsInline className="hidden" /></>
}

async function verifyIdentity(video: HTMLVideoElement, expected: number[], emit: (type: string, severity: string, confidence?: number, metadata?: Record<string, unknown>) => Promise<void>) {
  try {
    const faceapi = await import("face-api.js")
    await Promise.all([faceapi.nets.ssdMobilenetv1.loadFromUri(faceApiModels), faceapi.nets.faceLandmark68Net.loadFromUri(faceApiModels), faceapi.nets.faceRecognitionNet.loadFromUri(faceApiModels)])
    const detection = await faceapi.detectSingleFace(video).withFaceLandmarks().withFaceDescriptor()
    if (!detection) return
    const distance = faceapi.euclideanDistance(expected, Array.from(detection.descriptor))
    if (distance > 0.6) await emit("IDENTITY_MISMATCH", "CRITICAL", distance, { distance, threshold: 0.6 })
  } catch { /* Identity models are optional until registration has a descriptor. */ }
}