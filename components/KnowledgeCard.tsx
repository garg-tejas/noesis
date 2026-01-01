"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import type { KnowledgeEntry } from "../types"
import {
  ExternalLink,
  Trash2,
  Twitter,
  BookOpen,
  Youtube,
  ChevronDown,
  ChevronUp,
  Star,
  Zap,
  Tag,
  PenLine,
  Save,
  AlertTriangle,
} from "lucide-react"
import { toggleFavorite, deleteEntry, updateEntry } from "../services/storageService"

interface KnowledgeCardProps {
  entry: KnowledgeEntry
  onUpdate: () => void
  searchQuery?: string
}

const KnowledgeCard: React.FC<KnowledgeCardProps> = ({ entry, onUpdate, searchQuery }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [noteText, setNoteText] = useState(entry.userNotes || "")
  const [isNoteDirty, setIsNoteDirty] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { distilled } = entry
  const isLowQuality = distilled.quality_score < 40

  // Auto-resize textarea
  useEffect(() => {
    if (isExpanded && textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px"
    }
  }, [noteText, isExpanded])

  const handleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await toggleFavorite(entry.id)
      onUpdate()
    } catch (error) {
      console.error("Failed to toggle favorite:", error)
    }
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm("Are you sure you want to delete this insight?")) {
      try {
        await deleteEntry(entry.id)
        onUpdate()
      } catch (error) {
        console.error("Failed to delete entry:", error)
      }
    }
  }

  const handleSaveNote = async () => {
    if (isNoteDirty) {
      try {
        await updateEntry(entry.id, { userNotes: noteText })
        setIsNoteDirty(false)
        onUpdate()
      } catch (error) {
        console.error("Failed to save note:", error)
      }
    }
  }

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNoteText(e.target.value)
    setIsNoteDirty(true)
  }

  const handleBadgeClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsExpanded(true)
    // Small delay to allow render before focusing
    setTimeout(() => {
      textareaRef.current?.focus()
      textareaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
    }, 100)
  }

  const qualityColor =
    distilled.quality_score >= 80
      ? "bg-green-100 text-green-700 border-green-200"
      : distilled.quality_score >= 50
        ? "bg-yellow-100 text-yellow-700 border-yellow-200"
        : "bg-red-100 text-red-700 border-red-200"

  const isNoteMatch = searchQuery && noteText.toLowerCase().includes(searchQuery.toLowerCase())

  return (
    <div
      className={`group rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col ${isLowQuality ? "border-red-200 bg-red-50/20" : "bg-white border-gray-200"}`}
    >
      {/* Header */}
      <div className="p-5 flex items-start gap-4">
        {/* Quality Score Indicator */}
        <div
          className={`flex-shrink-0 w-12 h-12 rounded-lg flex flex-col items-center justify-center border ${qualityColor}`}
        >
          <span className="text-sm font-bold">{Math.round(distilled.quality_score)}</span>
          <span className="text-[10px] uppercase font-medium tracking-tighter opacity-80">Score</span>
        </div>

        <div className="flex-grow min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {isLowQuality && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                <AlertTriangle className="w-3 h-3" /> Low Signal
              </span>
            )}
            {entry.sourceType === "twitter" ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-600">
                <Twitter className="w-3 h-3" /> Twitter
              </span>
            ) : entry.sourceType === "youtube" ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-600">
                <Youtube className="w-3 h-3" /> YouTube
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-600">
                <BookOpen className="w-3 h-3" /> Blog
              </span>
            )}
            <span className="text-xs text-gray-400 font-medium truncate">
              {entry.author} • {new Date(entry.createdAt).toLocaleDateString()}
            </span>
          </div>

          <h3 className="text-gray-900 font-semibold leading-tight line-clamp-2 mb-2">
            {distilled.core_ideas[0] || "No core ideas found"}
          </h3>

          <div className="flex flex-wrap gap-2">
            {distilled.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full"
              >
                <Tag className="w-3 h-3 mr-1 opacity-50" />
                {tag}
              </span>
            ))}
            {entry.userNotes && (
              <button
                onClick={handleBadgeClick}
                className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full transition-colors ${isNoteMatch ? "bg-amber-200 text-amber-800 border border-amber-300 ring-2 ring-amber-100" : "text-amber-600 bg-amber-50 border border-amber-200 hover:bg-amber-100"}`}
              >
                <PenLine className="w-3 h-3 mr-1" /> Note added
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleFavorite}
            className={`p-1.5 rounded-md hover:bg-gray-100 transition-colors ${entry.isFavorite ? "text-amber-400 opacity-100" : "text-gray-400"}`}
          >
            <Star className={`w-4 h-4 ${entry.isFavorite ? "fill-current" : ""}`} />
          </button>
          {entry.originalUrl && (
            <a
              href={entry.originalUrl}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-brand-600 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
          <button
            onClick={handleDelete}
            className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Actionables Teaser (Always Visible if High Value) */}
      {distilled.actionables.length > 0 && (
        <div className="px-5 pb-4">
          <div className="flex items-start gap-2 bg-brand-50 rounded-lg p-3 text-sm text-brand-900">
            <Zap className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
            <p className="line-clamp-2">{distilled.actionables[0]}</p>
          </div>
        </div>
      )}

      {/* Expand/Collapse Toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full py-2 bg-gray-50 hover:bg-gray-100 border-t border-gray-100 flex items-center justify-center text-xs font-medium text-gray-500 transition-colors gap-1"
      >
        {isExpanded ? (
          <>
            Less Details <ChevronUp className="w-3 h-3" />
          </>
        ) : (
          <>
            Full Distillation <ChevronDown className="w-3 h-3" />
          </>
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-5 border-t border-gray-100 bg-gray-50/50 space-y-6 text-sm animate-in slide-in-from-top-2 fade-in duration-200">
          <div className="space-y-1">
            <h4 className="font-semibold text-gray-900 text-xs uppercase tracking-wider">Context</h4>
            <p className="text-gray-600 leading-relaxed">{distilled.context}</p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-gray-900 text-xs uppercase tracking-wider">Core Ideas</h4>
            <ul className="list-disc pl-4 space-y-1 text-gray-700">
              {distilled.core_ideas.map((idea, idx) => (
                <li key={idx} className="pl-1 marker:text-gray-400">
                  {idea}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-brand-800 text-xs uppercase tracking-wider flex items-center gap-1">
              <Zap className="w-3 h-3" /> Actionables
            </h4>
            <ul className="list-none space-y-2">
              {distilled.actionables.map((action, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-gray-800 bg-white p-2 rounded border border-gray-200 shadow-sm"
                >
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-brand-100 text-brand-600 text-xs font-bold flex-shrink-0">
                    {idx + 1}
                  </span>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* User Notes Section */}
          <div
            className={`space-y-2 pt-2 border-t border-gray-200 ${isNoteMatch ? "bg-amber-50/50 -mx-5 px-5 py-3" : ""}`}
          >
            <div className="flex items-center justify-between">
              <h4
                className={`font-semibold text-xs uppercase tracking-wider flex items-center gap-1 ${isNoteMatch ? "text-amber-700" : "text-amber-700"}`}
              >
                <PenLine className="w-3 h-3" /> My Notes
              </h4>
              {isNoteDirty && <span className="text-xs text-amber-600 italic animate-pulse">Unsaved changes...</span>}
            </div>
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={noteText}
                onChange={handleNoteChange}
                placeholder="Add your personal thoughts, reflections, or connections here..."
                className={`w-full min-h-[100px] p-3 rounded-lg border bg-amber-50 focus:bg-white focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none text-gray-800 text-sm resize-none overflow-hidden transition-colors ${isNoteMatch ? "border-amber-300 ring-2 ring-amber-100" : "border-amber-200"}`}
                onBlur={handleSaveNote}
              />
              {isNoteDirty && (
                <button
                  onClick={handleSaveNote}
                  className="absolute bottom-2 right-2 p-1.5 bg-amber-500 text-white rounded-md hover:bg-amber-600 shadow-sm transition-colors"
                  title="Save Note"
                >
                  <Save className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-gray-200">
            <h4 className="font-semibold text-gray-900 text-xs uppercase tracking-wider mb-2">Raw Text Snippet</h4>
            <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded font-mono truncate">
              {entry.rawText?.substring(0, 150)}...
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default KnowledgeCard
