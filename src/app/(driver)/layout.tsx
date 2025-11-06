import Link from 'next/link';
import { LogOut, Moped, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import Logo from '@/components/logo';

function DriverHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="container flex h-16 items-center">
        <Logo />
        <nav className="ml-6 hidden items-center gap-6 text-sm font-medium md:flex">
          <Link href="/driver/dashboard" className="transition-colors hover:text-primary font-semibold text-primary">
            My Deliveries
          </Link>
        </nav>
        <div className="ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2">
                <Moped className="h-5 w-5 text-primary"/>
                <span>Driver</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/">
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
      <footer className="border-t py-6 md:py-8">
        <div className="container text-center text-sm text-muted-foreground">
          <p>Turf Eats Driver Portal</p>
        </div>
      </footer>
    </div>
  );
}
