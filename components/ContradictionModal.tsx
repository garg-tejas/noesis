"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { X, Loader2, GitCompareArrows, ExternalLink, AlertTriangle } from "lucide-react"
import type { KnowledgeEntry, Contradiction } from "../types"
import { ApiClientError, toApiClientError, toUserFacingErrorMessage } from "@/lib/api/client-errors"
import { useRouter } from "next/navigation"

interface ContradictionModalProps {
  isOpen: boolean
  onClose: () => void
  entries: KnowledgeEntry[]
}

const ContradictionModal: React.FC<ContradictionModalProps> = ({ isOpen, onClose, entries }) => {
  const router = useRouter()
  const [contradictions, setContradictions] = useState<Contradiction[]>([])
  const [loading, setLoading] = useState(false)
  const [analyzed, setAnalyzed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dataVersion, setDataVersion] = useState(0)

  useEffect(() => {
    if (!isOpen) {
      setAnalyzed(false)
      setContradictions([])
      setError(null)
      setLoading(false)
      return
    }

    if (!analyzed && entries.length >= 2) {
      analyze()
    }
  }, [isOpen, analyzed, entries.length, dataVersion])

  useEffect(() => {
    if (!isOpen) return
    setDataVersion((prev) => prev + 1)
    setAnalyzed(false)
  }, [entries, isOpen])

  const analyze = async () => {
    setLoading(true)
    setError(null)
    try {
      const entryIds = entries.map((entry) => entry.id)

      // Log payload being sent for debugging
      console.log("Sending entries for contradiction analysis:", {
        count: entryIds.length,
        entryIds,
      })

      const response = await fetch("/api/contradictions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ entryIds }),
      })
      const payload: unknown = await response.json().catch(() => null)

      if (!response.ok) {
        const apiError = toApiClientError(response, payload, "Unable to analyze contradictions. Please try again.")
        console.error("Contradiction API error:", apiError)
        throw apiError
      }

      const data = payload as { contradictions?: Contradiction[] }
      setContradictions(data.contradictions || [])
    } catch (e) {
      console.error("Contradiction analysis error:", e)
      if (e instanceof ApiClientError) {
        if (e.code === "UNAUTHORIZED") {
          router.push("/auth/login")
        }
        setError(toUserFacingErrorMessage(e, "Unable to analyze contradictions. Please try again."))
      } else {
        setError(e instanceof Error ? e.message : "Unknown error occurred")
      }
    } finally {
      setLoading(false)
      setAnalyzed(true)
    }
  }

  const getEntry = (id: string) => entries.find((e) => e.id === id)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-orange-50">
          <h2 className="text-xl font-semibold text-orange-900 flex items-center gap-2">
            <GitCompareArrows className="w-5 h-5 text-orange-600" />
            Contradiction Analysis
          </h2>
          <button
            onClick={() => {
              setAnalyzed(false)
              setContradictions([])
              setError(null)
              setLoading(false)
              onClose()
            }}
            className="text-orange-400 hover:text-orange-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto bg-gray-50 flex-1">
          {error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-red-900 mb-2">Error</h3>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500 mb-3" />
              <p>Cross-referencing ideas...</p>
            </div>
          ) : contradictions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {analyzed ? (
                <>
                  <p className="text-lg font-medium text-gray-700">No contradictions found.</p>
                  <p className="text-sm mt-1">Your knowledge base seems internally consistent (for now).</p>
                </>
              ) : (
                <p>Waiting to analyze...</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-4 bg-white p-3 rounded border border-gray-200">
                Found <strong>{contradictions.length}</strong> potential conflicts. Reviewing these can help refine your
                mental models.
              </p>
              {contradictions.map((con, idx) => {
                const item1 = getEntry(con.item1_id)
                const item2 = getEntry(con.item2_id)
                if (!item1 || !item2) return null

                return (
                  <div key={idx} className="bg-white rounded-lg border border-orange-200 shadow-sm p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                      <p className="text-gray-800 text-sm font-medium">{con.description}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div className="p-3 bg-gray-50 rounded border border-gray-200 text-xs">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-semibold text-gray-700 truncate">{item1.author}</span>
                          {item1.originalUrl && (
                            <a
                              href={item1.originalUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-500 hover:underline"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                        <p className="text-gray-600 line-clamp-3 italic">"{item1.distilled.core_ideas[0]}"</p>
                      </div>

                      <div className="p-3 bg-gray-50 rounded border border-gray-200 text-xs">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-semibold text-gray-700 truncate">{item2.author}</span>
                          {item2.originalUrl && (
                            <a
                              href={item2.originalUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-500 hover:underline"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                        <p className="text-gray-600 line-clamp-3 italic">"{item2.distilled.core_ideas[0]}"</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 bg-white flex justify-end">
          <button
            onClick={() => {
              setAnalyzed(false)
              setContradictions([])
              setError(null)
              setLoading(false)
              onClose()
            }}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default ContradictionModal
