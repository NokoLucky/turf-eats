'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Hand, MapPin, PackageCheck, PackageOpen } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, query, where, updateDoc } from 'firebase/firestore';
import type { Order } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useMemo } from 'react';

function DeliveryTableSkeleton() {
  return (
     <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order ID</TableHead>
          <TableHead>Destination</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 2 }).map((_, i) => (
          <TableRow key={i}>
            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
            <TableCell><Skeleton className="h-5 w-48" /></TableCell>
            <TableCell className="text-right"><Skeleton className="h-9 w-28 ml-auto" /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export default function DriverDashboard() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  // Query for orders that are ready for pickup
  const availableOrdersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'orders'),
      where('status', '==', 'Preparing'),
      where('driverId', '==', null)
    );
  }, [firestore]);

  // Query for orders assigned to the current driver
  const myDeliveriesQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, 'orders'),
      where('driverId', '==', user.uid),
      where('status', '==', 'Out for Delivery')
    );
  }, [user, firestore]);

  const { data: availableOrders, isLoading: isLoadingAvailable } = useCollection<Order>(availableOrdersQuery);
  const { data: myDeliveries, isLoading: isLoadingMine } = useCollection<Order>(myDeliveriesQuery);

  const handleAcceptOrder = async (orderId: string) => {
    if (!user || !firestore) return;

    const orderRef = doc(firestore, 'orders', orderId);
    try {
      await updateDoc(orderRef, {
        driverId: user.uid,
        status: 'Out for Delivery',
      });
      toast({
        title: 'Order Accepted!',
        description: 'The delivery has been added to your active deliveries.',
      });
    } catch (error: any) {
      console.error('Error accepting order:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Could not accept the order.',
      });
    }
  };

  const handleMarkDelivered = async (orderId: string) => {
    if (!firestore) return;
     const orderRef = doc(firestore, 'orders', orderId);
    try {
      await updateDoc(orderRef, {
        status: 'Delivered',
      });
      toast({
        title: 'Delivery Complete!',
        description: 'Great job! The order has been marked as delivered.',
      });
    } catch (error: any) {
      console.error('Error completing delivery:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Could not update the order status.',
      });
    }
  };

  return (
    <div className="container py-12">
      <div className="mb-8">
        <h1 className="font-headline text-4xl font-bold">Delivery Dashboard</h1>
        <p className="text-muted-foreground mt-2">Find and manage your delivery tasks.</p>
      </div>
      
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'><PackageOpen className="text-primary"/>Available for Pickup</CardTitle>
            <CardDescription>Orders that are ready to be collected from restaurants.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingAvailable ? (
              <DeliveryTableSkeleton />
            ) : availableOrders && availableOrders.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availableOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">#{order.id.slice(0, 6)}...</TableCell>
                      <TableCell className="truncate max-w-xs">{order.deliveryAddress}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => handleAcceptOrder(order.id)}>
                          <Hand className="mr-2 h-4 w-4" />
                          Accept
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
                <div className="text-center text-muted-foreground py-12">
                    <p>No available deliveries right now. Check back soon!</p>
                </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'><MapPin className="text-primary"/>My Active Deliveries</CardTitle>
            <CardDescription>Orders you have accepted and are currently delivering.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingMine ? (
               <DeliveryTableSkeleton />
            ) : myDeliveries && myDeliveries.length > 0 ? (
               <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myDeliveries.map((delivery) => (
                    <TableRow key={delivery.id}>
                      <TableCell className="font-medium">#{delivery.id.slice(0, 6)}...</TableCell>
                      <TableCell className="truncate max-w-xs">{delivery.deliveryAddress}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="default" size="sm" onClick={() => handleMarkDelivered(delivery.id)}>
                          <PackageCheck className="mr-2 h-4 w-4" />
                          Delivered
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
                <div className="text-center text-muted-foreground py-12">
                    <p>You have no active deliveries.</p>
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
