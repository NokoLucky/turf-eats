'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ShoppingCart, User, LogOut, LayoutDashboard } from 'lucide-react';

import { useCart } from '@/context/cart-context';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import Logo from '@/components/logo';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function Header() {
  const { state } = useCart();
  const cartItemCount = state.items.reduce((acc, item) => acc + item.quantity, 0);
  const avatarImage = PlaceHolderImages.find((img) => img.id === 'avatar-1');

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <Logo />
        <nav className="ml-6 hidden items-center gap-6 text-sm font-medium md:flex">
          <Link href="/app" className="transition-colors hover:text-primary">
            Restaurants
          </Link>
          <Link href="/app/orders" className="transition-colors hover:text-primary">
            My Orders
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-4">
          <Button asChild variant="ghost" size="icon" className="relative">
            <Link href="/app/cart">
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  {avatarImage && (
                    <AvatarImage
                      src={avatarImage.imageUrl}
                      alt={avatarImage.description}
                      data-ai-hint={avatarImage.imageHint}
                    />
                  )}
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">User</p>
                  <p className="text-xs leading-none text-muted-foreground">user@example.com</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/app/orders">
                  <User className="mr-2 h-4 w-4" />
                  <span>My Orders</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/owner/dashboard">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  <span>Dashboard</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
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
