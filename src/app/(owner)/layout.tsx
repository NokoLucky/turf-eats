'use client';
import Link from 'next/link';
import { collection, query, where, limit } from 'firebase/firestore';
import { LogOut, Store, Settings, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Logo from '@/components/logo';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import type { Restaurant } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';

function OwnerHeader() {
  const { user } = useUser();
  const firestore = useFirestore();

  const restaurantQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'restaurants'), where('storeOwnerId', '==', user.uid), limit(1));
  }, [user, firestore]);

  const { data: restaurants, isLoading } = useCollection<Restaurant>(restaurantQuery);
  const restaurant = restaurants?.[0];

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="container flex h-16 items-center">
        <Logo />
        <nav className="ml-6 hidden items-center gap-6 text-sm font-medium md:flex">
          <Link href="/owner/dashboard" className="transition-colors hover:text-primary">
            Dashboard
          </Link>
          <Link href="/owner/menu" className="transition-colors hover:text-primary">
            Products
          </Link>
          <Link href="/owner/orders" className="transition-colors hover:text-primary">
            Orders
          </Link>
        </nav>
        <div className="ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2">
                <Store className="h-5 w-5 text-primary" />
                {isLoading ? (
                  <Skeleton className="h-5 w-24" />
                ) : (
                  <span className='truncate max-w-xs'>{restaurant?.name || 'My Store'}</span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/owner/restaurant">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Store Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/owner/menu">
                  <Package className="mr-2 h-4 w-4" />
                  <span>Manage Products</span>
                </Link>
              </DropdownMenuItem>
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

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <OwnerHeader />
      <main className="flex-1">{children}</main>
      <footer className="border-t py-6 md:py-8">
        <div className="container text-center text-sm text-muted-foreground">
          <p>Turf Eats Owner Portal</p>
        </div>
      </footer>
    </div>
  );
}
