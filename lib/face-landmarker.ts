import type { FaceLandmarker } from "@mediapipe/tasks-vision"

// The WASM runtime must be the same version as the installed @mediapipe/tasks-vision JavaScript, so it is served
// from /public/mediapipe/wasm (copied out of node_modules by scripts/fetch-mediapipe.sh) and only falls back to a CDN.
// MediaPipe's WASM runtime writes harmless status lines such as "INFO: Created TensorFlow Lite XNNPACK delegate
// for CPU." to console.error. They are not errors, but the Next.js dev overlay shows them as one, so drop them.
if (typeof window !== "undefined" && !(window as unknown as { __mpLogFilter?: boolean }).__mpLogFilter) {
  ;(window as unknown as { __mpLogFilter?: boolean }).__mpLogFilter = true
  const originalError = console.error
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === "string" && /^(INFO|WARNING): /.test(args[0]) && /TensorFlow Lite|XNNPACK|delegate/i.test(args[0])) return
    originalError.apply(console, args)
  }
}

const LOCAL_WASM = "/mediapipe/wasm"
const CDN_WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
const LOCAL_MODEL = "/mediapipe/face_landmarker.task"
const CDN_MODEL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"

async function exists(url: string) {
  try {
    return (await fetch(url, { method: "HEAD" })).ok
  } catch {
    return false
  }
}

export function describeError(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === "string") return error
  try { return JSON.stringify(error) } catch { return String(error) }
}

export async function createFaceLandmarker(options: { numFaces: number; blendshapes: boolean }): Promise<FaceLandmarker> {
  const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision")
  const localWasm = await exists(`${LOCAL_WASM}/vision_wasm_internal.js`)
  const localModel = await exists(LOCAL_MODEL)
  const fileset = await FilesetResolver.forVisionTasks(localWasm ? LOCAL_WASM : CDN_WASM)
  const make = (delegate: "GPU" | "CPU") =>
    FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: localModel ? LOCAL_MODEL : CDN_MODEL, delegate },
      runningMode: "VIDEO",
      numFaces: options.numFaces,
      outputFaceBlendshapes: options.blendshapes,
      outputFacialTransformationMatrixes: true,
    })
  try {
    return await make("GPU")
  } catch (gpuError) {
    console.warn("[face-landmarker] GPU delegate failed, using CPU:", gpuError)
    try {
      return await make("CPU")
    } catch (cpuError) {
      console.error("[face-landmarker] could not start", { localWasm, localModel, cpuError })
      throw new Error(`${describeError(cpuError)} [wasm: ${localWasm ? "local" : "CDN"}, model: ${localModel ? "local" : "CDN"}]`)
    }
  }
}
