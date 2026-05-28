
'use client';
import Link from 'next/link';
import { LogOut, Bike, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import Logo from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';

function DriverHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pt-[env(safe-area-inset-top)]">
      <div className="container flex h-16 items-center px-4">
        <Logo href="/driver/dashboard" />
        <nav className="ml-6 hidden items-center gap-6 text-sm font-medium md:flex">
          <Link href="/driver/dashboard" className="transition-colors hover:text-primary font-semibold text-primary">
            My Deliveries
          </Link>
          <Link href="/driver/profile" className="transition-colors hover:text-primary">
            Profile
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2">
                <Bike className="h-5 w-5 text-primary"/>
                <span className="hidden sm:inline">Driver Menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl border-none shadow-premium">
              <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                <Link href="/driver/profile">
                  <User className="mr-2 h-4 w-4" />
                  <span>My Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                <Link href="/login">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <DriverHeader />
      <main className="flex-1">{children}</main>
      <footer className="border-t py-6 md:py-8 pb-[calc(2rem+env(safe-area-inset-bottom))] bg-card">
        <div className="container text-center text-sm text-muted-foreground">
          <p>Pin2You Driver Portal</p>
        </div>
      </footer>
    </div>
  );
}
