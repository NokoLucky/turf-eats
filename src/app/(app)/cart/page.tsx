
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/context/cart-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Trash2, ShoppingBag } from 'lucide-react';
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
    <div className="container py-12 px-4 sm:px-8">
      <h1 className="font-headline text-4xl font-bold mb-8">Your Cart</h1>
      {state.items.length === 0 ? (
        <Card className="text-center py-20 border-none shadow-premium rounded-[2rem]">
            <CardHeader>
                <ShoppingBag className="mx-auto h-16 w-16 text-muted-foreground" />
                <CardTitle className="mt-4 text-2xl font-bold">Your cart is empty</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Looks like you haven't added anything to your cart yet.</p>
                <Button asChild className="mt-6 rounded-xl px-8">
                    <Link href="/dashboard">Start Shopping</Link>
                </Button>
            </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card className="border-none shadow-premium rounded-[2rem] overflow-hidden">
              <CardContent className="p-0">
                <ul className="divide-y">
                  {state.items.map((item) => (
                    <li key={item.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 sm:p-6">
                      <div className="relative h-20 w-20 rounded-xl overflow-hidden flex-shrink-0">
                        <Image
                            src={item.imageUrl.trim()}
                            alt={item.name}
                            fill
                            className="object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold">{item.name}</h3>
                        {item.selectedOptions && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {Object.entries(item.selectedOptions).map(([group, choices]) => (
                               choices.map(choice => (
                                 <Badge key={`${group}-${choice}`} variant="outline" className="text-[10px] font-normal py-0">
                                   {group}: {choice}
                                 </Badge>
                               ))
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">R{item.price.toFixed(2)} each</p>
                      </div>
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateQuantity(item.id, parseInt(e.target.value))}
                          className="h-9 w-16 text-center rounded-lg"
                        />
                         <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)} className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="hidden sm:block w-20 text-right font-bold text-primary">R{(item.price * item.quantity).toFixed(2)}</p>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
          <div>
            <Card className="border-none shadow-premium rounded-[2rem]">
              <CardHeader>
                <CardTitle className="font-headline text-2xl">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">R{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Service Fee</span>
                  <span className="font-medium">R{serviceFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Delivery Fee</span>
                  <span className="font-medium text-green-600">R{deliveryFee.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-xl font-bold">
                  <span>Total</span>
                  <span className="text-primary">R{total.toFixed(2)}</span>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full font-bold h-12 rounded-xl" size="lg" onClick={handleCheckout}>
                  Proceed to Checkout
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
