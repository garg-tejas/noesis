"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback, memo } from "react"
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

const KnowledgeCard: React.FC<KnowledgeCardProps> = memo(({ entry, onUpdate, searchQuery }) => {
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

  const handleFavorite = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await toggleFavorite(entry.id)
      onUpdate()
    } catch (error) {
      console.error("Failed to toggle favorite:", error)
    }
  }, [entry.id, onUpdate])

  const handleDelete = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm("Are you sure you want to delete this insight?")) {
      try {
        await deleteEntry(entry.id)
        onUpdate()
      } catch (error) {
        console.error("Failed to delete entry:", error)
      }
    }
  }, [entry.id, onUpdate])

  const handleSaveNote = useCallback(async () => {
    if (isNoteDirty) {
      try {
        await updateEntry(entry.id, { userNotes: noteText })
        setIsNoteDirty(false)
        onUpdate()
      } catch (error) {
        console.error("Failed to save note:", error)
      }
    }
  }, [entry.id, isNoteDirty, noteText, onUpdate])

  const handleNoteChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNoteText(e.target.value)
    setIsNoteDirty(true)
  }, [])

  const handleBadgeClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsExpanded(true)
    // Small delay to allow render before focusing
    setTimeout(() => {
      textareaRef.current?.focus()
      textareaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
    }, 100)
  }, [])

  const qualityColor =
    distilled.quality_score >= 80
      ? "bg-primary/20 text-primary border-primary/40"
      : distilled.quality_score >= 50
        ? "bg-accent/20 text-accent border-accent/40"
        : "bg-destructive/20 text-destructive border-destructive/40"

  const isNoteMatch = searchQuery && noteText.toLowerCase().includes(searchQuery.toLowerCase())

  return (
    <div
      className={`group relative bg-card border-4 border-foreground shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[3px] hover:translate-y-[3px] transition-all duration-150 overflow-hidden flex flex-col ${isLowQuality ? "border-destructive bg-destructive/5" : ""
        }`}
    >
      {/* Neo-brutalist Header */}
      <div className="p-6 flex items-start gap-4">
        {/* Quality Score - Bold Box */}
        <div
          className={`flex-shrink-0 w-16 h-16 border-3 border-foreground flex flex-col items-center justify-center ${qualityColor} font-display font-bold`}
        >
          <span className="text-2xl leading-none">{Math.round(distilled.quality_score)}</span>
          <span className="text-[9px] uppercase tracking-wider opacity-80 font-mono font-bold">SCORE</span>
        </div>

        <div className="flex-grow min-w-0">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {isLowQuality && (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold font-mono uppercase bg-destructive text-white border-2 border-foreground shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <AlertTriangle className="w-3 h-3" /> LOW SIGNAL
              </span>
            )}
            {entry.sourceType === "twitter" ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold font-mono uppercase bg-[oklch(0.6_0.24_295)] text-white border-2 border-foreground shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <Twitter className="w-3 h-3" /> TWITTER
              </span>
            ) : entry.sourceType === "youtube" ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold font-mono uppercase bg-destructive text-white border-2 border-foreground shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <Youtube className="w-3 h-3" /> YOUTUBE
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold font-mono uppercase bg-secondary text-white border-2 border-foreground shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <BookOpen className="w-3 h-3" /> BLOG
              </span>
            )}
            <span className="text-xs text-muted-foreground font-mono font-bold uppercase tracking-wide">
              {entry.author} • {new Date(entry.createdAt).toLocaleDateString()}
            </span>
          </div>

          <h3 className="font-display text-xl font-bold leading-tight line-clamp-2 mb-3">
            {distilled.core_ideas[0] || "No core ideas found"}
          </h3>

          <div className="flex flex-wrap gap-2">
            {distilled.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center text-xs font-mono font-bold bg-muted px-2 py-1 border-2 border-foreground"
              >
                <Tag className="w-3 h-3 mr-1" />
                {tag}
              </span>
            ))}
            {entry.userNotes ? (
              <button
                onClick={handleBadgeClick}
                className={`inline-flex items-center text-xs font-mono font-bold px-2 py-1 border-2 border-foreground transition-all ${isNoteMatch
                  ? "bg-primary text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  : "bg-accent/20 text-accent hover:bg-accent/30"
                  }`}
              >
                <PenLine className="w-3 h-3 mr-1" /> NOTE
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleFavorite}
            className={`p-2 border-2 border-foreground hover:bg-primary hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] ${entry.isFavorite ? "bg-primary text-white" : "bg-card"
              }`}
          >
            <Star className={`w-4 h-4 ${entry.isFavorite ? "fill-current" : ""}`} />
          </button>
          {entry.originalUrl && (
            <a
              href={entry.originalUrl}
              target="_blank"
              rel="noreferrer"
              className="p-2 border-2 border-foreground bg-card hover:bg-secondary hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
          <button
            onClick={handleDelete}
            className="p-2 border-2 border-foreground bg-card hover:bg-destructive hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Actionables Highlight - Neo-brutalist */}
      {distilled.actionables.length > 0 ? (
        <div className="px-6 pb-6">
          <div className="flex items-start gap-3 bg-accent/10 border-2 border-accent/40 p-4">
            <Zap className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
            <p className="text-sm font-medium line-clamp-2">{distilled.actionables[0]}</p>
          </div>
        </div>
      ) : null}

      {/* Expand/Collapse Toggle - Bold */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full py-3 bg-foreground text-background hover:bg-primary transition-colors border-t-4 border-foreground flex items-center justify-center font-mono text-xs font-bold uppercase tracking-wider gap-2"
      >
        {isExpanded ? (
          <>
            COLLAPSE <ChevronUp className="w-4 h-4" />
          </>
        ) : (
          <>
            FULL DETAILS <ChevronDown className="w-4 h-4" />
          </>
        )}
      </button>

      {/* Expanded Content - Editorial */}
      {isExpanded ? (
        <div className="p-6 border-t-4 border-foreground bg-muted/30 space-y-6 text-sm animate-slide-in-bottom">
          <div className="space-y-2">
            <h4 className="font-display font-bold text-sm uppercase tracking-wider border-b-2 border-foreground pb-1">
              Context
            </h4>
            <p className="text-foreground/80 leading-relaxed">{distilled.context}</p>
          </div>

          <div className="space-y-3">
            <h4 className="font-display font-bold text-sm uppercase tracking-wider border-b-2 border-foreground pb-1">
              Core Ideas
            </h4>
            <ul className="space-y-2">
              {distilled.core_ideas.map((idea, idx) => (
                <li key={idx} className="flex items-start gap-3 bg-card border-2 border-foreground p-3">
                  <span className="flex items-center justify-center w-6 h-6 bg-primary text-white font-display font-bold text-sm flex-shrink-0">
                    {idx + 1}
                  </span>
                  <span className="text-foreground/90">{idea}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-display font-bold text-sm uppercase tracking-wider border-b-2 border-accent pb-1 text-accent flex items-center gap-2">
              <Zap className="w-4 h-4" /> Actionables
            </h4>
            <ul className="space-y-2">
              {distilled.actionables.map((action, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-3 bg-accent/10 border-2 border-accent/40 p-3 hover:bg-accent/20 transition-colors"
                >
                  <span className="flex items-center justify-center w-6 h-6 bg-accent text-white font-display font-bold text-sm flex-shrink-0">
                    {idx + 1}
                  </span>
                  <span className="text-foreground/90 font-medium">{action}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* User Notes Section - Warm Accent */}
          <div
            className={`space-y-2 pt-4 border-t-4 border-foreground ${isNoteMatch ? "bg-primary/10 -mx-6 px-6 py-4" : ""
              }`}
          >
            <div className="flex items-center justify-between">
              <h4 className="font-display font-bold text-sm uppercase tracking-wider flex items-center gap-2 text-primary">
                <PenLine className="w-4 h-4" /> My Notes
              </h4>
              {isNoteDirty && (
                <span className="text-xs text-accent font-mono font-bold animate-pulse">UNSAVED</span>
              )}
            </div>
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={noteText}
                onChange={handleNoteChange}
                placeholder="Add your thoughts, connections, or reflections..."
                className={`w-full min-h-[120px] p-4 border-2 bg-card focus:bg-background focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none text-sm resize-none overflow-hidden transition-all ${isNoteMatch ? "border-primary ring-4 ring-primary/20" : "border-foreground/20"
                  }`}
                onBlur={handleSaveNote}
              />
              {isNoteDirty && (
                <button
                  onClick={handleSaveNote}
                  className="absolute bottom-3 right-3 p-2 bg-primary text-white border-2 border-foreground shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                  title="Save Note"
                >
                  <Save className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="pt-2">
            <h4 className="font-display font-bold text-sm uppercase tracking-wider mb-2">Raw Text</h4>
            <div className="text-xs text-muted-foreground bg-muted p-3 border-2 border-foreground/10 font-mono truncate">
              {entry.rawText?.substring(0, 150)}...
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
})

KnowledgeCard.displayName = "KnowledgeCard"

export default KnowledgeCard
