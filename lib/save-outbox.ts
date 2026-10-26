// Answers that have not reached the server yet. Each question keeps only its newest unsaved values. The outbox is
// mirrored to localStorage so a refresh or crash during a network outage does not lose answers.
export type AnswerPatch = { selectedOption?: string | null; descriptiveText?: string | null; markedForReview?: boolean }

export class Outbox {
  private items = new Map<string, AnswerPatch>()
  constructor(private readonly storageKey?: string) { this.load() }
  get size() { return this.items.size }
  /** Add or merge newer values for a question. */
  put(questionId: string, patch: AnswerPatch) { this.items.set(questionId, { ...(this.items.get(questionId) ?? {}), ...patch }); this.save() }
  /** Take one entry out to send it. If sending fails, give it back with restore(). */
  take(): { questionId: string; patch: AnswerPatch } | null {
    const first = this.items.entries().next()
    if (first.done) return null
    this.items.delete(first.value[0]); this.save()
    return { questionId: first.value[0], patch: first.value[1] }
  }
  /** Put back an entry that could not be sent; anything newer written meanwhile wins. */
  restore(questionId: string, patch: AnswerPatch) { this.items.set(questionId, { ...patch, ...(this.items.get(questionId) ?? {}) }); this.save() }
  clear() { this.items.clear(); this.save() }
  entries() { return [...this.items.entries()] }
  private save() { if (!this.storageKey) return; try { if (this.items.size) localStorage.setItem(this.storageKey, JSON.stringify([...this.items])); else localStorage.removeItem(this.storageKey) } catch { /* storage unavailable: still works in memory */ } }
  private load() { if (!this.storageKey) return; try { const raw = localStorage.getItem(this.storageKey); if (raw) this.items = new Map(JSON.parse(raw) as Array<[string, AnswerPatch]>) } catch { /* ignore */ } }
}
