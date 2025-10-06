'use client';

import React, { useState, useEffect } from 'react';
import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { FileUp, Combine, Split, RotateCw, Shuffle, Droplet, Lock, Unlock, Gauge, FileJson, BrainCircuit, FileSpreadsheet, Presentation, FileText, Image as ImageIcon, ChevronDown, Menu } from 'lucide-react';

interface HeaderProps {
  onToolSelect: (tool: string) => void;
}

interface NavMenuProps {
  trigger: React.ReactNode;
  items: { id: string; name: string; icon: React.ReactNode }[];
  onSelect: (id: string) => void;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

const NavMenu = ({ trigger, items, onSelect, isOpen, onOpen, onClose }: NavMenuProps) => {
  return (
    <DropdownMenu open={isOpen} onOpenChange={(open) => (open ? onOpen() : onClose())}>
      <DropdownMenuTrigger asChild>
        <button
          onMouseEnter={onOpen}
          className="flex items-center gap-1 text-sm font-medium text-muted-foreground outline-none transition-colors hover:text-primary focus:text-primary"
        >
          {trigger}
          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent onMouseLeave={onClose} align="start">
        {items.map(tool => (
          <DropdownMenuItem key={tool.id} onClick={() => onSelect(tool.id)}>
            {tool.icon}{tool.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};


export function Header({ onToolSelect }: HeaderProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      // Hide header on scroll down, show on scroll up
      if (currentScrollY > lastScrollY && currentScrollY > 80) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [lastScrollY]);

  const convertToPdfTools = [
    { id: 'excel-to-pdf', name: 'Excel to PDF', icon: <FileSpreadsheet className="mr-2 h-4 w-4" /> },
    { id: 'word-to-pdf', name: 'Word to PDF', icon: <FileText className="mr-2 h-4 w-4" /> },
    { id: 'ppt-to-pdf', name: 'PowerPoint to PDF', icon: <Presentation className="mr-2 h-4 w-4" /> },
    { id: 'image-to-pdf', name: 'Image to PDF', icon: <ImageIcon className="mr-2 h-4 w-4" /> },
    { id: 'html-to-pdf', name: 'HTML to PDF', icon: <FileText className="mr-2 h-4 w-4" /> },
  ];

  const convertFromPdfTools = [
    { id: 'pdf-to-word', name: 'PDF to Word', icon: <FileText className="mr-2 h-4 w-4" /> },
    { id: 'pdf-to-excel', name: 'PDF to Excel', icon: <FileSpreadsheet className="mr-2 h-4 w-4" /> },
    { id: 'pdf-to-ppt', name: 'PDF to PowerPoint', icon: <Presentation className="mr-2 h-4 w-4" /> },
    { id: 'pdf-to-image', name: 'PDF to Image', icon: <ImageIcon className="mr-2 h-4 w-4" /> },
  ];

  const managePdfTools = [
    { id: 'merge-pdf', name: 'Merge PDF', icon: <Combine className="mr-2 h-4 w-4" /> },
    { id: 'split-pdf', name: 'Split PDF', icon: <Split className="mr-2 h-4 w-4" /> },
    { id: 'compress-pdf', name: 'Compress PDF', icon: <Gauge className="mr-2 h-4 w-4" /> },
    { id: 'rotate-pdf', name: 'Rotate PDF', icon: <RotateCw className="mr-2 h-4 w-4" /> },
    { id: 'reorder-pdf', name: 'Reorder Pages', icon: <Shuffle className="mr-2 h-4 w-4" /> },
    { id: 'watermark-pdf', name: 'Add Watermark', icon: <Droplet className="mr-2 h-4 w-4" /> },
    { id: 'protect-pdf', name: 'Protect PDF', icon: <Lock className="mr-2 h-4 w-4" /> },
    { id: 'unlock-pdf', name: 'Unlock PDF', icon: <Unlock className="mr-2 h-4 w-4" /> },
  ];

  const allNavMenus = [
    { id: 'convert-to', trigger: 'Convert to PDF', items: convertToPdfTools },
    { id: 'convert-from', trigger: 'Convert from PDF', items: convertFromPdfTools },
    { id: 'manage', trigger: 'Manage PDF', items: managePdfTools },
  ];
  
  const allToolsFlat = allNavMenus.flatMap(menu => menu.items);

  const handleToolSelectAndClose = (toolId: string) => {
    onToolSelect(toolId);
    setIsMobileMenuOpen(false);
  };


  return (
    <header className={cn(
        "sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-transform duration-300",
        {
          '-translate-y-full': !isVisible
        }
      )}>
      <div className="container flex h-16 items-center px-4 sm:px-6">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <Image src="/camly.png" alt="PDFpro Logo" width={32} height={32} className="h-8 w-8" />
          <span className="font-bold sm:inline-block">
            PDFpro
          </span>
        </Link>
        
        <nav className="hidden md:flex items-center gap-6 text-sm flex-1" onMouseLeave={() => setOpenMenu(null)}>
          {allNavMenus.map(menu => (
            <NavMenu
              key={menu.id}
              trigger={menu.trigger}
              items={menu.items}
              onSelect={onToolSelect}
              isOpen={openMenu === menu.id}
              onOpen={() => setOpenMenu(menu.id)}
              onClose={() => setOpenMenu(null)}
            />
          ))}
        </nav>

        <div className="flex flex-1 items-center justify-end gap-2">
          <ThemeToggle />
          <Dialog open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[90vw] max-w-[90vw] h-[80vh] flex flex-col rounded-lg bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <ScrollArea className="flex-1">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-6">
                    {allToolsFlat.map(item => (
                      <button
                        key={item.id}
                        className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg bg-card hover:bg-accent transition-colors text-center"
                        onClick={() => handleToolSelectAndClose(item.id)}
                      >
                        {React.cloneElement(item.icon as React.ReactElement, { className: "h-6 w-6 text-primary" })}
                        <span className="text-sm font-medium">{item.name}</span>
                      </button>
                    ))}
                  </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  );
}
