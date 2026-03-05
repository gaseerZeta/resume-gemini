'use server';

// ============================================
// Resume CRUD Server Actions
// Paginated fetch, status updates, and stats
// ============================================

import { createServerSupabaseClient } from '@/lib/supabase/server';
import type {
    Resume,
    ResumeFilters,
    PaginatedResponse,
    ResumeStats,
} from '@/lib/types';

/**
 * Fetch resumes with server-side pagination using Supabase range(from, to).
 * Supports filtering by status, years of experience range, and text search.
 */
export async function fetchResumes(
    filters: ResumeFilters = {}
): Promise<PaginatedResponse<Resume>> {
    const {
        page = 1,
        pageSize = 10,
        status = 'all',
        minYears,
        maxYears,
        search,
    } = filters;

    const supabase = createServerSupabaseClient();

    // Build the query
    let query = supabase
        .from('resumes')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

    // Apply filters
    if (status && status !== 'all') {
        query = query.eq('status', status);
    }

    if (minYears !== undefined && minYears >= 0) {
        query = query.gte('years_of_experience', minYears);
    }

    if (maxYears !== undefined && maxYears >= 0) {
        query = query.lte('years_of_experience', maxYears);
    }

    if (search && search.trim()) {
        query = query.or(
            `full_name.ilike.%${search.trim()}%,email.ilike.%${search.trim()}%,executive_summary.ilike.%${search.trim()}%`
        );
    }

    // Apply pagination using range(from, to) — 0-indexed, inclusive
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, count, error } = await query;

    if (error) {
        throw new Error(`Failed to fetch resumes: ${error.message}`);
    }

    const total = count ?? 0;

    return {
        data: (data as Resume[]) || [],
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
    };
}

/**
 * Update the status of a resume (New → Shortlisted → Rejected).
 */
export async function updateResumeStatus(
    id: string,
    status: 'New' | 'Shortlisted' | 'Rejected'
): Promise<void> {
    const supabase = createServerSupabaseClient();

    const { error } = await supabase
        .from('resumes')
        .update({ status })
        .eq('id', id);

    if (error) {
        throw new Error(`Failed to update resume status: ${error.message}`);
    }
}

/**
 * Fetch a single resume by ID.
 */
export async function getResumeById(id: string): Promise<Resume | null> {
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
        .from('resumes')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        return null;
    }

    return data as Resume;
}

/**
 * Get aggregate stats for the dashboard.
 */
export async function getResumeStats(): Promise<ResumeStats> {
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
        .from('resume_stats')
        .select('*')
        .single();

    if (error) {
        // Return zero stats if the view query fails (e.g., empty table)
        return {
            total: 0,
            new_count: 0,
            shortlisted_count: 0,
            rejected_count: 0,
            avg_experience: 0,
        };
    }

    return {
        total: Number(data.total) || 0,
        new_count: Number(data.new_count) || 0,
        shortlisted_count: Number(data.shortlisted_count) || 0,
        rejected_count: Number(data.rejected_count) || 0,
        avg_experience: Number(data.avg_experience) || 0,
    };
}

/**
 * Delete a resume by ID.
 */
export async function deleteResume(id: string): Promise<void> {
    const supabase = createServerSupabaseClient();

    const { error } = await supabase.from('resumes').delete().eq('id', id);

    if (error) {
        throw new Error(`Failed to delete resume: ${error.message}`);
    }
}
