'use client';

import { useState, useRef, useCallback, ChangeEvent } from 'react';
import { PDFDocument, rgb } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';
import pptxgen from 'pptxgenjs';
import * as XLSX from 'xlsx';


import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { PagePreview } from '@/components/page-preview';
import { Download, FileUp, Loader2, Plus, Replace, Trash2, Combine, Shuffle, ZoomIn, FilePlus, Info, ImagePlus, Settings, Gauge, ChevronDown, Rocket, Image, FileJson, Copy, BrainCircuit, Presentation, FileSpreadsheet } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Switch } from './ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { imageToSvg } from '@/ai/flows/image-to-svg';
import { extractStructuredData } from '@/ai/flows/extract-structured-data';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';


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

type DownloadFormat = 'pdf' | 'png' | 'jpeg' | 'ppt' | 'xlsx';


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
  const [isCompressing, setIsCompressing] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [isConvertingToSvg, setIsConvertingToSvg] = useState(false);
  const [isExtractingData, setIsExtractingData] = useState(false);
  const [extractedData, setExtractedData] = useState('');
  const [ocrPrompt, setOcrPrompt] = useState('Extract the invoice number, date, and total amount.');
  const [enableCompression, setEnableCompression] = useState(false);
  const [targetSize, setTargetSize] = useState<number>(1);
  const [targetUnit, setTargetUnit] = useState<'MB' | 'KB'>('MB');
  const [compressedPdfBytes, setCompressedPdfBytes] = useState<Uint8Array | null>(null);
  const [downloadFormat, setDownloadFormat] = useState<DownloadFormat>('pdf');


  const fileInputRef = useRef<HTMLInputElement>(null);
  const mergeFileInputRef = useRef<HTMLInputElement>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const imageToSvgInputRef = useRef<HTMLInputElement>(null);
  const draggedItemIndex = useRef<number | null>(null);
  const dragOverItemIndex = useRef<number | null>(null);
  const { toast } = useToast();
  
  const resetCompressedState = () => {
    if (compressedPdfBytes) {
      setCompressedPdfBytes(null);
      toast({ title: "Edits detected", description: "Please re-compress your PDF before downloading.", variant: 'default' });
    }
  };

  const processAndSetPdf = async (file: File, sourceIndex: number) => {
    setIsLoading(true);
    resetCompressedState();
    if (sourceIndex === 0) {
      setPages([]);
    }
    try {
      const arrayBuffer = await file.arrayBuffer();
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
    resetCompressedState();
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
        resetCompressedState();

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

  const handleImageToSvg = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
        toast({
            variant: 'destructive',
            title: 'Invalid File',
            description: 'Please select a valid image file.',
        });
        return;
    }
    setIsConvertingToSvg(true);
    toast({ title: 'Converting to SVG...', description: 'This might take a moment.' });
    try {
        const dataUri = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.onerror = (e) => reject(e);
            reader.readAsDataURL(file);
        });

        const svgContent = await imageToSvg({ photoDataUri: dataUri, prompt: 'Return only the SVG code, without any wrapping text or markdown.' });
        
        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        const newFileName = file.name.replace(/\.[^/.]+$/, '_converted.svg');
        link.download = newFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: 'SVG Conversion Successful', description: `Your new file "${newFileName}" is downloading.` });
    } catch (error) {
        console.error(error);
        toast({
            variant: 'destructive',
            title: 'Error Converting to SVG',
            description: 'There was an issue converting your image.',
        });
    } finally {
        setIsConvertingToSvg(false);
        if (event.target) event.target.value = '';
    }
  };


  const renderPage = useCallback(async (pageId: number) => {
    const pageIndex = pages.findIndex((p) => p.id === pageId);
    if (pageIndex === -1 || pages[pageIndex].image) return;

    const pageData = pages[pageIndex];

    if (pageData.isNew || pageData.isFromImage) {
      return;
    }
    
    const source = pdfSources[pageData.pdfSourceIndex];
    if (!source) return;

    try {
      const page = await source.pdfjsDoc.getPage(pageData.originalIndex + 1);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      if (context) {
        await page.render({ canvasContext: context, viewport }).promise;
        const imageUrl = canvas.toDataURL('image/png'); // Use PNG for better quality in previews
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
      resetCompressedState();
    }
    draggedItemIndex.current = null;
    dragOverItemIndex.current = null;
  };
  
  const handleDeletePage = useCallback((id: number) => {
    setPages((prev) => prev.filter((p) => p.id !== id));
    toast({ title: 'Page removed' });
    resetCompressedState();
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
    resetCompressedState();
  };
  
  const handleImageScaleChange = (id: number, scale: number) => {
    setPages(prev => prev.map(p => p.id === id ? { ...p, imageScale: scale } : p));
    resetCompressedState();
  };

  const generatePdfBytes = async (quality?: number): Promise<Uint8Array> => {
    const newPdf = await PDFDocument.create();
    const sourcePdfDocs = pdfSources.length > 0 ? await Promise.all(
      pdfSources.map(source => PDFDocument.load(source.arrayBufferForPdfLib.slice(0)))
    ) : [];

    for (const page of pages) {
      if (page.isNew) {
        newPdf.addPage();
      } else if (page.isFromImage && page.imageBytes) {
          const imageBytesCopy = page.imageBytes.slice(0);
          const pageToAdd = newPdf.addPage();
          
          let image;
          if (quality !== undefined) {
              const tempDoc = await PDFDocument.create();
              const tempImage = page.imageType === 'image/png' 
                  ? await tempDoc.embedPng(imageBytesCopy)
                  : await tempDoc.embedJpg(imageBytesCopy);

              const jpgBytes = await tempImage.asJpg({ quality });
              image = await newPdf.embedJpg(jpgBytes);
          } else {
              if (page.imageType === 'image/png') {
                image = await newPdf.embedPng(imageBytesCopy);
              } else {
                image = await newPdf.embedJpg(imageBytesCopy);
              }
          }
          
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
        if(page.pdfSourceIndex < 0 || page.pdfSourceIndex >= sourcePdfDocs.length) continue;
        const sourcePdf = sourcePdfDocs[page.pdfSourceIndex];
        if(sourcePdf) {
          const [copiedPage] = await newPdf.copyPages(sourcePdf, [page.originalIndex]);
          newPdf.addPage(copiedPage);
        }
      }
    }

    if (enableCompression) {
        return newPdf.save({ useObjectStreams: false });
    }
    return newPdf.save();
  }
  
  const handleCompress = async () => {
    if (pages.length === 0) return;
    setIsCompressing(true);
    setCompressedPdfBytes(null);
    try {
      toast({ title: 'Compressing PDF...', description: 'This may take a moment.' });
      const targetBytes = targetUnit === 'MB' ? targetSize * 1024 * 1024 : targetSize * 1024;
      
      let minQuality = 0.01;
      let maxQuality = 1.0;
      let bestQuality = 0.8;
      let bestPdfBytes: Uint8Array | null = null;
      let iterations = 0;

      const hasImages = pages.some(p => p.isFromImage);
      if (!hasImages) {
        const finalBytes = await generatePdfBytes();
        setCompressedPdfBytes(finalBytes);
        const finalSizeMB = (finalBytes.length / 1024 / 1024).toFixed(2);
        const finalSizeKB = (finalBytes.length / 1024).toFixed(2);
        toast({ title: 'No images to compress', description: `Final size is ${targetUnit === 'MB' ? finalSizeMB + 'MB' : finalSizeKB + 'KB'}.` });
        setIsCompressing(false);
        return;
      }


      while (minQuality <= maxQuality && iterations < 10) {
        const currentQuality = (minQuality + maxQuality) / 2;
        const currentPdfBytes = await generatePdfBytes(currentQuality);
        
        if (currentPdfBytes.length <= targetBytes) {
          bestPdfBytes = currentPdfBytes;
          bestQuality = currentQuality;
          minQuality = currentQuality + 0.01;
        } else {
          maxQuality = currentQuality - 0.01;
        }
        iterations++;
      }
      
      const finalBytes = bestPdfBytes ?? await generatePdfBytes(bestQuality);
      setCompressedPdfBytes(finalBytes);

      const finalSizeMB = (finalBytes.length / 1024 / 1024).toFixed(2);
      const finalSizeKB = (finalBytes.length / 1024).toFixed(2);
      
      if (finalBytes.length > targetBytes) {
        toast({ variant: 'destructive', title: 'Compression Limit Reached', description: `Could not compress to below ${targetSize} ${targetUnit}. Final size is ${targetUnit === 'MB' ? finalSizeMB + 'MB' : finalSizeKB + 'KB'}.` });
      } else {
        toast({ title: 'Compression Successful', description: `Final size is ${targetUnit === 'MB' ? finalSizeMB + 'MB' : finalSizeKB + 'KB'}. Ready to download.` });
      }
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Failed to Compress PDF', description: 'An error occurred during compression.' });
    } finally {
      setIsCompressing(false);
    }
  }


  const handleDownloadPdf = async () => {
    if (pages.length === 0) return;

    setIsDownloading(true);
    try {
      let pdfBytes: Uint8Array;

      if (enableCompression) {
        if (compressedPdfBytes) {
          pdfBytes = compressedPdfBytes;
        } else {
            toast({ variant: 'destructive', title: 'Not Compressed', description: 'Please click the resize icon to compress the file first.' });
            setIsDownloading(false);
            return;
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

  const handleDownloadAsImages = async (format: 'png' | 'jpeg') => {
    if (pages.length === 0) return;

    setIsDownloading(true);
    toast({ title: 'Preparing images...', description: 'This may take a moment.' });
    try {
        const zip = new JSZip();
        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            let imageDataUrl = page.image;

            // Prepare canvas for rendering
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');

            if (!imageDataUrl || !page.isFromImage) {
                 // Render non-image or non-rendered pages
                const pdfPage = page.isNew ? null : await pdfSources[page.pdfSourceIndex].pdfjsDoc.getPage(page.originalIndex + 1);
                
                if (pdfPage) {
                    const viewport = pdfPage.getViewport({ scale: 2.0 }); // Higher scale for better quality
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    if (context) {
                        await pdfPage.render({ canvasContext: context, viewport }).promise;
                    }
                } else { // Blank page
                    canvas.width = 595 * 2;
                    canvas.height = 842 * 2;
                    if (context) {
                        context.fillStyle = 'white';
                        context.fillRect(0, 0, canvas.width, canvas.height);
                    }
                }
            } else {
                // For pages from images, just draw them on canvas to convert format
                const img = new (window as any).Image();
                await new Promise(resolve => {
                    img.onload = resolve;
                    img.src = imageDataUrl!;
                });
                canvas.width = img.width;
                canvas.height = img.height;
                context?.drawImage(img, 0, 0);
            }
            
            const mimeType = `image/${format}`;
            imageDataUrl = canvas.toDataURL(mimeType, format === 'jpeg' ? 0.9 : undefined);

            if (imageDataUrl) {
                const response = await fetch(imageDataUrl);
                const blob = await response.blob();
                zip.file(`page_${i + 1}.${format}`, blob);
            }
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(zipBlob);
        const newFileName = pdfSources[0]?.file.name.replace(/\.pdf$/i, `_images_${format}.zip`) ?? `images_${format}.zip`;
        link.download = newFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: 'Download Started', description: `Your images are downloading as "${newFileName}".` });
    } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: 'Failed to Generate Images', description: 'An error occurred while creating your image files.' });
    } finally {
        setIsDownloading(false);
    }
  };

  const handleDownloadAsPpt = async () => {
    if (pages.length === 0) return;

    setIsDownloading(true);
    toast({ title: 'Creating PowerPoint...', description: 'This may take a moment.' });
    try {
        const pptx = new pptxgen();
        pptx.layout = 'LAYOUT_WIDE'; // 16:9

        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            let imageDataUrl = page.image;

            if (!imageDataUrl) {
                await renderPage(page.id);
                // Need to get the updated page data with the image URI
                const updatedPage = pages.find(p => p.id === page.id) || page;
                imageDataUrl = updatedPage.image;
            }

            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            if (page.isNew) { // Handle blank pages
                canvas.width = 1280;
                canvas.height = 720;
                if(context) {
                    context.fillStyle = 'white';
                    context.fillRect(0, 0, canvas.width, canvas.height);
                }
                imageDataUrl = canvas.toDataURL('image/png');
            } else if (!imageDataUrl || !page.isFromImage) {
                const pdfPage = await pdfSources[page.pdfSourceIndex].pdfjsDoc.getPage(page.originalIndex + 1);
                const viewport = pdfPage.getViewport({ scale: 2.0 });
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                if (context) {
                    await pdfPage.render({ canvasContext: context, viewport }).promise;
                    imageDataUrl = canvas.toDataURL('image/png');
                }
            }
            
            if (imageDataUrl) {
                const slide = pptx.addSlide();
                slide.addImage({ data: imageDataUrl, x: 0, y: 0, w: '100%', h: '100%' });
            }
        }
        
        const newFileName = pdfSources[0]?.file.name.replace(/\.pdf$/i, '.pptx') ?? 'presentation.pptx';
        await pptx.writeFile({ fileName: newFileName });
        
        toast({ title: 'Download Started', description: `Your presentation "${newFileName}" is downloading.` });
    } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: 'Failed to Generate PPT', description: 'An error occurred while creating your presentation.' });
    } finally {
        setIsDownloading(false);
    }
  };

  const handleDownloadAsXlsx = async () => {
    if (pages.length === 0) return;
    
    setIsDownloading(true);
    toast({ title: 'Creating Excel file...', description: 'This may take several moments depending on the document size.' });

    try {
        const wb = XLSX.utils.book_new();
        let sheetCount = 0;

        const ocrPromptForExcel = "Extract all tabular data from this document. Return the data as a JSON object with a key 'tables', which is an array of tables. Each table should be an array of objects, where each object represents a row.";

        for (let i = 0; i < pages.length; i++) {
            const pageData = pages[i];
            
            // Skip blank pages
            if(pageData.isNew) continue;

            toast({ title: `Processing page ${i + 1} of ${pages.length}...`});

            let dataUri: string | undefined;

            const source = pdfSources[pageData.pdfSourceIndex];
            if (!source) continue;

            const page = await source.pdfjsDoc.getPage(pageData.originalIndex + 1);
            const viewport = page.getViewport({ scale: 2.0 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            if (context) {
                await page.render({ canvasContext: context, viewport }).promise;
                dataUri = canvas.toDataURL('image/jpeg', 0.9); // Use JPEG for smaller size
            } else {
                continue;
            }
            
            if (dataUri) {
                const result = await extractStructuredData({ photoDataUri: dataUri, prompt: ocrPromptForExcel });
                const extracted = JSON.parse(result);

                if (extracted && extracted.tables && Array.isArray(extracted.tables)) {
                    for (const table of extracted.tables) {
                        if (Array.isArray(table) && table.length > 0) {
                            const ws = XLSX.utils.json_to_sheet(table);
                            XLSX.utils.book_append_sheet(wb, ws, `Table_${sheetCount + 1}`);
                            sheetCount++;
                        }
                    }
                }
            }
        }
        
        if (sheetCount > 0) {
            const newFileName = pdfSources[0]?.file.name.replace(/\.pdf$/i, '.xlsx') ?? 'spreadsheet.xlsx';
            XLSX.writeFile(wb, newFileName);
            toast({ title: 'Download Started', description: `Your Excel file "${newFileName}" is downloading.` });
        } else {
            toast({ variant: 'destructive', title: 'No Tables Found', description: 'Could not find any tabular data to export to Excel.' });
        }
    } catch (error) {
        console.error("Error creating Excel file:", error);
        toast({
            variant: 'destructive',
            title: 'Error Creating Excel File',
            description: 'An unexpected error occurred while converting to Excel.',
        });
    } finally {
        setIsDownloading(false);
    }
};


  const handleReset = () => {
    setPdfSources([]);
    setPages([]);
    setCompressedPdfBytes(null);
    if(fileInputRef.current) fileInputRef.current.value = '';
  }

  const handleExtractData = async () => {
    if (pages.length === 0) return;
    
    setIsExtractingData(true);
    setExtractedData('');
    toast({ title: 'Extracting data...', description: 'This may take a moment.' });
    
    try {
        const firstPage = pages[0];
        let dataUri = firstPage.image;

        if (!dataUri) {
            await renderPage(firstPage.id);
            // We need to get the updated page data with the image URI
            dataUri = (pages.find(p => p.id === firstPage.id) || firstPage).image;
        }

        if (!dataUri) {
            const pageData = pages[0];
            const source = pdfSources[pageData.pdfSourceIndex];
            if (!source) throw new Error("PDF source not found for the first page.");

            const page = await source.pdfjsDoc.getPage(pageData.originalIndex + 1);
            const viewport = page.getViewport({ scale: 2.0 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            if (context) {
                await page.render({ canvasContext: context, viewport }).promise;
                dataUri = canvas.toDataURL('image/png');
            } else {
                throw new Error("Could not get canvas context.");
            }
        }
        
        const result = await extractStructuredData({ photoDataUri: dataUri, prompt: ocrPrompt });
        setExtractedData(result);
        toast({ title: 'Data Extracted Successfully' });
    } catch (error) {
        console.error("Error extracting structured data:", error);
        toast({
            variant: 'destructive',
            title: 'Error Extracting Data',
            description: 'Could not extract structured data from the first page.',
        });
    } finally {
        setIsExtractingData(false);
    }
  };

  const handleDownload = () => {
    switch (downloadFormat) {
      case 'pdf':
        handleDownloadPdf();
        break;
      case 'png':
        handleDownloadAsImages('png');
        break;
      case 'jpeg':
        handleDownloadAsImages('jpeg');
        break;
      case 'ppt':
        handleDownloadAsPpt();
        break;
      case 'xlsx':
        handleDownloadAsXlsx();
        break;
      default:
        handleDownloadPdf();
    }
  };

  const getDownloadButtonText = () => {
    switch (downloadFormat) {
      case 'pdf':
        return 'Download PDF';
      case 'png':
        return 'Download PNGs';
      case 'jpeg':
        return 'Download JPEGs';
      case 'ppt':
        return 'Download PPT';
      case 'xlsx':
        return 'Download Excel';
      default:
        return 'Download PDF';
    }
  };


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
                     <Button size="lg" variant="outline" onClick={() => imageToSvgInputRef.current?.click()} className="text-lg py-6 px-8" disabled={isConvertingToSvg}>
                        {isConvertingToSvg ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <FileJson className="mr-2 h-6 w-6" />}
                        Image to SVG
                    </Button>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="application/pdf" className="hidden" />
                <input type="file" ref={imageFileInputRef} onChange={handleImageFileChange} accept="image/*" className="hidden" />
                <input type="file" ref={imageToSvgInputRef} onChange={handleImageToSvg} accept="image/*" className="hidden" />
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

            <Dialog>
                <DialogTrigger asChild>
                    <Button variant="outline">
                        <BrainCircuit /> Extract Data (OCR)
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Extract Structured Data (Advanced OCR)</DialogTitle>
                        <DialogDescription>
                            Describe the data you want to extract from the first page of the PDF. The AI will return it as a JSON object.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="ocr-prompt">Extraction Prompt</Label>
                            <Textarea
                                id="ocr-prompt"
                                value={ocrPrompt}
                                onChange={(e) => setOcrPrompt(e.target.value)}
                                placeholder="e.g., Extract the invoice number, date, and a list of items with their prices."
                                className="min-h-[80px]"
                            />
                        </div>
                        {extractedData && (
                            <div className="grid gap-2">
                                <Label>Extracted Data</Label>
                                <div className="relative">
                                    <pre className="p-4 bg-muted rounded-md text-sm max-h-64 overflow-auto">
                                        <code>{extractedData}</code>
                                    </pre>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-2 right-2 h-7 w-7"
                                        onClick={() => {
                                            navigator.clipboard.writeText(extractedData);
                                            toast({ title: 'Copied to clipboard!' });
                                        }}
                                    >
                                        <Copy />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button onClick={handleExtractData} disabled={isExtractingData}>
                            {isExtractingData ? <Loader2 className="animate-spin" /> : <><BrainCircuit className="mr-2" /> Extract Data</>}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="flex items-center rounded-md border">
              <Button onClick={handleDownload} disabled={isDownloading} variant="ghost" className="border-r rounded-r-none">
                {isDownloading ? <Loader2 className="animate-spin" /> : <Download />}
                {getDownloadButtonText()}
              </Button>
              <Popover>
                  <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="rounded-l-none" disabled={isDownloading}>
                          <Settings className="h-4 w-4" />
                      </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-96">
                      <Tabs defaultValue="format" className="w-full">
                          <TabsList className="grid w-full grid-cols-2">
                              <TabsTrigger value="format">Format</TabsTrigger>
                              <TabsTrigger value="compress" disabled={downloadFormat !== 'pdf'}>Compress</TabsTrigger>
                          </TabsList>
                          <TabsContent value="format">
                              <div className="py-4">
                                  <Label>Download Format</Label>
                                  <RadioGroup value={downloadFormat} onValueChange={(value) => setDownloadFormat(value as DownloadFormat)} className="mt-2 space-y-1">
                                      <div className='flex items-center space-x-2'>
                                          <RadioGroupItem value="pdf" id="pdf" />
                                          <Label htmlFor="pdf" className="font-normal flex items-center gap-2"><Image className="h-4 w-4" />PDF Document</Label>
                                      </div>
                                      <div className='flex items-center space-x-2'>
                                          <RadioGroupItem value="png" id="png" />
                                          <Label htmlFor="png" className="font-normal flex items-center gap-2"><Image className="h-4 w-4" />PNG images (.zip)</Label>
                                      </div>
                                      <div className='flex items-center space-x-2'>
                                          <RadioGroupItem value="jpeg" id="jpeg" />
                                          <Label htmlFor="jpeg" className="font-normal flex items-center gap-2"><Image className="h-4 w-4" />JPEG images (.zip)</Label>
                                      </div>
                                      <div className='flex items-center space-x-2'>
                                          <RadioGroupItem value="ppt" id="ppt" />
                                          <Label htmlFor="ppt" className="font-normal flex items-center gap-2"><Presentation className="h-4 w-4" />PowerPoint (.pptx)</Label>
                                      </div>
                                      <div className='flex items-center space-x-2'>
                                          <RadioGroupItem value="xlsx" id="xlsx" />
                                          <Label htmlFor="xlsx" className="font-normal flex items-center gap-2"><FileSpreadsheet className="h-4 w-4" />Excel (.xlsx)</Label>
                                      </div>
                                  </RadioGroup>
                              </div>
                          </TabsContent>
                          <TabsContent value="compress">
                              <div className="py-4 space-y-4">
                                  <div className="flex items-center justify-between space-x-2">
                                      <Label htmlFor="compression-switch" className="flex flex-col space-y-1">
                                          <span>Enable Compression</span>
                                          <span className="font-normal leading-snug text-muted-foreground text-xs">
                                              Reduce file size by compressing images. May reduce quality.
                                          </span>
                                      </Label>
                                      <Switch id="compression-switch" checked={enableCompression} onCheckedChange={setEnableCompression} />
                                  </div>
                                  {enableCompression && (
                                      <div className='space-y-2 pt-2'>
                                          <Label htmlFor="target-size">Target File Size</Label>
                                          <div className="flex items-center gap-2">
                                              <Input
                                                  id="target-size"
                                                  type="number"
                                                  value={targetSize}
                                                  onChange={(e) => setTargetSize(Math.max(0, parseFloat(e.target.value) || 0))}
                                                  className="w-full"
                                                  min="0"
                                              />
                                              <Select value={targetUnit} onValueChange={(value: 'MB' | 'KB') => setTargetUnit(value)}>
                                                  <SelectTrigger className="w-32">
                                                      <SelectValue />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                      <SelectItem value="MB">MB</SelectItem>
                                                      <SelectItem value="KB">KB</SelectItem>
                                                  </SelectContent>
                                              </Select>
                                              <Tooltip>
                                                <TooltipTrigger asChild>
                                                  <Button variant="outline" size="icon" onClick={handleCompress} disabled={isCompressing}>
                                                    {isCompressing ? <Loader2 className="animate-spin" /> : <Rocket className="h-4 w-4" />}
                                                  </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Resize File</TooltipContent>
                                              </Tooltip>
                                          </div>
                                          {compressedPdfBytes && <p className="text-xs text-muted-foreground pt-1">Ready to download a file of {(compressedPdfBytes.length / 1024 / (targetUnit === 'MB' ? 1024 : 1)).toFixed(2)} {targetUnit}</p>}
                                      </div>
                                  )}
                              </div>
                          </TabsContent>
                      </Tabs>
                  </PopoverContent>
              </Popover>
            </div>
            
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

    