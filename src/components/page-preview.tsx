'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { GripVertical, Trash2, File, ZoomIn, ZoomOut, RotateCcw, Move, RotateCw } from 'lucide-react';
import { Badge } from './ui/badge';
import { Skeleton } from './ui/skeleton';
import { Slider } from './ui/slider';
import { Label } from './ui/label';

type Page = {
  id: number;
  image?: string;
  isNew?: boolean;
  isFromImage?: boolean;
  imageScale?: number;
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
  onDelete: (id: number) => void;
  onVisible: () => void;
  onImageScaleChange: (id: number, scale: number) => void;
  watermark?: Watermark;
  onWatermarkChange?: (newWatermarkProps: Partial<Watermark>) => void;
}

export function PagePreview({ page, pageNumber, onDelete, onVisible, onImageScaleChange, watermark, onWatermarkChange }: PagePreviewProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);

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
    
    if (!ref.current || !onWatermarkChange) return;
    const cardRect = ref.current.getBoundingClientRect();

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const x = ((moveEvent.clientX - cardRect.left) / cardRect.width) * 100;
      const y = ((moveEvent.clientY - cardRect.top) / cardRect.height) * 100;
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

  const renderContent = () => {
    if (page.isNew) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-white border">
          <div className="text-center text-muted-foreground">
            <File className="mx-auto h-12 w-12"/>
            <p>Blank Page</p>
          </div>
        </div>
      );
    }
    if (page.image) {
      const imageStyle: React.CSSProperties = page.isFromImage ? { transform: `scale(${page.imageScale ?? 1})`, transition: 'transform 0.2s ease-out' } : {};
      return <Image src={page.image} alt={`Page ${pageNumber}`} fill className="object-contain" style={imageStyle}/>;
    }
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted">
        <Skeleton className="w-full h-full" />
      </div>
    );
  };
  
  const handleScaleChange = (scale: number) => {
    const newScale = Math.max(0.1, Math.min(scale, 2)); // Clamp between 0.1 and 2
    onImageScaleChange(page.id, newScale);
  };

  return (
    <Card ref={ref} className="group/card relative overflow-hidden shadow-md hover:shadow-primary/20 hover:shadow-lg transition-shadow duration-300">
      <CardContent className="p-0 aspect-[210/297] relative overflow-hidden">
        {renderContent()}
        {watermark?.enabled && watermark.text && (
            <div
                className="group/watermark absolute transform-gpu select-none cursor-grab active:cursor-grabbing"
                style={{
                  left: `${watermark.x}%`,
                  top: `${watermark.y}%`,
                  transform: `translate(-50%, -50%) rotate(${watermark.rotation}deg)`,
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
                    <Button variant="ghost" size="icon" className="h-8 w-8 cursor-move" onMouseDown={(e) => e.stopPropagation()}>
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
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ZoomIn />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Resize Image</TooltipContent>
                </Tooltip>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="end">
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

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => onDelete(page.id)}
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
