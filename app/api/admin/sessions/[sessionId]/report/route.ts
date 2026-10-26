import { prisma } from "@/lib/prisma"
import { getAdminScope } from "@/lib/admin-auth"
import { assessIntegrity } from "@/lib/integrity-model"
import { analyseAnswerPatterns } from "@/lib/answer-patterns"

const esc = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string)

/** Printable integrity report for one candidate (open it in a tab and use Print / Save as PDF). */
export async function GET(_request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const scope = await getAdminScope()
  if (!scope) return new Response("Admin access required", { status: 403 })
  const { sessionId } = await params
  const session = await prisma.examSession.findFirst({
    where: { id: sessionId, ...(scope.collegeId ? { exam: { collegeId: scope.collegeId } } : {}) },
    include: { user: { select: { fullName: true, email: true } }, exam: { select: { title: true, durationMins: true } }, incidents: { orderBy: { createdAt: "asc" } }, answers: { select: { updatedAt: true, isCorrect: true, selectedOption: true } } },
  })
  if (!session) return new Response("Session not found", { status: 404 })

  const assessment = assessIntegrity({ startedAt: session.startedAt, incidents: session.incidents, answers: session.answers })
  const patterns = analyseAnswerPatterns({ startedAt: session.startedAt, endedAt: session.submittedAt, answers: session.answers })
  const byType = new Map<string, number>()
  for (const incident of session.incidents) byType.set(incident.type, (byType.get(incident.type) ?? 0) + 1)
  const evidence = session.incidents.filter((incident) => incident.evidence && incident.evidence.startsWith("data:image/jpeg;base64,")).slice(0, 6)
  const levelColour = assessment.level === "HIGH" ? "#b91c1c" : assessment.level === "ELEVATED" ? "#c2410c" : "#15803d"

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Integrity report - ${esc(session.user.fullName)}</title>
<style>
body{font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:820px;margin:24px auto;padding:0 16px;color:#111827}
h1{font-size:22px;margin:0}h2{font-size:15px;margin:22px 0 6px;border-bottom:1px solid #e5e7eb;padding-bottom:4px}
table{border-collapse:collapse;width:100%;font-size:13px}td,th{border:1px solid #e5e7eb;padding:5px 8px;text-align:left}
.badge{display:inline-block;color:#fff;border-radius:4px;padding:2px 8px;font-weight:600}
.bar{display:inline-block;height:8px;background:#374151;border-radius:2px}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.grid img{width:100%;border:1px solid #d1d5db}
.muted{color:#6b7280;font-size:12px}button{margin:8px 0;padding:6px 14px}
@media print{button{display:none}}
</style></head><body>
<button onclick="window.print()">Print / Save as PDF</button>
<h1>Exam integrity report</h1>
<p class="muted">Generated ${esc(new Date().toISOString())} · session ${esc(session.id)}</p>
<h2>Candidate and exam</h2>
<table><tr><th>Candidate</th><td>${esc(session.user.fullName)} (${esc(session.user.email)})</td></tr>
<tr><th>Exam</th><td>${esc(session.exam.title)} · ${esc(session.exam.durationMins)} min</td></tr>
<tr><th>Started / submitted</th><td>${esc(session.startedAt.toISOString())} / ${esc(session.submittedAt?.toISOString() ?? "not submitted")}</td></tr>
<tr><th>Score</th><td>${esc(session.score ?? "-")} · status ${esc(session.status)}</td></tr>
<tr><th>Reviewer verdict</th><td>${esc(session.verdict ?? "Not reviewed")}${session.reviewNote ? ` · ${esc(session.reviewNote)}` : ""}</td></tr></table>
<h2>Machine-learning integrity assessment</h2>
<p><span class="badge" style="background:${levelColour}">${esc(assessment.level)}</span> estimated likelihood of cheating: <b>${Math.round(assessment.probability * 100)}%</b> · rule-based risk points: ${esc(session.riskScore)}</p>
${assessment.factors.length ? `<table>${assessment.factors.map((factor) => `<tr><td>${esc(factor.label)}</td><td style="width:200px"><span class="bar" style="width:${Math.min(180, Math.round(factor.contribution * 45))}px"></span></td><td>+${factor.contribution.toFixed(2)}</td></tr>`).join("")}</table>` : "<p>No behaviour contributed to the score.</p>"}
<p class="muted">${assessment.trained ? `The model was fitted to ${assessment.samples} reviewed sessions.` : "The model uses starting weights, not weights learned from this institution's data."} The score supports a human reviewer and is not a verdict.</p>
<h2>Answer pattern analysis</h2>
${patterns.length ? `<table>${patterns.map((finding) => `<tr><td style="width:90px"><b>${esc(finding.severity)}</b></td><td>${esc(finding.text)}</td></tr>`).join("")}</table>` : "<p>No unusual answering pattern was found (or there were too few answers to judge).</p>"}
<p class="muted">Based on the last save time of each answer; changed answers appear as later answers.</p>
<h2>Incident summary</h2>
${byType.size ? `<table><tr><th>Type</th><th>Count</th></tr>${[...byType.entries()].sort((a, b) => b[1] - a[1]).map(([type, count]) => `<tr><td>${esc(type.replaceAll("_", " "))}</td><td>${count}</td></tr>`).join("")}</table>` : "<p>No incidents were recorded.</p>"}
<h2>Timeline</h2>
${session.incidents.length ? `<table><tr><th>Time</th><th>Type</th><th>Severity</th><th>Review</th></tr>${session.incidents.slice(0, 80).map((incident) => `<tr><td>${esc(incident.createdAt.toISOString().slice(11, 19))}</td><td>${esc(incident.type.replaceAll("_", " "))}</td><td>${esc(incident.severity)}</td><td>${esc(incident.reviewStatus.toLowerCase())}</td></tr>`).join("")}</table>${session.incidents.length > 80 ? `<p class="muted">First 80 of ${session.incidents.length} incidents shown.</p>` : ""}` : "<p>None.</p>"}
${evidence.length ? `<h2>Webcam evidence</h2><div class="grid">${evidence.map((incident) => `<figure style="margin:0"><img src="${incident.evidence}" alt="evidence"><figcaption class="muted">${esc(incident.type.replaceAll("_", " "))} · ${esc(incident.createdAt.toISOString().slice(11, 19))}</figcaption></figure>`).join("")}</div>` : ""}
</body></html>`
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } })
}
