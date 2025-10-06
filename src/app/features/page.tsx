import { Metadata } from 'next';
import { FeaturesView } from './features-view';

export const metadata: Metadata = {
  title: 'All PDF Tools and Features',
  description: 'Explore the full suite of PDFpro tools. Merge, split, compress, convert, rotate, watermark, and protect your PDF files for free with our easy-to-use online utilities.',
  keywords: [
    'PDF features',
    'PDF tools',
    'merge PDF',
    'split PDF',
    'compress PDF',
    'convert PDF',
    'rotate PDF',
    'watermark PDF',
    'protect PDF',
    'unlock PDF',
    'PDF to Word',
    'PDF to Excel',
    'PDF to PowerPoint',
    'image to PDF',
  ],
};

export default function FeaturesPage() {
  return <FeaturesView />;
}
