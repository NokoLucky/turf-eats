'use client'

import React from 'react';
import { notFound } from 'next/navigation';
import { orders, type OrderStatus } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, Bike, Pizza, Circle } from 'lucide-react';
import OrderTrackingMap from '@/components/order-tracking-map';

const statusSteps: { status: OrderStatus; icon: React.ReactNode; label: string }[] = [
    { status: 'Placed', icon: <Circle />, label: 'Order Placed' },
    { status: 'Preparing', icon: <Pizza />, label: 'Preparing' },
    { status: 'Out for Delivery', icon: <Bike />, label: 'Out for Delivery' },
    { status: 'Delivered', icon: <CheckCircle />, label: 'Delivered' },
];

export default function OrderDetailsPage({ params }: { params: { id: string } }) {
  const order = orders.find((o) => o.id === params.id);

  if (!order) {
    notFound();
  }

  const currentStatusIndex = statusSteps.findIndex(step => step.status === order.status);

  return (
    <div className="container py-12">
      <div className="mb-8">
        <h1 className="font-headline text-4xl font-bold">Order #{order.id}</h1>
        <p className="text-muted-foreground mt-2">
          From <span className="font-semibold text-primary">{order.restaurantName}</span> on {order.date}
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
                            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                {React.cloneElement(step.icon as React.ReactElement, { className: "h-5 w-5" })}
                            </div>
                            <span className={`font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
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
              <ul className="space-y-2">
                {order.items.map((item) => (
                  <li key={item.name} className="flex justify-between">
                    <span>{item.quantity} x {item.name}</span>
                  </li>
                ))}
              </ul>
              <Separator className="my-4" />
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>R{order.total.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
