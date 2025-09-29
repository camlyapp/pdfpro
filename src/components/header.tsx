'use client';

import { useState, useEffect } from 'react';
import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from '@/lib/utils';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { ALL_TOOLS, Tool } from '@/lib/tools';
import { ScrollArea } from './ui/scroll-area';

// Define categories
const toolCategories: { title: string; tools: Tool[] }[] = [
  {
    title: 'Create & Convert',
    tools: ALL_TOOLS.filter(t => ['Upload PDF', 'Scan to PDF', 'Image to PDF', 'Excel to PDF', 'PowerPoint to PDF', 'Word to PDF', 'HTML to PDF', 'Merge PDF'].includes(t.title)),
  },
  {
    title: 'Organize & Secure',
    tools: ALL_TOOLS.filter(t => ['Split PDF', 'Reorder Pages', 'Protect PDF', 'Unlock PDF'].includes(t.title)),
  },
  {
    title: 'AI Tools',
    tools: ALL_TOOLS.filter(t => ['Image to SVG'].includes(t.title)),
  },
];


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
            <div className="hidden sm:block text-sm font-medium cursor-pointer hover:text-primary transition-colors">
              All PDF Tools
            </div>
          </PopoverTrigger>
          <PopoverContent
            className="w-screen max-w-sm sm:max-w-md md:max-w-2xl lg:max-w-4xl p-0"
            align="start"
            onMouseEnter={() => setIsToolsPopoverOpen(true)}
            onMouseLeave={() => setIsToolsPopoverOpen(false)}
          >
            <ScrollArea className="max-h-[75vh]">
              <div className="p-4 md:p-6 space-y-6">
                {toolCategories.map(category => (
                  <div key={category.title}>
                    <h4 className="font-medium leading-none mb-4 text-primary">{category.title}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {category.tools.map((tool: Tool) => (
                        <Link
                          key={tool.title}
                          href="/" // All tools are on the home page for now
                          className="flex items-start gap-4 p-2 rounded-lg transition-all border border-transparent hover:border-border hover:shadow-md hover:bg-card"
                          onClick={() => setIsToolsPopoverOpen(false)}
                        >
                          <div className="p-2 bg-primary/10 rounded-lg mt-1">
                            {tool.icon}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{tool.title}</p>
                            <p className="text-xs text-muted-foreground">{tool.description}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
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
