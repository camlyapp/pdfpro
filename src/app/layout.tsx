import type { Metadata } from 'next';
import { Space_Grotesk } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from '@/components/theme-provider';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
});

const siteConfig = {
  name: 'PDFpro',
  url: 'https://pdfpro.app', // Replace with your actual domain
  description: 'The ultimate online toolkit to merge, split, compress, convert, and edit PDF files for free. Effortlessly manage your PDF documents in one place.',
  ogImage: 'https://pdfpro.app/og-image.png', // Replace with your actual OG image URL
};

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name}: Free Online PDF Editor & Converter`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [
    'PDF editor',
    'merge PDF',
    'split PDF',
    'compress PDF',
    'convert PDF',
    'PDF tools',
    'online PDF editor',
    'free PDF editor',
    'PDF to Word',
    'PDF to Excel',
    'PDF to PowerPoint',
    'Image to PDF',
    'Word to PDF',
    'Excel to PDF',
    'PowerPoint to PDF',
    'rotate PDF',
    'watermark PDF',
    'unlock PDF',
    'protect PDF',
    'eSign PDF'
  ],
  authors: [{ name: 'PDFpro Team', url: siteConfig.url }],
  creator: 'PDFpro Team',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteConfig.url,
    title: `${siteConfig.name} | The Ultimate Free Online PDF Toolkit`,
    description: siteConfig.description,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: `${siteConfig.name} - Online PDF Editor`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${siteConfig.name} | Free Online PDF Editor & Converter`,
    description: siteConfig.description,
    images: [siteConfig.ogImage],
    creator: '@pdfpro',
  },
  icons: {
    icon: '/camly.png',
    shortcut: '/camly.png',
    apple: '/camly.png',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: siteConfig.name,
  operatingSystem: 'Any',
  applicationCategory: 'BusinessApplication',
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    ratingCount: '1200',
  },
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  url: siteConfig.url,
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
         <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${spaceGrotesk.variable} font-body antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider delayDuration={0}>
            {children}
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
