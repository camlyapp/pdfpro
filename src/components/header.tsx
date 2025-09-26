'use client';

import { useState, useEffect } from 'react';
import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from '@/lib/utils';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { ALL_TOOLS, Tool } from '@/lib/tools.tsx';
import { ScrollArea } from './ui/scroll-area';

export function Header() {
  const [isScrolledDown, setIsScrolledDown] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isToolsPopoverOpen, setIsToolsPopoverOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 80) { // 80 is the header height
        setIsScrolledDown(true); // Scrolling down
      } else {
        setIsScrolledDown(false); // Scrolling up
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [lastScrollY]);

  return (
    <header className={cn(
        "sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-transform duration-300 ease-in-out",
        isScrolledDown ? '-translate-y-full' : 'translate-y-0'
      )}>
      <div className="container flex h-16 items-center">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <Image src="/camly.png" alt="PDFpro Logo" width={32} height={32} className="h-8 w-8" />
          <span className="font-bold sm:inline-block">
            PDFpro
          </span>
        </Link>

        <Popover open={isToolsPopoverOpen} onOpenChange={setIsToolsPopoverOpen}>
          <PopoverTrigger
            asChild
            onMouseEnter={() => setIsToolsPopoverOpen(true)}
            onMouseLeave={() => setIsToolsPopoverOpen(false)}
          >
            <div className="text-sm font-medium cursor-pointer hover:text-primary transition-colors">
              All PDF Tools
            </div>
          </PopoverTrigger>
          <PopoverContent
            className="w-80 max-h-[calc(100vh-100px)] p-0"
            align="start"
            onMouseEnter={() => setIsToolsPopoverOpen(true)}
            onMouseLeave={() => setIsToolsPopoverOpen(false)}
          >
            <ScrollArea className="h-full max-h-[70vh]">
              <div className="p-4">
                <h4 className="font-medium leading-none mb-4">All PDF Tools</h4>
                <div className="grid gap-1">
                  {ALL_TOOLS.map((tool: Tool) => (
                    <Link
                      key={tool.title}
                      href="/" // All tools are on the home page for now
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-accent -mx-2"
                      onClick={() => setIsToolsPopoverOpen(false)}
                    >
                      <div className="p-2 bg-primary/10 rounded-md">
                        {tool.icon}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{tool.title}</p>
                        <p className="text-xs text-muted-foreground">{tool.description}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>

        <div className="flex flex-1 items-center justify-end">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
