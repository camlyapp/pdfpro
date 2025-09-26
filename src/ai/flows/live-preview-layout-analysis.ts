'use server';
/**
 * @fileOverview Analyzes the layout of a PDF page and provides feedback on potential readability or overlap issues.
 *
 * - livePreviewLayoutAnalysis - A function that performs layout analysis on a PDF page.
 * - LivePreviewLayoutAnalysisInput - The input type for the livePreviewLayoutAnalysis function.
 * - LivePreviewLayoutAnalysisOutput - The return type for the livePreviewLayoutAnalysis function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const LivePreviewLayoutAnalysisInputSchema = z.object({
  pageDataUri: z
    .string()
    .describe(
      "A PDF page as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type LivePreviewLayoutAnalysisInput = z.infer<typeof LivePreviewLayoutAnalysisInputSchema>;

const LivePreviewLayoutAnalysisOutputSchema = z.object({
  analysisResult: z.string().describe('The analysis result of the PDF page layout.'),
});
export type LivePreviewLayoutAnalysisOutput = z.infer<typeof LivePreviewLayoutAnalysisOutputSchema>;

export async function livePreviewLayoutAnalysis(input: LivePreviewLayoutAnalysisInput): Promise<LivePreviewLayoutAnalysisOutput> {
  return livePreviewLayoutAnalysisFlow(input);
}

const analyzeLayoutPrompt = ai.definePrompt({
  name: 'analyzeLayoutPrompt',
  input: {schema: LivePreviewLayoutAnalysisInputSchema},
  output: {schema: LivePreviewLayoutAnalysisOutputSchema},
  prompt: `You are an AI assistant specializing in analyzing the layout of PDF pages.

You will receive a PDF page in the form of data URI. Analyze the page for potential readability or overlap issues.
Specifically, check if:

*   Any text elements overlap with each other or other visual elements.
*   The font size is too small for comfortable reading.
*   There is sufficient contrast between the text and background.
*   Images or other elements obscure the text.

Provide a detailed analysis of the layout, pointing out any potential issues and suggesting improvements.

PDF Page: {{media url=pageDataUri}}
`,
});

const livePreviewLayoutAnalysisFlow = ai.defineFlow(
  {
    name: 'livePreviewLayoutAnalysisFlow',
    inputSchema: LivePreviewLayoutAnalysisInputSchema,
    outputSchema: LivePreviewLayoutAnalysisOutputSchema,
  },
  async input => {
    const {output} = await analyzeLayoutPrompt(input);
    return output!;
  }
);
