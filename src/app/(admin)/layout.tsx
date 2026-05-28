'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { ShieldCheck, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/firebase';
import Logo from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/login');
  };

  return (
    <div className="relative flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center px-4">
          <Logo href="/admin/dashboard" />
          <nav className="ml-6 hidden items-center gap-6 text-sm font-medium md:flex">
            <Link href="/admin/dashboard" className="flex items-center gap-2 transition-colors hover:text-primary font-semibold text-primary">
              <ShieldCheck className="h-4 w-4" />
              Admin Panel
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-4">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 bg-muted/20">{children}</main>
      <footer className="border-t py-6 md:py-8 bg-card">
        <div className="container text-center text-sm text-muted-foreground">
          <p>Pin2You Administrative Dashboard</p>
        </div>
      </footer>
    </div>
  );
}
