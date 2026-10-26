// Per-student numeric question variants. A question can carry a `variantSpec`; each student then gets their own
// numbers (stable for their session), so copying a neighbour's "answer is 42" is useless.
//
// Example question text:   "A car travels {d} km in {t} hours. What is its average speed in km/h?"
// Example variantSpec:     { "vars": { "d": {"min": 120, "max": 480, "step": 10}, "t": {"min": 2, "max": 6} },
//                            "answer": "d / t", "distractors": ["d * t", "d + t", "t / d"], "decimals": 2 }
// The answer and distractors are formulas over the variables: + - * / ^ ( ) sqrt() abs(). No code is ever executed.

export type VariantSpec = {
  vars: Record<string, { min: number; max: number; step?: number }>
  answer: string
  distractors: string[]
  decimals?: number
}
export type ResolvedQuestion = { text: string; options: Array<{ id: string; text: string }>; correctOption: string }

// ---- safe formula evaluator (recursive descent) ----
export function evaluate(expression: string, values: Record<string, number>): number {
  const tokens = expression.match(/\d+\.?\d*|\.\d+|[A-Za-z_]\w*|[-+*/^(),]/g) ?? []
  if (tokens.join("") !== expression.replace(/\s+/g, "")) throw new Error(`Unsupported characters in formula "${expression}"`)
  let pos = 0
  const peek = () => tokens[pos]
  const take = () => tokens[pos++]
  function primary(): number {
    const token = take()
    if (token === undefined) throw new Error("Formula ended unexpectedly")
    if (token === "(") { const v = sum(); if (take() !== ")") throw new Error("Missing )"); return v }
    if (token === "-") return -power()
    if (token === "+") return power()
    if (/^[\d.]/.test(token)) return Number(token)
    if (peek() === "(") {
      take(); const arg = sum(); if (take() !== ")") throw new Error("Missing )")
      if (token === "sqrt") return Math.sqrt(arg)
      if (token === "abs") return Math.abs(arg)
      throw new Error(`Unknown function ${token}`)
    }
    if (token in values) return values[token]
    throw new Error(`Unknown variable ${token}`)
  }
  function power(): number { const base = primary(); if (peek() === "^") { take(); return base ** power() } return base }
  function product(): number { let v = power(); while (peek() === "*" || peek() === "/") v = take() === "*" ? v * power() : v / power(); return v }
  function sum(): number { let v = product(); while (peek() === "+" || peek() === "-") v = take() === "+" ? v + product() : v - product(); return v }
  const result = sum()
  if (pos !== tokens.length) throw new Error("Unexpected text after the formula")
  return result
}

// ---- deterministic randomness ----
function hash(text: string) { let h = 2166136261; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }
function rng(seed: number) { let a = seed; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
const fmt = (v: number, decimals: number) => String(Number(v.toFixed(decimals)))

export function isVariantSpec(value: unknown): value is VariantSpec {
  const s = value as VariantSpec | null
  return Boolean(s && typeof s === "object" && s.vars && typeof s.vars === "object" && typeof s.answer === "string" && Array.isArray(s.distractors))
}

/** Throws a readable error when a spec cannot work. Used when an admin saves a question. */
export function validateSpec(spec: unknown, text: string) {
  if (!isVariantSpec(spec)) throw new Error('variantSpec must look like {"vars":{...},"answer":"...","distractors":[...]}')
  const names = Object.keys(spec.vars)
  if (!names.length) throw new Error("variantSpec needs at least one variable")
  for (const name of names) {
    const v = spec.vars[name]
    if (!/^[A-Za-z_]\w*$/.test(name) || !(Number.isFinite(v.min) && Number.isFinite(v.max) && v.min <= v.max)) throw new Error(`Variable ${name} needs a valid min <= max`)
    if (!text.includes(`{${name}}`)) throw new Error(`The question text never uses {${name}}`)
  }
  if (spec.distractors.length < 1 || spec.distractors.length > 3) throw new Error("Give 1 to 3 distractor formulas")
  const sample = Object.fromEntries(names.map((n) => [n, spec.vars[n].max]))
  for (const f of [spec.answer, ...spec.distractors]) if (!Number.isFinite(evaluate(f, sample))) throw new Error(`Formula "${f}" does not give a number (division by zero?)`)
}

export function resolveQuestion(question: { id: string; text: string; options: unknown; correctOption: string; variantSpec?: unknown }, sessionId: string): ResolvedQuestion {
  const stored = { text: question.text, options: Array.isArray(question.options) ? (question.options as Array<{ id: string; text: string }>) : [], correctOption: question.correctOption }
  if (!isVariantSpec(question.variantSpec)) return stored
  const spec = question.variantSpec
  try {
    const random = rng(hash(`${sessionId}:${question.id}`))
    const decimals = spec.decimals ?? 2
    const values: Record<string, number> = {}
    for (const [name, v] of Object.entries(spec.vars)) {
      const step = v.step && v.step > 0 ? v.step : 1
      values[name] = v.min + step * Math.floor(random() * (Math.floor((v.max - v.min) / step) + 1))
    }
    const correct = Number(evaluate(spec.answer, values).toFixed(decimals))
    const taken = new Set([correct])
    const wrong: number[] = []
    for (const formula of spec.distractors) {
      let value = Number(evaluate(formula, values).toFixed(decimals))
      const nudge = Math.max(10 ** -decimals, Math.abs(correct) * 0.1)
      for (let tries = 0; taken.has(value) && tries < 20; tries++) value = Number((value + nudge).toFixed(decimals))
      taken.add(value); wrong.push(value)
    }
    const all = [correct, ...wrong].map((v, i) => ({ v, isCorrect: i === 0 }))
    for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [all[i], all[j]] = [all[j], all[i]] }
    const options = all.map((o, i) => ({ id: String.fromCharCode(65 + i), text: fmt(o.v, decimals) }))
    return {
      text: question.text.replace(/\{(\w+)\}/g, (match, name: string) => (name in values ? String(values[name]) : match)),
      options,
      correctOption: options[all.findIndex((o) => o.isCorrect)].id,
    }
  } catch {
    return stored // a broken spec must never take the exam down: fall back to the stored question
  }
}
