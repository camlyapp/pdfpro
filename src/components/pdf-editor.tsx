'use client';

import { useState, useRef, useCallback, ChangeEvent } from 'react';
import { PDFDocument, rgb } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { analyzePageLayout } from '@/lib/actions';
import { PagePreview } from '@/components/page-preview';
import { Download, FileUp, Loader2, Plus, Replace, Trash2, Combine, Shuffle, ZoomIn, FilePlus, Info, ImagePlus } from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

type Page = {
  id: number;
  image?: string;
  originalIndex: number; // For existing pages from original PDF
  pdfSourceIndex: number; // 0 for original, 1+ for merged PDFs
  analysis?: string;
  isAnalyzing?: boolean;
  isNew?: boolean; // For blank pages
  isFromImage?: boolean; // For pages created from an image
  imageBytes?: ArrayBuffer; // For pages created from an image
  imageType?: string; // e.g., 'image/png'
};

type PdfSource = {
  file: File;
  arrayBufferForPdfLib: ArrayBuffer;
  pdfjsDoc: pdfjsLib.PDFDocumentProxy;
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
    <div className="flex flex-col items-center text-center p-6 bg-card rounded-lg shadow-md hover:shadow-primary/20 transition-shadow">
        <div className="p-3 bg-primary/10 rounded-full mb-4">
            {icon}
        </div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
    </div>
);

export function PdfEditor() {
  const [pdfSources, setPdfSources] = useState<PdfSource[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isMerging, setIsMerging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mergeFileInputRef = useRef<HTMLInputElement>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const draggedItemIndex = useRef<number | null>(null);
  const dragOverItemIndex = useRef<number | null>(null);
  const { toast } = useToast();

  const processAndSetPdf = async (file: File, sourceIndex: number) => {
    setIsLoading(true);
    if (sourceIndex === 0) {
      setPages([]);
    }
    try {
      const arrayBuffer = await file.arrayBuffer();
      const arrayBufferForPdfLib = arrayBuffer.slice(0); // Create a copy for pdf-lib
      const pdfjsDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      setPdfSources(prev => {
        const newSources = [...prev];
        newSources[sourceIndex] = { file, arrayBufferForPdfLib, pdfjsDoc };
        return newSources;
      });

      const numPages = pdfjsDoc.numPages;
      const newPages: Page[] = [];

      for (let i = 1; i <= numPages; i++) {
        newPages.push({
          id: Date.now() + i + Math.random(),
          originalIndex: i - 1,
          pdfSourceIndex: sourceIndex,
        });
      }
      setPages(prev => [...prev, ...newPages]);

    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error Processing PDF',
        description: 'There was an issue loading your PDF. Please try another file.',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || file.type !== 'application/pdf') {
      toast({
        variant: 'destructive',
        title: 'Invalid File',
        description: 'Please select a valid PDF file.',
      });
      return;
    }
    setPdfSources([]);
    await processAndSetPdf(file, 0);
  };
  
  const handleMergeFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || file.type !== 'application/pdf') {
      toast({
        variant: 'destructive',
        title: 'Invalid File',
        description: 'Please select a valid PDF file.',
      });
      return;
    }
    setIsMerging(true);
    await processAndSetPdf(file, pdfSources.length);
    setIsMerging(false);
    toast({ title: 'PDF Merged', description: `Added pages from "${file.name}".`});
    if (event.target) event.target.value = '';
  };
  
  const handleImageFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
        toast({
            variant: 'destructive',
            title: 'Invalid File',
            description: 'Please select a valid image file (JPEG, PNG, etc.).',
        });
        return;
    }

    try {
        const imageBytes = await file.arrayBuffer();
        const imageUrl = URL.createObjectURL(file);

        const newPage: Page = {
            id: Date.now(),
            originalIndex: -1,
            pdfSourceIndex: -1,
            isFromImage: true,
            image: imageUrl,
            imageBytes: imageBytes,
            imageType: file.type,
        };

        if (pdfSources.length === 0) {
            // If no PDF is loaded, create a new one with the image.
            const newPdfDoc = await PDFDocument.create();
            const page = newPdfDoc.addPage();
            const image = await (file.type === 'image/png' ? newPdfDoc.embedPng(imageBytes) : newPdfDoc.embedJpg(imageBytes));
            const { width, height } = image.scale(1);
            page.setSize(width, height);
            page.drawImage(image, { x: 0, y: 0, width, height });

            const pdfBytes = await newPdfDoc.save();
            const newFile = new File([pdfBytes], file.name.replace(/\.[^/.]+$/, "") + ".pdf", { type: 'application/pdf' });
            await processAndSetPdf(newFile, 0);

        } else {
             setPages(prev => [...prev, newPage]);
        }

        toast({ title: 'Image added as a new page.' });

    } catch (error) {
        console.error(error);
        toast({
            variant: 'destructive',
            title: 'Error Processing Image',
            description: 'There was an issue processing your image file.',
        });
    }

    if (event.target) event.target.value = '';
  };


  const renderPage = useCallback(async (pageId: number) => {
    const pageIndex = pages.findIndex((p) => p.id === pageId);
    if (pageIndex === -1 || pages[pageIndex].image) return;

    const pageData = pages[pageIndex];

    if (pageData.isNew || pageData.isFromImage) {
      // It's a blank page or image page, rendering is handled directly or already done.
      return;
    }
    
    const source = pdfSources[pageData.pdfSourceIndex];
    if (!source) return;

    try {
      const page = await source.pdfjsDoc.getPage(pageData.originalIndex + 1);
      const viewport = page.getViewport({ scale: 1.0 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      if (context) {
        await page.render({ canvasContext: context, viewport }).promise;
        const imageUrl = canvas.toDataURL('image/jpeg', 0.5);
        setPages((prev) =>
          prev.map((p) => (p.id === pageId ? { ...p, image: imageUrl } : p))
        );
      }
    } catch (error) {
      console.error(`Failed to render page ${pageData.originalIndex + 1} from source ${pageData.pdfSourceIndex}`, error);
    }
  }, [pages, pdfSources]);

  const handleDragEnd = () => {
    if (draggedItemIndex.current !== null && dragOverItemIndex.current !== null) {
      const newPages = [...pages];
      const [reorderedItem] = newPages.splice(draggedItemIndex.current, 1);
      newPages.splice(dragOverItemIndex.current, 0, reorderedItem);
      setPages(newPages);
    }
    draggedItemIndex.current = null;
    dragOverItemIndex.current = null;
  };
  
  const handleDeletePage = useCallback((id: number) => {
    setPages((prev) => prev.filter((p) => p.id !== id));
    toast({ title: 'Page removed' });
  }, [toast]);
  
  const handleAddPage = () => {
    const newPage: Page = {
      id: Date.now(),
      originalIndex: -1,
      pdfSourceIndex: -1,
      isNew: true,
    };
    setPages(prev => [...prev, newPage]);
    toast({ title: 'Blank page added' });
  };

  const handleAnalyzePage = useCallback(async (id: number) => {
    const pageToAnalyze = pages.find((p) => p.id === id);
    if (!pageToAnalyze || !pageToAnalyze.image) {
      toast({ variant: 'destructive', title: 'Cannot Analyze', description: 'Page image is not available yet.' });
      return;
    };

    setPages((prev) => prev.map((p) => (p.id === id ? { ...p, isAnalyzing: true } : p)));

    const result = await analyzePageLayout(pageToAnalyze.image);

    if (result.success) {
      setPages((prev) => prev.map((p) => (p.id === id ? { ...p, isAnalyzing: false, analysis: result.analysis } : p)));
      toast({ title: 'Analysis complete', description: 'Layout feedback is now available.' });
    } else {
      setPages((prev) => prev.map((p) => (p.id === id ? { ...p, isAnalyzing: false } : p)));
      toast({ variant: 'destructive', title: 'Analysis Failed', description: result.error });
    }
  }, [pages, toast]);

  const handleDownload = async () => {
    if (pages.length === 0) return;

    setIsDownloading(true);
    try {
      const newPdf = await PDFDocument.create();
      const sourcePdfDocs = pdfSources.length > 0 ? await Promise.all(
        pdfSources.map(source => PDFDocument.load(source.arrayBufferForPdfLib))
      ) : [];

      for (const page of pages) {
        if (page.isNew) {
          newPdf.addPage();
        } else if (page.isFromImage && page.imageBytes) {
            const image = await (page.imageType === 'image/png' ? newPdf.embedPng(page.imageBytes) : newPdf.embedJpg(page.imageBytes));
            const pageToAdd = newPdf.addPage();
            const { width, height } = image.scale(1);
            pageToAdd.setSize(width, height);
            pageToAdd.drawImage(image, { x: 0, y: 0, width, height });
        } else {
          const sourcePdf = sourcePdfDocs[page.pdfSourceIndex];
          if(sourcePdf) {
            const [copiedPage] = await newPdf.copyPages(sourcePdf, [page.originalIndex]);
            newPdf.addPage(copiedPage);
          }
        }
      }

      const pdfBytes = await newPdf.save();
      
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      const newFileName = pdfSources[0]?.file.name.replace('.pdf', '_edited.pdf') ?? 'edited.pdf';
      link.download = newFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({ title: 'Download Started', description: `Your new PDF "${newFileName}" is downloading.` });
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Failed to Generate PDF', description: 'An error occurred while creating your new PDF.' });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleReset = () => {
    setPdfSources([]);
    setPages([]);
    if(fileInputRef.current) fileInputRef.current.value = '';
  }

  if (isLoading && pdfSources.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Processing your PDF...</p>
      </div>
    );
  }

  if (pages.length === 0) {
    return (
      <div className='space-y-12'>
        <Card className="max-w-2xl mx-auto text-center shadow-lg border-2 border-primary/20">
            <CardHeader>
                <CardTitle className="text-3xl font-bold tracking-tight">The Ultimate PDF Toolkit</CardTitle>
                <CardDescription className="text-lg text-muted-foreground">
                    Effortlessly manage your PDFs. Upload, reorder, delete, merge, and download pages—all with a live preview.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex justify-center gap-4">
                    <Button size="lg" onClick={() => fileInputRef.current?.click()} className="text-lg py-6 px-8">
                        <FileUp className="mr-2 h-6 w-6" />
                        Upload PDF
                    </Button>
                    <Button size="lg" variant="outline" onClick={() => imageFileInputRef.current?.click()} className="text-lg py-6 px-8">
                        <ImagePlus className="mr-2 h-6 w-6" />
                        Image to PDF
                    </Button>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="application/pdf" className="hidden" />
                <input type="file" ref={imageFileInputRef} onChange={handleImageFileChange} accept="image/*" className="hidden" />
            </CardContent>
        </Card>

        <section className="w-full">
            <div className="container mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <FeatureCard
                        icon={<Shuffle className="h-8 w-8 text-primary" />}
                        title="Reorder & Delete"
                        description="Easily drag and drop pages to reorder them or delete unwanted pages with a single click."
                    />
                    <FeatureCard
                        icon={<Combine className="h-8 w-8 text-primary" />}
                        title="Merge PDFs"
                        description="Combine multiple PDF files into a single document. Add new files to your existing project seamlessly."
                    />
                    <FeatureCard
                        icon={<ZoomIn className="h-8 w-8 text-primary" />}
                        title="Live Preview"
                        description="See your changes in real-time. Every adjustment you make is instantly visible in the page preview."
                    />
                </div>
            </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-4 items-center justify-between p-4 bg-card border rounded-lg shadow-sm">
        <div>
          <h2 className="font-bold text-lg">{pdfSources[0]?.file.name}</h2>
          <p className="text-sm text-muted-foreground">{pages.length} pages</p>
        </div>
        <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Replace /> Change File
            </Button>
            <Button variant="outline" onClick={handleReset}>
                <Trash2 /> Reset
            </Button>
            <Button variant="outline" onClick={handleAddPage}>
                <Plus /> Add Page
            </Button>
            <Button variant="outline" onClick={() => imageFileInputRef.current?.click()}>
                <ImagePlus /> Add Image
            </Button>
            <Button variant="outline" onClick={() => mergeFileInputRef.current?.click()} disabled={isMerging}>
                {isMerging ? <Loader2 className="animate-spin" /> : <Combine />}
                Merge PDF
            </Button>
            <Button onClick={handleDownload} disabled={isDownloading}>
                {isDownloading ? <Loader2 className="animate-spin" /> : <Download />}
                Download PDF
            </Button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="application/pdf" className="hidden" />
            <input type="file" ref={mergeFileInputRef} onChange={handleMergeFileChange} accept="application/pdf" className="hidden" />
            <input type="file" ref={imageFileInputRef} onChange={handleImageFileChange} accept="image/*" className="hidden" />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {pages.map((page, index) => (
          <div
            key={page.id}
            draggable
            onDragStart={() => (draggedItemIndex.current = index)}
            onDragEnter={() => (dragOverItemIndex.current = index)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => e.preventDefault()}
            className="relative transition-transform duration-300 ease-in-out"
          >
            <PagePreview
              page={page}
              pageNumber={index + 1}
              onDelete={handleDeletePage}
              onAnalyze={handleAnalyzePage}
              onVisible={() => renderPage(page.id)}
            />
          </div>
        ))}
        {isMerging && (
          <Card className="group relative overflow-hidden shadow-md">
            <CardContent className="p-0 aspect-[210/297] relative flex items-center justify-center bg-muted">
                <div className="flex flex-col items-center justify-center text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="mt-4 text-muted-foreground">Merging...</p>
                </div>
            </CardContent>
          </Card>
        )}
      </div>
      <div className="p-4 bg-muted/50 rounded-lg flex items-start gap-4">
        <div className='p-2 bg-primary/10 rounded-full'>
          <Info className="h-5 w-5 text-primary" />
        </div>
        <div>
            <h3 className="font-semibold text-foreground">Pro-Tip!</h3>
            <p className="text-sm text-muted-foreground">Use the <FilePlus className="inline h-4 w-4" /> 'Add Page' button to insert blank pages anywhere in your document, perfect for adding notes or section breaks.</p>
        </div>
      </div>
    </div>
  );
}
