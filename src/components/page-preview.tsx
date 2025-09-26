'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { GripVertical, Trash2, Sparkles, Loader2, Info, File, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';
import { Skeleton } from './ui/skeleton';
import { Slider } from './ui/slider';
import { Label } from './ui/label';

type Page = {
  id: number;
  image?: string;
  analysis?: string;
  isAnalyzing?: boolean;
  isNew?: boolean;
  isFromImage?: boolean;
  imageScale?: number;
};

interface PagePreviewProps {
  page: Page;
  pageNumber: number;
  onDelete: (id: number) => void;
  onAnalyze: (id: number) => void;
  onVisible: () => void;
  onImageScaleChange: (id: number, scale: number) => void;
}

export function PagePreview({ page, pageNumber, onDelete, onAnalyze, onVisible, onImageScaleChange }: PagePreviewProps) {
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
      const imageStyle = page.isFromImage ? { transform: `scale(${page.imageScale ?? 1})` } : {};
      return <Image src={page.image} alt={`Page ${pageNumber}`} fill className="object-contain transition-transform" style={imageStyle}/>;
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
    <Card ref={ref} className="group relative overflow-hidden shadow-md hover:shadow-primary/20 hover:shadow-lg transition-shadow duration-300">
      <CardContent className="p-0 aspect-[210/297] relative">
        {renderContent()}
        <Badge variant="secondary" className="absolute top-2 left-2">{pageNumber}</Badge>
        <div className="absolute top-1 right-1 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
        {page.analysis && (
          <Popover>
            <PopoverTrigger asChild>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-accent">
                            <Info />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>View Layout Analysis</TooltipContent>
                </Tooltip>
            </PopoverTrigger>
            <PopoverContent className="w-80">
                <div className="grid gap-4">
                    <div className="space-y-2">
                        <h4 className="font-medium leading-none">Layout Analysis</h4>
                        <p className="text-sm text-muted-foreground">{page.analysis}</p>
                    </div>
                </div>
            </PopoverContent>
          </Popover>
        )}

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
              className="h-8 w-8"
              onClick={() => onAnalyze(page.id)}
              disabled={page.isAnalyzing || page.isNew || !page.image}
            >
              {page.isAnalyzing ? <Loader2 className="animate-spin" /> : <Sparkles />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Analyze Layout</TooltipContent>
        </Tooltip>

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
