// ============================================
// Groq AI Extraction — Structured Resume Parsing
// ============================================

import Groq from 'groq-sdk';
import type { ResumeExtractionResult, MatchPreferences } from './types';

let groqClient: Groq | null = null;

function getGroqClient(): Groq {
    if (!groqClient) {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            throw new Error('Missing GROQ_API_KEY environment variable.');
        }
        groqClient = new Groq({ apiKey });
    }
    return groqClient;
}

const EXTRACTION_SYSTEM_PROMPT = `You are an expert resume parser. Extract structured data from the provided resume text.

You MUST respond with a valid JSON object containing exactly these fields:
{
  "full_name": "The candidate's full name",
  "email": "The candidate's email address (or empty string if not found)",
  "years_of_experience": <integer: total years of professional experience, estimate from work history dates>,
  "skills": ["array", "of", "technical", "and", "professional", "skills"],
  "executive_summary": "A concise 2-sentence professional summary highlighting the candidate's key strengths, expertise areas, and career trajectory."
}

Rules:
- years_of_experience must be a non-negative integer. If unclear, estimate conservatively.
- skills should include technical skills, tools, frameworks, programming languages, and soft skills mentioned.
- executive_summary should be exactly 2 sentences — the first about their core expertise, the second about their career highlights.
- If a field cannot be determined, use reasonable defaults (empty string for text, 0 for numbers, empty array for skills).
- Do NOT include any text outside the JSON object.`;

/**
 * Uses Groq (Llama-3) to extract structured resume data from raw text.
 * Constrained to: temperature=0, max_tokens=1000, JSON object response format.
 */
export async function extractResumeData(rawText: string): Promise<ResumeExtractionResult> {
    const groq = getGroqClient();

    const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
            { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
            { role: 'user', content: `Parse the following resume text and extract the structured data:\n\n${rawText.substring(0, 6000)}` },
        ],
        temperature: 0,
        max_tokens: 1000,
        response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
        throw new Error('Groq returned an empty response.');
    }

    const parsed = JSON.parse(content) as ResumeExtractionResult;

    // Validate and sanitize
    return {
        full_name: parsed.full_name || 'Unknown',
        email: parsed.email || '',
        years_of_experience: Math.max(0, Math.round(Number(parsed.years_of_experience) || 0)),
        skills: Array.isArray(parsed.skills) ? parsed.skills.filter(Boolean) : [],
        executive_summary: parsed.executive_summary || '',
    };
}

/**
 * Builds the scoring system prompt. When preferences are provided,
 * adds hard constraints for Location and Education that cap the score at 50.
 */
function buildScoringPrompt(preferences?: MatchPreferences): string {
    let prompt = `You are an expert technical recruiter AI. Score how well a candidate matches a job description.

Analyze the candidate's profile against the job requirements and provide:
1. A match_score from 0 to 100 (integer)
2. A brief match_reasoning (2-3 sentences) explaining the score

Consider:
- Skill overlap (technical skills, tools, frameworks)
- Experience level alignment
- Overall profile fit`;

    // Add hard constraints when advanced weighting is enabled
    if (preferences && (preferences.location || preferences.minEducation)) {
        prompt += `\n\nIMPORTANT — HARD CONSTRAINTS (Advanced Weighting Active):`;
        prompt += `\nLocation and Education are hard constraints. If the candidate does not meet these, the match_score MUST NOT exceed 50, regardless of skill overlap. You MUST explain the penalty clearly in match_reasoning.`;

        if (preferences.location) {
            prompt += `\n- REQUIRED LOCATION: "${preferences.location}". If the candidate's profile does not indicate availability for this location, apply the score cap of 50.`;
        }

        if (preferences.minEducation) {
            prompt += `\n- MINIMUM EDUCATION: "${preferences.minEducation}". If the candidate does not meet or exceed this education level, apply the score cap of 50.`;
        }
    }

    if (preferences?.prioritizeRecent) {
        prompt += `\n- RECENCY BONUS: Give a +5 to +10 bonus for candidates whose recent experience (last 2 years) is most relevant to the job requirements.`;
    }

    prompt += `\n\nRespond with ONLY a JSON object:
{
  "match_score": <0-100>,
  "match_reasoning": "Brief explanation..."
}`;

    return prompt;
}

/**
 * The "Matching" Prompt — Scores a resume against a specific Job Description.
 * Used to re-rank semantic search results with detailed reasoning.
 * Accepts optional preferences for advanced weighting (location/education hard constraints).
 */
export async function scoreResumeAgainstJob(
    resume: { full_name: string; skills: string[]; executive_summary: string; years_of_experience: number },
    jobDescription: string,
    preferences?: MatchPreferences
): Promise<{ match_score: number; match_reasoning: string }> {
    const groq = getGroqClient();

    const scoringPrompt = buildScoringPrompt(preferences);

    const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
            { role: 'system', content: scoringPrompt },
            {
                role: 'user',
                content: `JOB DESCRIPTION:\n${jobDescription}\n\nCANDIDATE PROFILE:\nName: ${resume.full_name}\nYears of Experience: ${resume.years_of_experience}\nSkills: ${resume.skills.join(', ')}\nSummary: ${resume.executive_summary}`,
            },
        ],
        temperature: 0,
        max_tokens: 300,
        response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
        return { match_score: 0, match_reasoning: 'Scoring failed — no response from AI.' };
    }

    const parsed = JSON.parse(content);
    return {
        match_score: Math.min(100, Math.max(0, Math.round(Number(parsed.match_score) || 0))),
        match_reasoning: parsed.match_reasoning || 'No reasoning provided.',
    };
}
