'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, updateDoc } from 'firebase/firestore';
import type { Order, OrderItem } from '@/lib/data';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';

type EnrichedOrder = Order & { customerName?: string };

// New component to render order items
function OrderItems({ orderId }: { orderId: string }) {
    const firestore = useFirestore();
    const itemsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, `orders/${orderId}/orderItems`);
    }, [firestore, orderId]);

    const { data: items, isLoading } = useCollection<OrderItem>(itemsQuery);

    if (isLoading) {
        return (
            <div className="space-y-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
            </div>
        );
    }

    if (!items || items.length === 0) {
        return <p className="text-sm text-muted-foreground">No items found in this order.</p>;
    }

    return (
        <ul className="space-y-1 text-sm">
            {items.map((item) => (
                <li key={item.id}>
                    <span className="font-semibold">{item.quantity}x</span> {item.name}
                </li>
            ))}
        </ul>
    );
}


export default function OwnerOrdersPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  // Get orders for that store, filtering by storeOwnerId
  const ordersQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'orders'), where('storeOwnerId', '==', user.uid));
  }, [user, firestore]);
  const { data: orders, isLoading: areOrdersLoading } = useCollection<EnrichedOrder>(ordersQuery);

  const sortedOrders = useMemo(() => {
      if (!orders) return [];
      return [...orders].sort((a, b) => b.orderDate.toDate().getTime() - a.orderDate.toDate().getTime());
  }, [orders]);

  const handleUpdateStatus = async (orderId: string, newStatus: Order['status']) => {
    if (!firestore) return;
    const orderRef = doc(firestore, 'orders', orderId);
    await updateDoc(orderRef, { status: newStatus });
  };

  return (
    <div className="container py-12">
        <div className="mb-8">
            <h1 className="font-headline text-4xl font-bold">Incoming Orders</h1>
            <p className="text-muted-foreground mt-2">Manage and track all orders for your store.</p>
        </div>
        <Card>
            <CardHeader>
              <CardTitle>All Orders</CardTitle>
              <CardDescription>A list of all incoming orders, with the most recent at the top.</CardDescription>
            </CardHeader>
            <CardContent>
            <Table>
                <TableHeader>
                  <TableRow>
                      <TableHead className="w-[40%]">Order Details</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {areOrdersLoading && Array.from({length: 3}).map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-9 w-9 ml-auto" /></TableCell>
                    </TableRow>
                ))}
                {!areOrdersLoading && sortedOrders?.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium align-top">
                          <OrderItems orderId={order.id} />
                          {order.notes && (
                              <div className="mt-2 pt-2 border-t border-dashed">
                                  <p className="text-xs text-muted-foreground"><span className="font-semibold">Note:</span> {order.notes}</p>
                              </div>
                          )}
                      </TableCell>
                      <TableCell className="align-top">{order.orderDate ? format(order.orderDate.toDate(), 'PPP') : 'N/A'}</TableCell>
                      <TableCell className="align-top">R{order.totalAmount.toFixed(2)}</TableCell>
                      <TableCell className="align-top">
                          <Badge variant={order.status === 'Placed' ? 'destructive' : 'outline'}>{order.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right align-top">
                       <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onSelect={() => handleUpdateStatus(order.id, 'Preparing')}>
                               Mark as Preparing
                            </DropdownMenuItem>
                             <DropdownMenuItem onSelect={() => handleUpdateStatus(order.id, 'Out for Delivery')}>
                               Mark as Out for Delivery
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleUpdateStatus(order.id, 'Delivered')}>
                               Mark as Delivered
                            </DropdownMenuItem>
                             <DropdownMenuItem onSelect={() => handleUpdateStatus(order.id, 'Cancelled')} className="text-destructive focus:text-destructive">
                               Cancel Order
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
            {!areOrdersLoading && (!orders || orders.length === 0) && (
              <div className='text-center py-16 text-muted-foreground'>
                <p>No orders found for your store yet.</p>
              </div>
            )}
            </CardContent>
        </Card>
    </div>
  );
}
