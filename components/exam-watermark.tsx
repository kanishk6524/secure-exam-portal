"use client"

/**
 * Tiled, semi-transparent identity overlay. A photo or screen recording of the exam therefore
 * carries the candidate's name and session, which discourages leaking questions and makes any
 * leak traceable. It ignores pointer events so it never gets in the way of the exam.
 */
export default function ExamWatermark({ label }: { label: string }) {
  const rows = 8
  const cols = 4
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-30 overflow-hidden select-none">
      <div className="absolute -inset-1/4 grid -rotate-[24deg]" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}>
        {Array.from({ length: rows * cols }).map((_, index) => (
          <span key={index} className="flex items-center justify-center whitespace-nowrap text-sm font-semibold text-gray-900/[0.07]">
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
