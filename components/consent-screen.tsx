"use client"

import { useState } from "react"
import { CONSENT_COLLECTED, CONSENT_PURPOSE, CONSENT_RIGHTS, CONSENT_VERSION } from "@/lib/consent"

type Props = { onAgree: () => void; onDecline: () => void }
export const CONSENT_STORAGE_KEY = "examConsentVersion"

export default function ConsentScreen({ onAgree, onDecline }: Props) {
  const [agreed, setAgreed] = useState(false)
  const [adult, setAdult] = useState(false)
  const contact = process.env.NEXT_PUBLIC_GRIEVANCE_EMAIL
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-3xl rounded-lg bg-white p-8 shadow-md">
        <h2 className="mb-1 text-2xl font-bold">Before you start: your data and this exam</h2>
        <p className="mb-6 text-sm text-gray-500">Privacy notice, version {CONSENT_VERSION}</p>
        <div className="space-y-5 text-sm text-gray-700">
          <section>
            <h3 className="mb-1 font-semibold text-gray-900">What this exam collects</h3>
            <ul className="list-disc space-y-1 pl-5">{CONSENT_COLLECTED.map((item) => <li key={item}>{item}</li>)}</ul>
          </section>
          <section>
            <h3 className="mb-1 font-semibold text-gray-900">Why</h3>
            <p>{CONSENT_PURPOSE}</p>
          </section>
          <section>
            <h3 className="mb-1 font-semibold text-gray-900">Who can see it</h3>
            <p>Authorised administrators and reviewers of your institution. Every review action is recorded in a tamper-evident audit log.</p>
          </section>
          <section>
            <h3 className="mb-1 font-semibold text-gray-900">Your choices</h3>
            <ul className="list-disc space-y-1 pl-5">{CONSENT_RIGHTS.map((item) => <li key={item}>{item}</li>)}</ul>
            <p className="mt-2">Questions or complaints about your data: {contact ? <a className="text-blue-600 underline" href={`mailto:${contact}`}>{contact}</a> : "contact your institution's exam cell"}.</p>
          </section>
        </div>
        <div className="mt-6 space-y-3 rounded-md border border-yellow-300 bg-yellow-50 p-4 text-sm">
          <label className="flex items-start gap-3"><input type="checkbox" className="mt-1" checked={adult} onChange={(e) => setAdult(e.target.checked)} /><span>I am 18 or older, or my parent or guardian has agreed to this on my behalf.</span></label>
          <label className="flex items-start gap-3"><input type="checkbox" className="mt-1" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} /><span>I have read this notice and I agree to the collection and use of my data described above for this exam.</span></label>
        </div>
        <div className="mt-6 flex justify-center gap-3">
          <button onClick={onDecline} className="rounded-md border border-gray-300 px-6 py-2 text-gray-700 hover:bg-gray-50">I do not agree</button>
          <button
            disabled={!agreed || !adult}
            onClick={() => { try { sessionStorage.setItem(CONSENT_STORAGE_KEY, CONSENT_VERSION) } catch { /* the start request will ask again */ } onAgree() }}
            className={`rounded-md px-6 py-2 text-white ${agreed && adult ? "bg-green-600 hover:bg-green-700" : "cursor-not-allowed bg-gray-400"}`}
          >
            I agree and continue
          </button>
        </div>
      </div>
    </div>
  )
}
