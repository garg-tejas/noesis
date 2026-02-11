"use client"

import type React from "react"
import { useState, useCallback } from "react"
import { X, Loader2, Sparkles, AlertCircle } from "lucide-react"
import { saveEntry } from "../services/storageService"
import type { KnowledgeEntry, SourceType } from "../types"
import { ApiClientError, toApiClientError, toUserFacingErrorMessage } from "@/lib/api/client-errors"
import { useRouter } from "next/navigation"

interface IngestionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const IngestionModal: React.FC<IngestionModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const router = useRouter()
  const [url, setUrl] = useState("")
  const [rawText, setRawText] = useState("")
  const [sourceType, setSourceType] = useState<SourceType>("twitter")
  const [author, setAuthor] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClose = useCallback(() => {
    setUrl("")
    setRawText("")
    setAuthor("")
    setSourceType("twitter")
    setError(null)
    onClose()
  }, [onClose])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsProcessing(true)

    try {
      // For YouTube, validate URL is provided
      if (sourceType === "youtube") {
        if (!url.trim()) {
          throw new Error("Please provide a YouTube URL")
        }
      } else {
        // For non-YouTube sources, require raw text
        if (!rawText.trim()) {
          throw new Error("Please provide the content text.")
        }
      }

      console.log("Starting distillation...", { sourceType, hasUrl: !!url, textLength: rawText?.length || 0 })

      const response = await fetch("/api/distill", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rawText: sourceType === "youtube" ? undefined : rawText,
          sourceType,
          youtubeUrl: sourceType === "youtube" ? url : undefined,
        }),
      })
      const payload: unknown = await response.json().catch(() => null)

      if (!response.ok) {
        const apiError = toApiClientError(response, payload, "Failed to distill content")
        console.error("Distillation failed:", apiError)
        throw apiError
      }

      const distilledData = payload as KnowledgeEntry["distilled"]
      console.log("Distillation successful:", distilledData)

      const newEntry: KnowledgeEntry = {
        id: crypto.randomUUID(),
        sourceType,
        originalUrl: url,
        author: author || (sourceType === "youtube" ? "YouTube Video" : "Unknown"),
        rawText: sourceType === "youtube" ? undefined : rawText,
        distilled: distilledData,
        createdAt: Date.now(),
        isFavorite: false,
      }

      await saveEntry(newEntry)
      onSuccess()
      handleClose()
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        if (err.code === "UNAUTHORIZED") {
          router.push("/auth/login")
        }
        setError(toUserFacingErrorMessage(err, "Failed to distill content."))
      } else {
        setError(err instanceof Error ? err.message : "Failed to distill content.")
      }
    } finally {
      setIsProcessing(false)
    }
  }, [author, handleClose, onSuccess, rawText, router, sourceType, url])

  const isYouTube = sourceType === "youtube"
  const isSubmitDisabled = isProcessing || (isYouTube ? !url.trim() : !rawText.trim())

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand-600" />
            Curate New Knowledge
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source Type</label>
              <div className="flex bg-gray-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setSourceType("twitter")}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${sourceType === "twitter"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                    }`}
                >
                  Twitter / X
                </button>
                <button
                  type="button"
                  onClick={() => setSourceType("blog")}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${sourceType === "blog" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                    }`}
                >
                  Blog Post
                </button>
                <button
                  type="button"
                  onClick={() => setSourceType("youtube")}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${sourceType === "youtube" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                    }`}
                >
                  YouTube
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className={isYouTube ? "col-span-2" : ""}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isYouTube ? "YouTube URL" : "Original URL (Optional)"}
                  {isYouTube && <span className="text-red-500 ml-1">*</span>}
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={isYouTube ? "https://youtube.com/watch?v=..." : "https://..."}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                  required={isYouTube}
                />
                {isYouTube && (
                  <p className="mt-1 text-xs text-gray-500">
                    We'll process the video directly from YouTube
                  </p>
                )}
              </div>

              {!isYouTube && (
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
              )}
            </div>

            {isYouTube && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Channel Name (Optional)</label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Channel name"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                />
              </div>
            )}

            {!isYouTube && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Content to Curate
                  <span className="ml-2 text-xs font-normal text-gray-400">(Paste the thread or article text here)</span>
                </label>
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Paste the raw text content here..."
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all resize-none font-mono text-sm"
                  required={!isYouTube}
                />
              </div>
            )}
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
            disabled={isSubmitDisabled}
            className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Curating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Curate Knowledge
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default IngestionModal
