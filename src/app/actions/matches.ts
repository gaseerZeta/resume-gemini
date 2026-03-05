'use server';

// ============================================
// Job Match CRUD Server Actions
// Save, list, and delete match results from job_matches table
// ============================================

import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { SavedMatch } from '@/lib/types';

/**
 * Save a match result to the job_matches table.
 */
export async function saveMatch(data: {
    candidateId: string;
    jobDescription: string;
    finalScore: number;
    reasoning: string;
    metadata?: Record<string, unknown>;
}): Promise<{ id: string }> {
    const supabase = createServerSupabaseClient();

    const { data: result, error } = await supabase
        .from('job_matches')
        .insert({
            candidate_id: data.candidateId,
            job_description: data.jobDescription,
            final_score: data.finalScore,
            reasoning: data.reasoning,
            metadata: data.metadata || {},
        })
        .select('id')
        .single();

    if (error) {
        throw new Error(`Failed to save match: ${error.message}`);
    }

    return { id: result.id };
}

/**
 * Fetch all saved matches, joined with resume candidate info.
 * Ordered by most recent first.
 */
export async function fetchSavedMatches(): Promise<SavedMatch[]> {
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
        .from('job_matches')
        .select(`
            id,
            candidate_id,
            job_description,
            final_score,
            reasoning,
            metadata,
            created_at,
            resumes!candidate_id (
                full_name,
                email,
                skills
            )
        `)
        .order('created_at', { ascending: false });

    if (error) {
        throw new Error(`Failed to fetch saved matches: ${error.message}`);
    }

    // Flatten the join
    return (data || []).map((row: Record<string, unknown>) => {
        const resume = row.resumes as Record<string, unknown> | null;
        return {
            id: row.id as string,
            candidate_id: row.candidate_id as string,
            job_description: row.job_description as string,
            final_score: row.final_score as number,
            reasoning: row.reasoning as string | null,
            metadata: (row.metadata || {}) as Record<string, unknown>,
            created_at: row.created_at as string,
            full_name: (resume?.full_name as string) || 'Unknown',
            email: (resume?.email as string) || '',
            skills: (resume?.skills as string[]) || [],
        };
    });
}

/**
 * Delete a saved match by ID.
 */
export async function deleteSavedMatch(id: string): Promise<void> {
    const supabase = createServerSupabaseClient();

    const { error } = await supabase
        .from('job_matches')
        .delete()
        .eq('id', id);

    if (error) {
        throw new Error(`Failed to delete match: ${error.message}`);
    }
}
