'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Combine, Split, Gauge, RotateCw, Shuffle, Droplet, Lock, Unlock, FileSpreadsheet, Presentation, FileText, Image as ImageIcon } from 'lucide-react';
import React from 'react';
import Link from 'next/link';

const featureSections = [
  {
    title: 'Manage & Organize',
    features: [
      { id: 'merge-pdf', name: 'Merge PDF', icon: <Combine className="h-6 w-6 text-primary" /> },
      { id: 'split-pdf', name: 'Split PDF', icon: <Split className="h-6 w-6 text-primary" /> },
      { id: 'compress-pdf', name: 'Compress PDF', icon: <Gauge className="h-6 w-6 text-primary" /> },
      { id: 'rotate-pdf', name: 'Rotate PDF', icon: <RotateCw className="h-6 w-6 text-primary" /> },
      { id: 'reorder-pdf', name: 'Reorder Pages', icon: <Shuffle className="h-6 w-6 text-primary" /> },
    ]
  },
  {
    title: 'Secure & Protect',
    features: [
      { id: 'watermark-pdf', name: 'Add Watermark', icon: <Droplet className="h-6 w-6 text-primary" /> },
      { id: 'protect-pdf', name: 'Protect PDF', icon: <Lock className="h-6 w-6 text-primary" /> },
      { id: 'unlock-pdf', name: 'Unlock PDF', icon: <Unlock className="h-6 w-6 text-primary" /> },
    ]
  },
  {
    title: 'Convert From PDF',
    features: [
      { id: 'pdf-to-word', name: 'PDF to Word', icon: <FileText className="h-6 w-6 text-primary" /> },
      { id: 'pdf-to-excel', name: 'PDF to Excel', icon: <FileSpreadsheet className="h-6 w-6 text-primary" /> },
      { id: 'pdf-to-ppt', name: 'PDF to PowerPoint', icon: <Presentation className="h-6 w-6 text-primary" /> },
      { id: 'pdf-to-image', name: 'PDF to Image', icon: <ImageIcon className="h-6 w-6 text-primary" /> },
    ]
  },
  {
    title: 'Convert To PDF',
    features: [
        { id: 'word-to-pdf', name: 'Word to PDF', icon: <FileText className="h-6 w-6 text-primary" /> },
        { id: 'excel-to-pdf', name: 'Excel to PDF', icon: <FileSpreadsheet className="h-6 w-6 text-primary" /> },
        { id: 'ppt-to-pdf', name: 'PowerPoint to PDF', icon: <Presentation className="h-6 w-6 text-primary" /> },
        { id: 'image-to-pdf', name: 'Image to PDF', icon: <ImageIcon className="h-6 w-6 text-primary" /> },
    ]
  }
];

export function AllToolsShowcase() {
  return (
    <section className="w-full py-20 bg-background/50">
      <div className="container mx-auto">
        <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">
                Every Tool You Need, All in One Place
            </h2>
            <p className="mt-4 max-w-3xl mx-auto text-lg text-muted-foreground">
                From simple conversions to complex document management, PDFpro provides a complete suite of tools to handle any task. Explore all our features below.
            </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {featureSections.map((section, index) => (
            <div key={index} className="flex flex-col gap-4">
              <h3 className="text-2xl font-bold tracking-tight pb-2 border-b-2 border-primary/20">{section.title}</h3>
              <div className="flex flex-col gap-3">
                {section.features.map(feature => (
                  <Link
                    key={feature.id}
                    href={`/features#${feature.id}`}
                    className="group flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors"
                  >
                    {feature.icon}
                    <span className="font-medium text-card-foreground group-hover:text-primary">{feature.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="text-center mt-16">
            <Link href="/features">
                <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-11 rounded-md px-8">
                    Explore All Features
                </button>
            </Link>
        </div>
      </div>
    </section>
  );
}
