
'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, Package, MapPin, 
  TrendingUp, Star, DollarSign, Clock,
  Navigation, ShoppingBag, ArrowRight,
  Calendar as CalendarIcon, History, ChevronLeft, ChevronRight,
  Heart
} from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, doc, query, where, updateDoc, arrayUnion, getDoc, serverTimestamp } from 'firebase/firestore';
import type { Order, Restaurant, Driver } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useDriverLocationTracking } from '@/hooks/use-driver-location-tracking';
import { cn } from '@/lib/utils';
import { startOfDay, startOfWeek, isAfter, isSameDay, format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea } from '@/components/ui/scroll-area';

/**
 * Component to display an active task with navigation and status controls.
 */
function ActiveTaskCard({ order, onStatusChange }: { order: Order, onStatusChange: (id: string, status: Order['status']) => void }) {
  const firestore = useFirestore();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);

  useEffect(() => {
    if (!firestore || !order.restaurantId) return;
    getDoc(doc(firestore, 'restaurants', order.restaurantId)).then(snap => {
      if (snap.exists()) setRestaurant({ id: snap.id, ...snap.data() } as Restaurant);
    });
  }, [firestore, order.restaurantId]);

  const isPickupPhase = order.status === 'Placed' || order.status === 'Preparing';
  const targetAddress = isPickupPhase ? restaurant?.address : order.deliveryAddress;
  const targetName = isPickupPhase ? restaurant?.name : 'Customer';

  const handleNavigate = () => {
    if (!targetAddress) return;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(targetAddress)}`, '_blank');
  };

  return (
    <Card className="bg-[#1a1a1a] border-white/5 rounded-3xl overflow-hidden shadow-2xl">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <Badge className={cn(
            "border-none text-[10px]",
            isPickupPhase ? "bg-yellow-500/20 text-yellow-500" : "bg-primary/20 text-primary"
          )}>
            {isPickupPhase ? 'PICKUP REQUIRED' : 'DELIVERY IN PROGRESS'}
          </Badge>
          <span className="text-xs text-muted-foreground">Order #{order.id.slice(0, 6)}</span>
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className={cn("w-2 h-2 rounded-full mt-1.5", isPickupPhase ? "bg-yellow-500" : "bg-primary")} />
            <div className="flex-1">
              <p className="text-[10px] uppercase font-bold text-muted-foreground">
                {isPickupPhase ? 'Restaurant Pickup' : 'Customer Dropoff'}
              </p>
              <p className="text-sm font-bold">{targetName}</p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{targetAddress || 'Loading address...'}</p>
            </div>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-primary" onClick={handleNavigate}>
              <Navigation className="h-4 w-4" />
            </Button>
          </div>

          {!isPickupPhase && order.notes && (
             <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">Customer Note</p>
                <p className="text-xs italic">"{order.notes}"</p>
             </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 mt-6">
          <Button 
            variant="outline" 
            className="rounded-2xl h-12 font-bold text-xs border-white/10 hover:bg-white/5"
            onClick={handleNavigate}
          >
            Navigate
          </Button>
          <Button 
            className="rounded-2xl h-12 font-bold text-xs bg-primary hover:bg-primary/90"
            onClick={() => onStatusChange(order.id, isPickupPhase ? 'Out for Delivery' : 'Delivered')}
          >
            {isPickupPhase ? 'Confirm Pickup' : 'Mark Delivered'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DriverDashboard() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState(true);
  const [greeting, setGreeting] = useState('Good morning');
  
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  const driverRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, `users/${user.uid}/drivers/${user.uid}`);
  }, [user?.uid, firestore]);
  const { data: driverProfile } = useDoc<Driver>(driverRef);

  const myDeliveriesQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, 'orders'),
      where('driverId', '==', user.uid),
      where('status', 'in', ['Placed', 'Preparing', 'Out for Delivery'])
    );
  }, [user?.uid, firestore]);

  const availableDeliveriesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'orders'),
      where('status', '==', 'Placed'),
      where('driverId', '==', null)
    );
  }, [firestore]);

  const allDriverOrdersQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, 'orders'),
      where('driverId', '==', user.uid)
    );
  }, [user?.uid, firestore]);

  const { data: activeDeliveries, isLoading: loadingActive } = useCollection<Order>(myDeliveriesQuery);
  const { data: availableDeliveries, isLoading: loadingAvailable } = useCollection<Order>(availableDeliveriesQuery);
  const { data: allOrders } = useCollection<Order>(allDriverOrdersQuery);
  
  useDriverLocationTracking(isOnline);

  const earnings = useMemo(() => {
    if (!allOrders) return { today: 0, week: 0, lifetime: 0, count: 0 };
    
    const now = new Date();
    const todayStart = startOfDay(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });

    const payoutPerOrder = 24; 

    return allOrders
      .filter(order => order.status === 'Delivered')
      .reduce((acc, order) => {
        const timestamp = order.deliveredAt || order.orderDate;
        let date: Date = timestamp ? timestamp.toDate() : now;
        
        const totalEarningsForOrder = payoutPerOrder + (order.tip || 0);

        if (isSameDay(date, now) || isAfter(date, todayStart)) {
          acc.today += totalEarningsForOrder;
        }
        
        if (isSameDay(date, weekStart) || isAfter(date, weekStart)) {
          acc.week += totalEarningsForOrder;
        }
        
        acc.lifetime += totalEarningsForOrder;
        acc.count += 1;
        return acc;
      }, { today: 0, week: 0, lifetime: 0, count: 0 });
  }, [allOrders]);

  const historyOrders = useMemo(() => {
    if (!allOrders || !selectedDate) return [];
    return allOrders
      .filter(o => o.status === 'Delivered')
      .filter(o => {
        const date = o.deliveredAt?.toDate() || o.orderDate.toDate();
        return isSameDay(date, selectedDate);
      })
      .sort((a, b) => {
        const timeA = a.deliveredAt?.toDate().getTime() || 0;
        const timeB = b.deliveredAt?.toDate().getTime() || 0;
        return timeB - timeA;
      });
  }, [allOrders, selectedDate]);

  const handleStatusChange = async (orderId: string, status: Order['status']) => {
    if (!firestore) return;
    const orderRef = doc(firestore, 'orders', orderId);
    
    const updateData: any = { status };
    if (status === 'Delivered') {
      updateData.deliveredAt = serverTimestamp();
    }
    
    updateDoc(orderRef, updateData).then(() => {
      toast({ 
        title: status === 'Delivered' ? 'Delivery Complete!' : 'Pickup Confirmed!', 
        description: status === 'Delivered' ? 'Earnings have been updated.' : 'Now navigate to the customer.' 
      });
    }).catch(err => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: orderRef.path, operation: 'update', requestResourceData: updateData }));
    });
  };

  const handleAcceptOrder = (orderId: string) => {
    if (!user || !firestore) return;
    const orderRef = doc(firestore, 'orders', orderId);
    const updateData = {
      driverId: user.uid,
      participantUids: arrayUnion(user.uid),
    };

    updateDoc(orderRef, updateData).then(() => {
      toast({ title: 'Order Accepted!', description: 'Navigate to the restaurant for pickup.' });
    }).catch(err => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: orderRef.path, operation: 'update', requestResourceData: updateData }));
    });
  };

  const rawName = driverProfile?.name || user?.displayName || '';
  const firstName = (rawName && !rawName.startsWith('New ')) ? rawName.split(' ')[0] : '';

  return (
    <div className="min-h-screen bg-[#111] text-white pb-20">
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
                <span className="font-bold text-white">{(driverProfile?.rating || 0).toFixed(1)}</span>
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

        <div className="grid grid-cols-3 gap-3">
          <Card 
            className="bg-[#222] border-none rounded-2xl cursor-pointer hover:bg-[#2a2a2a] transition-colors active:scale-95"
            onClick={() => setIsHistoryOpen(true)}
          >
            <div className="p-4">
              <div className="bg-white/5 w-8 h-8 rounded-lg flex items-center justify-center mb-2">
                <DollarSign className="h-4 w-4 text-green-500" />
              </div>
              <p className="text-[10px] text-muted-foreground font-medium">Today</p>
              <p className="text-sm font-bold mt-1 text-white">R{earnings.today.toFixed(2)}</p>
            </div>
          </Card>
          <Card 
            className="bg-[#222] border-none rounded-2xl cursor-pointer hover:bg-[#2a2a2a] transition-colors active:scale-95"
            onClick={() => setIsHistoryOpen(true)}
          >
            <div className="p-4">
              <div className="bg-white/5 w-8 h-8 rounded-lg flex items-center justify-center mb-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
              </div>
              <p className="text-[10px] text-muted-foreground font-medium">Weekly</p>
              <p className="text-sm font-bold mt-1 text-white">R{earnings.week.toFixed(2)}</p>
            </div>
          </Card>
          <Card 
            className="bg-[#222] border-none rounded-2xl cursor-pointer hover:bg-[#2a2a2a] transition-colors active:scale-95"
            onClick={() => setIsHistoryOpen(true)}
          >
            <div className="p-4">
              <div className="bg-white/5 w-8 h-8 rounded-lg flex items-center justify-center mb-2">
                <History className="h-4 w-4 text-primary" />
              </div>
              <p className="text-[10px] text-muted-foreground font-medium">Lifetime</p>
              <p className="text-sm font-bold mt-1 text-white">R{earnings.lifetime.toFixed(2)}</p>
            </div>
          </Card>
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-3 font-bold uppercase tracking-widest opacity-50">Click cards for history</p>
      </div>

      <div className="px-6 pt-8 space-y-8">
        {activeDeliveries && activeDeliveries.length > 0 && (
          <section>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Package className="text-primary h-5 w-5" /> Current Assignment
            </h2>
            <div className="space-y-4">
              {activeDeliveries.map(order => (
                <ActiveTaskCard key={order.id} order={order} onStatusChange={handleStatusChange} />
              ))}
            </div>
          </section>
        )}

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
                <div key={order.id} className="bg-[#1a1a1a] p-5 rounded-3xl border border-white/5 flex items-center justify-between group">
                  <div className="flex-1 overflow-hidden mr-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ShoppingBag className="h-3 w-3 text-primary" />
                      <h3 className="font-bold text-sm truncate">Order Request</h3>
                    </div>
                    <div className="flex flex-col gap-1">
                        <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
                            <MapPin className="h-3 w-3 mt-0.5" />
                            <span className="line-clamp-1">{order.deliveryAddress}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-primary font-bold">
                            <ArrowRight className="h-3 w-3" />
                            <span>Your Payout: R24.00</span>
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

      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-[2.5rem] bg-[#1a1a1a] border-white/5 text-white">
          <div className="bg-primary p-6">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                 <div className="bg-white/20 p-2 rounded-xl">
                   <History className="h-5 w-5 text-white" />
                 </div>
                 <Badge variant="secondary" className="bg-white/20 text-white border-none uppercase text-[10px] font-bold">Work History</Badge>
              </div>
              <DialogTitle className="text-2xl font-bold text-white">Earnings History</DialogTitle>
            </DialogHeader>
          </div>

          <div className="p-6 space-y-6">
             <div className="bg-[#222] p-4 rounded-3xl border border-white/5 flex flex-col items-center">
                <Calendar 
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border-none"
                  classNames={{
                    day_selected: "bg-primary text-white hover:bg-primary hover:text-white focus:bg-primary focus:text-white",
                    day_today: "bg-white/10 text-white",
                    head_cell: "text-muted-foreground",
                    cell: "text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
                    nav_button: "hover:bg-white/10 text-white",
                  }}
                />
             </div>

             <div className="space-y-4">
                <div className="flex items-center justify-between">
                   <h3 className="text-sm font-bold flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Select a date'}
                   </h3>
                   <Badge variant="outline" className="text-white border-white/10">
                      {historyOrders.length} {historyOrders.length === 1 ? 'Trip' : 'Trips'}
                   </Badge>
                </div>

                <ScrollArea className="h-[250px] pr-4">
                   {historyOrders.length > 0 ? (
                      <div className="space-y-3">
                         {historyOrders.map((order) => (
                            <div key={order.id} className="bg-[#222] p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                               <div>
                                  <p className="text-xs font-bold">Order #{order.id.slice(0, 6)}</p>
                                  <p className="text-[10px] text-muted-foreground">
                                     Delivered at {order.deliveredAt ? format(order.deliveredAt.toDate(), 'p') : 'N/A'}
                                  </p>
                               </div>
                               <div className="text-right">
                                  <p className="text-sm font-bold text-green-500">+ R{(24 + (order.tip || 0)).toFixed(2)}</p>
                                  <p className="text-[9px] text-muted-foreground uppercase font-medium">
                                    {order.tip ? `Inc. R${order.tip.toFixed(2)} Tip` : 'Base Payout'}
                                  </p>
                               </div>
                            </div>
                         ))}
                      </div>
                   ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center opacity-30 py-10">
                         <History className="h-10 w-10 mb-2" />
                         <p className="text-sm">No deliveries on this day.</p>
                      </div>
                   )}
                </ScrollArea>
             </div>
          </div>

          <div className="p-6 bg-[#222]/50 border-t border-white/5">
             <Button variant="outline" className="w-full rounded-2xl h-12 font-bold border-white/10 hover:bg-white/5 text-white" onClick={() => setIsHistoryOpen(false)}>
                Close History
             </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
