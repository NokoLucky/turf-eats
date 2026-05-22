'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/context/cart-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Trash2, ShoppingBag, ArrowLeft, Plus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';

export default function CartPage() {
  const { state, dispatch } = useCart();
  const router = useRouter();

  const subtotal = state.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const serviceFee = 5.0; 
  const deliveryFee = 30.0; 
  const total = subtotal + serviceFee + deliveryFee;

  const updateQuantity = (id: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity } });
  };
  
  const removeItem = (id: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: { id } });
  }

  const handleCheckout = () => {
    router.push('/checkout');
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24">
      <header className="bg-white border-b px-4 py-6 flex items-center gap-4">
        <Button asChild variant="ghost" size="icon" className="rounded-full">
           <Link href="/dashboard"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <h1 className="text-lg font-bold">Your Cart</h1>
        <Button variant="ghost" size="icon" className="ml-auto text-muted-foreground" onClick={() => dispatch({type: 'CLEAR_CART'})}>
           <Trash2 className="h-5 w-5" />
        </Button>
      </header>

      <div className="container py-8 px-4 max-w-md mx-auto space-y-8">
        {state.items.length === 0 ? (
          <div className="text-center py-20">
             <ShoppingBag className="mx-auto h-16 w-16 text-muted-foreground opacity-20" />
             <h2 className="mt-4 text-xl font-bold">Cart is empty</h2>
             <Button asChild className="mt-6 rounded-xl bg-primary">
                <Link href="/dashboard">Browse Menu</Link>
             </Button>
          </div>
        ) : (
          <>
            <div className="space-y-4">
               {state.items.map((item) => (
                 <Card key={item.id} className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
                    <div className="p-4 flex gap-4">
                       <div className="h-16 w-16 rounded-xl overflow-hidden shrink-0">
                          <Image src={item.imageUrl} alt={item.name} width={64} height={64} className="object-cover h-full" />
                       </div>
                       <div className="flex-1">
                          <h3 className="font-bold text-sm">{item.name}</h3>
                          {item.selectedOptions && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                               {Object.values(item.selectedOptions).flat().join(', ')}
                            </p>
                          )}
                          <div className="flex items-center justify-between mt-3">
                             <div className="flex items-center bg-[#F1F3F5] rounded-full px-2 py-0.5">
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.id, item.quantity - 1)}>-</Button>
                                <span className="w-6 text-center text-xs font-bold">{item.quantity}</span>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</Button>
                             </div>
                             <span className="font-bold text-sm">R{item.price.toFixed(2)}</span>
                          </div>
                       </div>
                    </div>
                 </Card>
               ))}
            </div>

            <section className="space-y-4">
               <h2 className="text-sm font-bold">You may also like</h2>
               <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-4 px-4 pb-2">
                  {[
                    { name: 'Coca Cola 500ml', price: 15.00, img: 'https://picsum.photos/seed/coke/100/100' },
                    { name: 'Malva Pudding', price: 20.00, img: 'https://picsum.photos/seed/pudding/100/100' },
                    { name: 'Still Water 500ml', price: 10.00, img: 'https://picsum.photos/seed/water/100/100' }
                  ].map((item, i) => (
                    <div key={i} className="min-w-[140px] bg-white p-3 rounded-2xl shadow-sm border border-transparent hover:border-primary transition-all relative">
                        <div className="h-16 w-full relative mb-2">
                           <Image src={item.img} alt={item.name} fill className="object-contain" />
                        </div>
                        <h4 className="text-[10px] font-bold truncate">{item.name}</h4>
                        <p className="text-primary font-bold text-[10px] mt-1">R{item.price.toFixed(2)}</p>
                        <Button size="icon" className="absolute bottom-2 right-2 h-6 w-6 rounded-lg bg-primary">
                           <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                  ))}
               </div>
            </section>

            <div className="space-y-2">
               <div className="flex justify-between text-xs text-muted-foreground font-medium">
                  <span>Subtotal</span>
                  <span>R{subtotal.toFixed(2)}</span>
               </div>
               <div className="flex justify-between text-xs text-muted-foreground font-medium">
                  <span>Service Fee</span>
                  <span>R{serviceFee.toFixed(2)}</span>
               </div>
               <div className="flex justify-between text-xs text-muted-foreground font-medium">
                  <span>Delivery Fee (2.1 km)</span>
                  <span>R{deliveryFee.toFixed(2)}</span>
               </div>
               <div className="flex justify-between text-xs font-bold pt-2">
                  <span>Estimated Delivery</span>
                  <span>25 - 35 mins</span>
               </div>
               <div className="flex justify-between text-xs text-muted-foreground pt-1">
                  <span>Delivering to</span>
                  <span className="flex items-center gap-1">Turfloop, Polokwane <Link href="/profile"><Badge variant="outline" className="h-4 w-4 p-0"><X className="h-2 w-2" /></Badge></Link></span>
               </div>
            </div>
          </>
        )}
      </div>

      {state.items.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white p-6 shadow-[0_-4px_20px_-2px_rgba(0,0,0,0.1)] z-50">
           <div className="max-w-md mx-auto space-y-4">
              <div className="flex justify-between items-center text-lg font-bold">
                 <span>Total</span>
                 <span className="text-primary">R{total.toFixed(2)}</span>
              </div>
              <Button onClick={handleCheckout} className="w-full h-14 rounded-2xl font-bold text-lg bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
                 Proceed to Checkout
              </Button>
           </div>
        </div>
      )}
    </div>
  );
}
