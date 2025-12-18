"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { X, Loader2, GitCompareArrows, ExternalLink, AlertTriangle } from "lucide-react"
import type { KnowledgeEntry, Contradiction } from "../types"

interface ContradictionModalProps {
  isOpen: boolean
  onClose: () => void
  entries: KnowledgeEntry[]
}

const ContradictionModal: React.FC<ContradictionModalProps> = ({ isOpen, onClose, entries }) => {
  const [contradictions, setContradictions] = useState<Contradiction[]>([])
  const [loading, setLoading] = useState(false)
  const [analyzed, setAnalyzed] = useState(false)

  useEffect(() => {
    if (isOpen && !analyzed && entries.length >= 2) {
      analyze()
    }
  }, [isOpen, entries])

  const analyze = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/contradictions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ entries }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to analyze contradictions")
      }

      const data = await response.json()
      setContradictions(data.contradictions || [])
    } catch (e) {
      console.error("Contradiction analysis error:", e)
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
          <button onClick={onClose} className="text-orange-400 hover:text-orange-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto bg-gray-50 flex-1">
          {loading ? (
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
                      {/* Item 1 */}
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

                      {/* Item 2 */}
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
            onClick={onClose}
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
