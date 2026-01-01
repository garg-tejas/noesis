"use client"

import { useState, useEffect, useMemo } from "react"
import {
    Search,
    Filter,
    Plus,
    Layout,
    Twitter,
    BookOpen,
    Youtube,
    GitCompareArrows,
    LogOut,
    User,
} from "lucide-react"
import KnowledgeCard from "@/components/KnowledgeCard"
import IngestionModal from "@/components/IngestionModal"
import ContradictionModal from "@/components/ContradictionModal"
import { BrainCircuitIcon } from "@/components/BrainCircuitIcon"
import { getEntries, getAllEntries } from "@/services/storageService"
import { createClient } from "@/lib/supabase/client"
import type { KnowledgeEntry, FilterState } from "@/types"
import { useRouter } from "next/navigation"

export default function DashboardPage() {
    const [entries, setEntries] = useState<KnowledgeEntry[]>([])
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isContradictionModalOpen, setIsContradictionModalOpen] = useState(false)
    const [allEntriesForContradictions, setAllEntriesForContradictions] = useState<KnowledgeEntry[]>([])
    const [userEmail, setUserEmail] = useState<string>("")
    const [isLoading, setIsLoading] = useState(true)
    const router = useRouter()

    // Filter State
    const [filters, setFilters] = useState<FilterState>({
        searchQuery: "",
        minQualityScore: 0,
        selectedTags: [],
        sourceFilter: "all",
    })

    const [showLowQuality, setShowLowQuality] = useState(false)

    useEffect(() => {
        const init = async () => {
            const supabase = createClient()
            const {
                data: { user },
            } = await supabase.auth.getUser()

            if (user) {
                setUserEmail(user.email || "")
                await refreshData()
            } else {
                router.push("/auth/login")
            }
            setIsLoading(false)
        }
        init()
    }, [router])

    const refreshData = async () => {
        try {
            const result = await getEntries()
            setEntries(result.data)
        } catch (error) {
            console.error("Failed to load entries:", error)
        }
    }

    const handleLogout = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push("/")
        router.refresh()
    }

    // Derive unique tags from data
    const availableTags = useMemo(() => {
        const tags = new Set<string>()
        entries.forEach((e) => e.distilled.tags.forEach((t) => tags.add(t)))
        return Array.from(tags).sort()
    }, [entries])

    // Filtering Logic
    const filteredEntries = useMemo(() => {
        return entries.filter((entry) => {
            if (!showLowQuality && entry.distilled.quality_score < 40) return false
            if (entry.distilled.quality_score < filters.minQualityScore) return false

            if (filters.sourceFilter !== "all" && entry.sourceType !== filters.sourceFilter) return false

            if (filters.selectedTags.length > 0) {
                const hasTag = filters.selectedTags.some((tag) => entry.distilled.tags.includes(tag))
                if (!hasTag) return false
            }

            if (filters.searchQuery) {
                const query = filters.searchQuery.toLowerCase()
                const contentMatch =
                    entry.distilled.core_ideas.some((i) => i.toLowerCase().includes(query)) ||
                    entry.distilled.context.toLowerCase().includes(query) ||
                    entry.author.toLowerCase().includes(query) ||
                    entry.distilled.tags.some((t) => t.toLowerCase().includes(query)) ||
                    (entry.userNotes && entry.userNotes.toLowerCase().includes(query))

                if (!contentMatch) return false
            }

            return true
        })
    }, [entries, filters, showLowQuality])

    const toggleTag = (tag: string) => {
        setFilters((prev) => ({
            ...prev,
            selectedTags: prev.selectedTags.includes(tag)
                ? prev.selectedTags.filter((t) => t !== tag)
                : [...prev.selectedTags, tag],
        }))
    }

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-center">
                    <BrainCircuitIcon className="w-12 h-12 text-brand-600 animate-pulse mx-auto mb-4" />
                    <p className="text-gray-500">Loading your knowledge base...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#F8F9FB] text-slate-900 font-sans flex">
            {/* Sidebar (Filters) */}
            <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col fixed h-full z-10">
                <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center gap-2 text-brand-600 font-bold text-lg">
                        <BrainCircuitIcon className="w-6 h-6" />
                        <span>Noesis</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Personal Knowledge Distiller</p>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-8">
                    {/* Main Navigation */}
                    <nav className="space-y-1">
                        <button
                            onClick={() => setFilters((f) => ({ ...f, sourceFilter: "all" }))}
                            className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${filters.sourceFilter === "all" ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-50"}`}
                        >
                            <Layout className="w-4 h-4" /> All Knowledge
                        </button>
                        <button
                            onClick={() => setFilters((f) => ({ ...f, sourceFilter: "twitter" }))}
                            className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${filters.sourceFilter === "twitter" ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50"}`}
                        >
                            <Twitter className="w-4 h-4" /> Twitter / X
                        </button>
                        <button
                            onClick={() => setFilters((f) => ({ ...f, sourceFilter: "blog" }))}
                            className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${filters.sourceFilter === "blog" ? "bg-purple-50 text-purple-700" : "text-gray-600 hover:bg-gray-50"}`}
                        >
                            <BookOpen className="w-4 h-4" /> Blog Posts
                        </button>
                        <button
                            onClick={() => setFilters((f) => ({ ...f, sourceFilter: "youtube" }))}
                            className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${filters.sourceFilter === "youtube" ? "bg-red-50 text-red-700" : "text-gray-600 hover:bg-gray-50"}`}
                        >
                            <Youtube className="w-4 h-4" /> YouTube Videos
                        </button>
                        <button
                            onClick={async () => {
                                try {
                                    const allEntries = await getAllEntries()
                                    setAllEntriesForContradictions(allEntries)
                                    setIsContradictionModalOpen(true)
                                } catch (error) {
                                    console.error("Failed to load entries for contradiction analysis:", error)
                                }
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors text-orange-700 bg-orange-50 hover:bg-orange-100 mt-2"
                        >
                            <GitCompareArrows className="w-4 h-4" /> Find Contradictions
                        </button>
                    </nav>

                    {/* Quality Filter */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Quality Threshold</h3>
                            <span className="text-xs font-medium text-gray-700">{Math.round(filters.minQualityScore)}</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={filters.minQualityScore}
                            onChange={(e) => setFilters((f) => ({ ...f, minQualityScore: parseFloat(e.target.value) }))}
                            className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
                        />
                        <label className="flex items-center gap-2 text-xs">
                            <input
                                type="checkbox"
                                checked={showLowQuality}
                                onChange={(e) => setShowLowQuality(e.target.checked)}
                                className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                            />
                            <label htmlFor="showLow" className="text-xs text-gray-500 cursor-pointer">
                                Show low quality (&lt;40%)
                            </label>
                        </label>
                    </div>

                    {/* Tags */}
                    <div>
                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Tags</h3>
                        <div className="flex flex-wrap gap-2">
                            {availableTags.length === 0 && <span className="text-xs text-gray-400 italic">No tags yet</span>}
                            {availableTags.map((tag) => (
                                <button
                                    key={tag}
                                    onClick={() => toggleTag(tag)}
                                    className={`px-2 py-1 text-xs rounded-md border transition-colors ${filters.selectedTags.includes(tag)
                                        ? "bg-brand-100 text-brand-700 border-brand-200"
                                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                                        }`}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* User Section */}
                <div className="p-4 border-t border-gray-100 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600 px-2">
                        <User className="w-4 h-4" />
                        <span className="truncate text-xs">{userEmail}</span>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 md:ml-64">
                <div className="p-6 md:p-8">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Knowledge Base</h1>
                            <p className="text-gray-500 text-sm mt-1">
                                {filteredEntries.length} {filteredEntries.length === 1 ? "insight" : "insights"}
                                {filters.searchQuery && ` matching "${filters.searchQuery}"`}
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-brand-500 transition-colors" />
                                <input
                                    type="text"
                                    value={filters.searchQuery}
                                    onChange={(e) => setFilters((f) => ({ ...f, searchQuery: e.target.value }))}
                                    placeholder="Search ideas..."
                                    className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm w-64 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none shadow-sm transition-all"
                                />
                            </div>
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg shadow-sm shadow-brand-200 transition-all active:scale-95"
                            >
                                <Plus className="w-4 h-4" />
                                Distill New
                            </button>
                        </div>
                    </div>

                    {/* Content Grid */}
                    {entries.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-gray-200 rounded-xl bg-white/50">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <BrainCircuitIcon className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900">Your mind is empty (for now)</h3>
                            <p className="text-gray-500 max-w-sm mt-2 mb-6">
                                Start by distilling a tweet thread, blog post, or YouTube video to build your personal knowledge base.
                            </p>
                            <button onClick={() => setIsModalOpen(true)} className="text-brand-600 font-medium hover:underline">
                                Add your first item
                            </button>
                        </div>
                    ) : filteredEntries.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <Filter className="w-10 h-10 text-gray-300 mb-3" />
                            <p className="text-gray-500">No items match your filters.</p>
                            <button
                                onClick={() => setFilters({ searchQuery: "", minQualityScore: 0, selectedTags: [], sourceFilter: "all" })}
                                className="mt-2 text-brand-600 text-sm font-medium hover:underline"
                            >
                                Clear all filters
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20">
                            {filteredEntries.map((entry) => (
                                <KnowledgeCard key={entry.id} entry={entry} onUpdate={refreshData} searchQuery={filters.searchQuery} />
                            ))}
                        </div>
                    )}
                </div>
            </main>

            <IngestionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={refreshData} />
            <ContradictionModal
                isOpen={isContradictionModalOpen}
                onClose={() => setIsContradictionModalOpen(false)}
                entries={allEntriesForContradictions}
            />
        </div>
    )
}
