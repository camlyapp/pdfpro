'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { GripVertical, Trash2, Sparkles, Loader2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';
import { Skeleton } from './ui/skeleton';

type Page = {
  id: number;
  image?: string;
  analysis?: string;
  isAnalyzing?: boolean;
};

interface PagePreviewProps {
  page: Page;
  pageNumber: number;
  onDelete: (id: number) => void;
  onAnalyze: (id: number) => void;
  onVisible: () => void;
}

export function PagePreview({ page, pageNumber, onDelete, onAnalyze, onVisible }: PagePreviewProps) {
  const ref = useRef<HTMLDivElement>(null);

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
  }, [onVisible]);

  return (
    <Card ref={ref} className="group relative overflow-hidden shadow-md hover:shadow-primary/20 hover:shadow-lg transition-shadow duration-300">
      <CardContent className="p-0 aspect-[210/297] relative">
        {page.image ? (
          <Image src={page.image} alt={`Page ${pageNumber}`} fill className="object-contain" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <Skeleton className="w-full h-full" />
          </div>
        )}
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

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onAnalyze(page.id)}
              disabled={page.isAnalyzing || !page.image}
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
