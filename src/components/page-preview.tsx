'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { GripVertical, Trash2, File, ZoomIn, ZoomOut, RotateCcw, Move, RotateCw, CheckSquare, Crop } from 'lucide-react';
import { Badge } from './ui/badge';
import { Skeleton } from './ui/skeleton';
import { Slider } from './ui/slider';
import { Label } from './ui/label';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';

type Page = {
  id: number;
  image?: string;
  isNew?: boolean;
  isFromImage?: boolean;
  imageScale?: number;
  rotation?: number;
  crop?: { x: number; y: number; width: number; height: number };
};

type Watermark = {
  enabled: boolean;
  text: string;
  opacity: number;
  rotation: number;
  fontSize: number;
  x: number;
  y: number;
}

interface PagePreviewProps {
  page: Page;
  pageNumber: number;
  isSelected: boolean;
  onDelete: (id: number) => void;
  onVisible: () => void;
  onImageScaleChange: (id: number, scale: number) => void;
  onRotate: (id: number) => void;
  watermark?: Watermark;
  onWatermarkChange?: (newWatermarkProps: Partial<Watermark>) => void;
  onCrop: (id: number, crop: { x: number, y: number, width: number, height: number }) => void;
}

export function PagePreview({ page, pageNumber, isSelected, onDelete, onVisible, onImageScaleChange, onRotate, watermark, onWatermarkChange, onCrop }: PagePreviewProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0, width: 100, height: 100 });
  const cropImageRef = useRef<HTMLImageElement>(null);
  const cropBoxRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onVisible();
          observer.disconnect();
        }
      },
      { rootMargin: '100px' }
    );

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [onVisible, page.id]);

  
  const handleDragMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!ref.current || !onWatermarkChange || !watermark) return;
    const cardRect = ref.current.getBoundingClientRect();
    const watermarkElement = e.currentTarget.parentElement;
    if (!watermarkElement) return;

    const watermarkRect = watermarkElement.getBoundingClientRect();

    const initialX = watermark.x / 100 * cardRect.width;
    const initialY = watermark.y / 100 * cardRect.height;
    
    const offsetX = e.clientX - cardRect.left - initialX;
    const offsetY = e.clientY - cardRect.top - initialY;


    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newLeft = moveEvent.clientX - cardRect.left - offsetX;
      const newTop = moveEvent.clientY - cardRect.top - offsetY;

      // Convert pixel position to percentage based on the watermark element's dimensions
      const x = (newLeft / cardRect.width) * 100;
      const y = (newTop / cardRect.height) * 100;
      
      onWatermarkChange({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleRotateMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!ref.current || !watermark || !onWatermarkChange) return;
    const cardRect = ref.current.getBoundingClientRect();
    const watermarkElement = e.currentTarget.parentElement;
    
    if (!watermarkElement) return;

    const watermarkRect = watermarkElement.getBoundingClientRect();
    const centerX = watermarkRect.left + watermarkRect.width / 2 - cardRect.left;
    const centerY = watermarkRect.top + watermarkRect.height / 2 - cardRect.top;


    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - cardRect.left - centerX;
      const dy = moveEvent.clientY - cardRect.top - centerY;
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      onWatermarkChange({ rotation: angle });
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleCropBoxDrag = (e: React.MouseEvent, corner: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!cropImageRef.current) return;
    const imgRect = cropImageRef.current.getBoundingClientRect();
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startCrop = { ...crop };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = (moveEvent.clientX - startX) / imgRect.width * 100;
      const dy = (moveEvent.clientY - startY) / imgRect.height * 100;
      
      let newCrop = { ...startCrop };

      if (corner.includes('right')) {
        newCrop.width = Math.min(100 - newCrop.x, startCrop.width + dx);
      }
      if (corner.includes('left')) {
        newCrop.width = startCrop.width - dx;
        newCrop.x = startCrop.x + dx;
      }
      if (corner.includes('bottom')) {
        newCrop.height = Math.min(100 - newCrop.y, startCrop.height + dy);
      }
      if (corner.includes('top')) {
        newCrop.height = startCrop.height - dy;
        newCrop.y = startCrop.y + dy;
      }
      
      if (corner === 'move') {
        newCrop.x = Math.max(0, Math.min(100 - newCrop.width, startCrop.x + dx));
        newCrop.y = Math.max(0, Math.min(100 - newCrop.height, startCrop.y + dy));
      }

      // Clamp values
      newCrop.x = Math.max(0, newCrop.x);
      newCrop.y = Math.max(0, newCrop.y);
      newCrop.width = Math.max(1, Math.min(100 - newCrop.x, newCrop.width));
      newCrop.height = Math.max(1, Math.min(100 - newCrop.y, newCrop.height));

      setCrop(newCrop);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleApplyCrop = () => {
    onCrop(page.id, crop);
    setIsCropDialogOpen(false);
  }

  const renderContent = () => {
    const rotationStyle = { transform: `rotate(${page.rotation || 0}deg)` };

    if (page.isNew) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-white border" style={rotationStyle}>
          <div className="text-center text-muted-foreground">
            <File className="mx-auto h-12 w-12"/>
            <p>Blank Page</p>
          </div>
        </div>
      );
    }
    if (page.image) {
      if (page.crop) {
        const { x, y, width, height } = page.crop;
        const outerStyle: React.CSSProperties = {
            ...rotationStyle,
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            position: 'relative'
        };
        const innerStyle: React.CSSProperties = {
            position: 'absolute',
            left: `-${x / width * 100}%`,
            top: `-${y / height * 100}%`,
            width: `${100 / width * 100}%`,
            height: `${100 / height * 100}%`,
        };
         return (
            <div style={outerStyle}>
                <div style={innerStyle}>
                    <Image src={page.image} alt={`Page ${pageNumber}`} fill className="object-contain"/>
                </div>
            </div>
        );
      }

      const imageStyle: React.CSSProperties = {
        ...rotationStyle,
        ...(page.isFromImage ? { transform: `${rotationStyle.transform} scale(${page.imageScale ?? 1})` } : {}),
        transition: 'transform 0.2s ease-out'
      };
      return <Image src={page.image} alt={`Page ${pageNumber}`} fill className="object-contain" style={imageStyle}/>;
    }
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted" style={rotationStyle}>
        <Skeleton className="w-full h-full" />
      </div>
    );
  };
  
  const handleScaleChange = (scale: number) => {
    const newScale = Math.max(0.1, Math.min(scale, 2)); // Clamp between 0.1 and 2
    onImageScaleChange(page.id, newScale);
  };

  return (
    <Card ref={ref} className={cn(
        "group/card relative overflow-hidden shadow-md hover:shadow-primary/20 hover:shadow-lg transition-shadow duration-300 cursor-pointer",
        isSelected && "ring-2 ring-primary ring-offset-2"
        )}>
      <CardContent className="p-0 aspect-[210/297] relative overflow-hidden">
        {renderContent()}
        {isSelected && (
            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                <CheckSquare className="h-16 w-16 text-primary-foreground drop-shadow-md" />
            </div>
        )}
        {watermark?.enabled && watermark.text && (
            <div
                className="group/watermark absolute transform-gpu select-none"
                style={{
                  left: `${watermark.x}%`,
                  top: `${watermark.y}%`,
                  transform: `translate(-50%, -50%) rotate(${watermark.rotation}deg)`,
                  pointerEvents: isSelected ? 'auto' : 'none',
                }}
            >
                <span
                  className="font-bold text-black break-all whitespace-nowrap"
                  style={{
                    opacity: watermark.opacity,
                    fontSize: `${watermark.fontSize * 0.5}px`, // Scale font size for preview
                    color: 'black',
                    textShadow: '0 0 2px white, 0 0 2px white, 0 0 2px white, 0 0 2px white', // basic stroke
                  }}
                >
                  {watermark.text}
                </span>

                <div 
                  className="absolute -top-3 -left-3 p-1 rounded-full bg-primary/80 text-primary-foreground opacity-0 group-hover/watermark:opacity-100 transition-opacity cursor-move"
                  onMouseDown={handleDragMouseDown}
                >
                    <Move className="h-3 w-3" />
                </div>
                 <div 
                  className="absolute -bottom-3 -right-3 p-1 rounded-full bg-primary/80 text-primary-foreground opacity-0 group-hover/watermark:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
                  onMouseDown={handleRotateMouseDown}
                >
                    <RotateCw className="h-3 w-3" />
                </div>
            </div>
        )}
        <Badge variant="secondary" className="absolute top-2 left-2">{pageNumber}</Badge>
        <div className="absolute top-1 right-1 flex flex-col gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 cursor-move" onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}>
                        <GripVertical className="h-4 w-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>Drag to reorder</TooltipContent>
            </Tooltip>
        </div>
      </CardContent>
      <CardFooter className="p-2 bg-card/80 backdrop-blur-sm flex justify-end gap-1">
        {page.isFromImage && (
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => {e.stopPropagation()}}>
                            <ZoomIn />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Resize Image</TooltipContent>
                </Tooltip>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="end" onClick={(e) => e.stopPropagation()}>
                <div className="grid gap-4">
                    <div className="space-y-2">
                        <h4 className="font-medium leading-none">Image Scale</h4>
                        <p className="text-xs text-muted-foreground">Adjust the size of the image on the page.</p>
                    </div>
                    <div className='space-y-4'>
                        <div className="flex justify-between items-center">
                            <Label htmlFor="image-scale" className="text-sm">Scale</Label>
                            <span className="text-sm font-medium">{Math.round((page.imageScale ?? 1) * 100)}%</span>
                        </div>
                        <Slider
                            id="image-scale"
                            min={0.1}
                            max={2}
                            step={0.05}
                            value={[page.imageScale ?? 1]}
                            onValueChange={(value) => handleScaleChange(value[0])}
                        />
                        <div className="flex justify-between items-center">
                            <Button variant="outline" size="icon" onClick={() => handleScaleChange((page.imageScale ?? 1) - 0.1)}>
                                <ZoomOut className="h-4 w-4" />
                            </Button>
                             <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={() => handleScaleChange(1)}>
                                        <RotateCcw className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Reset Scale</TooltipContent>
                            </Tooltip>
                            <Button variant="outline" size="icon" onClick={() => handleScaleChange((page.imageScale ?? 1) + 0.1)}>
                                <ZoomIn className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </PopoverContent>
          </Popover>
        )}
        
        <Dialog open={isCropDialogOpen} onOpenChange={setIsCropDialogOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                  <Crop />
                </Button>
              </DialogTrigger>
            </TooltipTrigger>
            <TooltipContent>Crop Page</TooltipContent>
          </Tooltip>
          <DialogContent className="max-w-4xl" onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>Crop Page {pageNumber}</DialogTitle>
            </DialogHeader>
            <div className="relative w-full aspect-[210/297] bg-muted overflow-hidden" style={{ maxHeight: '70vh' }}>
              <Image ref={cropImageRef} src={page.image || ''} alt={`Page ${pageNumber}`} fill className="object-contain" />
              <div
                ref={cropBoxRef}
                className="absolute border-2 border-primary bg-primary/20 cursor-move"
                style={{
                  left: `${crop.x}%`,
                  top: `${crop.y}%`,
                  width: `${crop.width}%`,
                  height: `${crop.height}%`,
                }}
                onMouseDown={(e) => handleCropBoxDrag(e, 'move')}
              >
                <div className="absolute -top-1.5 -left-1.5 h-3 w-3 rounded-full bg-primary cursor-nwse-resize" onMouseDown={(e) => handleCropBoxDrag(e, 'top-left')}></div>
                <div className="absolute -top-1.5 -right-1.5 h-3 w-3 rounded-full bg-primary cursor-nesw-resize" onMouseDown={(e) => handleCropBoxDrag(e, 'top-right')}></div>
                <div className="absolute -bottom-1.5 -left-1.5 h-3 w-3 rounded-full bg-primary cursor-nesw-resize" onMouseDown={(e) => handleCropBoxDrag(e, 'bottom-left')}></div>
                <div className="absolute -bottom-1.5 -right-1.5 h-3 w-3 rounded-full bg-primary cursor-nwse-resize" onMouseDown={(e) => handleCropBoxDrag(e, 'bottom-right')}></div>
              </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsCropDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleApplyCrop}>Apply Crop</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                onRotate(page.id);
              }}
            >
              <RotateCw />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Rotate Page</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(page.id);
              }}
            >
              <Trash2 />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Delete Page</TooltipContent>
        </Tooltip>
      </CardFooter>
    </Card>
  );
}
