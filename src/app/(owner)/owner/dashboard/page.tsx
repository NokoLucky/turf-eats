'use client';

import { useMemo } from 'react';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { format, formatDistanceToNow } from 'date-fns';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import type { Order, OrderItem } from '@/lib/data';
import Link from 'next/link';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DollarSign, ShoppingCart, Users, ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"

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

function StatCardSkeleton() {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-4 w-40 mt-1" />
            </CardContent>
        </Card>
    )
}

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
        <ul className="space-y-1 text-sm text-muted-foreground">
            {items.map((item) => (
                <li key={item.id}>
                    <span className="font-semibold">{item.quantity}x</span> {item.name}
                </li>
            ))}
        </ul>
    );
}

function RecentOrdersSkeleton() {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Order Details</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                        <TableCell>
                            <div className="space-y-2">
                                <Skeleton className="h-5 w-20" />
                                <Skeleton className="h-4 w-40" />
                            </div>
                        </TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-9 w-24 ml-auto" /></TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}

export default function OwnerDashboard() {
  const { user } = useUser();
  const firestore = useFirestore();

  const ordersQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, 'orders'), 
      where('participantUids', 'array-contains', user.uid)
    );
  }, [user, firestore]);

  const { data: orders, isLoading } = useCollection<Order>(ordersQuery);

  const stats = useMemo(() => {
    if (!orders) {
      return {
        totalRevenue: 0,
        totalOrders: 0,
        newCustomers: 0,
      };
    }

    const totalRevenue = orders
      .filter(order => order.status === 'Delivered')
      .reduce((sum, order) => sum + order.totalAmount, 0);

    const totalOrders = orders.length;

    const uniqueCustomerIds = new Set(orders.map(order => order.customerId));
    const newCustomers = uniqueCustomerIds.size;

    return {
      totalRevenue,
      totalOrders,
      newCustomers,
    };
  }, [orders]);

  const recentOrders = useMemo(() => {
      if (!orders) return [];
      // Sort on the client side
      return [...orders]
        .sort((a, b) => b.orderDate.toDate().getTime() - a.orderDate.toDate().getTime())
        .slice(0, 5);
  }, [orders]);

  const chartData = useMemo(() => {
    if (!orders) return [];
    
    const salesByDay = orders
        .filter(order => order.status === 'Delivered')
        .reduce((acc, order) => {
            const date = format(order.orderDate.toDate(), 'yyyy-MM-dd');
            if (!acc[date]) {
                acc[date] = 0;
            }
            acc[date] += order.totalAmount;
            return acc;
        }, {} as Record<string, number>);

    return Object.entries(salesByDay)
        .map(([date, revenue]) => ({ date: format(new Date(date), "MMM d"), revenue: Math.round(revenue) }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [orders]);

  const chartConfig = {
    revenue: {
      label: "Revenue",
      color: "hsl(var(--primary))",
    },
  } satisfies ChartConfig;


  return (
    <div className="container py-12">
      <div className="mb-8">
        <h1 className="font-headline text-4xl font-bold">Store Dashboard</h1>
        <p className="text-muted-foreground mt-2">An overview of your store's performance.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
       {isLoading ? (
            <>
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
            </>
       ) : (
        <>
            <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">R{stats.totalRevenue.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">From delivered orders</p>
            </CardContent>
            </Card>
            <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">+{stats.totalOrders}</div>
                <p className="text-xs text-muted-foreground">All-time orders received</p>
            </CardContent>
            </Card>
            <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unique Customers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">+{stats.newCustomers}</div>
                <p className="text-xs text-muted-foreground">Customers who have ordered</p>
            </CardContent>
            </Card>
        </>
       )}
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
          <CardDescription>A list of your 5 most recent incoming orders.</CardDescription>
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <RecentOrdersSkeleton />
            ) : !orders || orders.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                    <p>No orders found for your store yet.</p>
                </div>
            ) : (
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Order Details</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {recentOrders.map((order) => (
                        <TableRow key={order.id}>
                        <TableCell className="font-medium align-top">
                            <p className='font-semibold mb-2'>#{order.id.slice(0,6)}...</p>
                            <OrderItems orderId={order.id} />
                        </TableCell>
                        <TableCell className="align-top">{order.orderDate ? formatDistanceToNow(order.orderDate.toDate(), { addSuffix: true }) : 'N/A'}</TableCell>
                        <TableCell className="align-top">R{order.totalAmount.toFixed(2)}</TableCell>
                        <TableCell className="align-top">
                            <Badge variant={getStatusVariant(order.status)}>{order.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right align-top">
                            <Button asChild variant="outline" size="sm">
                            <Link href="/owner/orders">
                                Manage Orders <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                            </Button>
                        </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
            )}
        </CardContent>
      </Card>
       
       <Card className="mb-8">
        <CardHeader>
          <CardTitle>Revenue Over Time</CardTitle>
          <CardDescription>Total revenue from delivered orders per day.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-52 w-full" />
          ) : !chartData || chartData.length === 0 ? (
             <div className="text-center py-16 text-muted-foreground">
                <p>No revenue data available yet. Complete some orders!</p>
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
              <BarChart accessibilityLayer data={chartData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `R${value}`}
                  width={80}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dot" />}
                />
                <Bar
                  dataKey="revenue"
                  fill="var(--color-revenue)"
                  radius={4}
                />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
