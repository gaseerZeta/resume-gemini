// ============================================
// Semantic Search / Job Matching API Route
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateEmbedding } from '@/lib/embeddings';
import { scoreResumeAgainstJob } from '@/lib/groq';
import type { MatchResult, MatchPreferences } from '@/lib/types';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { jobDescription, matchCount = 10, preferences } = body as {
            jobDescription: string;
            matchCount?: number;
            preferences?: MatchPreferences;
        };

        if (!jobDescription || typeof jobDescription !== 'string' || jobDescription.trim().length < 10) {
            return NextResponse.json(
                { error: 'Job description must be at least 10 characters.' },
                { status: 400 }
            );
        }

        // 1. Generate embedding for the job description
        const queryEmbedding = await generateEmbedding(jobDescription);

        // 2. Perform cosine similarity search via Supabase RPC
        const supabase = createServerSupabaseClient();
        const { data: matches, error } = await supabase.rpc('match_resumes', {
            query_embedding: JSON.stringify(queryEmbedding),
            match_threshold: 0.1,
            match_count: Math.min(matchCount, 20),
        });

        if (error) {
            console.error('Semantic search error:', error);
            return NextResponse.json(
                { error: `Semantic search failed: ${error.message}` },
                { status: 500 }
            );
        }

        if (!matches || matches.length === 0) {
            return NextResponse.json({ results: [], total: 0 });
        }

        // 3. Re-rank with Groq AI scoring (with rate limiting)
        // Forward preferences for advanced weighting
        const scoredResults: MatchResult[] = [];

        for (let i = 0; i < matches.length; i++) {
            const match = matches[i];

            try {
                // Add delay between scoring calls
                if (i > 0) {
                    await new Promise((resolve) => setTimeout(resolve, 300));
                }

                const score = await scoreResumeAgainstJob(
                    {
                        full_name: match.full_name,
                        skills: match.skills || [],
                        executive_summary: match.executive_summary || '',
                        years_of_experience: match.years_of_experience || 0,
                    },
                    jobDescription,
                    preferences // Forward preferences for weighted scoring
                );

                scoredResults.push({
                    ...match,
                    match_score: score.match_score,
                    match_reasoning: score.match_reasoning,
                });
            } catch {
                // If scoring fails, still include the result with similarity only
                scoredResults.push({
                    ...match,
                    match_score: Math.round(match.similarity * 100),
                    match_reasoning: 'AI scoring unavailable — ranked by semantic similarity.',
                });
            }
        }

        // Sort by match_score descending
        scoredResults.sort((a, b) => (b.match_score || 0) - (a.match_score || 0));

        return NextResponse.json({
            results: scoredResults,
            total: scoredResults.length,
        });
    } catch (error) {
        console.error('Match API error:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred during matching.' },
            { status: 500 }
        );
    }
}
