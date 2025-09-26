'use server';
/**
 * @fileOverview An AI flow to convert an image to an SVG.
 * 
 * - imageToSvg - A function that handles the image to SVG conversion.
 * - ImageToSvgInput - The input type for the imageToSvg function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ImageToSvgInputSchema = z.object({
    photoDataUri: z
        .string()
        .describe(
            "A photo to be converted to SVG, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
        ),
    prompt: z.string().optional().describe('An optional prompt to guide the SVG conversion.'),
});
export type ImageToSvgInput = z.infer<typeof ImageToSvgInputSchema>;

export async function imageToSvg(input: ImageToSvgInput): Promise<string> {
    return imageToSvgFlow(input);
}

const prompt = ai.definePrompt({
    name: 'imageToSvgPrompt',
    input: { schema: ImageToSvgInputSchema },
    output: { format: 'text' },
    prompt: `Convert the following image into a single, self-contained SVG file. The SVG should be a vector representation of the key elements in the image. Do not embed the original raster image. Only return the SVG code.
    
User prompt: {{{prompt}}}
Image: {{media url=photoDataUri}}`,
});

const imageToSvgFlow = ai.defineFlow(
    {
        name: 'imageToSvgFlow',
        inputSchema: ImageToSvgInputSchema,
        outputSchema: z.string(),
    },
    async (input) => {
        const { output } = await prompt(input);

        if (!output) {
            throw new Error('The model did not return an SVG.');
        }

        // Clean the output to ensure it's just the SVG
        const svgMatch = output.match(/<svg[\s\S]*?<\/svg>/);
        if (svgMatch && svgMatch[0]) {
            return svgMatch[0];
        }

        throw new Error('Could not extract a valid SVG from the model output.');
    }
);
