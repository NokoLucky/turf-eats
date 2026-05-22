'use client';
import Header from '@/components/header';
import { CartProvider } from '@/context/cart-context';
import BottomNav from '@/components/bottom-nav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <div className="relative flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex-1 pb-20 md:pb-0">{children}</main>
        <BottomNav />
        <footer className="hidden border-t py-6 md:block md:py-8 bg-white">
          <div className="container text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} Pin2You. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </CartProvider>
  );
}
