"use client"

import { FormEvent, useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { AlertTriangle, ArrowLeft, CheckCircle2, CloudCog, Loader2, RefreshCw, ShieldAlert, Trash2 } from "lucide-react"

type Integration = {
  remote_handle: string | null
  sync_likes: boolean
  sync_saves: boolean
  status: "active" | "paused" | "reauth_required"
  last_synced_at: string | null
  last_error: string | null
} | null

type FailedEvent = {
  id: string
  interaction_type: "like" | "save"
  post_url: string
  error: string | null
  attempt_count: number
  discovered_at: string
}

export default function IntegrationsPage() {
  const [integration, setIntegration] = useState<Integration>(null)
  const [failedEvents, setFailedEvents] = useState<FailedEvent[]>([])
  const [activeTab, setActiveTab] = useState<"connection" | "attention">("connection")
  const [sessionCookie, setSessionCookie] = useState("")
  const [syncLikes, setSyncLikes] = useState(true)
  const [syncSaves, setSyncSaves] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const response = await fetch("/api/integrations/substack")
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error || "Could not load integration")
    setIntegration(payload.integration)
    if (payload.integration) {
      setSyncLikes(payload.integration.sync_likes)
      setSyncSaves(payload.integration.sync_saves)
    }
  }, [])

  const loadFailedEvents = useCallback(async () => {
    const response = await fetch("/api/integrations/substack/events")
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error || "Could not load failed syncs")
    setFailedEvents(payload.events)
  }, [])

  useEffect(() => {
    Promise.all([load(), loadFailedEvents()]).catch((err) => setError(err instanceof Error ? err.message : "Could not load integration"))
      .finally(() => setIsLoading(false))
  }, [load])

  async function connect(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setMessage(null)
    setIsSaving(true)
    try {
      const response = await fetch("/api/integrations/substack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionCookie, syncLikes, syncSaves }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || "Could not connect Substack")
      setSessionCookie("")
      setMessage("Connected. You can sync now or wait for the next scheduled daily sync.")
      await Promise.all([load(), loadFailedEvents()])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect Substack")
    } finally {
      setIsSaving(false)
    }
  }

  async function syncNow() {
    setError(null)
    setMessage(null)
    setIsSyncing(true)
    try {
      const response = await fetch("/api/integrations/substack/sync", { method: "POST" })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || "Sync failed")
      setMessage(`Sync complete: discovered ${payload.discovered} interactions and added or updated ${payload.processed} items.`)
      await Promise.all([load(), loadFailedEvents()])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed")
      await Promise.all([load(), loadFailedEvents()]).catch(() => undefined)
    } finally {
      setIsSyncing(false)
    }
  }

  async function disconnect() {
    if (!window.confirm("Disconnect Substack? Stored session credentials will be deleted.")) return
    setError(null)
    setMessage(null)
    const response = await fetch("/api/integrations/substack", { method: "DELETE" })
    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      setError(payload?.error || "Could not disconnect Substack")
      return
    }
    setIntegration(null)
    setFailedEvents([])
    setMessage("Substack disconnected and its stored session was deleted.")
  }

  async function retryFailedEvent(eventId: string) {
    setError(null)
    setMessage(null)
    const response = await fetch(`/api/integrations/substack/events/${eventId}/retry`, { method: "POST" })
    const payload = await response.json()
    if (!response.ok) {
      setError(payload.error || "Retry failed")
    } else {
      setMessage(payload.processed ? "Article added to your library." : "The retry completed without adding an item.")
      if (payload.processed) setActiveTab("connection")
    }
    await Promise.all([load(), loadFailedEvents()]).catch(() => undefined)
  }

  const statusCopy = integration?.status === "reauth_required"
    ? "Your Substack session expired. Paste a fresh session below to resume syncs."
    : integration?.last_error
      ? `Last run had a recoverable error: ${integration.last_error}`
      : "Automatic sync is healthy."

  return (
    <main className="min-h-screen bg-[#f6f3ed] px-5 py-10 text-stone-900 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 transition hover:text-stone-950">
          <ArrowLeft className="h-4 w-4" /> Knowledge library
        </Link>

        <section className="mt-8 overflow-hidden rounded-[2rem] border border-stone-200 bg-[#fffdf9] shadow-[0_24px_70px_-38px_rgba(60,45,25,0.45)]">
          <div className="border-b border-stone-200 bg-[#253a31] px-7 py-8 text-[#fbf6eb] sm:px-10">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-[#d8ac53] p-3 text-[#253a31]"><CloudCog className="h-6 w-6" /></div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#d8ac53]">Experimental connector</p>
                <h1 className="mt-2 font-serif text-3xl tracking-tight sm:text-4xl">Substack reader sync</h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-[#dfe8df]">Bring your likes and saved posts into Noesis once each day—without asking Substack to publish or modify anything.</p>
              </div>
            </div>
          </div>

          <div className="space-y-6 p-7 sm:p-10">
            {isLoading ? <div className="flex items-center gap-2 text-sm text-stone-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading connection…</div> : null}
            {message ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div> : null}
            {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}

            <div className="flex gap-1 border-b border-stone-200">
              <button onClick={() => setActiveTab("connection")} className={`border-b-2 px-3 py-2 text-sm font-semibold transition ${activeTab === "connection" ? "border-[#253a31] text-[#253a31]" : "border-transparent text-stone-500 hover:text-stone-800"}`}>Connection</button>
              {failedEvents.length > 0 ? <button onClick={() => setActiveTab("attention")} className={`inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-semibold transition ${activeTab === "attention" ? "border-red-700 text-red-800" : "border-transparent text-stone-500 hover:text-stone-800"}`}><AlertTriangle className="h-4 w-4" /> Needs attention <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-xs text-red-800">{failedEvents.length}</span></button> : null}
            </div>

            {activeTab === "attention" ? (
              <div className="space-y-3">
                <div><h2 className="font-serif text-2xl">Articles needing attention</h2><p className="mt-1 text-sm leading-6 text-stone-600">No automatic retries. Each button below makes exactly one new attempt, and failed items remain here until one succeeds.</p></div>
                {failedEvents.map((event) => <article key={event.id} className="rounded-2xl border border-red-100 bg-red-50/40 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.16em] text-red-700">{event.interaction_type} · Attempt {event.attempt_count}</p><a href={event.post_url} target="_blank" rel="noreferrer" className="mt-1 block truncate text-sm font-semibold text-stone-900 underline decoration-stone-300 underline-offset-4 hover:decoration-stone-900">{event.post_url}</a><p className="mt-2 text-xs leading-5 text-red-800">{event.error || "Unknown sync error"}</p></div><button onClick={() => retryFailedEvent(event.id)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-red-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-800"><RefreshCw className="h-4 w-4" /> Retry once</button></div></article>)}
              </div>
            ) : null}

            {activeTab === "connection" && integration ? (
              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-emerald-600" /><div><p className="font-semibold">Connected{integration.remote_handle ? ` as @${integration.remote_handle}` : ""}</p><p className="mt-1 text-sm text-stone-600">{statusCopy}</p></div></div>
                  <button onClick={syncNow} disabled={isSyncing || integration.status === "reauth_required"} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#253a31] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#182920] disabled:cursor-not-allowed disabled:opacity-50">
                    {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Sync now
                  </button>
                </div>
                <p className="mt-4 border-t border-stone-200 pt-4 text-xs text-stone-500">Last successful check: {integration.last_synced_at ? new Date(integration.last_synced_at).toLocaleString() : "Not yet run"}</p>
              </div>
            ) : null}

            {activeTab === "connection" ? <form onSubmit={connect} className="space-y-5">
              <div>
                <h2 className="font-serif text-2xl">{integration ? "Replace session" : "Connect your reader account"}</h2>
                <p className="mt-2 text-sm leading-6 text-stone-600">In your browser’s DevTools, open a signed-in request to <code className="rounded bg-stone-100 px-1.5 py-0.5 text-xs">substack.com</code> and copy only the value after <code className="rounded bg-stone-100 px-1.5 py-0.5 text-xs">Cookie:</code>. Noesis encrypts it before storage and uses it only for read-only sync requests.</p>
              </div>
              <label className="block"><span className="mb-2 block text-sm font-semibold text-stone-700">Substack Cookie header</span><textarea value={sessionCookie} onChange={(event) => setSessionCookie(event.target.value)} required rows={5} placeholder="substack.sid=…; connect.sid=…" className="w-full rounded-xl border border-stone-300 bg-white px-3 py-3 font-mono text-xs leading-5 outline-none transition placeholder:text-stone-400 focus:border-[#d8ac53] focus:ring-4 focus:ring-[#d8ac53]/15" /></label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-stone-200 bg-white p-4"><input checked={syncLikes} onChange={(event) => setSyncLikes(event.target.checked)} type="checkbox" className="mt-1 accent-[#253a31]" /><span><span className="block text-sm font-semibold">Liked posts</span><span className="mt-1 block text-xs leading-5 text-stone-600">Fetch public posts you have liked.</span></span></label>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-stone-200 bg-white p-4"><input checked={syncSaves} onChange={(event) => setSyncSaves(event.target.checked)} type="checkbox" className="mt-1 accent-[#253a31]" /><span><span className="block text-sm font-semibold">Saved posts</span><span className="mt-1 block text-xs leading-5 text-stone-600">Attempt to fetch Substack’s saved inbox surface.</span></span></label>
              </div>
              <button disabled={isSaving} className="inline-flex items-center gap-2 rounded-xl bg-[#d8ac53] px-5 py-3 text-sm font-bold text-[#253a31] transition hover:bg-[#c99b40] disabled:cursor-not-allowed disabled:opacity-50">{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}{integration ? "Replace secure session" : "Connect securely"}</button>
            </form> : null}

            {activeTab === "connection" && integration ? <button onClick={disconnect} className="inline-flex items-center gap-2 text-sm font-semibold text-red-700 transition hover:text-red-900"><Trash2 className="h-4 w-4" /> Disconnect and erase session</button> : null}
          </div>
        </section>
      </div>
    </main>
  )
}
