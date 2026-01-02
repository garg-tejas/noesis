"use client"

import React from "react"

interface SkeletonProps {
  className?: string
}

// Base skeleton component with neo-brutalist styling
export const Skeleton: React.FC<SkeletonProps> = ({ className = "" }) => {
  return (
    <div
      className={`animate-pulse bg-muted border-2 border-foreground/10 ${className}`}
      aria-hidden="true"
    />
  )
}

// Knowledge card skeleton loader
export const KnowledgeCardSkeleton: React.FC = () => {
  return (
    <div className="bg-card border-4 border-foreground/20 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)] overflow-hidden">
      <div className="p-6 flex items-start gap-4">
        {/* Quality score skeleton */}
        <Skeleton className="flex-shrink-0 w-16 h-16" />

        <div className="flex-grow space-y-3">
          {/* Badges skeleton */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-32" />
          </div>

          {/* Title skeleton */}
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-7 w-1/2" />

          {/* Tags skeleton */}
          <div className="flex flex-wrap gap-2 pt-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-24" />
          </div>
        </div>

        {/* Action buttons skeleton */}
        <div className="flex flex-col gap-2">
          <Skeleton className="w-8 h-8" />
          <Skeleton className="w-8 h-8" />
          <Skeleton className="w-8 h-8" />
        </div>
      </div>

      {/* Actionables preview skeleton */}
      <div className="px-6 pb-6">
        <Skeleton className="h-16 w-full" />
      </div>

      {/* Expand button skeleton */}
      <div className="w-full py-3 bg-foreground/5 border-t-4 border-foreground/10" />
    </div>
  )
}

// Grid of knowledge card skeletons
interface KnowledgeGridSkeletonProps {
  count?: number
}

export const KnowledgeGridSkeleton: React.FC<KnowledgeGridSkeletonProps> = ({ count = 6 }) => {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <KnowledgeCardSkeleton key={i} />
      ))}
    </div>
  )
}

// Sidebar filter skeleton
export const SidebarSkeleton: React.FC = () => {
  return (
    <div className="w-80 bg-sidebar border-r-4 border-foreground p-6 space-y-6">
      {/* Logo skeleton */}
      <div className="flex items-center gap-3 mb-8">
        <Skeleton className="w-8 h-8" />
        <Skeleton className="h-8 w-32" />
      </div>

      {/* Search skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-10 w-full" />
      </div>

      {/* Button skeleton */}
      <Skeleton className="h-12 w-full" />

      {/* Filter sections */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-5 w-24" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-3/4" />
          </div>
        </div>
      ))}

      {/* Quality slider skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-2 w-full" />
        <Skeleton className="h-6 w-20" />
      </div>
    </div>
  )
}

// Dashboard loading skeleton
export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="flex min-h-screen bg-background">
      <SidebarSkeleton />
      <div className="flex-1 p-8">
        {/* Header skeleton */}
        <div className="mb-8 space-y-3">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-6 w-96" />
        </div>

        {/* Grid skeleton */}
        <KnowledgeGridSkeleton count={6} />
      </div>
    </div>
  )
}

// Button loading state
interface ButtonSkeletonProps {
  className?: string
}

export const ButtonSkeleton: React.FC<ButtonSkeletonProps> = ({ className = "" }) => {
  return (
    <div
      className={`inline-flex items-center justify-center gap-2 px-6 py-3 bg-muted/50 border-2 border-foreground/20 ${className}`}
    >
      <div className="w-4 h-4 border-2 border-foreground/30 border-t-foreground animate-spin rounded-full" />
      <span className="text-muted-foreground font-mono text-sm font-bold">LOADING...</span>
    </div>
  )
}

// Inline text skeleton with shimmer effect
export const TextSkeleton: React.FC<SkeletonProps> = ({ className = "" }) => {
  return (
    <span className={`inline-block relative overflow-hidden bg-muted/50 ${className}`}>
      <span className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-background/50 to-transparent" />
    </span>
  )
}
