'use server';
/**
 * @fileOverview An AI flow to extract structured data from an image based on a prompt.
 * 
 * - extractStructuredData - A function that handles the data extraction.
 * - ExtractStructuredDataInput - The input type for the extractStructuredData function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ExtractStructuredDataInputSchema = z.object({
    photoDataUri: z
        .string()
        .describe(
            "A photo to extract data from, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'"
        ),
    prompt: z.string().describe('A prompt describing the data to extract in JSON format.'),
});
export type ExtractStructuredDataInput = z.infer<typeof ExtractStructuredDataInputSchema>;

export async function extractStructuredData(input: ExtractStructuredDataInput): Promise<string> {
    return extractStructuredDataFlow(input);
}

const prompt = ai.definePrompt({
    name: 'extractStructuredDataPrompt',
    input: { schema: ExtractStructuredDataInputSchema },
    output: { format: 'json' },
    prompt: `You are an expert at extracting structured data from documents. Analyze the provided image and extract the information requested in the user's prompt. Return the data as a JSON object.

User prompt: {{{prompt}}}
Image: {{media url=photoDataUri}}`,
});

const extractStructuredDataFlow = ai.defineFlow(
    {
        name: 'extractStructuredDataFlow',
        inputSchema: ExtractStructuredDataInputSchema,
        outputSchema: z.string(),
    },
    async (input) => {
        const { output } = await prompt(input);

        if (!output) {
            throw new Error('The model did not return any data.');
        }

        // The model output is already a JSON object, but we need to stringify it to send it back to the client.
        return JSON.stringify(output, null, 2);
    }
);
