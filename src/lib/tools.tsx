import { FileUp, Camera, ImagePlus, FileJson, FileSpreadsheet, Presentation, FileText, Combine, Split, Lock, Shuffle, Unlock } from 'lucide-react';
import type { ReactNode } from 'react';

export interface Tool {
    title: string;
    description: string;
    icon: ReactNode;
}

export const ALL_TOOLS: Tool[] = [
    {
        title: 'Upload PDF',
        description: 'Load a PDF file from your device.',
        icon: <FileUp className="h-6 w-6 text-primary" />,
    },
    {
        title: 'Scan to PDF',
        description: 'Use your camera to scan a document.',
        icon: <Camera className="h-6 w-6 text-primary" />,
    },
    {
        title: 'Image to PDF',
        description: 'Convert an image file to a PDF page.',
        icon: <ImagePlus className="h-6 w-6 text-primary" />,
    },
    {
        title: 'Image to SVG',
        description: 'Convert a raster image to a vector SVG.',
        icon: <FileJson className="h-6 w-6 text-primary" />,
    },
    {
        title: 'Excel to PDF',
        description: 'Convert an Excel spreadsheet to a PDF.',
        icon: <FileSpreadsheet className="h-6 w-6 text-primary" />,
    },
    {
        title: 'PowerPoint to PDF',
        description: 'Convert a PowerPoint presentation to a PDF.',
        icon: <Presentation className="h-6 w-6 text-primary" />,
    },
    {
        title: 'Word to PDF',
        description: 'Convert a Word document to a PDF.',
        icon: <FileText className="h-6 w-6 text-primary" />,
    },
    {
        title: 'HTML to PDF',
        description: 'Convert an HTML file to a PDF.',
        icon: <FileText className="h-6 w-6 text-primary" />,
    },
    {
        title: 'Merge PDF',
        description: 'Combine multiple PDF files into one.',
        icon: <Combine className="h-6 w-6 text-primary" />,
    },
    {
        title: 'Split PDF',
        description: 'Extract each page into a separate PDF.',
        icon: <Split className="h-6 w-6 text-primary" />,
    },
    {
        title: 'Protect PDF',
        description: 'Add a password to your PDF file.',
        icon: <Lock className="h-6 w-6 text-primary" />,
    },
    {
        title: 'Unlock PDF',
        description: 'Remove password protection from a PDF.',
        icon: <Unlock className="h-6 w-6 text-primary" />,
    },
    {
        title: 'Reorder Pages',
        description: 'Drag and drop to change page order.',
        icon: <Shuffle className="h-6 w-6 text-primary" />,
    },
];
