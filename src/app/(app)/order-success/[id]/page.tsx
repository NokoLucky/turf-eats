'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Check, Clock, Bike, Package, Home as HomeIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Order } from '@/lib/data';

export default function OrderSuccessPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const firestore = useFirestore();

  const orderRef = useMemoFirebase(() => {
    if (!firestore || !id) return null;
    return doc(firestore, 'orders', id);
  }, [firestore, id]);

  const { data: order } = useDoc<Order>(orderRef);

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center p-6">
       <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-premium overflow-hidden p-8 text-center space-y-8">
          <div className="relative mx-auto w-24 h-24">
             <div className="absolute inset-0 bg-green-500/10 rounded-full animate-ping" />
             <div className="relative bg-green-500 w-24 h-24 rounded-full flex items-center justify-center shadow-lg shadow-green-500/20">
                <Check className="h-12 w-12 text-white" strokeWidth={3} />
             </div>
          </div>

          <div className="relative h-48 w-full mt-4">
             <Image 
              src="https://picsum.photos/seed/delivery/600/400" 
              alt="Delivery" 
              fill 
              className="object-contain" 
             />
          </div>

          <div>
             <h1 className="text-2xl font-bold">Order Confirmed! 🎉</h1>
             <p className="text-green-600 font-bold mt-2">Order #PIN{id.slice(0, 7).toUpperCase()}</p>
          </div>

          <div className="bg-[#F8F9FA] rounded-3xl p-6 space-y-2">
             <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Estimated delivery</p>
             <p className="text-3xl font-black text-slate-800">25 - 35 mins</p>
          </div>

          <div className="text-left space-y-6 pt-4">
             <div className="flex flex-col gap-1">
                <h3 className="font-bold text-sm">Track your order in real-time</h3>
                <p className="text-[11px] text-muted-foreground">We'll notify you when your rider is on the way.</p>
             </div>

             <div className="flex justify-between items-center relative px-2">
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-slate-100 -z-0" />
                {[
                  { icon: <Check />, label: 'Confirmed', active: true },
                  { icon: <Package />, label: 'Preparing', active: false },
                  { icon: <Bike />, label: 'On the way', active: false },
                  { icon: <HomeIcon />, label: 'Delivered', active: false }
                ].map((step, i) => (
                  <div key={i} className="flex flex-col items-center gap-2 relative z-10">
                     <div className={cn(
                       "w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-all",
                       step.active ? "bg-green-500 text-white scale-110" : "bg-white text-slate-300"
                     )}>
                        {React.cloneElement(step.icon as React.ReactElement, { className: "h-4 w-4", strokeWidth: 3 })}
                     </div>
                     <span className={cn("text-[9px] font-bold uppercase", step.active ? "text-slate-800" : "text-slate-300")}>
                        {step.label}
                     </span>
                  </div>
                ))}
             </div>
          </div>

          <div className="pt-8">
             <Button asChild className="w-full h-14 rounded-2xl font-bold text-lg border-2 border-orange-500 text-orange-500 bg-white hover:bg-orange-50 hover:text-orange-600 transition-all">
                <Link href={`/orders/${id}`}>View Order Status</Link>
             </Button>
          </div>
       </div>

       <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 w-full max-w-4xl">
          {[
            { label: 'Fast Delivery', desc: 'Quick delivery to your door.', img: 'https://picsum.photos/seed/fast/100/100' },
            { label: 'Live Tracking', desc: 'Track your order in real-time.', img: 'https://picsum.photos/seed/live/100/100' },
            { label: 'Secure Payments', desc: 'Pay safely with cash or card.', img: 'https://picsum.photos/seed/safe/100/100' },
            { label: 'Top Restaurants', desc: 'From your favorite local spots.', img: 'https://picsum.photos/seed/top/100/100' }
          ].map((feature, i) => (
            <div key={i} className="bg-white/50 backdrop-blur-sm p-4 rounded-3xl border border-white flex items-center gap-3">
               <div className="h-10 w-10 shrink-0 bg-orange-100 rounded-xl flex items-center justify-center">
                  <Image src={feature.img} alt={feature.label} width={24} height={24} className="rounded-lg" />
               </div>
               <div className="min-w-0">
                  <h4 className="text-[11px] font-bold truncate">{feature.label}</h4>
                  <p className="text-[9px] text-muted-foreground line-clamp-2">{feature.desc}</p>
               </div>
            </div>
          ))}
       </div>
    </div>
  );
}
