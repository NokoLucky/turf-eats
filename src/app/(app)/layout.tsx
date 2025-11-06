import Header from '@/components/header';
import { CartProvider } from '@/context/cart-context';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <div className="relative flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <footer className="border-t py-6 md:py-8">
          <div className="container text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} Turf Eats. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </CartProvider>
  );
}
