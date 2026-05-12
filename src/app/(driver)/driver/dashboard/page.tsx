
'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, Package, MapPin, 
  TrendingUp, Star, DollarSign, Clock
} from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, doc, query, where, updateDoc, arrayUnion, Timestamp } from 'firebase/firestore';
import type { Order } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useDriverLocationTracking } from '@/hooks/use-driver-location-tracking';
import { cn } from '@/lib/utils';
import { startOfDay, startOfWeek, isAfter } from 'date-fns';

export default function DriverDashboard() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState(true);
  const [greeting, setGreeting] = useState('Good morning');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  // Fetch driver profile
  const driverRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, `users/${user.uid}/drivers/${user.uid}`);
  }, [user?.uid, firestore]);
  const { data: driverProfile } = useDoc(driverRef);

  // My Active Deliveries
  const myDeliveriesQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, 'orders'),
      where('driverId', '==', user.uid),
      where('status', '==', 'Out for Delivery')
    );
  }, [user?.uid, firestore]);

  // Available Deliveries (unassigned)
  const availableDeliveriesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'orders'),
      where('status', '==', 'Placed')
    );
  }, [firestore]);

  // History for Earnings Calculation
  const historyQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, 'orders'),
      where('driverId', '==', user.uid),
      where('status', '==', 'Delivered')
    );
  }, [user?.uid, firestore]);

  const { data: activeDeliveries, isLoading: loadingActive } = useCollection<Order>(myDeliveriesQuery);
  const { data: availableDeliveries, isLoading: loadingAvailable } = useCollection<Order>(availableDeliveriesQuery);
  const { data: history } = useCollection<Order>(historyQuery);
  
  // Location tracking hook - only runs when online and potentially has tasks
  useDriverLocationTracking(isOnline);

  const earnings = useMemo(() => {
    if (!history) return { today: 0, week: 0, count: 0 };
    
    const now = new Date();
    const todayStart = startOfDay(now);
    const weekStart = startOfWeek(now);

    return history.reduce((acc, order) => {
      const orderDate = order.orderDate.toDate();
      const payout = 35; // Standard flat delivery fee for MVP
      
      if (isAfter(orderDate, todayStart)) acc.today += payout;
      if (isAfter(orderDate, weekStart)) acc.week += payout;
      acc.count += 1;
      
      return acc;
    }, { today: 0, week: 0, count: 0 });
  }, [history]);

  const stats = [
    { label: "Today's Earnings", value: `R${earnings.today.toFixed(2)}`, icon: <DollarSign className="text-green-500" /> },
    { label: "This Week", value: `R${earnings.week.toFixed(2)}`, icon: <TrendingUp className="text-blue-500" /> },
    { label: "Completed", value: earnings.count.toString(), icon: <CheckCircle className="text-primary" /> },
  ];

  const handleStatusChange = async (orderId: string, status: Order['status']) => {
    if (!firestore) return;
    const orderRef = doc(firestore, 'orders', orderId);
    const updateData = { status };
    
    updateDoc(orderRef, updateData).catch(err => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: orderRef.path, operation: 'update', requestResourceData: updateData }));
    });
  };

  const handleAcceptOrder = (orderId: string) => {
    if (!user || !firestore) return;
    const orderRef = doc(firestore, 'orders', orderId);
    const updateData = {
      driverId: user.uid,
      status: 'Out for Delivery' as const,
      participantUids: arrayUnion(user.uid),
    };

    updateDoc(orderRef, updateData).then(() => {
      toast({ title: 'Order Accepted!', description: 'Navigate to the restaurant to pick up the order.' });
    }).catch(err => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: orderRef.path, operation: 'update', requestResourceData: updateData }));
    });
  };

  const rawName = driverProfile?.name || user?.displayName || '';
  const firstName = (rawName && !rawName.startsWith('New ')) ? rawName.split(' ')[0] : '';

  return (
    <div className="min-h-screen bg-[#111] text-white pb-20">
      {/* Driver Profile Header */}
      <div className="bg-[#1a1a1a] p-6 rounded-b-[2rem] shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 rounded-full overflow-hidden border-2 border-primary">
              <img src={user?.photoURL || `https://picsum.photos/seed/${user?.uid}/100/100`} alt="profile" className="object-cover" />
            </div>
            <div>
              <h1 className="text-lg font-bold">{greeting}{firstName ? `, ${firstName}` : ''} 👋</h1>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <Star className="h-3 w-3 text-primary fill-primary" />
                <span className="font-bold text-white">4.8</span>
                <span>• {driverProfile?.vehicleType || 'Driver'}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
             <div className="flex items-center gap-2 bg-[#222] p-2 rounded-xl">
               <span className={cn("text-[10px] font-bold uppercase", isOnline ? "text-green-500" : "text-muted-foreground")}>
                 {isOnline ? 'Online' : 'Offline'}
               </span>
               <Switch checked={isOnline} onCheckedChange={setIsOnline} />
             </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-[#222] p-4 rounded-2xl border border-white/5">
              <div className="bg-white/5 w-8 h-8 rounded-lg flex items-center justify-center mb-2">
                {React.cloneElement(stat.icon as React.ReactElement, { className: "h-4 w-4" })}
              </div>
              <p className="text-[10px] text-muted-foreground font-medium">{stat.label}</p>
              <p className="text-sm font-bold mt-1">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-6 pt-8 space-y-8">
        {/* Active Deliveries */}
        {activeDeliveries && activeDeliveries.length > 0 && (
          <section>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Package className="text-primary h-5 w-5" /> Active Tasks
            </h2>
            <div className="space-y-4">
              {activeDeliveries.map(order => (
                <Card key={order.id} className="bg-[#1a1a1a] border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <Badge className="bg-primary/20 text-primary border-none text-[10px]">IN TRANSIT</Badge>
                      <span className="text-xs text-muted-foreground">Order #{order.id.slice(0, 6)}</span>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                        <div className="flex-1">
                          <p className="text-[10px] uppercase font-bold text-muted-foreground">Dropoff Location</p>
                          <p className="text-sm font-bold">{order.deliveryAddress}</p>
                        </div>
                      </div>
                      {order.notes && (
                         <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                            <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">Customer Note</p>
                            <p className="text-xs italic">"{order.notes}"</p>
                         </div>
                      )}
                    </div>
                    <Button 
                      className="w-full mt-6 rounded-2xl h-12 font-bold text-sm bg-primary hover:bg-primary/90"
                      onClick={() => handleStatusChange(order.id, 'Delivered')}
                    >
                      Mark as Delivered
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Available Deliveries Queue */}
        <section>
          <div className="flex items-center justify-between mb-4">
             <h2 className="text-lg font-bold">Available Nearby</h2>
             {availableDeliveries && availableDeliveries.length > 0 && (
                <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-full animate-pulse">
                  {availableDeliveries.length} NEW
                </span>
             )}
          </div>
          
          <div className="space-y-4">
            {loadingAvailable ? (
              Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-32 w-full bg-[#1a1a1a] rounded-3xl" />)
            ) : availableDeliveries && availableDeliveries.length > 0 ? (
              availableDeliveries.map(order => (
                <div key={order.id} className="bg-[#1a1a1a] p-5 rounded-3xl border border-white/5 flex items-center justify-between group animate-in fade-in slide-in-from-bottom-4">
                  <div className="flex-1 overflow-hidden mr-4">
                    <h3 className="font-bold text-sm truncate">New Delivery Request</h3>
                    <div className="flex flex-col gap-1 mt-2">
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <MapPin className="h-3 w-3 text-primary" />
                            <span className="truncate">{order.deliveryAddress}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-primary font-bold">
                            <DollarSign className="h-3 w-3" />
                            <span>Estimated Fee: R35.00</span>
                        </div>
                    </div>
                  </div>
                  <Button 
                    variant="secondary" 
                    className="bg-primary text-white hover:bg-primary/90 rounded-2xl px-6 font-bold h-10 flex-shrink-0"
                    onClick={() => handleAcceptOrder(order.id)}
                    disabled={!isOnline}
                  >
                    Accept
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-center py-16 bg-[#1a1a1a] rounded-3xl border border-dashed border-white/10">
                <Clock className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No new orders available.</p>
                <p className="text-[10px] text-muted-foreground mt-1 px-10">We'll notify you when a customer places an order nearby.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
