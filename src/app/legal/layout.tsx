'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Logo from '@/components/logo';

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 w-full border-b bg-white/95 backdrop-blur">
        <div className="container flex h-16 items-center px-4">
          <Button asChild variant="ghost" size="icon" className="mr-2">
            <Link href="/"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <Logo />
        </div>
      </header>
      <main className="container max-w-3xl py-10 px-6 sm:px-8">
        {children}
      </main>
      <footer className="border-t py-10">
        <div className="container text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Pin2You Delivery. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
