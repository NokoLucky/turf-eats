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

export default function CartPage() {
  const { state, dispatch } = useCart();
  const router = useRouter();

  const subtotal = state.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const serviceFee = subtotal * 0.08;
  const deliveryFee = 5.0;
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
        <Card className="text-center py-20">
            <CardHeader>
                <ShoppingBag className="mx-auto h-16 w-16 text-muted-foreground" />
                <CardTitle className="mt-4 text-2xl font-bold">Your cart is empty</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Looks like you haven't added anything to your cart yet.</p>
                <Button asChild className="mt-6">
                    <Link href="/dashboard">Start Shopping</Link>
                </Button>
            </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-0">
                <ul className="divide-y">
                  {state.items.map((item) => (
                    <li key={item.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 sm:p-6">
                      <Image
                        src={item.image.imageUrl}
                        alt={item.image.description}
                        data-ai-hint={item.image.imageHint}
                        width={80}
                        height={80}
                        className="rounded-md object-cover w-full sm:w-20 h-auto sm:h-20"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold">{item.name}</h3>
                        <p className="text-sm text-muted-foreground">R{item.price.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateQuantity(item.id, parseInt(e.target.value))}
                          className="h-9 w-16 text-center"
                        />
                         <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                            <span className="sr-only">Remove item</span>
                        </Button>
                      </div>
                      <p className="hidden sm:block w-20 text-right font-semibold">R{(item.price * item.quantity).toFixed(2)}</p>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="font-headline text-2xl">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>R{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Service Fee</span>
                  <span>R{serviceFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Fee</span>
                  <span>R{deliveryFee.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>R{total.toFixed(2)}</span>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full font-bold" size="lg" onClick={handleCheckout}>
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
