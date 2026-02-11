export type SourceType = 'twitter' | 'blog' | 'youtube' | 'other';

export interface DistilledContent {
  core_ideas: string[];
  context: string;
  actionables: string[];
  tags: string[];
  quality_score: number;
}

export interface KnowledgeEntry {
  id: string;
  sourceType: SourceType;
  originalUrl: string;
  author: string;
  rawText?: string;
  distilled: DistilledContent;
  createdAt: number;
  isFavorite: boolean;
  userNotes?: string;
}

export interface FilterState {
  searchQuery: string;
  minQualityScore: number;
  selectedTags: string[];
  sourceFilter: SourceType | 'all';
}

export interface Contradiction {
  item1_id: string;
  item2_id: string;
  description: string;
}

export interface ContradictionRecord {
  id: string;
  userId: string;
  item1Id: string;
  item2Id: string;
  description: string;
  createdAt: string;
}

export interface SourceBreakdown {
  twitter: number;
  blog: number;
  youtube: number;
  other: number;
}

export interface TagCount {
  tag: string;
  count: number;
}

export interface QualityBands {
  high: number;
  medium: number;
  low: number;
}

export interface DashboardStats {
  totalEntries: number;
  favoriteEntries: number;
  contradictionCount: number;
  averageQualityScore: number;
  sourceBreakdown: SourceBreakdown;
  topTags: TagCount[];
  qualityBands: QualityBands;
}

export interface ContradictionInsightEntry {
  id: string;
  author: string;
  sourceType: SourceType;
  coreIdea: string;
}

export interface ContradictionInsight {
  id: string;
  description: string;
  createdAt: string;
  item1: ContradictionInsightEntry;
  item2: ContradictionInsightEntry;
}

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "RATE_LIMITED"
  | "VALIDATION_FAILED"
  | "BAD_REQUEST"
  | "CONFIG_ERROR"
  | "UPSTREAM_TIMEOUT"
  | "UPSTREAM_ERROR"
  | "INTERNAL_ERROR";

export interface ApiErrorResponse {
  error: string;
  code: ApiErrorCode;
  details?: unknown;
}
