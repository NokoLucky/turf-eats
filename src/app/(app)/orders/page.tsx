'use client';

import Link from 'next/link';
import { collection, query, orderBy } from 'firebase/firestore';
import { format } from 'date-fns';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import type { Order } from '@/lib/data';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, ShoppingBag } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const getStatusVariant = (status: Order['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch(status) {
        case 'Delivered':
            return 'default';
        case 'Out for Delivery':
            return 'secondary';
        case 'Cancelled':
            return 'destructive';
        default:
            return 'outline';
    }
}

export default function OrdersPage() {
    const { user } = useUser();
    const firestore = useFirestore();

    const ordersQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        // Query the sub-collection under the user's document
        return query(
            collection(firestore, `users/${user.uid}/orders`),
            orderBy('orderDate', 'desc')
        );
    }, [user, firestore]);

    const { data: orders, isLoading } = useCollection<Order>(ordersQuery);

  return (
    <div className="container py-12 px-4 sm:px-8">
      <div className="mb-8">
        <h1 className="font-headline text-4xl font-bold">My Orders</h1>
        <p className="text-muted-foreground mt-2">View your order history and track current orders.</p>
      </div>
      
      {isLoading && (
        <Card className="hidden sm:block">
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
                    {Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                            <TableCell><Skeleton className="h-6 w-28" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Card>
      )}

      {!isLoading && orders && orders.length > 0 && (
        <>
            <Card className="hidden sm:block">
                <CardContent className="p-0">
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
                    {orders.map((order) => (
                        <TableRow key={order.id}>
                        <TableCell className="font-medium">#{order.id.slice(0, 6)}...</TableCell>
                        <TableCell>{order.orderDate ? format(order.orderDate.toDate(), 'PPP') : 'N/A'}</TableCell>
                        <TableCell>R{order.totalAmount.toFixed(2)}</TableCell>
                        <TableCell>
                            <Badge variant={getStatusVariant(order.status)}>{order.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                            <Button asChild variant="ghost" size="sm">
                            <Link href={`/orders/${order.id}`}>
                                View Details <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                            </Button>
                        </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
                </CardContent>
            </Card>
            <div className="sm:hidden space-y-4">
                {orders.map((order) => (
                <Card key={order.id}>
                    <CardHeader>
                    <CardTitle className='text-lg'>Order #{order.id.slice(0,6)}</CardTitle>
                    <CardDescription>{order.orderDate ? format(order.orderDate.toDate(), 'PPP') : 'N/A'}</CardDescription>
                    </CardHeader>
                    <CardContent className='flex items-center justify-between'>
                        <div>
                            <p className='text-lg font-bold'>R{order.totalAmount.toFixed(2)}</p>
                            <Badge variant={getStatusVariant(order.status)} className='mt-1'>{order.status}</Badge>
                        </div>
                        <Button asChild variant="default" size="sm">
                            <Link href={`/orders/${order.id}`}>
                                View
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
                ))}
            </div>
        </>
      )}

      {!isLoading && (!orders || orders.length === 0) && (
        <Card className="text-center py-20">
            <CardHeader>
                <ShoppingBag className="mx-auto h-16 w-16 text-muted-foreground" />
                <CardTitle className="mt-4 text-2xl font-bold">No Orders Yet</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">You haven't placed any orders yet. Let's change that!</p>
                <Button asChild className="mt-6">
                    <Link href="/dashboard">Start Shopping</Link>
                </Button>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
