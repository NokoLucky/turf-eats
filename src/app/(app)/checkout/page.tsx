'use client';

import { useEffect, useState } from 'react';
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
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, writeBatch, doc, getDoc } from 'firebase/firestore';
import FreeAddressAutocomplete from '@/components/free-address-autocomplete';
import { Textarea } from '@/components/ui/textarea';

export default function CheckoutPage() {
  const { state, dispatch } = useCart();
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();

  const customerRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, `users/${user.uid}/customers/${user.uid}`);
  }, [user, firestore]);

  const { data: customerData } = useDoc<{address: string}>(customerRef);

  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if(customerData?.address) {
      setDeliveryAddress(customerData.address);
    }
  }, [customerData]);


  useEffect(() => {
    // If cart is empty, redirect away from checkout.
    // This must be in a useEffect to avoid state updates during render.
    if (state.items.length === 0) {
      router.replace('/dashboard');
    }
  }, [state.items, router]);

  // If the cart is empty, render nothing while the redirect is in-flight.
  if (state.items.length === 0) {
    return null;
  }

  const subtotal = state.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const serviceFee = subtotal * 0.08;
  const deliveryFee = 5.0;
  const total = subtotal + serviceFee + deliveryFee;

  const handleConfirmOrder = async () => {
    if (!user || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You must be logged in to place an order.',
      });
      return;
    }
    
    if (!deliveryAddress) {
       toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please select a delivery address.',
      });
      return;
    }

    const restaurantId = state.items[0]?.restaurantId;
    if (!restaurantId) {
       toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not determine the restaurant for this order.',
      });
      return;
    }

    try {
      // Get storeOwnerId from the restaurant document
      const restaurantRef = doc(firestore, 'restaurants', restaurantId);
      const restaurantSnap = await getDoc(restaurantRef);
      if (!restaurantSnap.exists()) {
        throw new Error("Restaurant not found!");
      }
      const restaurantData = restaurantSnap.data();
      const storeOwnerId = restaurantData.storeOwnerId;

      // 1. Create the main order document
      const ordersCollection = collection(firestore, 'orders');
      const orderDocRef = await addDoc(ordersCollection, {
        customerId: user.uid,
        restaurantId: restaurantId,
        storeOwnerId: storeOwnerId, // Denormalize storeOwnerId
        driverId: null, // To be assigned later
        orderDate: serverTimestamp(),
        status: 'Placed',
        itemsTotal: subtotal,
        totalAmount: total,
        deliveryAddress: deliveryAddress,
        notes: notes,
        participantUids: [user.uid, storeOwnerId],
      });

      // 2. Create order items in a batch
      const batch = writeBatch(firestore);
      
      for (const item of state.items) {
        // Correctly create a new doc reference in a subcollection for each item
        const orderItemRef = doc(collection(firestore, `orders/${orderDocRef.id}/orderItems`));
        batch.set(orderItemRef, {
            orderId: orderDocRef.id,
            menuItemId: item.id,
            quantity: item.quantity,
            itemPrice: item.price,
            name: item.name, // Denormalize for easier display
        });
      }

      await batch.commit();

      toast({
          title: "Order Placed!",
          description: "Thank you for your order. You can track it in the 'My Orders' section.",
      });

      dispatch({ type: 'CLEAR_CART' });
      router.push('/orders');

    } catch (error: any) {
      console.error("Error placing order:", error);
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: error.message || "Could not place your order. Please try again.",
      });
    }
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
                            <Input id="name" defaultValue={user?.displayName || "Turfloop User"} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone Number</Label>
                            <Input id="phone" defaultValue={user?.phoneNumber || "+27 72 123 4567"} />
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="address">Street Address</Label>
                        <FreeAddressAutocomplete 
                          onChange={(address) => setDeliveryAddress(address)}
                          value={deliveryAddress}
                        />
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Order Notes</CardTitle>
                    <CardDescription>
                        Have any special instructions? Let the restaurant know.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Textarea
                        placeholder="e.g., 'No cheese on the burger, please.'"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />
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
