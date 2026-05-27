
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
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
        return <p className="text-sm text-muted-foreground">No items found.</p>;
    }

    return (
        <ul className="space-y-4">
            {items.map((item) => (
                <li key={item.id} className="flex flex-col gap-1 bg-white p-3 rounded-xl border shadow-sm">
                    <div className="flex items-center gap-2">
                        <span className="font-black text-primary bg-primary/5 px-2 py-0.5 rounded text-xs">{item.quantity}x</span>
                        <span className="font-bold text-sm text-slate-800">{item.name}</span>
                    </div>
                    {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {Object.entries(item.selectedOptions).map(([group, choices]) => (
                           choices.map(choice => (
                             <Badge key={`${group}-${choice}`} variant="secondary" className="text-[9px] h-4 font-bold bg-slate-100 text-slate-600">
                               {group}: {choice}
                             </Badge>
                           ))
                        ))}
                      </div>
                    )}
                </li>
            ))}
        </ul>
    );
}


export default function OwnerOrdersPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const ordersQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'orders'), where('participantUids', 'array-contains', user.uid));
  }, [user, firestore]);
  const { data: orders, isLoading: areOrdersLoading } = useCollection<EnrichedOrder>(ordersQuery);

  const sortedOrders = useMemo(() => {
      if (!orders) return [];
      return [...orders].sort((a, b) => b.orderDate.toDate().getTime() - a.orderDate.toDate().getTime());
  }, [orders]);

  const handleUpdateStatus = async (orderId: string, newStatus: Order['status']) => {
    if (!firestore) return;
    const orderRef = doc(firestore, 'orders', orderId);
    
    const updateData: any = { status: newStatus };
    
    if (newStatus === 'Preparing') updateData.preparingAt = serverTimestamp();
    if (newStatus === 'Out for Delivery') updateData.pickedUpAt = serverTimestamp();
    if (newStatus === 'Delivered') updateData.deliveredAt = serverTimestamp();
    if (newStatus === 'Cancelled') updateData.cancelledAt = serverTimestamp();

    await updateDoc(orderRef, updateData);
  };

  return (
    <div className="container py-12 px-4 sm:px-8">
        <div className="mb-8">
            <h1 className="font-headline text-4xl font-bold">Incoming Orders</h1>
            <p className="text-muted-foreground mt-2">Manage and track all orders for your store.</p>
        </div>
        <Card className="border-none shadow-premium rounded-[2.5rem] overflow-hidden">
            <CardHeader className="bg-white border-b px-8 py-6">
              <CardTitle className="text-lg">Store Order History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
            <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                      <TableHead className="w-[45%] pl-8">Preparation List</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right pr-8">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {areOrdersLoading && Array.from({length: 3}).map((_, i) => (
                    <TableRow key={i}>
                        <TableCell className="pl-8 py-8"><Skeleton className="h-20 w-full rounded-2xl" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                        <TableCell className="text-right pr-8"><Skeleton className="h-9 w-9 ml-auto rounded-full" /></TableCell>
                    </TableRow>
                ))}
                {!areOrdersLoading && sortedOrders?.map((order) => (
                    <TableRow key={order.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="align-top pl-8 py-6">
                          <OrderItems orderId={order.id} />
                          {order.notes && (
                              <div className="mt-4 p-3 bg-orange-50/50 rounded-2xl border border-orange-100">
                                  <p className="text-[10px] text-orange-600 uppercase font-black tracking-widest mb-1">Customer Request</p>
                                  <p className="text-xs italic text-slate-700">"{order.notes}"</p>
                              </div>
                          )}
                      </TableCell>
                      <TableCell className="align-top py-6 font-medium text-slate-600">
                        {order.orderDate ? format(order.orderDate.toDate(), 'MMM d, p') : 'N/A'}
                      </TableCell>
                      <TableCell className="align-top py-6">
                         <div className="flex flex-col">
                            <span className="font-bold text-sm">{order.customerName || 'Guest'}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">#{order.id.slice(0, 6)}</span>
                         </div>
                      </TableCell>
                      <TableCell className="align-top py-6">
                          <Badge variant={order.status === 'Placed' ? 'destructive' : 'outline'} className="rounded-lg font-bold text-[10px] tracking-wide">
                            {order.status}
                          </Badge>
                      </TableCell>
                      <TableCell className="text-right align-top pr-8 py-6">
                       <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 hover:bg-white hover:shadow-sm">
                              <MoreHorizontal className="h-5 w-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-2xl border-none shadow-2xl p-2 min-w-[180px]">
                            <DropdownMenuItem onSelect={() => handleUpdateStatus(order.id, 'Preparing')} className="rounded-xl py-3 font-bold cursor-pointer">
                               Mark as Preparing
                            </DropdownMenuItem>
                             <DropdownMenuItem onSelect={() => handleUpdateStatus(order.id, 'Out for Delivery')} className="rounded-xl py-3 font-bold cursor-pointer">
                               Mark as Out for Delivery
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleUpdateStatus(order.id, 'Delivered')} className="rounded-xl py-3 font-bold cursor-pointer">
                               Mark as Delivered
                            </DropdownMenuItem>
                             <DropdownMenuItem onSelect={() => handleUpdateStatus(order.id, 'Cancelled')} className="text-destructive focus:text-destructive focus:bg-destructive/10 rounded-xl py-3 font-bold cursor-pointer">
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
              <div className='text-center py-24 text-muted-foreground bg-slate-50/20'>
                <p className="font-bold text-lg">No incoming orders yet.</p>
                <p className="text-sm">When customers order, they will appear here in real-time.</p>
              </div>
            )}
            </CardContent>
        </Card>
    </div>
  );
}
