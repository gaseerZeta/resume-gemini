'use server';

// ============================================
// Batch Upload Server Action
// Handles multi-file upload with concurrent processing
// ============================================

import { extractTextFromPDF } from '@/lib/pdf-extract';
import { extractResumeData } from '@/lib/groq';
import { generateResumeEmbedding } from '@/lib/embeddings';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { BatchUploadResult, FileProcessingResult } from '@/lib/types';

const MAX_FILES = 10;
const RATE_LIMIT_DELAY_MS = 500; // Delay between Groq API calls

/**
 * Delays execution for rate-limit management.
 */
function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Process a single resume file: extract text → AI parse → embed → store.
 * Includes retry logic for transient Groq API failures.
 */
async function processSingleResume(
    file: File,
    index: number
): Promise<FileProcessingResult> {
    try {
        // 1. Stagger API calls to respect Groq rate limits
        if (index > 0) {
            await delay(index * RATE_LIMIT_DELAY_MS);
        }

        // 2. Extract text from PDF
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const rawText = await extractTextFromPDF(buffer);

        // 3. AI extraction with retry logic (max 2 retries)
        let extractedData;
        let lastError: Error | null = null;
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                extractedData = await extractResumeData(rawText);
                break;
            } catch (err) {
                lastError = err instanceof Error ? err : new Error(String(err));
                if (attempt < 2) {
                    await delay(1000 * (attempt + 1)); // Exponential backoff
                }
            }
        }

        if (!extractedData) {
            throw lastError || new Error('AI extraction failed after retries.');
        }

        // 4. Generate embedding from skills + executive summary
        const embedding = await generateResumeEmbedding(
            extractedData.skills,
            extractedData.executive_summary
        );

        // 5. Insert into Supabase
        const supabase = createServerSupabaseClient();
        const { data, error } = await supabase
            .from('resumes')
            .upsert(
                {
                    full_name: extractedData.full_name,
                    email: extractedData.email,
                    years_of_experience: extractedData.years_of_experience,
                    skills: extractedData.skills,
                    executive_summary: extractedData.executive_summary,
                    raw_text: rawText.substring(0, 10000), // Cap storage
                    file_name: file.name,
                    embedding: JSON.stringify(embedding),
                    status: 'New',
                },
                { onConflict: 'email,full_name', ignoreDuplicates: false }
            )
            .select('id')
            .single();

        if (error) {
            throw new Error(`Database insert failed: ${error.message}`);
        }

        return {
            fileName: file.name,
            status: 'success',
            data: extractedData,
            resumeId: data.id,
        };
    } catch (error) {
        return {
            fileName: file.name,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Batch upload server action.
 * Processes up to 10 PDF resumes concurrently using Promise.allSettled.
 * Handles partial failures gracefully — if 8 succeed and 2 fail,
 * the 8 are still saved.
 */
export async function batchUploadResumes(formData: FormData): Promise<BatchUploadResult> {
    const files = formData.getAll('files') as File[];

    // Validate file count
    if (files.length === 0) {
        return { total: 0, succeeded: 0, failed: 0, results: [] };
    }

    if (files.length > MAX_FILES) {
        return {
            total: files.length,
            succeeded: 0,
            failed: files.length,
            results: files.map((f) => ({
                fileName: f.name,
                status: 'error' as const,
                error: `Maximum ${MAX_FILES} files allowed per batch.`,
            })),
        };
    }

    // Validate file types
    const validFiles = files.filter((f) => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
    const invalidFiles = files.filter((f) => f.type !== 'application/pdf' && !f.name.endsWith('.pdf'));

    const invalidResults: FileProcessingResult[] = invalidFiles.map((f) => ({
        fileName: f.name,
        status: 'error' as const,
        error: 'Invalid file type. Only PDF files are accepted.',
    }));

    // Process valid files concurrently with Promise.allSettled
    const processingPromises = validFiles.map((file, index) =>
        processSingleResume(file, index)
    );

    const settled = await Promise.allSettled(processingPromises);

    const processedResults: FileProcessingResult[] = settled.map((result, index) => {
        if (result.status === 'fulfilled') {
            return result.value;
        }
        return {
            fileName: validFiles[index].name,
            status: 'error' as const,
            error: result.reason?.message || 'Processing failed unexpectedly.',
        };
    });

    const allResults = [...processedResults, ...invalidResults];
    const succeeded = allResults.filter((r) => r.status === 'success').length;

    return {
        total: allResults.length,
        succeeded,
        failed: allResults.length - succeeded,
        results: allResults,
    };
}
