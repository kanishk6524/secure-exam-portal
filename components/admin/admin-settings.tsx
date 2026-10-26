"use client"

import { useEffect, useState } from "react"

type Settings = { maxViolations: number; adminRegistrationEnabled: boolean; cronConfigured: boolean; realtimeAvailable: boolean; role: string }

function Row({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="flex items-start justify-between gap-6 border-b py-4 last:border-b-0">
      <div><p className="font-medium text-gray-800">{label}</p><p className="text-sm text-gray-500">{note}</p></div>
      <span className="shrink-0 rounded bg-gray-100 px-3 py-1 text-sm font-medium text-gray-800">{value}</span>
    </div>
  )
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [message, setMessage] = useState("")

  useEffect(() => {
    fetch("/api/admin/settings")
      .then(async (response) => ({ ok: response.ok, data: await response.json() }))
      .then(({ ok, data }) => (ok ? setSettings(data) : setMessage(data.error ?? "Unable to load settings")))
      .catch(() => setMessage("Unable to load settings"))
  }, [])

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-gray-800">Settings</h1>
      <p className="mb-6 text-sm text-gray-500">These values come from the deployment's environment variables. Change them in your hosting dashboard (for example Vercel) and redeploy.</p>
      {message && <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{message}</p>}
      {settings && (
        <div className="rounded-lg bg-white px-6 shadow">
          <Row label="Violation limit" value={String(settings.maxViolations)} note="Tab switches, fullscreen exits and copy/paste attempts allowed before an exam is auto-submitted (MAX_LOCKDOWN_VIOLATIONS)." />
          <Row label="Admin self-registration" value={settings.adminRegistrationEnabled ? "Enabled" : "Disabled"} note="Needs ADMIN_REGISTRATION_CODE. When unset, nobody can register as an admin." />
          <Row label="Auto-submit scheduler" value={settings.cronConfigured ? "Secret set" : "Not configured"} note="CRON_SECRET protects /api/cron/auto-submit. Expired attempts are also finalized whenever an admin opens the dashboard, reports or monitoring." />
          <Row label="Live socket feed" value={settings.realtimeAvailable ? "Available" : "Unavailable"} note="Needs the custom Node server (server.ts). Without it the monitoring page and student screens fall back to polling every 10 seconds." />
        </div>
      )}
    </div>
  )
}
