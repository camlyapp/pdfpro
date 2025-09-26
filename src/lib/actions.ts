'use server';

import { livePreviewLayoutAnalysis } from '@/ai/flows/live-preview-layout-analysis';

export async function analyzePageLayout(pageDataUri: string) {
  if (!pageDataUri.startsWith('data:image/png;base64,')) {
    return { success: false, error: 'Invalid page data format.' };
  }

  try {
    const result = await livePreviewLayoutAnalysis({ pageDataUri });
    return { success: true, analysis: result.analysisResult };
  } catch (error) {
    console.error('Error analyzing page layout:', error);
    return { success: false, error: 'An unexpected error occurred during analysis.' };
  }
}
