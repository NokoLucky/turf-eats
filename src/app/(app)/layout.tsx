'use client';
import Header from '@/components/header';
import { CartProvider } from '@/context/cart-context';
import BottomNav from '@/components/bottom-nav';
import { APIProvider } from '@vis.gl/react-google-maps';

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <APIProvider apiKey={API_KEY} version="beta" libraries={['places', 'geocoding']}>
      <CartProvider>
        <div className="relative flex min-h-screen flex-col">
          <Header />
          <main className="flex-1 pb-20 md:pb-0">{children}</main>
          <BottomNav />
          <footer className="hidden border-t py-6 md:block md:py-8">
            <div className="container text-center text-sm text-muted-foreground">
              <p>&copy; {new Date().getFullYear()} Turf Eats. All rights reserved.</p>
            </div>
          </footer>
        </div>
      </CartProvider>
    </APIProvider>
  );
}
