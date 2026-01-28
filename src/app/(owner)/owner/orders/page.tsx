'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, limit, doc, updateDoc } from 'firebase/firestore';
import type { Order, Restaurant } from '@/lib/data';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, NotebookText } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type EnrichedOrder = Order & { customerName?: string };

export default function OwnerOrdersPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  // Get orders for that store, filtering by storeOwnerId
  const ordersQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'orders'), where('storeOwnerId', '==', user.uid));
  }, [user, firestore]);
  const { data: orders, isLoading: areOrdersLoading } = useCollection<EnrichedOrder>(ordersQuery);

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
              <CardDescription>A list of all incoming orders.</CardDescription>
            </CardHeader>
            <CardContent>
            <Table>
                <TableHeader>
                  <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {areOrdersLoading && Array.from({length: 3}).map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-9 w-9 ml-auto" /></TableCell>
                    </TableRow>
                ))}
                {!areOrdersLoading && orders?.map((order) => (
                    <TableRow key={order.id}>
                    <TableCell>
                        <div className="font-medium">#{order.id.slice(0, 6)}...</div>
                        {order.notes && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1 cursor-help">
                                            <NotebookText className="h-3 w-3" />
                                            <p className="truncate max-w-[150px]">{order.notes}</p>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="max-w-xs">{order.notes}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                    </TableCell>
                    <TableCell>{order.orderDate ? format(order.orderDate.toDate(), 'PPP') : 'N/A'}</TableCell>
                    <TableCell>R{order.totalAmount.toFixed(2)}</TableCell>
                    <TableCell>
                        <Badge variant={order.status === 'Placed' ? 'destructive' : 'outline'}>{order.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
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
