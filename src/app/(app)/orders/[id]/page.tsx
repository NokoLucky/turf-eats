'use client'

import React, { useMemo } from 'react';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, Bike, Pizza, Circle, ShoppingBag } from 'lucide-react';
import OrderTrackingMap from '@/components/order-tracking-map';
import { useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import type { Order, OrderItem, OrderStatus, Restaurant } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

const statusSteps: { status: OrderStatus; icon: React.ReactNode; label: string }[] = [
    { status: 'Placed', icon: <Circle />, label: 'Order Placed' },
    { status: 'Preparing', icon: <Pizza />, label: 'Preparing' },
    { status: 'Out for Delivery', icon: <Bike />, label: 'Out for Delivery' },
    { status: 'Delivered', icon: <CheckCircle />, label: 'Delivered' },
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
                <Card>
                    <CardHeader>
                        <CardTitle>Live Tracking</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="aspect-video w-full" />
                    </CardContent>
                </Card>
            </div>
            <div className="space-y-8">
                <Card>
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
                 <Card>
                    <CardHeader>
                        <CardTitle>Order Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {Array.from({length: 2}).map((_, i) => (
                            <Skeleton key={i} className="h-5 w-full" />
                        ))}
                        <Separator className="my-4" />
                        <Skeleton className="h-6 w-1/2 ml-auto" />
                    </CardContent>
                </Card>
            </div>
        </div>
    </div>
  )
}

export default function OrderDetailsPage({ params }: { params: { id: string } }) {
  const firestore = useFirestore();

  const orderRef = useMemoFirebase(() => 
    firestore ? doc(firestore, 'orders', params.id) : null
  , [firestore, params.id]);
  const { data: order, isLoading: isOrderLoading } = useDoc<Order>(orderRef);

  const restaurantRef = useMemoFirebase(() => 
    (firestore && order?.restaurantId) ? doc(firestore, 'restaurants', order.restaurantId) : null
  , [firestore, order?.restaurantId]);
  const { data: restaurant } = useDoc<Restaurant>(restaurantRef);

  const orderItemsRef = useMemoFirebase(() =>
    firestore ? collection(firestore, 'orders', params.id, 'orderItems') : null
  , [firestore, params.id]);
  const { data: orderItems, isLoading: areItemsLoading } = useCollection<OrderItem>(orderItemsRef);

  const isLoading = isOrderLoading || areItemsLoading;

  // Use this check to decide when to show the 404 page.
  // It should only trigger if loading is complete AND the order still isn't found.
  if (!isLoading && !order) {
    notFound();
  }

  // Show a skeleton or loading state while data is being fetched.
  if (isLoading) {
    return <OrderDetailsSkeleton />;
  }

  // At this point, if there's no order, the `notFound()` would have already been called.
  // We can safely assume `order` exists.
  const currentStatusIndex = statusSteps.findIndex(step => step.status === order!.status);

  return (
    <div className="container py-12 px-4 sm:px-8">
      <div className="mb-8">
        <h1 className="font-headline text-4xl font-bold">Order #{order!.id.slice(0, 6)}...</h1>
        <p className="text-muted-foreground mt-2">
          From <span className="font-semibold text-primary">{restaurant?.name || '...'}</span> on {order!.orderDate ? format(order!.orderDate.toDate(), 'PPP') : 'N/A'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Live Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderTrackingMap />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Order Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative flex flex-col gap-8 pl-4">
                 <div className="absolute left-7 top-4 bottom-4 w-0.5 bg-border -translate-x-1/2"></div>
                {statusSteps.map((step, index) => {
                    const isActive = index <= currentStatusIndex;
                    return (
                        <div key={step.status} className="flex items-center gap-4 relative z-10">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                {React.cloneElement(step.icon as React.ReactElement, { className: "h-5 w-5" })}
                            </div>
                            <span className={`font-medium transition-colors ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {step.label}
                            </span>
                        </div>
                    )
                })}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
                {!orderItems || orderItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-8">
                        <ShoppingBag className="h-10 w-10 mb-4" />
                        <p>Loading items or no items found for this order...</p>
                    </div>
                ) : (
                    <>
                        <ul className="space-y-3">
                            {orderItems.map((item) => (
                            <li key={item.id} className="flex justify-between text-sm">
                                <span>{item.quantity} x {item.name}</span>
                                <span className="font-medium">R{(item.itemPrice * item.quantity).toFixed(2)}</span>
                            </li>
                            ))}
                        </ul>
                        <Separator className="my-4" />
                        <div className="flex justify-between font-bold text-lg">
                            <span>Total</span>
                            <span>R{order!.totalAmount.toFixed(2)}</span>
                        </div>
                    </>
                )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
