'use client';

import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Combine, Split, Gauge, RotateCw, Shuffle, Droplet, Lock, Unlock, FileSpreadsheet, Presentation, FileText, Image as ImageIcon } from 'lucide-react';
import React from 'react';

const featureSections = [
  {
    title: 'Manage & Organize PDFs',
    features: [
      { id: 'merge-pdf', name: 'Merge PDF', icon: <Combine className="h-8 w-8 text-primary" />, description: 'Combine multiple PDF files into one single document effortlessly.' },
      { id: 'split-pdf', name: 'Split PDF', icon: <Split className="h-8 w-8 text-primary" />, description: 'Extract one or more pages from your PDF or save each page as a separate PDF file.' },
      { id: 'increase-quality-pdf', name: 'Increase PDF Quality', icon: <Gauge className="h-8 w-8 text-primary" />, description: 'Reduce the file size of your PDF while maintaining optimal quality for easy sharing.' },
      { id: 'rotate-pdf', name: 'Rotate PDF', icon: <RotateCw className="h-8 w-8 text-primary" />, description: 'Rotate your PDF pages to the correct orientation. Rotate multiple pages at once.' },
      { id: 'reorder-pdf', name: 'Reorder Pages', icon: <Shuffle className="h-8 w-8 text-primary" />, description: 'Easily rearrange the order of pages in your PDF by dragging and dropping page thumbnails.' },
    ]
  },
  {
    title: 'Secure & Protect PDFs',
    features: [
      { id: 'watermark-pdf', name: 'Add Watermark', icon: <Droplet className="h-8 w-8 text-primary" />, description: 'Stamp an image or text over your PDF in seconds. Choose the typography, transparency, and position.' },
      { id: 'protect-pdf', name: 'Protect PDF', icon: <Lock className="h-8 w-8 text-primary" />, description: 'Add a password to your PDF to prevent unauthorized access to its content.' },
      { id: 'unlock-pdf', name: 'Unlock PDF', icon: <Unlock className="h-8 w-8 text-primary" />, description: 'Remove a password from your PDF file to easily view and edit it. Your file will not be encrypted anymore.' },
    ]
  },
  {
    title: 'Convert From PDF',
    features: [
      { id: 'pdf-to-word', name: 'PDF to Word', icon: <FileText className="h-8 w-8 text-primary" />, description: 'Convert your PDFs to editable DOC and DOCX documents. The conversion is incredibly accurate.' },
      { id: 'pdf-to-excel', name: 'PDF to Excel', icon: <FileSpreadsheet className="h-8 w-8 text-primary" />, description: 'Pull data directly from PDFs into Excel spreadsheets in a few seconds.' },
      { id: 'pdf-to-ppt', name: 'PDF to PowerPoint', icon: <Presentation className="h-8 w-8 text-primary" />, description: 'Turn your PDF pages into easily editable PowerPoint slides.' },
      { id: 'pdf-to-image', name: 'PDF to Image', icon: <ImageIcon className="h-8 w-8 text-primary" />, description: 'Convert each PDF page into a JPG, PNG, or TIFF file or extract all images contained in a PDF.' },
    ]
  },
  {
    title: 'Convert To PDF',
    features: [
        { id: 'word-to-pdf', name: 'Word to PDF', icon: <FileText className="h-8 w-8 text-primary" />, description: 'Easily convert Microsoft Word documents to PDF format.' },
        { id: 'excel-to-pdf', name: 'Excel to PDF', icon: <FileSpreadsheet className="h-8 w-8 text-primary" />, description: 'Turn your Excel spreadsheets into PDFs. XLS and XLSX are supported.' },
        { id: 'ppt-to-pdf', name: 'PowerPoint to PDF', icon: <Presentation className="h-8 w-8 text-primary" />, description: 'Convert PowerPoint presentations to PDF files. PPT and PPTX formats are supported.' },
        { id: 'image-to-pdf', name: 'Image to PDF', icon: <ImageIcon className="h-8 w-8 text-primary" />, description: 'Convert JPG, PNG, BMP, GIF, and TIFF images to PDF.' },
    ]
  }
];

export function FeaturesView() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header onToolSelect={() => {}} />
      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
              Powerful Tools for <span className="text-primary">Every PDF Need</span>
            </h1>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
              PDFpro offers a comprehensive suite of free online tools to manage, convert, and edit your PDF documents with ease. Boost your productivity and streamline your workflow.
            </p>
          </div>

          {featureSections.map((section, index) => (
            <section key={index} className="mb-20">
              <h2 className="text-3xl font-bold tracking-tight text-center mb-10 pb-2 border-b-2 border-primary/20 inline-block">
                {section.title}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {section.features.map(feature => (
                  <Card key={feature.id} className="shadow-md hover:shadow-primary/20 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                    <CardHeader className="flex-row items-center gap-4">
                      <div className="p-3 bg-primary/10 rounded-full">
                        {feature.icon}
                      </div>
      
                      <CardTitle className='text-xl'>{feature.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{feature.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
