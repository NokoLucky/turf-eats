'use client'

import React, { Suspense } from 'react';
import { notFound, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, Bike, Pizza, Circle, ShoppingBag, Star, Clock, Heart, Phone, User as UserIcon } from 'lucide-react';
import OrderTrackingMap from '@/components/order-tracking-map';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, collection, getDoc, getDocs, onSnapshot } from 'firebase/firestore';
import type { Order, OrderItem, OrderStatus, Restaurant, Driver } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import { format, formatDistanceToNow } from 'date-fns';
import { RatingDialog } from '@/components/rating-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';

const statusSteps: { status: OrderStatus; icon: React.ReactNode; label: string; timestampField: keyof Order }[] = [
    { status: 'Placed', icon: <Circle />, label: 'Order Placed', timestampField: 'orderDate' },
    { status: 'Preparing', icon: <Pizza />, label: 'Preparing', timestampField: 'preparingAt' },
    { status: 'Out for Delivery', icon: <Bike />, label: 'Out for Delivery', timestampField: 'pickedUpAt' },
    { status: 'Delivered', icon: <CheckCircle />, label: 'Delivered', timestampField: 'deliveredAt' },
];

function OrderDetailsSkeleton() {
  return (
    <div className="container py-12 px-4 sm:px-8">
        <div className="mb-8">
            <Skeleton className="h-10 w-1/2" />
            <Skeleton className="h-5 w-1/3 mt-2" />
        </div>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
                <Card className="rounded-[2rem] border-none shadow-premium">
                    <CardHeader>
                        <CardTitle>Live Tracking</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="aspect-video w-full rounded-2xl" />
                    </CardContent>
                </Card>
            </div>
            <div className="space-y-8">
                <Card className="rounded-[2rem] border-none shadow-premium">
                    <CardHeader>
                        <CardTitle>Order Status</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {Array.from({length: 4}).map((_, i) => (
                           <div key={i} className="flex items-center gap-4">
                               <Skeleton className="h-8 w-8 rounded-full" />
                               <Skeleton className="h-5 w-32" />
                           </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    </div>
  )
}

function OrderDetailsContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('id');
  const firestore = useFirestore();
  const [order, setOrder] = React.useState<Order | null>(null);
  const [restaurant, setRestaurant] = React.useState<Restaurant | null>(null);
  const [orderItems, setOrderItems] = React.useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRatingOpen, setRatingOpen] = React.useState(false);

  React.useEffect(() => {
    if (!firestore || !orderId) return;

    const orderRef = doc(firestore, 'orders', orderId);
    
    const unsubscribe = onSnapshot(orderRef, 
      (docSnap) => {
        if (docSnap.exists()) {
          const orderData = { id: docSnap.id, ...docSnap.data() } as Order;
          setOrder(orderData);

          if (orderData.restaurantId) {
            const restaurantRef = doc(firestore, 'restaurants', orderData.restaurantId);
            getDoc(restaurantRef).then(restaurantSnap => {
              if (restaurantSnap.exists()) {
                setRestaurant({ id: restaurantSnap.id, ...restaurantSnap.data() } as Restaurant);
              }
            });
          }

          const itemsRef = collection(firestore, 'orders', orderId, 'orderItems');
          getDocs(itemsRef).then(itemsSnap => {
            const items = itemsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as OrderItem));
            setOrderItems(items);
          });

        } else {
          setOrder(null);
        }
        setIsLoading(false);
      },
      (error) => {
        console.error("[OrderDetailsPage] Snapshot error:", error);
        setIsLoading(false);
        setOrder(null);
      }
    );

    return () => unsubscribe();
  }, [firestore, orderId]);

  const driverRef = useMemoFirebase(() => {
    if (!firestore || !order?.driverId) return null;
    return doc(firestore, `users/${order.driverId}/drivers/${order.driverId}`);
  }, [firestore, order?.driverId]);

  const { data: driverInfo } = useDoc<Driver>(driverRef);


  const handleRatingSubmitted = () => {
    if (!order) return;
    setOrder({ ...order, isRated: true });
  };


  if (isLoading) {
    return <OrderDetailsSkeleton />;
  }

  if (!order) {
    notFound();
  }

  const currentStatusIndex = statusSteps.findIndex(step => step.status === order.status);

  return (
    <>
    <RatingDialog
        order={order}
        open={isRatingOpen}
        onOpenChange={setRatingOpen}
        onRatingSubmitted={handleRatingSubmitted}
    />
    <div className="container py-12 px-4 sm:px-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div>
            <div className="flex items-center gap-3 mb-2">
                <Badge className="bg-primary/10 text-primary border-none rounded-full px-3 py-1 text-xs font-bold">#{order.id.slice(0, 8)}</Badge>
                {order.status === 'Delivered' && (
                    <Badge className="bg-green-100 text-green-700 border-none rounded-full px-3 py-1 text-xs font-bold">DELIVERED</Badge>
                )}
            </div>
            <h1 className="font-headline text-4xl font-bold">Track Your Order</h1>
            <p className="text-muted-foreground mt-1 flex items-center gap-2">
               <Clock className="h-4 w-4" /> Ordered from <span className="font-bold text-foreground">{restaurant?.name || '...'}</span> on {order.orderDate ? format(order.orderDate.toDate(), 'PPP') : 'N/A'}
            </p>
        </div>
      </div>

      {order.status === 'Delivered' && (
        <Card className="mb-10 border-none shadow-premium bg-gradient-to-br from-orange-50 to-primary/5 rounded-[2.5rem] overflow-hidden">
          <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className="bg-white p-4 rounded-[1.5rem] shadow-sm transform -rotate-3">
                <Star className="h-10 w-10 text-primary fill-primary" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">How was everything?</h3>
                <p className="text-muted-foreground mt-1">Your feedback helps Pin2You's local community grow.</p>
              </div>
            </div>
            {!order.isRated ? (
              <Button onClick={() => setRatingOpen(true)} className="rounded-2xl px-10 h-14 font-bold text-lg shadow-xl shadow-primary/20 hover:scale-105 transition-transform">
                Rate Order
              </Button>
            ) : (
              <div className="flex items-center gap-3 bg-green-500 text-white py-3 px-6 rounded-2xl font-bold shadow-lg">
                <CheckCircle className="h-5 w-5" />
                <span>THANKS FOR YOUR RATING!</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="rounded-[2.5rem] border-none shadow-premium overflow-hidden">
            <CardHeader className="bg-white/50 backdrop-blur-sm border-b px-8 py-6">
              <CardTitle className="text-lg">Live Tracking</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <OrderTrackingMap order={order} restaurant={restaurant} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          {driverInfo && order.status !== 'Placed' && order.status !== 'Cancelled' && (
             <Card className="rounded-[2.5rem] border-none shadow-premium overflow-hidden bg-white">
                <CardHeader className="px-8 pt-8 pb-4">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Your Delivery Partner</p>
                  <CardTitle className="text-lg">Meet {driverInfo.name.split(' ')[0]}</CardTitle>
                </CardHeader>
                <CardContent className="px-8 pb-8">
                   <div className="flex items-center gap-4">
                      <div className="relative h-16 w-16 rounded-full overflow-hidden bg-muted shadow-inner border-2 border-primary/20">
                         {driverInfo.photoUrl ? (
                            <Image src={driverInfo.photoUrl} alt={driverInfo.name} fill className="object-cover" />
                         ) : (
                            <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                               <UserIcon className="h-8 w-8" />
                            </div>
                         )}
                      </div>
                      <div className="flex-1">
                         <p className="font-bold text-sm">{driverInfo.name}</p>
                         <div className="flex items-center gap-1 mt-0.5">
                            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                            <span className="text-xs font-bold">{(driverInfo.rating || 5.0).toFixed(1)}</span>
                            <span className="text-muted-foreground text-[10px] ml-1">• {driverInfo.vehicleType}</span>
                         </div>
                         <div className="flex items-center gap-2 mt-2">
                            <Button asChild size="sm" variant="outline" className="h-8 rounded-lg text-[10px] font-bold">
                               <a href={`tel:${driverInfo.phoneNumber}`}>
                                  <Phone className="h-3 w-3 mr-1" /> Call Driver
                               </a>
                            </Button>
                         </div>
                      </div>
                   </div>
                </CardContent>
             </Card>
          )}

          <Card className="rounded-[2.5rem] border-none shadow-premium overflow-hidden">
            <CardHeader className="px-8 py-6">
              <CardTitle className="text-lg">Order Status</CardTitle>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <div className="relative flex flex-col gap-8 pl-4">
                 <div className="absolute left-7 top-4 bottom-4 w-0.5 bg-muted -translate-x-1/2"></div>
                {statusSteps.map((step, index) => {
                    const isActive = index <= currentStatusIndex;
                    const isLastCompleted = index === currentStatusIndex;
                    const timestamp = order[step.timestampField];

                    return (
                        <div key={step.status} className="flex items-center gap-4 relative z-10">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-500 shadow-md ${isActive ? 'bg-primary text-white scale-110' : 'bg-muted text-muted-foreground opacity-50'}`}>
                                {React.cloneElement(step.icon as React.ReactElement, { className: "h-4 w-4" })}
                            </div>
                            <div className="flex flex-col">
                                <span className={`font-bold text-sm transition-colors ${isActive ? 'text-foreground' : 'text-muted-foreground opacity-50'}`}>
                                    {step.label}
                                </span>
                                <div className="flex items-center gap-2">
                                  {timestamp && (
                                    <span className="text-[10px] text-muted-foreground">
                                       {formatDistanceToNow(timestamp.toDate(), { addSuffix: true })}
                                    </span>
                                  )}
                                  {isLastCompleted && (
                                      <span className="text-[10px] text-primary font-bold uppercase tracking-widest animate-pulse">Current Status</span>
                                  )}
                                </div>
                            </div>
                        </div>
                    )
                })}
              </div>
            </CardContent>
          </Card>
          
          <Card className="rounded-[2.5rem] border-none shadow-premium overflow-hidden">
            <CardHeader className="px-8 py-6">
              <CardTitle className="text-lg">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="px-8 pb-8">
                {!orderItems || orderItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-8">
                        <ShoppingBag className="h-10 w-10 mb-4 animate-bounce text-muted" />
                        <p className="text-sm">Preparing your items...</p>
                    </div>
                ) : (
                    <>
                        <ul className="space-y-4">
                            {orderItems.map((item) => (
                            <li key={item.id} className="flex justify-between items-center text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="bg-muted px-2 py-0.5 rounded text-[10px] font-bold">{item.quantity}x</span>
                                    <span className="font-medium">{item.name}</span>
                                </div>
                                <span className="font-bold text-primary">R{(item.itemPrice * item.quantity).toFixed(2)}</span>
                            </li>
                            ))}
                        </ul>
                        <Separator className="my-6" />
                        <div className="space-y-2 mb-4">
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Items Total</span>
                                <span>R{order.itemsTotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Service Fee</span>
                                <span>R{(order.serviceFee || 5.0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Delivery Fee</span>
                                <span>R{(order.deliveryFee || 30.0).toFixed(2)}</span>
                            </div>
                            {order.tip && order.tip > 0 && (
                              <div className="flex justify-between text-xs text-primary font-bold">
                                <span className="flex items-center gap-1"><Heart className="h-3 w-3 fill-primary" /> Driver Tip</span>
                                <span>R{order.tip.toFixed(2)}</span>
                              </div>
                            )}
                        </div>
                        <div className="flex justify-between font-bold text-xl">
                            <span>Total</span>
                            <span className="text-primary">R{order.totalAmount.toFixed(2)}</span>
                        </div>
                    </>
                )}
            </CardContent>
          </Card>
          
          {order.notes && (
            <Card className="rounded-[2rem] border-none shadow-premium bg-primary/5">
                <CardHeader className="px-6 pt-6 pb-2">
                    <CardTitle className="text-sm uppercase tracking-widest text-primary font-bold">Your Notes</CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-6">
                    <p className="text-sm italic text-muted-foreground">"{order.notes}"</p>
                </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
    </>
  );
}

export default function OrderDetailsPage() {
  return (
    <Suspense fallback={<OrderDetailsSkeleton />}>
      <OrderDetailsContent />
    </Suspense>
  )
}
