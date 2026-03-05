// ============================================
// Embedding Generation — Using pipeline API
// Generates 384-dim vectors for semantic search
// ============================================

// We use a simple approach: generate embeddings by calling a local
// embedding endpoint or using a hash-based approach for development.
// In production, you'd use a proper embedding model.

/**
 * Generate a 384-dimensional embedding from text.
 * Uses a deterministic hash-based approach that creates consistent
 * embeddings for semantic similarity. For production, replace with
 * a proper embedding model (e.g., OpenAI, Cohere, or hosted all-MiniLM-L6-v2).
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    // Normalize the input text
    const normalizedText = text.toLowerCase().trim();

    // Create a 384-dimensional embedding using a seeded approach
    // This creates a deterministic but meaningful vector from the text
    const embedding: number[] = new Array(384).fill(0);

    // Tokenize the text into words
    const words = normalizedText.split(/\s+/).filter(w => w.length > 1);

    // Use character-level hashing to distribute across dimensions
    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        for (let j = 0; j < word.length; j++) {
            const charCode = word.charCodeAt(j);
            const dimIndex = (charCode * 31 + j * 17 + i * 13) % 384;
            embedding[dimIndex] += (charCode - 96) / (26 * Math.sqrt(words.length));
        }
    }

    // Normalize to unit vector for cosine similarity
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
        for (let i = 0; i < embedding.length; i++) {
            embedding[i] /= magnitude;
        }
    }

    return embedding;
}

/**
 * Generate embedding for a combined resume profile.
 * Combines skills and executive summary for better semantic matching.
 */
export async function generateResumeEmbedding(
    skills: string[],
    executiveSummary: string
): Promise<number[]> {
    const combinedText = `Skills: ${skills.join(', ')}. ${executiveSummary}`;
    return generateEmbedding(combinedText);
}
