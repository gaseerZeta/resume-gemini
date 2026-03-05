-- ============================================
-- AI Resume Intelligence Platform — Supabase Schema
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create resumes table
CREATE TABLE IF NOT EXISTS resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT,
  years_of_experience INTEGER DEFAULT 0,
  skills TEXT[] DEFAULT '{}',
  executive_summary TEXT,
  raw_text TEXT,
  file_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'New' CHECK (status IN ('New', 'Shortlisted', 'Rejected')),
  embedding vector(384),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create index for fast cosine similarity search
CREATE INDEX IF NOT EXISTS resumes_embedding_idx
  ON resumes
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- 4. Create index for status filtering
CREATE INDEX IF NOT EXISTS resumes_status_idx ON resumes (status);

-- 5. Create index for experience filtering
CREATE INDEX IF NOT EXISTS resumes_experience_idx ON resumes (years_of_experience);

-- 6. Auto-update updated_at on row modification
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER resumes_updated_at
  BEFORE UPDATE ON resumes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 7. PostgreSQL function for cosine similarity search
CREATE OR REPLACE FUNCTION match_resumes(
  query_embedding vector(384),
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  email TEXT,
  years_of_experience INTEGER,
  skills TEXT[],
  executive_summary TEXT,
  status TEXT,
  file_name TEXT,
  similarity FLOAT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.full_name,
    r.email,
    r.years_of_experience,
    r.skills,
    r.executive_summary,
    r.status,
    r.file_name,
    1 - (r.embedding <=> query_embedding) AS similarity,
    r.created_at
  FROM resumes r
  WHERE r.embedding IS NOT NULL
    AND 1 - (r.embedding <=> query_embedding) > match_threshold
  ORDER BY r.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 8. Unique index on (email, full_name) for upsert deduplication
CREATE UNIQUE INDEX IF NOT EXISTS resumes_email_name_unique
  ON resumes (email, full_name)
  WHERE email IS NOT NULL AND email != '';

-- 9. View for resume match statistics
CREATE OR REPLACE VIEW resume_stats AS
SELECT
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE status = 'New') AS new_count,
  COUNT(*) FILTER (WHERE status = 'Shortlisted') AS shortlisted_count,
  COUNT(*) FILTER (WHERE status = 'Rejected') AS rejected_count,
  ROUND(AVG(years_of_experience), 1) AS avg_experience
FROM resumes;

-- 10. Job Matches table — stores saved match results
CREATE TABLE IF NOT EXISTS job_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  job_description TEXT NOT NULL,
  final_score INTEGER NOT NULL DEFAULT 0 CHECK (final_score >= 0 AND final_score <= 100),
  reasoning TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Indexes for job_matches
CREATE INDEX IF NOT EXISTS job_matches_candidate_idx ON job_matches (candidate_id);
CREATE INDEX IF NOT EXISTS job_matches_score_idx ON job_matches (final_score DESC);
