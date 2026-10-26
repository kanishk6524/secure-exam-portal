// What the candidate is told before the exam and agrees to. Bump CONSENT_VERSION whenever the wording or the data
// collected changes, so every session records exactly which version was accepted.
export const CONSENT_VERSION = "2026-10-v1"

export const CONSENT_COLLECTED = [
  "Live video from your webcam (frames are analysed in your browser; still pictures are saved only when an alert is raised, as evidence).",
  "A face template (numbers describing your face) made from your registration photo and the photo taken just before the exam, to check that the same person sits the whole exam.",
  "Eye and head movement measurements, including your personal gaze baseline created during calibration.",
  "Microphone audio, analysed in your browser to detect speech. Audio is not recorded or stored.",
  "Activity in the exam window: tab or window switches, fullscreen exits, copy and paste attempts, connection loss.",
  "If you pair your phone as a side camera: pictures from the phone camera, analysed to detect other people or devices.",
  "Your answers and the time you take.",
]
export const CONSENT_PURPOSE = "To keep the exam fair. Alerts are shown to a human reviewer, who decides whether anything is wrong. No automatic penalty is applied except the violation limit shown in the instructions."
export const CONSENT_RIGHTS = [
  "You can decline now. Declining means you cannot take this proctored exam; contact your institution about an alternative arrangement.",
  "You can appeal any outcome from the final screen after the exam. A person (not the software) answers it.",
  "You can ask your institution to show you the data held about you, correct it, or erase it once it is no longer needed.",
  "You can withdraw consent at any time; the proctored exam then ends.",
]
