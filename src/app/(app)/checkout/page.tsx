'use client';

import { useCart } from '@/context/cart-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CreditCard, Landmark, Truck } from 'lucide-react';

export default function CheckoutPage() {
  const { state, dispatch } = useCart();
  const { toast } = useToast();
  const router = useRouter();

  if (state.items.length === 0) {
    // Redirect to dashboard if cart is empty
    if(typeof window !== 'undefined') {
        router.replace('/dashboard');
    }
    return null;
  }

  const subtotal = state.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const serviceFee = subtotal * 0.08;
  const deliveryFee = 5.0;
  const total = subtotal + serviceFee + deliveryFee;

  const handleConfirmOrder = () => {
    // Mock order placement
    toast({
        title: "Order Placed!",
        description: "Thank you for your order. You can track it in the 'My Orders' section.",
    });
    dispatch({ type: 'CLEAR_CART' });
    router.push('/orders');
  };

  return (
    <div className="container py-12 px-4 sm:px-8">
      <h1 className="font-headline text-4xl font-bold mb-8">Confirm Your Order</h1>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Delivery Address</CardTitle>
                </CardHeader>
                <CardContent className='space-y-4'>
                    <div className='grid sm:grid-cols-2 gap-4'>
                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input id="name" defaultValue="Turfloop User" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone Number</Label>
                            <Input id="phone" defaultValue="+27 72 123 4567" />
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="address">Street Address</Label>
                        <Input id="address" defaultValue="123 University Road, Mankweng" />
                    </div>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Payment Method</CardTitle>
                    <CardDescription>This is a demo. No real payment will be processed.</CardDescription>
                </CardHeader>
                <CardContent>
                    <RadioGroup defaultValue="cod" className="space-y-4">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="cod" id="cod" />
                            <Label htmlFor="cod" className='flex items-center gap-2'>
                                <Truck className='h-5 w-5 text-muted-foreground' />
                                Cash on Delivery
                            </Label>
                        </div>
                         <div className="flex items-center space-x-2">
                            <RadioGroupItem value="card" id="card" disabled/>
                             <Label htmlFor="card" className='flex items-center gap-2 text-muted-foreground'>
                                <CreditCard className='h-5 w-5' />
                                Credit / Debit Card (coming soon)
                            </Label>
                        </div>
                         <div className="flex items-center space-x-2">
                            <RadioGroupItem value="eft" id="eft" disabled/>
                            <Label htmlFor="eft" className='flex items-center gap-2 text-muted-foreground'>
                                <Landmark className='h-5 w-5' />
                                EFT (coming soon)
                            </Label>
                        </div>
                    </RadioGroup>
                </CardContent>
            </Card>
        </div>
        <div>
            <Card>
              <CardHeader>
                <CardTitle className="font-headline text-2xl">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {state.items.map(item => (
                    <div key={item.id} className="flex justify-between items-center text-sm">
                        <span className="flex-1 truncate pr-2">{item.quantity} x {item.name}</span>
                        <span className='font-medium'>R{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                ))}
                <Separator />
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
                <Button className="w-full font-bold" size="lg" onClick={handleConfirmOrder}>
                  Confirm & Place Order
                </Button>
              </CardFooter>
            </Card>
        </div>
      </div>
    </div>
  );
}
