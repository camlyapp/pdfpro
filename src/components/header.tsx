import Link from "next/link";
import { Icons } from "@/components/icons";
import { Github } from "lucide-react";
import { Button } from "./ui/button";

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <Icons.logo className="h-6 w-6 text-primary" />
          <span className="font-bold sm:inline-block">
            PDF Live
          </span>
        </Link>
        <div className="flex flex-1 items-center justify-end">
            <Button variant="ghost" size="icon" asChild>
                <a href="https://github.com/FirebaseExtended/studio-pdf-live" target="_blank" rel="noopener noreferrer">
                    <Github />
                </a>
            </Button>
        </div>
      </div>
    </header>
  );
}
