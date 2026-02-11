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

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "VALIDATION_FAILED"
  | "BAD_REQUEST"
  | "CONFIG_ERROR"
  | "INTERNAL_ERROR";

export interface ApiErrorResponse {
  error: string;
  code: ApiErrorCode;
  details?: unknown;
}
