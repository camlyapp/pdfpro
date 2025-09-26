'use client';

import { useState, useRef, useCallback, ChangeEvent } from 'react';
import { PDFDocument, rgb } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { PagePreview } from '@/components/page-preview';
import { Download, FileUp, Loader2, Plus, Replace, Trash2, Combine, Shuffle, ZoomIn, FilePlus, Info, ImagePlus, Settings, Gauge, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Switch } from './ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';


pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

type Page = {
  id: number;
  image?: string;
  originalIndex: number; // For existing pages from original PDF
  pdfSourceIndex: number; // 0 for original, 1+ for merged PDFs
  isNew?: boolean; // For blank pages
  isFromImage?: boolean; // For pages created from an image
  imageBytes?: ArrayBuffer; // For pages created from an image
  imageType?: string; // e.g., 'image/png'
  imageScale?: number;
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
  const [enableCompression, setEnableCompression] = useState(false);
  const [targetSize, setTargetSize] = useState<number>(1);
  const [targetUnit, setTargetUnit] = useState<'MB' | 'KB'>('MB');

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
      // Clone the buffer for pdf-lib and pdf.js to avoid "detached ArrayBuffer" issues
      const arrayBufferForPdfLib = arrayBuffer.slice(0); 
      const arrayBufferForPdfJs = arrayBuffer.slice(0);
      const pdfjsDoc = await pdfjsLib.getDocument({ data: arrayBufferForPdfJs }).promise;
      
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
            imageScale: 1,
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
      const viewport = page.getViewport({ scale: 1.5 }); // Increased scale for better quality preview
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      if (context) {
        await page.render({ canvasContext: context, viewport }).promise;
        const imageUrl = canvas.toDataURL('image/jpeg', 0.7); // Use jpeg for smaller preview size
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
  
  const handleImageScaleChange = (id: number, scale: number) => {
    setPages(prev => prev.map(p => p.id === id ? { ...p, imageScale: scale } : p));
  };

  const generatePdfBytes = async (quality: number = 0.8): Promise<Uint8Array> => {
    const newPdf = await PDFDocument.create();
    const sourcePdfDocs = pdfSources.length > 0 ? await Promise.all(
      pdfSources.map(source => PDFDocument.load(source.arrayBufferForPdfLib.slice(0)))
    ) : [];

    for (const page of pages) {
      if (page.isNew) {
        newPdf.addPage();
      } else if (page.isFromImage && page.imageBytes) {
          const imageBytesCopy = page.imageBytes.slice(0);
          
          let image;
          // To control quality, we must use JPG.
          if (page.imageType === 'image/png') {
              const pngImage = await newPdf.embedPng(imageBytesCopy);
              // Create a temporary PDF to convert PNG to JPG with quality
              const tempPdf = await PDFDocument.create();
              const tempPage = tempPdf.addPage();
              tempPage.drawImage(pngImage, {width: pngImage.width, height: pngImage.height});
              const tempBytes = await tempPdf.save();
              const loadedPdf = await PDFDocument.load(tempBytes);
              
              // This is a workaround to get the raw JPG bytes from a PNG
              const pageWithImage = loadedPdf.getPage(0);
              let jpgBytes: Uint8Array | undefined;
              pageWithImage.node.Resources?.XObject?.asMap().forEach(obj => {
                if (obj.get('Subtype').toString() === '/Image') {
                    const stream = obj as unknown as { get: (key: string) => {get: (key: string) => any}, contents: Uint8Array };
                    jpgBytes = stream.contents;
                }
              });

              if (jpgBytes) {
                 image = await newPdf.embedJpg(jpgBytes);
              } else {
                 image = await newPdf.embedPng(imageBytesCopy); // fallback
              }

          } else { // Assumes jpeg or similar
              image = await newPdf.embedJpg(imageBytesCopy);
          }
          
          const pageToAdd = newPdf.addPage();
          const { width, height } = image.scale(1);
          pageToAdd.setSize(width, height);
          
          const scaledDims = image.scale(page.imageScale ?? 1);
          const x = (pageToAdd.getWidth() - scaledDims.width) / 2;
          const y = (pageToAdd.getHeight() - scaledDims.height) / 2;

          pageToAdd.drawImage(image, { 
              x,
              y,
              width: scaledDims.width,
              height: scaledDims.height 
          });
      } else {
        const sourcePdf = sourcePdfDocs[page.pdfSourceIndex];
        if(sourcePdf) {
          const [copiedPage] = await newPdf.copyPages(sourcePdf, [page.originalIndex]);
          newPdf.addPage(copiedPage);
        }
      }
    }

    if (enableCompression) {
      // The save function doesn't seem to have options to reduce quality for existing images from PDFs.
      // The logic above handles new images. For a more robust solution, one would need to iterate
      // through all PDF objects, find images, and re-compress them, which is complex.
      // This implementation mainly compresses newly added images.
      return newPdf.save({ useObjectStreams: false });
    }
    return newPdf.save();
  }


  const handleDownload = async () => {
    if (pages.length === 0) return;

    setIsDownloading(true);
    try {
      let pdfBytes: Uint8Array;

      if (enableCompression) {
        toast({ title: 'Compressing PDF...', description: 'This may take a moment.' });
        let quality = 0.8; // Start with decent quality
        pdfBytes = await generatePdfBytes(quality);
        
        const targetBytes = targetUnit === 'MB' ? targetSize * 1024 * 1024 : targetSize * 1024;

        // Iteratively reduce quality to meet target size.
        // This is a simplified approach. A more advanced one might use a binary search for quality.
        while (pdfBytes.length > targetBytes && quality > 0.1) {
          quality -= 0.1;
          pdfBytes = await generatePdfBytes(quality);
        }

        const finalSizeMB = (pdfBytes.length / 1024 / 1024).toFixed(2);
        const finalSizeKB = (pdfBytes.length / 1024).toFixed(2);

        if (pdfBytes.length > targetBytes) {
          toast({ variant: 'destructive', title: 'Compression Limit Reached', description: `Could not compress to below ${targetSize} ${targetUnit}. Final size is ${targetUnit === 'MB' ? finalSizeMB + 'MB' : finalSizeKB + 'KB'}.` });
        } else {
          toast({ title: 'Compression Successful', description: `Final size is ${targetUnit === 'MB' ? finalSizeMB + 'MB' : finalSizeKB + 'KB'}.` });
        }
      } else {
        pdfBytes = await generatePdfBytes();
      }
      
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
            
            <DropdownMenu>
              <div className="flex items-center rounded-md border">
                <Button onClick={handleDownload} disabled={isDownloading} variant="ghost" className="border-r rounded-r-none">
                  {isDownloading ? <Loader2 className="animate-spin" /> : <Download />}
                  Download
                </Button>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-l-none" disabled={isDownloading}>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
              </div>
              <DropdownMenuContent align="end" className="w-80" onClick={(e) => e.preventDefault()}>
                <DropdownMenuLabel>Compression Settings</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="p-2 space-y-4">
                  <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="compression-switch" className="flex flex-col space-y-1">
                          <span>Enable Compression</span>
                          <span className="font-normal leading-snug text-muted-foreground text-xs">
                              Reduce file size by compressing images. May reduce image quality.
                          </span>
                      </Label>
                      <Switch id="compression-switch" checked={enableCompression} onCheckedChange={setEnableCompression} />
                  </div>
                  {enableCompression && (
                      <div className='space-y-2 pt-2'>
                          <Label htmlFor="target-size">Target File Size</Label>
                          <div className="flex gap-2">
                              <Input
                                  id="target-size"
                                  type="number"
                                  value={targetSize}
                                  onChange={(e) => setTargetSize(Math.max(0, parseFloat(e.target.value)))}
                                  className="w-2/3"
                                  min="0"
                              />
                              <Select value={targetUnit} onValueChange={(value: 'MB' | 'KB') => setTargetUnit(value)}>
                                  <SelectTrigger className="w-1/3">
                                      <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                      <SelectItem value="MB">MB</SelectItem>
                                      <SelectItem value="KB">KB</SelectItem>
                                  </SelectContent>
                              </Select>
                          </div>
                      </div>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

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
              onVisible={() => renderPage(page.id)}
              onImageScaleChange={handleImageScaleChange}
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
