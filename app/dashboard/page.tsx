"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
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
import dynamic from "next/dynamic"
import KnowledgeCard from "@/components/KnowledgeCard"

const IngestionModal = dynamic(() => import("@/components/IngestionModal"), {
    ssr: false,
})

const ContradictionModal = dynamic(() => import("@/components/ContradictionModal"), {
    ssr: false,
})
import { BrainCircuitIcon } from "@/components/BrainCircuitIcon"
import { DashboardSkeleton } from "@/components/ui/skeleton"
import {
    getEntries,
    getAllEntries,
    getDashboardStats,
    getRecentContradictions,
} from "@/services/storageService"
import { createClient } from "@/lib/supabase/client"
import { ApiClientError, toUserFacingErrorMessage } from "@/lib/api/client-errors"
import type {
    KnowledgeEntry,
    FilterState,
    DashboardStats,
    ContradictionInsight,
} from "@/types"
import { useRouter } from "next/navigation"

const SEARCH_DEBOUNCE_MS = 300

export default function DashboardPage() {
    const router = useRouter()

    const [entries, setEntries] = useState<KnowledgeEntry[]>([])
    const [availableTags, setAvailableTags] = useState<string[]>([])
    const [currentPage, setCurrentPage] = useState(1)
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasMore: false,
    })
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isContradictionModalOpen, setIsContradictionModalOpen] = useState(false)
    const [allEntriesForContradictions, setAllEntriesForContradictions] = useState<KnowledgeEntry[]>([])
    const [userEmail, setUserEmail] = useState<string>("")
    const [isLoading, setIsLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [queryError, setQueryError] = useState<string | null>(null)
    const [statsError, setStatsError] = useState<string | null>(null)
    const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)
    const [recentContradictions, setRecentContradictions] = useState<ContradictionInsight[]>([])
    const [isLoadingRecentContradictions, setIsLoadingRecentContradictions] = useState(false)
    const [recentContradictionsError, setRecentContradictionsError] = useState<string | null>(null)

    // Filter state
    const [filters, setFilters] = useState<FilterState>({
        searchQuery: "",
        minQualityScore: 0,
        selectedTags: [],
        sourceFilter: "all",
    })
    const [showLowQuality, setShowLowQuality] = useState(false)
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")
    const entriesRequestIdRef = useRef(0)
    const entriesAbortControllerRef = useRef<AbortController | null>(null)

    const hasActiveFilters = useMemo(() => {
        return (
            filters.searchQuery.trim().length > 0 ||
            filters.minQualityScore > 0 ||
            filters.selectedTags.length > 0 ||
            filters.sourceFilter !== "all" ||
            showLowQuality
        )
    }, [filters, showLowQuality])

    useEffect(() => {
        const init = async () => {
            const supabase = createClient()
            const {
                data: { user },
            } = await supabase.auth.getUser()

            if (!user) {
                router.push("/auth/login")
                setIsLoading(false)
                return
            }

            setUserEmail(user.email || "")
            setIsAuthenticated(true)
        }
        init()
    }, [router])

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setDebouncedSearchQuery(filters.searchQuery.trim())
        }, SEARCH_DEBOUNCE_MS)

        return () => clearTimeout(timeoutId)
    }, [filters.searchQuery])

    const refreshData = useCallback(async () => {
        if (!isAuthenticated) return

        const requestId = entriesRequestIdRef.current + 1
        entriesRequestIdRef.current = requestId
        entriesAbortControllerRef.current?.abort()

        const abortController = new AbortController()
        entriesAbortControllerRef.current = abortController

        try {
            setIsRefreshing(true)
            setQueryError(null)

            const result = await getEntries({
                page: currentPage,
                limit: 20,
                searchQuery: debouncedSearchQuery,
                minQualityScore: filters.minQualityScore,
                selectedTags: filters.selectedTags,
                sourceFilter: filters.sourceFilter,
                showLowQuality,
            }, {
                signal: abortController.signal,
            })

            if (requestId !== entriesRequestIdRef.current || abortController.signal.aborted) {
                return
            }

            setEntries(result.data)
            setAvailableTags(result.availableTags)
            setPagination(result.pagination)
        } catch (error) {
            const isAbortError = error instanceof DOMException && error.name === "AbortError"
            if (isAbortError || abortController.signal.aborted || requestId !== entriesRequestIdRef.current) {
                return
            }

            console.error("Failed to load entries:", error)
            if (error instanceof ApiClientError && error.code === "UNAUTHORIZED") {
                router.push("/auth/login")
                return
            }
            if (error instanceof ApiClientError) {
                setQueryError(toUserFacingErrorMessage(error, "Failed to load entries"))
            } else {
                setQueryError("Failed to load entries. Please try again.")
            }
        } finally {
            if (requestId === entriesRequestIdRef.current) {
                setIsLoading(false)
                setIsRefreshing(false)
            }
        }
    }, [
        currentPage,
        debouncedSearchQuery,
        filters.minQualityScore,
        filters.selectedTags,
        filters.sourceFilter,
        isAuthenticated,
        router,
        showLowQuality,
    ])

    const refreshStats = useCallback(async () => {
        if (!isAuthenticated) return

        try {
            setStatsError(null)
            const stats = await getDashboardStats()
            setDashboardStats(stats)
        } catch (error) {
            console.error("Failed to load dashboard stats:", error)
            if (error instanceof ApiClientError && error.code === "UNAUTHORIZED") {
                router.push("/auth/login")
                return
            }
            if (error instanceof ApiClientError) {
                setStatsError(toUserFacingErrorMessage(error, "Unable to load dashboard insights right now."))
            } else {
                setStatsError("Unable to load dashboard insights right now.")
            }
        }
    }, [isAuthenticated, router])

    const refreshRecentContradictions = useCallback(async () => {
        if (!isAuthenticated) return

        try {
            setIsLoadingRecentContradictions(true)
            setRecentContradictionsError(null)
            const rows = await getRecentContradictions(6)
            setRecentContradictions(rows)
        } catch (error) {
            console.error("Failed to load recent contradictions:", error)
            if (error instanceof ApiClientError && error.code === "UNAUTHORIZED") {
                router.push("/auth/login")
                return
            }
            if (error instanceof ApiClientError) {
                setRecentContradictionsError(
                    toUserFacingErrorMessage(error, "Unable to load recent contradictions right now.")
                )
            } else {
                setRecentContradictionsError("Unable to load recent contradictions right now.")
            }
        } finally {
            setIsLoadingRecentContradictions(false)
        }
    }, [isAuthenticated, router])

    useEffect(() => {
        if (!isAuthenticated) return
        refreshData()
    }, [isAuthenticated, refreshData])

    useEffect(() => {
        if (!isAuthenticated) return
        refreshStats()
    }, [isAuthenticated, refreshStats])

    useEffect(() => {
        if (!isAuthenticated) return
        refreshRecentContradictions()
    }, [isAuthenticated, refreshRecentContradictions])

    useEffect(() => {
        return () => {
            entriesAbortControllerRef.current?.abort()
        }
    }, [])

    const handleDataMutation = useCallback(() => {
        void refreshData()
        void refreshStats()
        void refreshRecentContradictions()
    }, [refreshData, refreshStats, refreshRecentContradictions])

    const handleLogout = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push("/")
        router.refresh()
    }

    const toggleTag = useCallback((tag: string) => {
        setCurrentPage(1)
        setFilters((prev) => {
            const selectedTagsSet = new Set(prev.selectedTags)
            if (selectedTagsSet.has(tag)) {
                selectedTagsSet.delete(tag)
            } else {
                selectedTagsSet.add(tag)
            }
            return {
                ...prev,
                selectedTags: Array.from(selectedTagsSet),
            }
        })
    }, [])

    if (isLoading) {
        return <DashboardSkeleton />
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
                    <p className="text-xs text-gray-500 mt-1">AI Knowledge Curation Platform</p>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-8">
                    {/* Main Navigation */}
                    <nav className="space-y-1">
                        <button
                            onClick={() => {
                                setCurrentPage(1)
                                setFilters((f) => ({ ...f, sourceFilter: "all" }))
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${filters.sourceFilter === "all" ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-50"}`}
                        >
                            <Layout className="w-4 h-4" /> All Knowledge
                        </button>
                        <button
                            onClick={() => {
                                setCurrentPage(1)
                                setFilters((f) => ({ ...f, sourceFilter: "twitter" }))
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${filters.sourceFilter === "twitter" ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50"}`}
                        >
                            <Twitter className="w-4 h-4" /> Twitter / X
                        </button>
                        <button
                            onClick={() => {
                                setCurrentPage(1)
                                setFilters((f) => ({ ...f, sourceFilter: "blog" }))
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${filters.sourceFilter === "blog" ? "bg-purple-50 text-purple-700" : "text-gray-600 hover:bg-gray-50"}`}
                        >
                            <BookOpen className="w-4 h-4" /> Blog Posts
                        </button>
                        <button
                            onClick={() => {
                                setCurrentPage(1)
                                setFilters((f) => ({ ...f, sourceFilter: "youtube" }))
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${filters.sourceFilter === "youtube" ? "bg-red-50 text-red-700" : "text-gray-600 hover:bg-gray-50"}`}
                        >
                            <Youtube className="w-4 h-4" /> YouTube Videos
                        </button>
                        <button
                            onClick={async () => {
                                try {
                                    setQueryError(null)
                                    const allEntries = await getAllEntries()
                                    setAllEntriesForContradictions(allEntries)
                                    setIsContradictionModalOpen(true)
                                } catch (error) {
                                    console.error("Failed to load entries for contradiction analysis:", error)
                                    if (error instanceof ApiClientError && error.code === "UNAUTHORIZED") {
                                        router.push("/auth/login")
                                        return
                                    }
                                    if (error instanceof ApiClientError) {
                                        setQueryError(toUserFacingErrorMessage(error, "Failed to load entries for contradiction analysis"))
                                    } else {
                                        setQueryError("Failed to load entries for contradiction analysis.")
                                    }
                                }
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors text-orange-700 bg-orange-50 hover:bg-orange-100 mt-2"
                        >
                            <GitCompareArrows className="w-4 h-4" /> Run Tension Scan
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
                            onChange={(e) => {
                                setCurrentPage(1)
                                setFilters((f) => ({ ...f, minQualityScore: parseFloat(e.target.value) }))
                            }}
                            className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
                        />
                        <label className="flex items-center gap-2 text-xs">
                            <input
                                type="checkbox"
                                checked={showLowQuality}
                                onChange={(e) => {
                                    setCurrentPage(1)
                                    setShowLowQuality(e.target.checked)
                                }}
                                className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                            />
                            <span className="text-xs text-gray-500 cursor-pointer">
                                Show low quality (&lt;40%)
                            </span>
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
                            <h1 className="text-2xl font-bold text-gray-900">Knowledge Curation Workspace</h1>
                            <p className="text-gray-500 text-sm mt-1">
                                {pagination.total} {pagination.total === 1 ? "entry" : "entries"}
                                {filters.searchQuery && ` matching "${filters.searchQuery}"`}
                            </p>
                            {isRefreshing ? <p className="text-xs text-gray-400 mt-1">Updating results...</p> : null}
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-brand-500 transition-colors" />
                                <input
                                    type="text"
                                    value={filters.searchQuery}
                                    onChange={(e) => {
                                        setCurrentPage(1)
                                        setFilters((f) => ({ ...f, searchQuery: e.target.value }))
                                    }}
                                    placeholder="Search ideas..."
                                    className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm w-64 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none shadow-sm transition-all"
                                />
                            </div>
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg shadow-md shadow-brand-600/30 transition-all active:scale-95"
                            >
                                <Plus className="w-4 h-4" />
                                Curate New
                            </button>
                        </div>
                    </div>
                    {queryError ? (
                        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {queryError}
                        </div>
                    ) : null}
                    {statsError ? (
                        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                            {statsError}
                        </div>
                    ) : null}
                    {recentContradictionsError ? (
                        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                            {recentContradictionsError}
                        </div>
                    ) : null}

                    <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                        <div className="rounded-xl border border-gray-200 bg-white p-4">
                            <p className="text-xs uppercase tracking-wide text-gray-500">Total Insights</p>
                            <p className="mt-2 text-2xl font-semibold text-gray-900">{dashboardStats?.totalEntries ?? 0}</p>
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-white p-4">
                            <p className="text-xs uppercase tracking-wide text-gray-500">Avg Quality</p>
                            <p className="mt-2 text-2xl font-semibold text-gray-900">{dashboardStats?.averageQualityScore ?? 0}%</p>
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-white p-4">
                            <p className="text-xs uppercase tracking-wide text-gray-500">Favorites</p>
                            <p className="mt-2 text-2xl font-semibold text-gray-900">{dashboardStats?.favoriteEntries ?? 0}</p>
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-white p-4">
                            <p className="text-xs uppercase tracking-wide text-gray-500">Contradictions Tracked</p>
                            <p className="mt-2 text-2xl font-semibold text-gray-900">{dashboardStats?.contradictionCount ?? 0}</p>
                        </div>
                    </div>

                    <div className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="rounded-xl border border-gray-200 bg-white p-4">
                            <p className="text-xs uppercase tracking-wide text-gray-500">Source Mix</p>
                            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                                <div className="rounded-md bg-blue-50 px-3 py-2 text-blue-700">Twitter: {dashboardStats?.sourceBreakdown.twitter ?? 0}</div>
                                <div className="rounded-md bg-purple-50 px-3 py-2 text-purple-700">Blog: {dashboardStats?.sourceBreakdown.blog ?? 0}</div>
                                <div className="rounded-md bg-red-50 px-3 py-2 text-red-700">YouTube: {dashboardStats?.sourceBreakdown.youtube ?? 0}</div>
                                <div className="rounded-md bg-gray-100 px-3 py-2 text-gray-700">Other: {dashboardStats?.sourceBreakdown.other ?? 0}</div>
                            </div>
                            <p className="mt-3 text-xs text-gray-500">
                                Quality bands: high {dashboardStats?.qualityBands.high ?? 0}, medium {dashboardStats?.qualityBands.medium ?? 0}, low {dashboardStats?.qualityBands.low ?? 0}
                            </p>
                        </div>

                        <div className="rounded-xl border border-gray-200 bg-white p-4">
                            <p className="text-xs uppercase tracking-wide text-gray-500">Top Tags</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {(dashboardStats?.topTags || []).length === 0 ? (
                                    <span className="text-sm text-gray-400 italic">No tags yet</span>
                                ) : (
                                    (dashboardStats?.topTags || []).map((item) => (
                                        <span
                                            key={item.tag}
                                            className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-700"
                                        >
                                            <span>{item.tag}</span>
                                            <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold text-gray-600">{item.count}</span>
                                        </span>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="mb-8 rounded-xl border border-gray-200 bg-white p-4">
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <div>
                                <p className="text-xs uppercase tracking-wide text-gray-500">Knowledge Tensions</p>
                                <h2 className="text-lg font-semibold text-gray-900">Recent Contradictions</h2>
                            </div>
                            <button
                                onClick={() => void refreshRecentContradictions()}
                                className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                            >
                                Refresh
                            </button>
                        </div>

                        {isLoadingRecentContradictions ? (
                            <p className="text-sm text-gray-500">Loading recent contradictions...</p>
                        ) : recentContradictions.length === 0 ? (
                            <p className="text-sm text-gray-500">
                                No stored contradictions yet. Run contradiction analysis to populate this section.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {recentContradictions.map((item) => (
                                    <div key={item.id} className="rounded-lg border border-orange-200 bg-orange-50/40 p-3">
                                        <p className="text-sm font-medium text-gray-900">{item.description}</p>
                                        <div className="mt-2 grid gap-2 text-xs text-gray-600 md:grid-cols-2">
                                            <div className="rounded-md bg-white px-2 py-2">
                                                <p className="font-semibold text-gray-800">{item.item1.author} ({item.item1.sourceType})</p>
                                                <p className="mt-1 line-clamp-2">{item.item1.coreIdea}</p>
                                            </div>
                                            <div className="rounded-md bg-white px-2 py-2">
                                                <p className="font-semibold text-gray-800">{item.item2.author} ({item.item2.sourceType})</p>
                                                <p className="mt-1 line-clamp-2">{item.item2.coreIdea}</p>
                                            </div>
                                        </div>
                                        <p className="mt-2 text-[11px] text-gray-500">
                                            Logged {new Date(item.createdAt).toLocaleString()}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Content Grid */}
                    {pagination.total === 0 && !hasActiveFilters ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-gray-200 rounded-xl bg-white/50">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <BrainCircuitIcon className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900">Your mind is empty (for now)</h3>
                            <p className="text-gray-500 max-w-sm mt-2 mb-6">
                                Start by curating a tweet thread, blog post, or YouTube video to build your knowledge system.
                            </p>
                            <button onClick={() => setIsModalOpen(true)} className="text-brand-600 font-medium hover:underline">
                                Add your first item
                            </button>
                        </div>
                    ) : pagination.total === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <Filter className="w-10 h-10 text-gray-300 mb-3" />
                            <p className="text-gray-500">No items match your filters.</p>
                            <button
                                onClick={() => {
                                    setCurrentPage(1)
                                    setShowLowQuality(false)
                                    setFilters(() => ({ searchQuery: "", minQualityScore: 0, selectedTags: [], sourceFilter: "all" }))
                                }}
                                className="mt-2 text-brand-600 text-sm font-medium hover:underline"
                            >
                                Clear all filters
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-8">
                                {entries.map((entry) => (
                                    <KnowledgeCard key={entry.id} entry={entry} onUpdate={handleDataMutation} searchQuery={filters.searchQuery} />
                                ))}
                            </div>

                            {pagination.totalPages > 1 ? (
                                <div className="flex items-center justify-between py-4 border-t border-gray-200">
                                    <button
                                        onClick={() => setCurrentPage(Math.max(pagination.page - 1, 1))}
                                        disabled={pagination.page <= 1 || isRefreshing}
                                        className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                    >
                                        Previous
                                    </button>
                                    <p className="text-sm text-gray-600">
                                        Page {pagination.page} of {pagination.totalPages}
                                    </p>
                                    <button
                                        onClick={() => setCurrentPage(pagination.page + 1)}
                                        disabled={!pagination.hasMore || isRefreshing}
                                        className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                    >
                                        Next
                                    </button>
                                </div>
                            ) : null}
                        </>
                    )}
                </div>
            </main>

            <IngestionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={handleDataMutation} />
            <ContradictionModal
                isOpen={isContradictionModalOpen}
                onClose={() => {
                    setIsContradictionModalOpen(false)
                    setAllEntriesForContradictions([])
                }}
                onAnalyzed={handleDataMutation}
                entries={allEntriesForContradictions}
            />
        </div>
    )
}
