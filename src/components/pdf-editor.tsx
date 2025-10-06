'use client';

import React, { useState, useRef, useCallback, ChangeEvent, useEffect } from 'react';
import { PDFDocument, rgb, StandardFonts, degrees }from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';
import pptxgen from 'pptxgenjs';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Document, Packer, Paragraph, TextRun } from 'docx';


import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { PagePreview } from '@/components/page-preview';
import { Download, FileUp, Loader2, Plus, Replace, Trash2, Combine, Shuffle, ZoomIn, FilePlus, Info, ImagePlus, Settings, Gauge, ChevronDown, Rocket, Image, FileJson, Copy, BrainCircuit, Presentation, FileSpreadsheet, Split, Camera, FileText, Lock, Unlock, Droplet, RotateCcw, Search, CheckSquare, Square, RotateCw, Crop } from 'lucide-react';
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
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { ScanDocument } from './scan-document';
import { Slider } from './ui/slider';


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
  rotation?: number;
  crop?: { x: number; y: number; width: number; height: number }; // Crop data in percentages
  originalPageId?: number; // To reference the original page for cropping
};

type PdfSource = {
  file: File;
  arrayBufferForPdfLib: ArrayBuffer;
  pdfjsDoc: pdfjsLib.PDFDocumentProxy;
  password?: string;
};

type DownloadFormat = 'pdf' | 'png' | 'jpeg' | 'ppt' | 'xlsx' | 'word';

type Watermark = {
  enabled: boolean;
  text: string;
  opacity: number;
  rotation: number;
  fontSize: number;
  x: number;
  y: number;
};

interface PdfEditorProps {
  selectedTool: string | null;
  onToolSelect: (tool: string | null) => void;
}

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
    <div className="flex flex-col items-center text-center p-6 bg-card rounded-lg shadow-md hover:shadow-primary/20 transition-shadow">
        <div className="p-3 bg-primary/10 rounded-full mb-4">
            {icon}
        </div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
    </div>
);

const ToolCard = ({ icon, title, onClick, disabled = false }: { icon: React.ReactNode, title: string, onClick: () => void, disabled?: boolean }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className="group flex flex-col items-center justify-center p-4 bg-card rounded-lg shadow-md hover:shadow-primary/20 transition-all aspect-square border hover:border-primary disabled:opacity-50 disabled:pointer-events-none"
    >
        <div className="p-3 bg-primary/10 rounded-full mb-3 transition-transform duration-200 group-hover:scale-110">
            {React.cloneElement(icon as React.ReactElement, { className: 'h-8 w-8 text-primary' })}
        </div>
        <h3 className="text-base font-semibold text-center">{title}</h3>
    </button>
);


// Function to remove non-WinAnsi characters
const sanitizeTextForPdf = (text: string): string => {
  // This is a simplified regex. A more accurate one would be more complex.
  // It aims to remove most common characters outside of the WinAnsi spec.
  // eslint-disable-next-line no-control-regex
  return text.replace(/[^\x00-\x7F\u20AC-\u2122]/g, '');
};

export function PdfEditor({ selectedTool, onToolSelect }: PdfEditorProps) {
  const [pdfSources, setPdfSources] = useState<PdfSource[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [selectionInput, setSelectionInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [isConvertingToSvg, setIsConvertingToSvg] = useState(false);
  const [isExtractingData, setIsExtractingData] = useState(false);
  const [isConvertingExcel, setIsConvertingExcel] = useState(false);
  const [isConvertingPptx, setIsConvertingPptx] = useState(false);
  const [isConvertingWord, setIsConvertingWord] = useState(false);
  const [isConvertingHtml, setIsConvertingHtml] = useState(false);
  const [isSplitting, setIsSplitting] = useState(false);
  const [isScanDialogOpen, setIsScanDialogOpen] = useState(false);
  const [extractedData, setExtractedData] = useState('');
  const [ocrPrompt, setOcrPrompt] = useState('Extract the invoice number, date, and total amount.');
  const [enableCompression, setEnableCompression] = useState(false);
  const [compressionQuality, setCompressionQuality] = useState(75);
  const [compressedPdfBytes, setCompressedPdfBytes] = useState<Uint8Array | null>(null);
  const [downloadFormat, setDownloadFormat] = useState<DownloadFormat>('pdf');
  const [watermark, setWatermark] = useState<Watermark>({
    enabled: false,
    text: 'CONFIDENTIAL',
    opacity: 50,
    rotation: -45,
    fontSize: 50,
    x: 50,
    y: 50,
  });
  const [enableEncryption, setEnableEncryption] = useState(false);
  const [encryptionPassword, setEncryptionPassword] = useState('');
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [pdfForPassword, setPdfForPassword] = useState<{file: File, sourceIndex: number} | null>(null);
  const [pdfPassword, setPdfPassword] = useState('');
  const [compressionMode, setCompressionMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');


  const fileInputRef = useRef<HTMLInputElement>(null);
  const mergeFileInputRef = useRef<HTMLInputElement>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const imageToSvgInputRef = useRef<HTMLInputElement>(null);
  const excelFileInputRef = useRef<HTMLInputElement>(null);
  const pptxFileInputRef = useRef<HTMLInputElement>(null);
  const wordFileInputRef = useRef<HTMLInputElement>(null);
  const htmlFileInputRef = useRef<HTMLInputElement>(null);
  const draggedItemIndex = useRef<number | null>(null);
  const dragOverItemIndex = useRef<number | null>(null);
  const { toast } = useToast();
  
  useEffect(() => {
    if (selectedTool) {
      const tool = allTools.find(t => t.id === selectedTool);
      if (tool) {
        tool.onClick();
      }
      onToolSelect(null); // Reset after triggering
    }
  }, [selectedTool, onToolSelect]);

  const resetCompressedState = () => {
    if (compressedPdfBytes) {
      setCompressedPdfBytes(null);
      toast({ title: "Edits detected", description: "Please re-compress your PDF to see updated size.", variant: 'default' });
    }
  };

  const processAndSetPdf = async (file: File, sourceIndex: number, password?: string) => {
    setIsLoading(true);
    resetCompressedState();
    if (sourceIndex === 0) {
      setPages([]);
    }
    try {
      const arrayBuffer = await file.arrayBuffer();
      const arrayBufferForPdfLib = arrayBuffer.slice(0); 
      const arrayBufferForPdfJs = arrayBuffer.slice(0);
      const loadingTask = pdfjsLib.getDocument({ data: arrayBufferForPdfJs, password });
      const pdfjsDoc = await loadingTask.promise;
      
      setPdfSources(prev => {
        const newSources = [...prev];
        newSources[sourceIndex] = { file, arrayBufferForPdfLib, pdfjsDoc, password };
        return newSources;
      });

      const numPages = pdfjsDoc.numPages;
      const newPages: Page[] = [];

      for (let i = 1; i <= numPages; i++) {
        newPages.push({
          id: Date.now() + i + Math.random(),
          originalIndex: i - 1,
          pdfSourceIndex: sourceIndex,
          rotation: 0,
        });
      }
      setPages(prev => [...prev, ...newPages]);

    } catch (error: any) {
        if (error.name === 'PasswordException') {
            setPdfForPassword({file, sourceIndex});
            setIsPasswordDialogOpen(true);
        } else {
            console.error(error);
            toast({
                variant: 'destructive',
                title: 'Error Processing PDF',
                description: 'There was an issue loading your PDF. Please try another file.',
            });
        }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = () => {
    if (pdfForPassword) {
      processAndSetPdf(pdfForPassword.file, pdfForPassword.sourceIndex, pdfPassword);
      setIsPasswordDialogOpen(false);
      setPdfForPassword(null);
      setPdfPassword('');
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

  const addImageAsPage = async (imageFile: File | Blob, fileName: string) => {
    try {
        const imageBytes = await imageFile.arrayBuffer();
        const imageUrl = URL.createObjectURL(imageFile);
        resetCompressedState();

        const newPage: Page = {
            id: Date.now(),
            originalIndex: -1,
            pdfSourceIndex: -1,
            isFromImage: true,
            image: imageUrl,
            imageBytes: imageBytes,
            imageType: imageFile.type,
            imageScale: 1,
            rotation: 0,
        };

        if (pdfSources.length === 0) {
            const newPdfDoc = await PDFDocument.create();
            const page = newPdfDoc.addPage();
            const image = await (imageFile.type === 'image/png' ? newPdfDoc.embedPng(imageBytes) : newPdfDoc.embedJpg(imageBytes));
            const { width, height } = image.scale(1);
            page.setSize(width, height);
            page.drawImage(image, { x: 0, y: 0, width, height });

            const pdfBytes = await newPdfDoc.save();
            const newFile = new File([pdfBytes], fileName.replace(/\.[^/.]+$/, "") + ".pdf", { type: 'application/pdf' });
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
    await addImageAsPage(file, file.name);
    if (event.target) event.target.value = '';
  };
  
  const handleScanComplete = (imageBlob: Blob) => {
    const fileName = `scan_${new Date().toISOString()}.jpeg`;
    addImageAsPage(imageBlob, fileName);
    setIsScanDialogOpen(false);
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

  const handleExcelFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (!validTypes.includes(file.type)) {
        toast({
            variant: 'destructive',
            title: 'Invalid File',
            description: 'Please select a valid Excel file (.xls, .xlsx).',
        });
        return;
    }

    setIsConvertingExcel(true);
    toast({ title: 'Converting Excel to PDF...', description: 'This might take a moment.' });

    try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const pdfDoc = await PDFDocument.create();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        for (const sheetName of workbook.SheetNames) {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

            if (jsonData.length === 0) continue;
            
            const page = pdfDoc.addPage();
            const { width, height } = page.getSize();
            const margin = 40;
            const tableTop = height - margin - 20;

            // Draw header
            page.drawText(sheetName, {
                x: margin,
                y: height - margin,
                font: boldFont,
                size: 18,
            });

            // Basic table rendering logic
            const table = {
                headers: jsonData[0] as string[],
                rows: jsonData.slice(1) as string[][],
            };

            const numCols = table.headers.length;
            const colWidth = (width - 2 * margin) / numCols;
            const rowHeight = 20;
            const headerSize = 10;
            const rowSize = 9;

            // Draw headers
            let y = tableTop;
            table.headers.forEach((header, i) => {
                page.drawText(sanitizeTextForPdf(String(header ?? '')), {
                    x: margin + i * colWidth + 5,
                    y: y - rowHeight / 2,
                    font: boldFont,
                    size: headerSize,
                    color: rgb(0, 0, 0),
                });
            });
            y -= rowHeight;
            page.drawLine({
                start: { x: margin, y: y },
                end: { x: width - margin, y: y },
                thickness: 1.5,
            });

            // Draw rows
            for (const row of table.rows) {
                 if (y < margin + rowHeight) {
                    const newPage = pdfDoc.addPage();
                    // Copy functionality to new page if needed, for now just reset y
                    y = newPage.getHeight() - margin;
                }

                row.forEach((cell, i) => {
                    page.drawText(sanitizeTextForPdf(String(cell ?? '')), {
                        x: margin + i * colWidth + 5,
                        y: y - rowHeight / 2,
                        font,
                        size: rowSize,
                        color: rgb(0.2, 0.2, 0.2),
                    });
                });
                y -= rowHeight;
                 page.drawLine({
                    start: { x: margin, y: y },
                    end: { x: width - margin, y: y },
                    thickness: 0.5,
                });
            }
        }
        
        const pdfBytes = await pdfDoc.save();
        const pdfFile = new File([pdfBytes], file.name.replace(/\.(xlsx|xls)$/, '.pdf'), { type: 'application/pdf' });
        
        await processAndSetPdf(pdfFile, 0);

        toast({ title: 'Excel converted to PDF successfully!' });
    } catch (error) {
        console.error("Error converting Excel to PDF:", error);
        toast({
            variant: 'destructive',
            title: 'Conversion Failed',
            description: 'There was an error converting the Excel file to PDF.',
        });
    } finally {
        setIsConvertingExcel(false);
        if (event.target) event.target.value = '';
    }
};

  const handlePptxFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validTypes = [
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];

    if (!validTypes.includes(file.type)) {
        toast({
            variant: 'destructive',
            title: 'Invalid File',
            description: 'Please select a valid PowerPoint file (.pptx).',
        });
        return;
    }

    setIsConvertingPptx(true);
    toast({ title: 'Converting PowerPoint to PDF...', description: 'This may take a moment.' });
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      const pdfDoc = await PDFDocument.create();

      const imagePromises = [];
      const imagePaths: string[] = [];

      // Find all image files in the ppt/media/ directory
      zip.folder('ppt/media')?.forEach((relativePath, file) => {
        if (file.name.match(/\.(jpeg|jpg|png|gif)$/i)) {
          imagePaths.push(file.name);
          imagePromises.push(file.async('arraybuffer'));
        }
      });
      
      const images = await Promise.all(imagePromises);

      if(images.length === 0) {
        toast({ variant: 'destructive', title: 'No Images Found', description: 'Could not find any images in the PowerPoint file to convert.' });
        setIsConvertingPptx(false);
        return;
      }

      for (const imageBytes of images) {
        try {
          const page = pdfDoc.addPage();
          let image;
          
          // We need to know the image type to embed it correctly
          // This is a basic check, might not cover all cases
          const isPng = (new Uint8Array(imageBytes.slice(0, 8))).toString() === '137,80,78,71,13,10,26,10';

          if (isPng) {
            image = await pdfDoc.embedPng(imageBytes);
          } else {
            image = await pdfDoc.embedJpg(imageBytes);
          }
          
          const { width, height } = image.scale(1);
          page.setSize(width, height);
          page.drawImage(image, { x: 0, y: 0, width, height });

        } catch (e) {
          console.warn('Skipping an unsupported image format in PPTX file.', e);
        }
      }

      const pdfBytes = await pdfDoc.save();
      const pdfFile = new File([pdfBytes], file.name.replace(/\.pptx$/, '.pdf'), { type: 'application/pdf' });
      
      await processAndSetPdf(pdfFile, 0);

      toast({ title: 'PowerPoint converted to PDF successfully!' });
    } catch (error) {
      console.error("Error converting PPTX to PDF:", error);
      toast({
          variant: 'destructive',
          title: 'Conversion Failed',
          description: 'There was an error converting the PowerPoint file to PDF.',
      });
    } finally {
      setIsConvertingPptx(false);
      if (event.target) event.target.value = '';
    }
  };

  const handleWordFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validTypes = [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!validTypes.includes(file.type)) {
        toast({
            variant: 'destructive',
            title: 'Invalid File',
            description: 'Please select a valid Word file (.docx).',
        });
        return;
    }

    setIsConvertingWord(true);
    toast({ title: 'Converting Word to PDF...', description: 'This may take a moment.' });

    try {
        const arrayBuffer = await file.arrayBuffer();
        const { value: html } = await mammoth.convertToHtml({ arrayBuffer });

        const tempContainer = document.createElement('div');
        tempContainer.innerHTML = html;
        tempContainer.style.width = '210mm'; // A4 width
        tempContainer.style.padding = '15mm';
        tempContainer.style.boxSizing = 'border-box';
        document.body.appendChild(tempContainer);
        
        const canvas = await html2canvas(tempContainer, {
            scale: 2, // Higher scale for better quality
            useCORS: true,
        });
        
        document.body.removeChild(tempContainer);

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const ratio = canvasWidth / canvasHeight;
        
        const imgWidth = pdfWidth;
        const imgHeight = imgWidth / ratio;
        
        let heightLeft = imgHeight;
        let position = 0;
        
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;

        while (heightLeft > 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pdfHeight;
        }

        const pdfBytes = pdf.output('arraybuffer');
        const pdfFile = new File([pdfBytes], file.name.replace(/\.docx$/, '.pdf'), { type: 'application/pdf' });

        await processAndSetPdf(pdfFile, 0);

        toast({ title: 'Word converted to PDF successfully!' });
    } catch (error) {
        console.error("Error converting Word to PDF:", error);
        toast({
            variant: 'destructive',
            title: 'Conversion Failed',
            description: 'There was an error converting the Word file to PDF.',
        });
    } finally {
        setIsConvertingWord(false);
        if (event.target) event.target.value = '';
    }
  };

  const handleHtmlFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('html')) {
        toast({
            variant: 'destructive',
            title: 'Invalid File',
            description: 'Please select a valid HTML file (.html).',
        });
        return;
    }

    setIsConvertingHtml(true);
    toast({ title: 'Converting HTML to PDF...', description: 'This may take a moment.' });

    try {
        const html = await file.text();

        const tempContainer = document.createElement('div');
        tempContainer.innerHTML = html;
        tempContainer.style.width = '210mm'; // A4 width
        tempContainer.style.padding = '15mm';
        tempContainer.style.boxSizing = 'border-box';
        document.body.appendChild(tempContainer);
        
        const canvas = await html2canvas(tempContainer, {
            scale: 2, // Higher scale for better quality
            useCORS: true,
        });
        
        document.body.removeChild(tempContainer);

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const ratio = canvasWidth / canvasHeight;
        
        const imgWidth = pdfWidth;
        const imgHeight = imgWidth / ratio;
        
        let heightLeft = imgHeight;
        let position = 0;
        
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;

        while (heightLeft > 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pdfHeight;
        }

        const pdfBytes = pdf.output('arraybuffer');
        const pdfFile = new File([pdfBytes], file.name.replace(/\.html?$/, '.pdf'), { type: 'application/pdf' });

        await processAndSetPdf(pdfFile, 0);

        toast({ title: 'HTML converted to PDF successfully!' });
    } catch (error) {
        console.error("Error converting HTML to PDF:", error);
        toast({
            variant: 'destructive',
            title: 'Conversion Failed',
            description: 'There was an error converting the HTML file to PDF.',
        });
    } finally {
        setIsConvertingHtml(false);
        if (event.target) event.target.value = '';
    }
  };

  const renderPage = useCallback(async (pageId: number) => {
    const pageIndex = pages.findIndex((p) => p.id === pageId);
    if (pageIndex === -1 || pages[pageIndex].image) return;

    const pageData = pages[pageIndex];
    if (pageData.crop && pageData.originalPageId) {
        const originalPage = pages.find(p => p.id === pageData.originalPageId);
        if (originalPage?.image) {
            setPages(prev => prev.map(p => p.id === pageId ? { ...p, image: originalPage.image } : p));
        } else if (originalPage) {
            await renderPage(originalPage.id);
        }
        return;
    }

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
    setSelectedPages(prev => {
        const newSelection = new Set(prev);
        newSelection.delete(id);
        return newSelection;
    });
    toast({ title: 'Page removed' });
    resetCompressedState();
  }, [toast]);

  const handleDeleteSelectedPages = () => {
    const numSelected = selectedPages.size;
    if (numSelected === 0) return;

    setPages(prev => prev.filter(p => !selectedPages.has(p.id)));
    setSelectedPages(new Set());
    toast({ title: `${numSelected} page${numSelected > 1 ? 's' : ''} deleted`});
    resetCompressedState();
  };

  const handleToggleSelection = (pageId: number) => {
    setSelectedPages(prev => {
        const newSelection = new Set(prev);
        if (newSelection.has(pageId)) {
            newSelection.delete(pageId);
        } else {
            newSelection.add(pageId);
        }
        return newSelection;
    });
  };

  const handleSelectAll = () => {
    setSelectedPages(new Set(pages.map(p => p.id)));
  };

  const handleClearSelection = () => {
    setSelectedPages(new Set());
  };

  const handleSelectByRange = () => {
    const newSelection = new Set<number>();
    const parts = selectionInput.split(',').map(s => s.trim());
    
    parts.forEach(part => {
        if (part.includes('-')) {
            const [start, end] = part.split('-').map(s => parseInt(s.trim(), 10));
            if (!isNaN(start) && !isNaN(end)) {
                for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
                    if (i > 0 && i <= pages.length) {
                        newSelection.add(pages[i - 1].id);
                    }
                }
            }
        } else {
            const pageNum = parseInt(part, 10);
            if (!isNaN(pageNum) && pageNum > 0 && pageNum <= pages.length) {
                newSelection.add(pages[pageNum - 1].id);
            }
        }
    });

    setSelectedPages(newSelection);
    toast({ title: `${newSelection.size} pages selected`});
  };
  
  const handleAddPage = () => {
    const newPage: Page = {
      id: Date.now(),
      originalIndex: -1,
      pdfSourceIndex: -1,
      isNew: true,
      rotation: 0,
    };
    setPages(prev => [...prev, newPage]);
    toast({ title: 'Blank page added' });
    resetCompressedState();
  };
  
  const handleImageScaleChange = (id: number, scale: number) => {
    setPages(prev => prev.map(p => p.id === id ? { ...p, imageScale: scale } : p));
    resetCompressedState();
  };

  const handleRotatePage = (id: number) => {
    setPages(prev => prev.map(p => p.id === id ? { ...p, rotation: ((p.rotation || 0) + 90) % 360 } : p));
    resetCompressedState();
  };

  const handleWatermarkChange = (newProps: Partial<Watermark>) => {
    setWatermark(prev => ({...prev, ...newProps}));
    resetCompressedState();
  }

  const handleApplyCrop = (pageId: number, crop: { x: number, y: number, width: number, height: number }) => {
    const originalPageIndex = pages.findIndex(p => p.id === pageId);
    if (originalPageIndex === -1) return;

    const originalPage = pages[originalPageIndex];

    const newPage: Page = {
        id: Date.now(),
        originalIndex: -1, 
        pdfSourceIndex: -1,
        isNew: false,
        isFromImage: false,
        crop,
        originalPageId: originalPage.crop ? originalPage.originalPageId : originalPage.id, // Chain crops back to the very first original
        rotation: 0,
        // Carry over image data if already loaded
        image: originalPage.image,
        imageBytes: originalPage.imageBytes,
        imageType: originalPage.imageType,
    };

    setPages(prev => {
        const newPages = [...prev];
        newPages.splice(originalPageIndex + 1, 0, newPage);
        return newPages;
    });

    toast({ title: "Page cropped", description: "A new page has been created with the cropped area." });
    resetCompressedState();
};

  const generatePdfBytes = async (quality?: number): Promise<Uint8Array> => {
    const newPdf = await PDFDocument.create();
    const sourcePdfDocs = await Promise.all(
        pdfSources.map(source => {
            const options = { data: source.arrayBufferForPdfLib.slice(0), password: source.password };
            return PDFDocument.load(options.data, { password: options.password });
        })
    );

    const font = await newPdf.embedFont(StandardFonts.Helvetica);

    const findOriginalPageData = (page: Page): {imageBytes?: ArrayBuffer, imageType?: string, sourcePdf?: PDFDocument, originalIndex?: number} => {
        if (page.originalPageId) {
            const originalPage = pages.find(p => p.id === page.originalPageId);
            if (originalPage) {
                return findOriginalPageData(originalPage);
            }
        }
        return {
            imageBytes: page.imageBytes,
            imageType: page.imageType,
            sourcePdf: page.pdfSourceIndex !== -1 ? sourcePdfDocs[page.pdfSourceIndex] : undefined,
            originalIndex: page.originalIndex
        };
    };

    for (const page of pages) {
      const pageRotation = page.rotation || 0;
      if (page.isNew) {
        const newPage = newPdf.addPage();
        newPage.setRotation(degrees(pageRotation));
      } else if (page.crop) {
        const { imageBytes, imageType, sourcePdf, originalIndex } = findOriginalPageData(page);

        if (imageBytes && imageType) {
            const image = imageType === 'image/png' ? await newPdf.embedPng(imageBytes) : await newPdf.embedJpg(imageBytes);
            const { width: origWidth, height: origHeight } = image.scale(1);
            
            const cropWidth = origWidth * page.crop.width / 100;
            const cropHeight = origHeight * page.crop.height / 100;

            const newPage = newPdf.addPage([cropWidth, cropHeight]);

            newPage.drawImage(image, {
                x: -origWidth * page.crop.x / 100,
                y: -origHeight * (100 - page.crop.y - page.crop.height) / 100 + cropHeight - origHeight,
                width: origWidth,
                height: origHeight,
            });
            newPage.setRotation(degrees(pageRotation));
        } else if (sourcePdf && originalIndex !== undefined && originalIndex !== -1) {
            const [copiedPage] = await newPdf.copyPages(sourcePdf, [originalIndex]);
            
            const { width: origWidth, height: origHeight } = copiedPage.getSize();
            const cropWidth = origWidth * page.crop.width / 100;
            const cropHeight = origHeight * page.crop.height / 100;

            const newPage = newPdf.addPage([cropWidth, cropHeight]);
            
            copiedPage.setCropBox(
                origWidth * page.crop.x / 100,
                origHeight * (1 - (page.crop.y / 100) - (page.crop.height / 100)),
                cropWidth,
                cropHeight
            );
            
            const embeddedPage = await newPdf.embedPage(copiedPage);
            newPage.drawPage(embeddedPage, { x: 0, y: 0, width: cropWidth, height: cropHeight });
            newPage.setRotation(degrees(pageRotation));
        }

      } else if (page.isFromImage && page.imageBytes) {
          const imageBytesCopy = page.imageBytes.slice(0);
          const pageToAdd = newPdf.addPage();
          pageToAdd.setRotation(degrees(pageRotation));
          
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
          copiedPage.setRotation(degrees(pageRotation + copiedPage.getRotation().angle));
          newPdf.addPage(copiedPage);
        }
      }
    }
    
    if (watermark.enabled && watermark.text) {
        const pagesToWatermark = newPdf.getPages();
        for (const page of pagesToWatermark) {
            const { width, height } = page.getSize();
            page.drawText(watermark.text, {
                x: (watermark.x / 100) * width,
                y: height - (watermark.y / 100) * height,
                font,
                size: watermark.fontSize,
                color: rgb(0, 0, 0),
                opacity: watermark.opacity / 100,
                rotate: degrees(watermark.rotation),
            });
        }
    }
    
    const saveOptions: any = {};
    if (enableCompression) {
        saveOptions.useObjectStreams = false;
    }

    if (enableEncryption && encryptionPassword) {
      saveOptions.userPassword = encryptionPassword;
      saveOptions.ownerPassword = encryptionPassword;
      saveOptions.permissions = [4, 16];
    }


    return newPdf.save(saveOptions);
  }
  
  const handleCompress = useCallback(async (quality: number) => {
    if (pages.length === 0) return;
    setIsCompressing(true);
    setCompressedPdfBytes(null);
    try {
      const qualityValue = quality / 100;
      const newPdf = await PDFDocument.create();
  
      for (const pageInfo of pages) {
        const pageToAdd = newPdf.addPage();
        pageToAdd.setRotation(degrees(pageInfo.rotation || 0));

        if (pageInfo.isNew) {
          // It's a blank page, just add it
        } else if (pageInfo.isFromImage && pageInfo.imageBytes) {
            const tempDoc = await PDFDocument.create();
            const image = pageInfo.imageType === 'image/png'
              ? await tempDoc.embedPng(pageInfo.imageBytes)
              : await tempDoc.embedJpg(pageInfo.imageBytes);
            
            let jpgBytes;
            if (pageInfo.imageType === 'image/png') {
              const canvas = document.createElement('canvas');
              const context = canvas.getContext('2d');
              const img = new (window as any).Image();
              img.src = pageInfo.image!; // Assumes image data url is available
              await new Promise(resolve => { img.onload = resolve; });
              canvas.width = img.width;
              canvas.height = img.height;
              context?.drawImage(img, 0, 0);
              const dataUrl = canvas.toDataURL('image/jpeg', qualityValue);
              jpgBytes = await fetch(dataUrl).then(res => res.arrayBuffer());
            } else {
              jpgBytes = pageInfo.imageBytes; // For jpg, use original bytes as we can't recompress easily on client
            }

            const jpgImage = await newPdf.embedJpg(jpgBytes);
            const { width, height } = jpgImage.scale(pageInfo.imageScale ?? 1);
            pageToAdd.setSize(width, height);
            const x = (pageToAdd.getWidth() - width) / 2;
            const y = (pageToAdd.getHeight() - height) / 2;
            pageToAdd.drawImage(jpgImage, { x, y, width, height });

        } else {
          const source = pdfSources[pageInfo.pdfSourceIndex];
          if (source) {
            const pdfDoc = await PDFDocument.load(source.arrayBufferForPdfLib.slice(0), { password: source.password });
            const [copiedPage] = await newPdf.copyPages(pdfDoc, [pageInfo.originalIndex]);
            const pdfJsPage = await source.pdfjsDoc.getPage(pageInfo.originalIndex + 1);

            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            const viewport = pdfJsPage.getViewport({ scale: 2 });
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            if (context) {
              await pdfJsPage.render({ canvasContext: context, viewport }).promise;
              const dataUrl = canvas.toDataURL('image/jpeg', qualityValue);
              const imageBytes = await fetch(dataUrl).then(res => res.arrayBuffer());
              
              const jpgImage = await newPdf.embedJpg(imageBytes);
              
              pageToAdd.setSize(viewport.width, viewport.height);
              pageToAdd.drawImage(jpgImage, {
                width: viewport.width,
                height: viewport.height,
              });
            }
          }
        }
      }
      const currentPdfBytes = await newPdf.save({ useObjectStreams: false });
      setCompressedPdfBytes(currentPdfBytes);
  
    } catch (error: any) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Failed to Increase Quality', description: error.message || 'An error occurred during quality increase.' });
    } finally {
      setIsCompressing(false);
    }
  }, [pages, pdfSources, toast]);

  useEffect(() => {
    if (enableCompression && pages.length > 0) {
      const handler = setTimeout(() => {
        handleCompress(compressionQuality);
      }, 500); // Debounce
      return () => clearTimeout(handler);
    }
  }, [compressionQuality, enableCompression, pages, handleCompress]);


  const handleDownloadPdf = async () => {
    if (pages.length === 0) return;

    if (enableEncryption && !encryptionPassword) {
      toast({ variant: 'destructive', title: 'Password Required', description: 'Please enter a password to encrypt the PDF.' });
      return;
    }

    setIsDownloading(true);
    try {
      let pdfBytes: Uint8Array;

      if (enableCompression) {
        if (compressedPdfBytes) {
          pdfBytes = compressedPdfBytes;
        } else {
            toast({ variant: 'destructive', title: 'Not Processed', description: 'Please wait for quality processing to finish or adjust settings.' });
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

const handleDownloadAsWord = async () => {
    if (pages.length === 0) return;

    setIsDownloading(true);
    toast({ title: 'Creating Word document...', description: 'This may take a moment.' });

    try {
        const paragraphs: Paragraph[] = [];

        for (const pageInfo of pages) {
            if (pageInfo.isNew) {
                paragraphs.push(new Paragraph({ children: [new TextRun({ text: '', break: 1 })] }));
                continue;
            }

            if (pageInfo.isFromImage) {
                // Cannot directly embed images from URL in docx library easily on client-side
                // Skipping images for now.
                continue;
            }
            
            const source = pdfSources[pageInfo.pdfSourceIndex];
            if (!source) continue;

            const page = await source.pdfjsDoc.getPage(pageInfo.originalIndex + 1);
            const textContent = await page.getTextContent();
            
            // A simple approach to group text items into paragraphs
            let currentY = -1;
            let line = '';
            textContent.items.forEach((item: any) => {
                if (currentY !== -1 && Math.abs(currentY - item.transform[5]) > 5) {
                    paragraphs.push(new Paragraph(line));
                    line = '';
                }
                line += item.str + ' ';
                currentY = item.transform[5];
            });
            if (line.trim()) {
                paragraphs.push(new Paragraph(line));
            }
            // Add a page break after each PDF page
            paragraphs.push(new Paragraph({ children: [new TextRun({ text: '', break: 1 })] }));
        }

        const doc = new Document({
            sections: [{
                children: paragraphs,
            }],
        });
        
        const blob = await Packer.toBlob(doc);
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        const newFileName = pdfSources[0]?.file.name.replace(/\.pdf$/i, '.docx') ?? 'document.docx';
        link.download = newFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({ title: 'Download Started', description: `Your Word document "${newFileName}" is downloading.` });
    } catch (error) {
        console.error("Error creating Word document:", error);
        toast({
            variant: 'destructive',
            title: 'Error Creating Word Document',
            description: 'An unexpected error occurred while converting to Word.',
        });
    } finally {
        setIsDownloading(false);
    }
};

 const handleSplitPdf = async () => {
    if (pages.length === 0) return;

    setIsSplitting(true);
    toast({ title: 'Splitting PDF...', description: 'This may take a moment.' });
    
    try {
        const zip = new JSZip();
        const sourcePdfDocs = pdfSources.length > 0 ? await Promise.all(
          pdfSources.map(source => {
              const options = { data: source.arrayBufferForPdfLib.slice(0), password: source.password };
              return PDFDocument.load(options.data, { password: options.password });
          })
        ) : [];

        for (let i = 0; i < pages.length; i++) {
            const pageInfo = pages[i];
            const singlePagePdf = await PDFDocument.create();

            if (pageInfo.isNew) {
                singlePagePdf.addPage();
            } else if (pageInfo.isFromImage && pageInfo.imageBytes) {
                const imageBytesCopy = pageInfo.imageBytes.slice(0);
                const pageToAdd = singlePagePdf.addPage();
                
                const image = pageInfo.imageType === 'image/png' 
                    ? await singlePagePdf.embedPng(imageBytesCopy)
                    : await singlePagePdf.embedJpg(imageBytesCopy);
                
                const { width, height } = image.scale(1);
                pageToAdd.setSize(width, height);
                
                const scaledDims = image.scale(pageInfo.imageScale ?? 1);
                const x = (pageToAdd.getWidth() - scaledDims.width) / 2;
                const y = (pageToAdd.getHeight() - scaledDims.height) / 2;

                pageToAdd.drawImage(image, { 
                    x, y,
                    width: scaledDims.width,
                    height: scaledDims.height 
                });
            } else {
                if (pageInfo.pdfSourceIndex < 0 || pageInfo.pdfSourceIndex >= sourcePdfDocs.length) continue;
                const sourcePdf = sourcePdfDocs[pageInfo.pdfSourceIndex];
                if (sourcePdf) {
                    const [copiedPage] = await singlePagePdf.copyPages(sourcePdf, [pageInfo.originalIndex]);
                    singlePagePdf.addPage(copiedPage);
                }
            }
            
            const pdfBytes = await singlePagePdf.save();
            zip.file(`page_${i + 1}.pdf`, pdfBytes);
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(zipBlob);
        const newFileName = pdfSources[0]?.file.name.replace(/\.pdf$/i, '_split.zip') ?? 'split_pages.zip';
        link.download = newFileName;
        document.body.appendChild(link);
        document.body.removeChild(link);
        toast({ title: 'Download Started', description: `Your split PDFs are downloading as "${newFileName}".` });
    } catch (error) {
        console.error("Error splitting PDF:", error);
        toast({
            variant: 'destructive',
            title: 'Error Splitting PDF',
            description: 'An unexpected error occurred while splitting the PDF.',
        });
    } finally {
        setIsSplitting(false);
    }
 };


  const handleReset = () => {
    setPdfSources([]);
    setPages([]);
    setSelectedPages(new Set());
    setCompressedPdfBytes(null);
    setCompressionMode(false);
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
            title: 'Error Extacting Data',
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
      case 'word':
        handleDownloadAsWord();
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
      case 'word':
        return 'Download Word';
      default:
        return 'Download PDF';
    }
  };

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
  
  const originalSize = pdfSources.reduce((acc, s) => acc + s.arrayBufferForPdfLib.byteLength, 0);

  const allTools = [
      {
          id: 'upload-pdf',
          title: 'Upload PDF',
          icon: <FileUp />,
          onClick: () => fileInputRef.current?.click(),
          keywords: ['upload', 'pdf', 'open', 'select', 'file'],
      },
      {
          id: 'scan-to-pdf',
          title: 'Scan to PDF',
          icon: <Camera />,
          onClick: () => setIsScanDialogOpen(true),
          keywords: ['scan', 'camera', 'document', 'mobile'],
      },
      {
          id: 'image-to-pdf',
          title: 'Image to PDF',
          icon: <ImagePlus />,
          onClick: () => imageFileInputRef.current?.click(),
          keywords: ['image', 'jpg', 'png', 'jpeg', 'convert', 'to pdf'],
      },
      {
          id: 'excel-to-pdf',
          title: 'Excel to PDF',
          icon: <FileSpreadsheet />,
          onClick: () => excelFileInputRef.current?.click(),
          disabled: isConvertingExcel,
          keywords: ['excel', 'xls', 'xlsx', 'spreadsheet', 'convert'],
      },
      {
          id: 'ppt-to-pdf',
          title: 'PowerPoint to PDF',
          icon: <Presentation />,
          onClick: () => pptxFileInputRef.current?.click(),
          disabled: isConvertingPptx,
          keywords: ['powerpoint', 'ppt', 'pptx', 'presentation', 'convert'],
      },
      {
          id: 'word-to-pdf',
          title: 'Word to PDF',
          icon: <FileText />,
          onClick: () => wordFileInputRef.current?.click(),
          disabled: isConvertingWord,
          keywords: ['word', 'doc', 'docx', 'document', 'convert'],
      },
      {
          id: 'html-to-pdf',
          title: 'HTML to PDF',
          icon: <FileText />,
          onClick: () => htmlFileInputRef.current?.click(),
          disabled: isConvertingHtml,
          keywords: ['html', 'htm', 'webpage', 'convert'],
      },
      {
          id: 'pdf-to-image',
          title: 'PDF to Images',
          icon: <Image />,
          onClick: () => fileInputRef.current?.click(),
          keywords: ['pdf to image', 'png', 'jpg', 'jpeg', 'convert'],
      },
      {
          id: 'pdf-to-ppt',
          title: 'PDF to PowerPoint',
          icon: <Presentation />,
          onClick: () => fileInputRef.current?.click(),
          keywords: ['pdf to powerpoint', 'ppt', 'pptx', 'presentation', 'convert'],
      },
      {
          id: 'pdf-to-excel',
          title: 'PDF to Excel',
          icon: <FileSpreadsheet />,
          onClick: () => fileInputRef.current?.click(),
          keywords: ['pdf to excel', 'xls', 'xlsx', 'spreadsheet', 'extract', 'table'],
      },
      {
          id: 'pdf-to-word',
          title: 'PDF to Word',
          icon: <FileText />,
          onClick: () => fileInputRef.current?.click(),
          keywords: ['pdf to word', 'doc', 'docx', 'document', 'convert'],
      },
      {
          id: 'merge-pdf',
          title: 'Merge PDF',
          icon: <Combine />,
          onClick: () => fileInputRef.current?.click(),
          keywords: ['merge', 'combine', 'join', 'pdf'],
      },
      {
          id: 'split-pdf',
          title: 'Split PDF',
          icon: <Split />,
          onClick: () => fileInputRef.current?.click(),
          keywords: ['split', 'separate', 'extract pages', 'pdf'],
      },
      {
          id: 'rotate-pdf',
          title: 'Rotate Pages',
          icon: <RotateCw />,
          onClick: () => fileInputRef.current?.click(),
          keywords: ['rotate', 'turn', 'flip', 'pages'],
      },
      {
          id: 'reorder-pdf',
          title: 'Reorder Pages',
          icon: <Shuffle />,
          onClick: () => fileInputRef.current?.click(),
          keywords: ['reorder', 'sort', 'move', 'pages'],
      },
      {
          id: 'watermark-pdf',
          title: 'Add Watermark',
          icon: <Droplet />,
          onClick: () => fileInputRef.current?.click(),
          keywords: ['watermark', 'stamp', 'confidential', 'text'],
      },
      {
          id: 'protect-pdf',
          title: 'Protect PDF',
          icon: <Lock />,
          onClick: () => fileInputRef.current?.click(),
          keywords: ['protect', 'encrypt', 'password', 'secure'],
      },
      {
          id: 'unlock-pdf',
          title: 'Unlock PDF',
          icon: <Unlock />,
          onClick: () => fileInputRef.current?.click(),
          keywords: ['unlock', 'decrypt', 'remove password', 'unsecure'],
      },
      {
          id: 'increase-quality-pdf',
          title: 'Increase PDF Quality',
          icon: <Gauge />,
          onClick: () => {
              fileInputRef.current?.click();
          },
          keywords: ['increase quality', 'optimize', 'quality', 'compress', 'resize', 'reduce size'],
      },
      {
          id: 'crop-pdf',
          title: 'Crop PDF',
          icon: <Crop />,
          onClick: () => fileInputRef.current?.click(),
          keywords: ['crop', 'cut', 'trim'],
      },
      {
          id: 'image-to-svg',
          title: 'Image to SVG',
          icon: <FileJson />,
          onClick: () => imageToSvgInputRef.current?.click(),
          disabled: isConvertingToSvg,
          keywords: ['image to svg', 'vector', 'convert', 'trace'],
      },
      {
          id: 'extract-data',
          title: 'Extract Data',
          icon: <BrainCircuit />,
          onClick: () => fileInputRef.current?.click(),
          keywords: ['extract', 'data', 'ocr', 'ai', 'json'],
      },
  ];

  const filteredTools = allTools.filter(tool =>
    tool.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tool.keywords.some(keyword => keyword.toLowerCase().includes(searchQuery.toLowerCase()))
  );


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
        <Card className="max-w-6xl mx-auto text-center shadow-lg bg-card/50">
            <CardHeader>
                <CardTitle className="text-3xl font-bold tracking-tight">The Ultimate PDF Toolkit</CardTitle>
                <CardDescription className="text-lg text-muted-foreground">
                    Effortlessly manage your PDFs. Upload, reorder, delete, merge, and download pages—all with a live preview.
                </CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="mb-8 max-w-lg mx-auto">
                    <div className="relative">
                        <Input
                            placeholder="Search for a tool (e.g., 'merge', 'compress')..."
                            className="w-full h-12 pl-12 pr-4 text-base"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    </div>
                </div>

                {filteredTools.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 auto-rows-[1fr]">
                        {filteredTools.map((tool, index) => (
                           <ToolCard
                                key={tool.title}
                                icon={tool.icon}
                                title={tool.title}
                                onClick={tool.onClick}
                                disabled={tool.disabled}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <p className="text-lg font-semibold">No tools found for "{searchQuery}"</p>
                        <p className="text-muted-foreground">Try a different search term.</p>
                    </div>
                )}
                
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="application/pdf" className="hidden" />
                <input type="file" ref={imageFileInputRef} onChange={handleImageFileChange} accept="image/*" className="hidden" />
                <input type="file" ref={imageToSvgInputRef} onChange={handleImageToSvg} accept="image/*" className="hidden" />
                <input type="file" ref={excelFileInputRef} onChange={handleExcelFileChange} accept=".xlsx, .xls" className="hidden" />
                <input type="file" ref={pptxFileInputRef} onChange={handlePptxFileChange} accept=".pptx" className="hidden" />
                <input type="file" ref={wordFileInputRef} onChange={handleWordFileChange} accept=".docx" className="hidden" />
                <input type="file" ref={htmlFileInputRef} onChange={handleHtmlFileChange} accept=".html,.htm" className="hidden" />
            </CardContent>
        </Card>

        <section className="w-full">
            <div className="container mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
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
                     <FeatureCard
                        icon={<Unlock className="h-8 w-8 text-primary" />}
                        title="Remove Encryption"
                        description="Upload a password-protected PDF, enter its password, and download a password-free version."
                    />
                </div>
            </div>
        </section>
        
        <Dialog open={isScanDialogOpen} onOpenChange={setIsScanDialogOpen}>
          <ScanDocument onScanComplete={handleScanComplete} open={isScanDialogOpen} />
        </Dialog>

        <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Password Required</DialogTitle>
                    <DialogDescription>
                        This PDF is password protected. Please enter the password to open it.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                    <Label htmlFor="pdf-password">Password</Label>
                    <Input
                        id="pdf-password"
                        type="password"
                        value={pdfPassword}
                        onChange={(e) => setPdfPassword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                    />
                </div>
                <DialogFooter>
                    <Button onClick={handlePasswordSubmit}>Unlock PDF</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 p-4 bg-card border rounded-lg shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className='flex-auto min-w-0'>
                <h2 className="font-bold text-lg truncate" title={pdfSources[0]?.file.name}>{pdfSources[0]?.file.name}</h2>
                <p className="text-sm text-muted-foreground">{pages.length} pages {selectedPages.size > 0 ? `• ${selectedPages.size} selected` : ''}</p>
            </div>
             <div className="flex items-center rounded-md border flex-shrink-0">
              <Button onClick={handleDownload} disabled={isDownloading} variant="ghost" className="border-r rounded-r-none">
                {isDownloading ? <Loader2 className="animate-spin" /> : (enableEncryption ? <Lock /> : <Download />)}
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
                          <TabsList className="grid w-full grid-cols-4">
                              <TabsTrigger value="format">Format</TabsTrigger>
                              <TabsTrigger value="compress" disabled={downloadFormat !== 'pdf'}>Quality</TabsTrigger>
                              <TabsTrigger value="watermark" disabled={downloadFormat !== 'pdf'}>Watermark</TabsTrigger>
                              <TabsTrigger value="encrypt" disabled={downloadFormat !== 'pdf'}>Encrypt</TabsTrigger>
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
                                      <div className='flex items-center space-x-2'>
                                          <RadioGroupItem value="word" id="word" />
                                          <Label htmlFor="word" className="font-normal flex items-center gap-2"><FileText className="h-4 w-4" />Word (.docx)</Label>
                                      </div>
                                  </RadioGroup>
                              </div>
                          </TabsContent>
                          <TabsContent value="compress">
                              <div className="py-4 space-y-4">
                                  <div className="flex items-center justify-between space-x-2">
                                      <Label htmlFor="compression-switch" className="flex flex-col space-y-1">
                                          <span>Increase Image Quality</span>
                                          <span className="font-normal leading-snug text-muted-foreground text-xs">
                                              Enhance the quality of images in your PDF. May increase file size.
                                          </span>
                                      </Label>
                                      <Switch id="compression-switch" checked={enableCompression} onCheckedChange={setEnableCompression} />
                                  </div>
                                  {enableCompression && (
                                    <div className='space-y-4 pt-2'>
                                      <div className="space-y-2">
                                          <div className='flex justify-between items-baseline'>
                                              <Label htmlFor="quality-slider">Image Quality</Label>
                                              <span className="text-sm font-medium text-muted-foreground">{compressionQuality}%</span>
                                          </div>
                                          <Slider
                                              id="quality-slider"
                                              min={1}
                                              max={100}
                                              step={1}
                                              value={[compressionQuality]}
                                              onValueChange={(value) => setCompressionQuality(value[0])}
                                              disabled={isCompressing}
                                          />
                                      </div>

                                      <div className="grid grid-cols-2 gap-4 text-center p-2 bg-muted/50 rounded-lg">
                                          <div>
                                              <p className="text-xs text-muted-foreground">Original Size</p>
                                              <p className="text-lg font-bold">
                                                  {formatBytes(originalSize)}
                                              </p>
                                          </div>
                                          <div>
                                              <p className="text-xs text-muted-foreground">New Size</p>
                                              {isCompressing ? 
                                                  <Loader2 className="h-6 w-6 animate-spin mx-auto my-1" /> :
                                                  <p className="text-lg font-bold">
                                                      {compressedPdfBytes ? formatBytes(compressedPdfBytes.length) : '-'}
                                                  </p>
                                              }
                                          </div>
                                      </div>
                                    </div>
                                  )}
                              </div>
                          </TabsContent>
                          <TabsContent value="watermark">
                                <div className="py-4 space-y-4">
                                    <div className="flex items-center justify-between space-x-2">
                                        <Label htmlFor="watermark-switch" className="flex flex-col space-y-1">
                                            <span>Enable Watermark</span>
                                            <span className="font-normal leading-snug text-muted-foreground text-xs">
                                                Add a text watermark to each page of the PDF.
                                            </span>
                                        </Label>
                                        <Switch id="watermark-switch" checked={watermark.enabled} onCheckedChange={(checked) => handleWatermarkChange({ enabled: checked })} />
                                    </div>
                                    {watermark.enabled && (
                                        <div className='space-y-4 pt-2'>
                                            <div className='space-y-2'>
                                                <Label htmlFor="watermark-text">Watermark Text</Label>
                                                <Input
                                                    id="watermark-text"
                                                    value={watermark.text}
                                                    onChange={(e) => handleWatermarkChange({ text: e.target.value })}
                                                />
                                            </div>
                                            <div className='space-y-2'>
                                                <Label htmlFor="watermark-size">Font Size: {watermark.fontSize}px</Label>
                                                <Slider
                                                    id="watermark-size"
                                                    min={10} max={200} step={5}
                                                    value={[watermark.fontSize]}
                                                    onValueChange={(v) => handleWatermarkChange({ fontSize: v[0] })}
                                                />
                                            </div>
                                            <div className='space-y-2'>
                                                <Label htmlFor="watermark-rotation">Rotation: {Math.round(watermark.rotation)}°</Label>
                                                <Slider
                                                    id="watermark-rotation"
                                                    min={-180} max={180} step={5}
                                                    value={[watermark.rotation]}
                                                    onValueChange={(v) => handleWatermarkChange({ rotation: v[0] })}
                                                />
                                            </div>
                                             <div className='space-y-2'>
                                                <Label htmlFor="watermark-opacity">Opacity: {watermark.opacity}%</Label>
                                                <Slider
                                                    id="watermark-opacity"
                                                    min={1} max={100} step={1}
                                                    value={[watermark.opacity]}
                                                    onValueChange={(v) => handleWatermarkChange({ opacity: v[0] })}
                                                />
                                            </div>
                                            <div className='space-y-2'>
                                                <Label htmlFor="watermark-x">Horizontal Position: {Math.round(watermark.x)}%</Label>
                                                <Slider
                                                    id="watermark-x"
                                                    min={0} max={100} step={1}
                                                    value={[watermark.x]}
                                                    onValueChange={(v) => handleWatermarkChange({ x: v[0] })}
                                                />
                                            </div>
                                            <div className='space-y-2'>
                                                <Label htmlFor="watermark-y">Vertical Position: {Math.round(watermark.y)}%</Label>
                                                <Slider
                                                    id="watermark-y"
                                                    min={0} max={100} step={1}
                                                    value={[watermark.y]}
                                                    onValueChange={(v) => handleWatermarkChange({ y: v[0] })}
                                                />
                                            </div>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <Button variant="outline" size="sm" onClick={() => handleWatermarkChange({ x: 50, y: 50, rotation: -45 })}>
                                                    <RotateCcw className="mr-2 h-4 w-4" /> Reset Position
                                                </Button>
                                              </TooltipTrigger>
                                              <TooltipContent>Reset position and rotation</TooltipContent>
                                            </Tooltip>
                                        </div>
                                    )}
                                </div>
                          </TabsContent>
                          <TabsContent value="encrypt">
                                <div className="py-4 space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="encryption-password">Password</Label>
                                        <Input
                                            id="encryption-password"
                                            type="password"
                                            value={encryptionPassword}
                                            onChange={(e) => setEncryptionPassword(e.target.value)}
                                            placeholder="Enter password"
                                            disabled={enableEncryption}
                                        />
                                    </div>
                                    {enableEncryption ? (
                                        <Button variant="destructive" onClick={() => { setEnableEncryption(false); setEncryptionPassword(''); toast({ title: 'PDF Unlocked' }); }}>
                                            <Unlock className="mr-2" /> Remove Password
                                        </Button>
                                    ) : (
                                        <Button onClick={() => {
                                            if (encryptionPassword) {
                                                setEnableEncryption(true);
                                                toast({ title: 'PDF Locked', description: 'The downloaded file will be password protected.' });
                                            } else {
                                                toast({ variant: 'destructive', title: 'Password Required', description: 'Please enter a password.' });
                                            }
                                        }}>
                                            <Lock className="mr-2" /> Set Password & Lock
                                        </Button>
                                    )}
                                </div>
                            </TabsContent>
                      </Tabs>
                  </PopoverContent>
              </Popover>
            </div>
        </div>
        <div className="w-full">
            <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex gap-2 pb-4">
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                        <Replace /> Change File
                    </Button>
                    <Button variant="outline" onClick={handleReset}>
                        <Trash2 /> Reset
                    </Button>
                    {selectedPages.size > 0 && (
                        <Button variant="destructive" onClick={handleDeleteSelectedPages}>
                            <Trash2 /> Delete {selectedPages.size} Page{selectedPages.size > 1 ? 's' : ''}
                        </Button>
                    )}
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline">
                                <CheckSquare /> Select Pages
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className='w-80'>
                            <div className='grid gap-4'>
                                <div className='space-y-2'>
                                    <h4 className="font-medium leading-none">Select Pages</h4>
                                    <p className="text-xs text-muted-foreground">
                                        Enter page numbers or ranges (e.g., 1, 3-5, 8).
                                    </p>
                                </div>
                                <div className='grid gap-2'>
                                    <Input
                                        value={selectionInput}
                                        onChange={(e) => setSelectionInput(e.target.value)}
                                        placeholder="e.g. 1, 3-5, 8"
                                    />
                                    <Button onClick={handleSelectByRange} size="sm">Select</Button>
                                </div>
                                <div className='grid grid-cols-2 gap-2'>
                                    <Button onClick={handleSelectAll} variant="secondary" size="sm">Select All</Button>
                                    <Button onClick={handleClearSelection} variant="secondary" size="sm">Clear Selection</Button>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                    <Button variant="outline" onClick={handleAddPage}>
                        <Plus /> Add Page
                    </Button>
                    <Dialog open={isScanDialogOpen} onOpenChange={setIsScanDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline">
                                <Camera /> Scan Page
                            </Button>
                        </DialogTrigger>
                        <ScanDocument onScanComplete={handleScanComplete} open={isScanDialogOpen} />
                    </Dialog>
                    <Button variant="outline" onClick={() => imageFileInputRef.current?.click()}>
                        <ImagePlus /> Add Image
                    </Button>
                    <Button variant="outline" onClick={() => mergeFileInputRef.current?.click()} disabled={isMerging}>
                        {isMerging ? <Loader2 className="animate-spin" /> : <Combine />}
                        Merge PDF
                    </Button>
                    <Button variant="outline" onClick={handleSplitPdf} disabled={isSplitting}>
                      {isSplitting ? <Loader2 className="animate-spin" /> : <Split />}
                      Split PDF
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
                </div>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
        </div>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="application/pdf" className="hidden" />
        <input type="file" ref={mergeFileInputRef} onChange={handleMergeFileChange} accept="application/pdf" className="hidden" />
        <input type="file" ref={imageFileInputRef} onChange={handleImageFileChange} accept="image/*" className="hidden" />
        <input type="file" ref={htmlFileInputRef} onChange={handleHtmlFileChange} accept=".html,.htm" className="hidden" />
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
            onClick={() => handleToggleSelection(page.id)}
          >
            <PagePreview
              page={page}
              pageNumber={index + 1}
              isSelected={selectedPages.has(page.id)}
              onDelete={handleDeletePage}
              onVisible={() => renderPage(page.id)}
              onImageScaleChange={handleImageScaleChange}
              onRotate={handleRotatePage}
              watermark={{...watermark, opacity: watermark.opacity / 100}}
              onWatermarkChange={handleWatermarkChange}
              onCrop={handleApplyCrop}
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
