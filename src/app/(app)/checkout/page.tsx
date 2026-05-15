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
import { CreditCard, Landmark, Truck, MapPin, Phone, User as UserIcon, Send } from 'lucide-react';
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
  const [paymentMethod, setPaymentMethod] = useState('cod');

  useEffect(() => {
    if(customerData?.address) {
      setDeliveryAddress(customerData.address);
    }
  }, [customerData]);


  useEffect(() => {
    if (state.items.length === 0) {
      router.replace('/dashboard');
    }
  }, [state.items, router]);

  if (state.items.length === 0) {
    return null;
  }

  const subtotal = state.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const serviceFee = 5.0; // Standard R5 service fee
  const deliveryFee = 30.0; // Standard R30 delivery fee
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
      const restaurantRef = doc(firestore, 'restaurants', restaurantId);
      const restaurantSnap = await getDoc(restaurantRef);
      if (!restaurantSnap.exists()) {
        throw new Error("Restaurant not found!");
      }
      const restaurantData = restaurantSnap.data();
      const storeOwnerId = restaurantData.storeOwnerId;

      const ordersCollection = collection(firestore, 'orders');
      const orderDocRef = await addDoc(ordersCollection, {
        customerId: user.uid,
        restaurantId: restaurantId,
        storeOwnerId: storeOwnerId,
        driverId: null,
        orderDate: serverTimestamp(),
        status: 'Placed',
        itemsTotal: subtotal,
        deliveryFee: deliveryFee,
        serviceFee: serviceFee,
        totalAmount: total,
        deliveryAddress: deliveryAddress,
        notes: notes,
        paymentMethod: paymentMethod,
        participantUids: [user.uid, storeOwnerId],
      });

      const batch = writeBatch(firestore);
      
      for (const item of state.items) {
        const orderItemRef = doc(collection(firestore, `orders/${orderDocRef.id}/orderItems`));
        batch.set(orderItemRef, {
            orderId: orderDocRef.id,
            menuItemId: item.id,
            quantity: item.quantity,
            itemPrice: item.price,
            name: item.name,
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
            <Card className="border-none shadow-premium rounded-[2rem]">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /> Delivery Address</CardTitle>
                </CardHeader>
                <CardContent className='space-y-6'>
                    <div className='grid sm:grid-cols-2 gap-4'>
                        <div className="space-y-2">
                            <Label htmlFor="name" className="flex items-center gap-1.5"><UserIcon className="h-3.5 w-3.5 text-muted-foreground" /> Full Name</Label>
                            <Input id="name" defaultValue={user?.displayName || "Turfloop User"} className="rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone" className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-muted-foreground" /> Phone Number</Label>
                            <Input id="phone" defaultValue={user?.phoneNumber || "+27 72 123 4567"} className="rounded-xl" />
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
            
            <Card className="border-none shadow-premium rounded-[2rem]">
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
                        className="rounded-xl min-h-[100px]"
                    />
                </CardContent>
            </Card>

             <Card className="border-none shadow-premium rounded-[2rem]">
                <CardHeader>
                    <CardTitle>Payment Method</CardTitle>
                    <CardDescription>Select how you'd like to pay for your delivery.</CardDescription>
                </CardHeader>
                <CardContent>
                    <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-4">
                        <div className={`flex items-center space-x-3 p-4 rounded-xl border transition-colors ${paymentMethod === 'cod' ? 'border-primary bg-primary/5' : 'border-muted'}`}>
                            <RadioGroupItem value="cod" id="cod" />
                            <Label htmlFor="cod" className='flex items-center gap-3 cursor-pointer w-full'>
                                <div className="bg-white p-2 rounded-lg shadow-sm"><Truck className='h-5 w-5 text-primary' /></div>
                                <div className="flex-1">
                                    <p className="font-bold">Cash on Delivery</p>
                                    <p className="text-xs text-muted-foreground">Pay when your food arrives.</p>
                                </div>
                            </Label>
                        </div>
                         <div className={`flex items-center space-x-3 p-4 rounded-xl border transition-colors ${paymentMethod === 'payshap' ? 'border-primary bg-primary/5' : 'border-muted'}`}>
                            <RadioGroupItem value="payshap" id="payshap" />
                             <Label htmlFor="payshap" className='flex items-center gap-3 cursor-pointer w-full'>
                                <div className="bg-white p-2 rounded-lg shadow-sm"><Send className='h-5 w-5 text-primary' /></div>
                                <div className="flex-1">
                                    <p className="font-bold">PayShap</p>
                                    <p className="text-xs text-muted-foreground">Send to 0707529446 (WhatsApp Number).</p>
                                </div>
                            </Label>
                        </div>
                    </RadioGroup>
                </CardContent>
            </Card>
        </div>

        <div>
            <Card className="border-none shadow-premium rounded-[2rem] sticky top-24">
              <CardHeader>
                <CardTitle className="font-headline text-2xl">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {state.items.map(item => (
                    <div key={item.id} className="flex justify-between items-center text-sm">
                        <span className="flex-1 truncate pr-2 text-muted-foreground">{item.quantity} x {item.name}</span>
                        <span className='font-bold'>R{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                ))}
                <Separator />
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
                <Button className="w-full font-bold h-14 rounded-xl text-lg shadow-lg shadow-primary/20" size="lg" onClick={handleConfirmOrder}>
                  Confirm & Place Order
                </Button>
              </CardFooter>
            </Card>
        </div>
      </div>
    </div>
  );
}
