'use client';

import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';

import { useCart } from '@/context/cart-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Logo from '@/components/logo';

export default function Header() {
  const { state } = useCart();
  const cartItemCount = state.items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <Logo />
        <nav className="ml-6 hidden items-center gap-6 text-sm font-medium md:flex">
          <Link href="/dashboard" className="transition-colors hover:text-primary">
            Restaurants
          </Link>
          <Link href="/orders" className="transition-colors hover:text-primary">
            My Orders
          </Link>
           <Link href="/profile" className="transition-colors hover:text-primary">
            My Profile
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-4">
          <Button asChild size="icon" className="relative bg-accent text-accent-foreground hover:bg-accent/90">
            <Link href="/cart">
              <ShoppingCart className="h-5 w-5" />
              {cartItemCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full p-0"
                >
                  {cartItemCount}
                </Badge>
              )}
              <span className="sr-only">Shopping Cart</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
