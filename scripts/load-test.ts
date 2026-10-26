// Load test: many virtual candidates take an exam at the same time against a running portal.
//
//   npm run load-test -- --base http://localhost:3001 --users 100 --exam <examId> [--think 1] [--ramp 20] [--sockets]
//
// Each virtual candidate: registers (local relaxed-signup mode only) and signs in, starts the exam, loads the questions,
// answers every question with a human-like pause, sends a few proctoring incidents, polls like the real exam page does,
// and submits. The script reports latency (p50/p95/p99), errors and throughput per endpoint, and writes
// docs/load-test-results.md. Run it against a local or staging server, NEVER against real exam day production data.
import { writeFileSync, mkdirSync } from "node:fs"

const arg = (name: string, fallback?: string) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : fallback }
const flag = (name: string) => process.argv.includes(`--${name}`)
const BASE = (arg("base", "http://localhost:3000") as string).replace(/\/$/, "")
const USERS = Number(arg("users", "50"))
const THINK = Number(arg("think", "1")) // average seconds a candidate "thinks" per question
const RAMP = Number(arg("ramp", "10")) // seconds over which candidates arrive
const EXAM_ID = arg("exam")
const CONSENT_VERSION = arg("consent", "2026-10-v1") as string
const RUN_ID = Date.now().toString(36)

type Sample = { name: string; ms: number; status: number }
const samples: Sample[] = []
const failures: string[] = []
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

class Client {
  jar = new Map<string, string>()
  private cookies() { return [...this.jar].map(([k, v]) => `${k}=${v}`).join("; ") }
  async call(name: string, path: string, init: { method?: string; body?: unknown; form?: Record<string, string> } = {}) {
    const headers: Record<string, string> = { cookie: this.cookies() }
    let body: string | undefined
    if (init.form) { headers["content-type"] = "application/x-www-form-urlencoded"; body = new URLSearchParams(init.form).toString() }
    else if (init.body !== undefined) { headers["content-type"] = "application/json"; body = JSON.stringify(init.body) }
    const started = performance.now()
    let status = 0
    try {
      const res = await fetch(BASE + path, { method: init.method ?? "GET", headers, body, redirect: "manual" })
      status = res.status
      for (const c of res.headers.getSetCookie?.() ?? []) { const [pair] = c.split(";"); const eq = pair.indexOf("="); if (eq > 0) this.jar.set(pair.slice(0, eq), pair.slice(eq + 1)) }
      const text = await res.text()
      samples.push({ name, ms: performance.now() - started, status })
      let json: any = null
      try { json = text ? JSON.parse(text) : null } catch { /* not json */ }
      return { status, json }
    } catch (error) {
      samples.push({ name, ms: performance.now() - started, status: 0 })
      failures.push(`${name}: ${(error as Error).message}`)
      return { status: 0, json: null }
    }
  }
}

async function candidate(i: number) {
  await sleep((i / USERS) * RAMP * 1000)
  const c = new Client()
  const email = `load-${RUN_ID}-${i}@loadtest.local`, password = "LoadTest123"
  await c.call("register", "/api/auth/register", { method: "POST", body: { email, password, fullName: `Load Tester ${i}`, role: "STUDENT" } })
  const csrf = await c.call("csrf", "/api/auth/csrf")
  await c.call("login", "/api/auth/callback/credentials", { method: "POST", form: { csrfToken: csrf.json?.csrfToken ?? "", email, password, json: "true", callbackUrl: BASE } })
  const who = await c.call("session", "/api/auth/session")
  if (!who.json?.user) { failures.push(`user ${i}: login failed`); return }
  let examId = EXAM_ID
  if (!examId) examId = (await c.call("exams", "/api/exams")).json?.exams?.[0]?.id
  if (!examId) { failures.push(`user ${i}: no exam available`); return }
  const start = await c.call("start", `/api/exams/${examId}/start`, { method: "POST", body: { consentVersion: CONSENT_VERSION } })
  const sessionId = start.json?.sessionId
  if (!sessionId) { failures.push(`user ${i}: could not start (${start.status} ${JSON.stringify(start.json)?.slice(0, 120)})`); return }
  const q = await c.call("questions", `/api/exams/session/${sessionId}/questions`)
  await c.call("answers-load", `/api/exams/session/${sessionId}/answers`)
  const questions: Array<{ id: string; options: Array<{ id: string }> }> = q.json?.questions ?? []
  let n = 0
  for (const question of questions) {
    await sleep(THINK * 1000 * (0.4 + Math.random() * 1.2))
    const option = question.options[Math.floor(Math.random() * question.options.length)]?.id
    await c.call("answer", `/api/exams/session/${sessionId}/answer`, { method: "POST", body: { questionId: question.id, selectedOption: option } })
    n += 1
    if (n % 5 === 0) await c.call("poll", `/api/exams/session/${sessionId}/answers`)
    if (n % 7 === 0) await c.call("notices", `/api/exams/session/${sessionId}/notices?after=0`)
    if (Math.random() < 0.15) await c.call("incident", `/api/exams/session/${sessionId}/incident`, { method: "POST", body: { type: "GAZE_AWAY", severity: "MEDIUM", confidence: 0.5, metadata: { source: "load-test" } } })
  }
  await c.call("submit", `/api/exams/session/${sessionId}/submit`, { method: "POST" })
}

const pct = (xs: number[], p: number) => { if (!xs.length) return 0; const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))] }

async function main() {
  console.log(`Load test: ${USERS} candidates against ${BASE}, ramp ${RAMP}s, think ~${THINK}s per question`)
  const t0 = performance.now()
  await Promise.all(Array.from({ length: USERS }, (_, i) => candidate(i).catch((e) => { failures.push(`user ${i}: ${e.message}`) })))
  const seconds = (performance.now() - t0) / 1000
  const names = [...new Set(samples.map((s) => s.name))]
  const rows = names.map((name) => {
    const xs = samples.filter((s) => s.name === name)
    const ms = xs.map((x) => x.ms)
    const bad = xs.filter((x) => x.status === 0 || x.status >= 500).length
    const rejected = xs.filter((x) => x.status >= 400 && x.status < 500).length
    return { name, n: xs.length, p50: pct(ms, 50), p95: pct(ms, 95), p99: pct(ms, 99), max: Math.max(...ms), bad, rejected }
  })
  let md = `# Load test results\n\nRun ${new Date().toISOString()} against ${BASE}: ${USERS} virtual candidates, ramp ${RAMP}s, think time ~${THINK}s per question, total ${seconds.toFixed(1)}s, ${samples.length} requests (${(samples.length / seconds).toFixed(1)} per second).\n\n| Endpoint | Requests | p50 ms | p95 ms | p99 ms | max ms | Server errors | Rejected (4xx) |\n|---|---|---|---|---|---|---|---|\n`
  for (const r of rows) md += `| ${r.name} | ${r.n} | ${r.p50.toFixed(0)} | ${r.p95.toFixed(0)} | ${r.p99.toFixed(0)} | ${r.max.toFixed(0)} | ${r.bad} | ${r.rejected} |\n`
  md += `\nFailures: ${failures.length}${failures.length ? "\n\n" + [...new Set(failures)].slice(0, 15).map((f) => `- ${f}`).join("\n") : ""}\n\nNote: registration and login use bcrypt (deliberately slow), so a login stampede is the usual first bottleneck. Compare the numbers with your target: for example answers saved in under 500 ms at p95.\n`
  mkdirSync("docs", { recursive: true })
  writeFileSync("docs/load-test-results.md", md)
  console.log(md)
}
void main()
