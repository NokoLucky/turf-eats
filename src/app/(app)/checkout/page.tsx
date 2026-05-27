'use client';

import { useEffect, useState } from 'react';
import { useCart } from '@/context/cart-context';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowLeft, MapPin, ShieldCheck, MessageSquare, Heart, Loader2 } from 'lucide-react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { collection, serverTimestamp, writeBatch, doc, getDoc } from 'firebase/firestore';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const tipOptions = [
  { label: 'R0', value: 0 },
  { label: 'R5', value: 5 },
  { label: 'R10', value: 10 },
  { label: 'R20', value: 20 },
  { label: 'R50', value: 50 },
  { label: 'R100', value: 100 },
];

export default function CheckoutPage() {
  const { state, dispatch } = useCart();
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();

  const customerRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, `users/${user.uid}/customers/${user.uid}`);
  }, [user, firestore]);

  const { data: customerData } = useDoc<{name: string; phoneNumber: string; address: string}>(customerRef);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [deliveryOption, setDeliveryOption] = useState('standard');
  const [selectedTip, setSelectedTip] = useState(0);

  useEffect(() => {
    if (customerData) {
      if (customerData.address) setDeliveryAddress(customerData.address);
      if (customerData.name) setCustomerName(customerData.name);
      if (customerData.phoneNumber) setCustomerPhone(customerData.phoneNumber);
    }
  }, [customerData]);

  // Only auto-redirect if the cart is empty AND we aren't currently placing an order
  useEffect(() => {
    if (state.items.length === 0 && !isSubmitting) {
      router.replace('/dashboard');
    }
  }, [state.items.length, isSubmitting, router]);

  if (state.items.length === 0 && !isSubmitting) return null;

  const subtotal = state.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const serviceFee = 5.0; 
  const deliveryFee = deliveryOption === 'standard' ? 30.0 : 50.0;
  const total = subtotal + serviceFee + deliveryFee + selectedTip;

  const handleConfirmOrder = async () => {
    if (!user || !firestore || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      const restaurantId = state.items[0]?.restaurantId;
      const restaurantSnap = await getDoc(doc(firestore, 'restaurants', restaurantId));
      const storeOwnerId = restaurantSnap.data()?.storeOwnerId;

      // Prepare order doc and ID
      const orderRef = doc(collection(firestore, 'orders'));
      const orderId = orderRef.id;

      const batch = writeBatch(firestore);

      batch.set(orderRef, {
        customerId: user.uid,
        customerName: customerName || user.displayName || 'Guest',
        customerPhone: customerPhone || user.phoneNumber || '',
        restaurantId,
        storeOwnerId,
        orderDate: serverTimestamp(),
        status: 'Placed',
        itemsTotal: subtotal,
        deliveryFee,
        serviceFee,
        tip: selectedTip,
        totalAmount: total,
        deliveryAddress: deliveryAddress || 'Update address in profile',
        notes,
        paymentMethod,
        participantUids: [user.uid, storeOwnerId],
      });

      state.items.forEach(item => {
        const orderItemRef = doc(collection(firestore, `orders/${orderId}/orderItems`));
        batch.set(orderItemRef, {
            orderId: orderId,
            menuItemId: item.actualId,
            quantity: item.quantity,
            itemPrice: item.price,
            name: item.name,
            selectedOptions: item.selectedOptions || null,
        });
      });

      await batch.commit();
      
      // Navigate first, then clear cart to avoid the "empty cart" redirect logic
      router.push(`/order-success?id=${orderId}`);
      
      // Small delay before clearing global cart state
      setTimeout(() => {
        dispatch({ type: 'CLEAR_CART' });
      }, 500);

    } catch (error) {
      console.error("Order failed:", error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-44">
      <header className="bg-white border-b px-4 py-6 flex items-center gap-4 pt-[env(safe-area-inset-top)]">
        <Button onClick={() => router.back()} variant="ghost" size="icon" className="rounded-full">
           <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold">Checkout</h1>
      </header>

      <div className="container py-8 px-4 max-w-md mx-auto space-y-6">
        <Card className="border-none shadow-sm rounded-2xl p-4 bg-white">
           <div className="flex items-start gap-4">
              <div className="bg-orange-100 p-2 rounded-xl text-primary">
                 <MapPin className="h-5 w-5" />
              </div>
              <div className="flex-1">
                 <p className="text-[10px] font-bold text-muted-foreground uppercase">Delivering to</p>
                 <p className="text-sm font-bold mt-0.5">{deliveryAddress || 'Set address in profile'}</p>
                 <p className="text-[10px] text-muted-foreground mt-1">{customerName || 'Update name in profile'} • {customerPhone || 'Update phone'}</p>
              </div>
              <Button variant="ghost" className="text-primary text-xs font-bold h-auto p-0" onClick={() => router.push('/profile')}>Change</Button>
           </div>
        </Card>

        <section className="space-y-3">
           <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <Heart className="h-4 w-4 text-primary fill-primary" /> Tip your rider
              </h2>
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Optional</span>
           </div>
           <p className="text-[11px] text-muted-foreground">100% of the tip goes to your rider to help support their work.</p>
           <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
              {tipOptions.map((opt) => (
                <Button
                  key={opt.label}
                  type="button"
                  variant={selectedTip === opt.value ? 'default' : 'outline'}
                  className={cn(
                    "rounded-xl min-w-[60px] h-10 font-bold text-xs",
                    selectedTip === opt.value ? "bg-primary" : "bg-white"
                  )}
                  onClick={() => setSelectedTip(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
           </div>
        </section>

        <section className="space-y-3">
           <h2 className="text-sm font-bold">Delivery option</h2>
           <RadioGroup value={deliveryOption} onValueChange={setDeliveryOption} className="space-y-3">
              <div className={cn(
                "flex items-center justify-between p-4 rounded-2xl border bg-white transition-all",
                deliveryOption === 'standard' ? "border-primary" : "border-transparent"
              )}>
                 <div className="flex items-center gap-3">
                    <RadioGroupItem value="standard" id="std" />
                    <Label htmlFor="std" className="cursor-pointer">
                       <p className="text-sm font-bold">Standard Delivery</p>
                       <p className="text-[10px] text-muted-foreground">25 - 35 mins</p>
                    </Label>
                 </div>
                 <span className="text-sm font-bold">R30.00</span>
              </div>
              <div className={cn(
                "flex items-center justify-between p-4 rounded-2xl border bg-white transition-all",
                deliveryOption === 'express' ? "border-primary" : "border-transparent"
              )}>
                 <div className="flex items-center gap-3">
                    <RadioGroupItem value="express" id="exp" />
                    <Label htmlFor="exp" className="cursor-pointer">
                       <p className="text-sm font-bold">Express Delivery</p>
                       <p className="text-[10px] text-muted-foreground">15 - 20 mins</p>
                    </Label>
                 </div>
                 <span className="text-sm font-bold">R50.00</span>
              </div>
           </RadioGroup>
        </section>

        <section className="space-y-3">
           <h2 className="text-sm font-bold">Payment method</h2>
           <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-3">
              <div className="flex items-center justify-between p-4 rounded-2xl border border-transparent bg-white">
                 <div className="flex items-center gap-3">
                    <RadioGroupItem value="cod" id="cod" />
                    <Label htmlFor="cod" className="text-sm font-bold cursor-pointer">Cash on Delivery</Label>
                 </div>
              </div>
              <div className="flex items-center justify-between p-4 rounded-2xl border border-transparent bg-white">
                 <div className="flex items-center gap-3">
                    <RadioGroupItem value="payshap" id="payshap" />
                    <Label htmlFor="payshap" className="cursor-pointer">
                        <p className="text-sm font-bold">PayShap</p>
                        <p className="text-[10px] text-muted-foreground">Transfer via phone number</p>
                    </Label>
                 </div>
                 <div className="bg-blue-50 px-2 py-1 rounded-lg">
                    <span className="text-[10px] font-black text-blue-600 italic uppercase">PayShap</span>
                 </div>
              </div>
           </RadioGroup>
        </section>

        <section className="space-y-3">
           <h2 className="text-sm font-bold flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Note to rider <span className="text-muted-foreground font-normal">(optional)</span></h2>
           <Textarea 
            placeholder="Add a note for your rider..." 
            className="rounded-2xl bg-white border-none shadow-sm min-h-[80px]"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
           />
        </section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white p-6 shadow-[0_-4px_20px_-2px_rgba(0,0,0,0.1)] z-50 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
           <div className="max-w-md mx-auto">
              <div className="flex justify-between items-center text-lg font-bold mb-4">
                 <span>Total</span>
                 <span className="text-primary">R{total.toFixed(2)}</span>
              </div>
              <Button 
                onClick={handleConfirmOrder} 
                disabled={isSubmitting}
                className="w-full h-14 rounded-2xl font-bold text-lg bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
              >
                 {isSubmitting ? (
                   <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Placing Order...
                   </>
                 ) : (
                   "Place Order"
                 )}
              </Button>
              <p className="text-center mt-3 text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                 <ShieldCheck className="h-3 w-3" /> Safe & secure payments
              </p>
           </div>
      </div>
    </div>
  );
}
