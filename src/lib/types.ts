// ============================================
// Type Definitions — AI Resume Intelligence Platform
// ============================================

export type ResumeStatus = 'New' | 'Shortlisted' | 'Rejected';

export interface Resume {
  id: string;
  full_name: string;
  email: string | null;
  years_of_experience: number;
  skills: string[];
  executive_summary: string | null;
  raw_text: string | null;
  file_name: string;
  status: ResumeStatus;
  embedding?: number[];
  created_at: string;
  updated_at: string;
}

export interface ResumeExtractionResult {
  full_name: string;
  email: string;
  years_of_experience: number;
  skills: string[];
  executive_summary: string;
}

export interface FileProcessingResult {
  fileName: string;
  status: 'success' | 'error';
  data?: ResumeExtractionResult;
  error?: string;
  resumeId?: string;
}

export interface BatchUploadResult {
  total: number;
  succeeded: number;
  failed: number;
  results: FileProcessingResult[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ResumeFilters {
  page?: number;
  pageSize?: number;
  status?: ResumeStatus | 'all';
  minYears?: number;
  maxYears?: number;
  search?: string;
}

export interface MatchResult {
  id: string;
  full_name: string;
  email: string | null;
  years_of_experience: number;
  skills: string[];
  executive_summary: string | null;
  status: string;
  file_name: string;
  similarity: number;
  match_score?: number;
  match_reasoning?: string;
  created_at: string;
}

export interface ResumeStats {
  total: number;
  new_count: number;
  shortlisted_count: number;
  rejected_count: number;
  avg_experience: number;
}

export interface MatchPreferences {
  location?: string;
  minEducation?: string;
  prioritizeRecent?: boolean;
}

export interface SavedMatch {
  id: string;
  candidate_id: string;
  job_description: string;
  final_score: number;
  reasoning: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  // Joined from resumes table
  full_name?: string;
  email?: string;
  skills?: string[];
}
