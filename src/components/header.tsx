'use client';

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from 'react';
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from '@/lib/utils';
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "@/components/ui/menubar"
import { FileUp, Combine, Split, RotateCw, Shuffle, Droplet, Lock, Unlock, Gauge, FileJson, BrainCircuit, FileSpreadsheet, Presentation, FileText, Image as ImageIcon } from 'lucide-react';

interface HeaderProps {
  onToolSelect: (tool: string) => void;
}

export function Header({ onToolSelect }: HeaderProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

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

  return (
    <header className={cn(
        "sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-transform duration-300",
        {
          '-translate-y-full': !isVisible
        }
      )}>
      <div className="container flex h-16 items-center">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <Image src="/camly.png" alt="PDFpro Logo" width={32} height={32} className="h-8 w-8" />
          <span className="font-bold sm:inline-block">
            PDFpro
          </span>
        </Link>
        
        <Menubar className="border-none shadow-none bg-transparent">
          <MenubarMenu>
            <MenubarTrigger>Convert to PDF</MenubarTrigger>
            <MenubarContent>
              {convertToPdfTools.map(tool => (
                <MenubarItem key={tool.id} onClick={() => onToolSelect(tool.id)}>
                  {tool.icon}{tool.name}
                </MenubarItem>
              ))}
            </MenubarContent>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger>Convert from PDF</MenubarTrigger>
            <MenubarContent>
              {convertFromPdfTools.map(tool => (
                <MenubarItem key={tool.id} onClick={() => onToolSelect(tool.id)}>
                  {tool.icon}{tool.name}
                </MenubarItem>
              ))}
            </MenubarContent>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger>Manage PDF</MenubarTrigger>
            <MenubarContent>
              {managePdfTools.map(tool => (
                <MenubarItem key={tool.id} onClick={() => onToolSelect(tool.id)}>
                  {tool.icon}{tool.name}
                </MenubarItem>
              ))}
            </MenubarContent>
          </MenubarMenu>
        </Menubar>

        <div className="flex flex-1 items-center justify-end">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
