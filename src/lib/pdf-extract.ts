// ============================================
// PDF Text Extraction Utility
// ============================================

import { PDFParse } from 'pdf-parse';

/**
 * Extracts raw text content from a PDF file buffer.
 * pdf-parse v2 uses a class-based API:
 *   const parser = new PDFParse({ data: buffer });
 *   const result = await parser.getText();
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
    try {
        const parser = new PDFParse({ data: buffer });
        const result = await parser.getText();
        const text = result.text?.trim();

        if (!text || text.length < 50) {
            throw new Error('PDF appears to be empty or contains too little text for resume parsing.');
        }

        // Clean up resources
        await parser.destroy();

        return text;
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`PDF extraction failed: ${error.message}`);
        }
        throw new Error('PDF extraction failed: Unknown error');
    }
}
