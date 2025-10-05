'use client';

import { useState } from 'react';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { PdfEditor } from '@/components/pdf-editor';

export default function Home() {
  const [selectedTool, setSelectedTool] = useState<string | null>(null);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header onToolSelect={setSelectedTool} />
      <main className="flex-1 flex justify-center py-12 px-4">
        <div className="w-full max-w-screen-xl">
          <PdfEditor selectedTool={selectedTool} onToolSelect={setSelectedTool} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
