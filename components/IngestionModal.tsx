"use client"

import type React from "react"
import { useState } from "react"
import { X, Loader2, Sparkles, AlertCircle } from "lucide-react"
import { saveEntry } from "../services/storageService"
import type { KnowledgeEntry, SourceType } from "../types"

interface IngestionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const IngestionModal: React.FC<IngestionModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [url, setUrl] = useState("")
  const [rawText, setRawText] = useState("")
  const [sourceType, setSourceType] = useState<SourceType>("twitter")
  const [author, setAuthor] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsProcessing(true)

    try {
      if (!rawText.trim()) {
        throw new Error("Please provide the content text. (Scraping is disabled in this demo)")
      }

      // Call API route instead of direct service call
      console.log("Starting distillation...", { sourceType, textLength: rawText.length })
      
      const response = await fetch("/api/distill", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rawText,
          sourceType,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        console.error("Distillation failed:", errorData)
        throw new Error(errorData.error || "Failed to distill content")
      }

      const distilledData = await response.json()
      console.log("Distillation successful:", distilledData)

      const newEntry: KnowledgeEntry = {
        id: crypto.randomUUID(),
        sourceType,
        originalUrl: url,
        author: author || "Unknown",
        rawText,
        distilled: distilledData,
        createdAt: Date.now(),
        isFavorite: false,
      }

      await saveEntry(newEntry)
      onSuccess()
      handleClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to distill content.")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClose = () => {
    setUrl("")
    setRawText("")
    setAuthor("")
    setSourceType("twitter")
    setError(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand-600" />
            Distill New Knowledge
          </h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3 text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <form id="ingest-form" onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source Type</label>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setSourceType("twitter")}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
                      sourceType === "twitter"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Twitter / X
                  </button>
                  <button
                    type="button"
                    onClick={() => setSourceType("blog")}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
                      sourceType === "blog" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Blog Post
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Author / Handle</label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder={sourceType === "twitter" ? "@username" : "Author Name"}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Original URL (Optional)</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Content to Distill
                <span className="ml-2 text-xs font-normal text-gray-400">(Paste the thread or article text here)</span>
              </label>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste the raw text content here..."
                rows={8}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all resize-none font-mono text-sm"
                required
              />
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="ingest-form"
            disabled={isProcessing || !rawText.trim()}
            className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Distilling...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Distill Knowledge
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default IngestionModal
