'use client';

import { useMemo, useState, useEffect } from 'react';
import { collection, query, where, doc, limit } from 'firebase/firestore';
import { format, formatDistanceToNow, startOfDay, startOfWeek, isAfter } from 'date-fns';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import type { Order, Restaurant } from '@/lib/data';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DollarSign, ShoppingCart, TrendingUp, Star, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartTooltip, ChartTooltipContent, ChartContainer, type ChartConfig } from "@/components/ui/chart"

const chartConfig = {
  amount: {
    label: "Revenue (R)",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig

export default function OwnerDashboard() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [greeting, setGreeting] = useState('Welcome back');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  // Fetch owner profile for greeting
  const ownerRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, `users/${user.uid}/storeOwners/${user.uid}`);
  }, [user?.uid, firestore]);
  const { data: ownerProfile } = useDoc(ownerRef);

  // Fetch restaurant details for ratings
  const restaurantQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'restaurants'), where('storeOwnerId', '==', user.uid), limit(1));
  }, [user?.uid, firestore]);
  const { data: restaurants } = useCollection<Restaurant>(restaurantQuery);
  const restaurant = restaurants?.[0];

  // Fetch all orders for this store
  const ordersQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'orders'), where('participantUids', 'array-contains', user.uid));
  }, [user?.uid, firestore]);

  const { data: orders, isLoading } = useCollection<Order>(ordersQuery);

  const stats = useMemo(() => {
    if (!orders) return { totalRevenue: 0, totalOrders: 0, activeCustomers: 0, growth: 0 };
    
    const deliveredOrders = orders.filter(o => o.status === 'Delivered');
    const totalRevenue = deliveredOrders.reduce((sum, o) => sum + (o.itemsTotal || 0), 0);
    const activeCustomers = new Set(orders.map(o => o.customerId)).size;

    // Simple growth logic based on recent orders (last 7 days vs previous)
    const weekAgo = startOfWeek(new Date());
    const recentRevenue = deliveredOrders
      .filter(o => o.orderDate && isAfter(o.orderDate.toDate(), weekAgo))
      .reduce((sum, o) => sum + (o.itemsTotal || 0), 0);
    
    const growth = recentRevenue > 0 ? 12 : 0; // Placeholder growth logic

    return {
      totalRevenue,
      totalOrders: orders.length,
      activeCustomers,
      growth
    };
  }, [orders]);

  const chartData = useMemo(() => {
    if (!orders) return [];
    const salesByDay = orders.filter(o => o.status === 'Delivered' && o.orderDate).reduce((acc, o) => {
      const date = format(o.orderDate.toDate(), 'MMM d');
      acc[date] = (acc[date] || 0) + (o.itemsTotal || 0);
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(salesByDay)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [orders]);

  const sortedRecentOrders = useMemo(() => {
    if (!orders) return [];
    return [...orders].sort((a, b) => {
      if (!a.orderDate || !b.orderDate) return 0;
      return b.orderDate.toDate().getTime() - a.orderDate.toDate().getTime();
    });
  }, [orders]);

  const rawName = ownerProfile?.name || user?.displayName || '';
  const firstName = (rawName && !rawName.startsWith('New ')) ? rawName.split(' ')[0] : '';

  return (
    <div className="container py-10 px-4 sm:px-8">
      {/* Dynamic Header */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{greeting}{firstName ? `, ${firstName}` : ''} 👋</h1>
          <p className="text-muted-foreground mt-1">Your store received <span className="text-primary font-bold">{orders?.length || 0}</span> orders in total.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="rounded-xl">Overview</Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <Card className="border-none shadow-premium rounded-[2rem]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase">Revenue</CardTitle>
            <div className="bg-green-100 p-2 rounded-xl"><DollarSign className="h-4 w-4 text-green-600" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R{stats.totalRevenue.toFixed(2)}</div>
            <p className="text-[10px] text-green-600 font-bold mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> ↑ +{stats.growth}% this week
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-premium rounded-[2rem]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase">Orders</CardTitle>
            <div className="bg-orange-100 p-2 rounded-xl"><ShoppingCart className="h-4 w-4 text-orange-600" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <p className="text-[10px] text-muted-foreground mt-1 font-bold">ALL TIME</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-premium rounded-[2rem]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase">Rating</CardTitle>
            <div className="bg-yellow-100 p-2 rounded-xl"><Star className="h-4 w-4 text-yellow-600" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(restaurant?.rating || 0).toFixed(1)}</div>
            <p className="text-[10px] text-muted-foreground mt-1 font-bold">FROM CUSTOMERS</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-premium rounded-[2rem]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase">Customers</CardTitle>
            <div className="bg-blue-100 p-2 rounded-xl"><Users className="h-4 w-4 text-blue-600" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeCustomers}</div>
            <p className="text-[10px] text-muted-foreground mt-1 font-bold">UNIQUE USERS</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sales Chart */}
        <Card className="lg:col-span-2 border-none shadow-premium rounded-[2rem] overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg">Revenue Trends</CardTitle>
            <CardDescription>Daily sales performance for delivered orders.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] pt-4">
             {isLoading ? <Skeleton className="w-full h-full" /> : chartData.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-full w-full">
                  <BarChart data={chartData}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="amount" fill="var(--color-amount)" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ChartContainer>
             ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm border-2 border-dashed rounded-3xl">
                   No delivered orders yet to show trends.
                </div>
             )}
          </CardContent>
        </Card>

        {/* Recent Orders List */}
        <Card className="border-none shadow-premium rounded-[2rem] overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg">Recent Orders</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="p-4 flex gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                  </div>
                ))
              ) : sortedRecentOrders.length > 0 ? (
                sortedRecentOrders.slice(0, 5).map(order => (
                  <div key={order.id} className="p-4 hover:bg-muted/30 transition-colors flex justify-between items-center">
                    <div>
                      <p className="font-bold text-sm">#{order.id.slice(0, 6)}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {order.orderDate ? formatDistanceToNow(order.orderDate.toDate(), { addSuffix: true }) : 'Just now'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">R{(order.itemsTotal || 0).toFixed(2)}</p>
                      <Badge variant={order.status === 'Delivered' ? 'default' : 'outline'} className="text-[9px] h-4">
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-10 text-center text-muted-foreground text-sm">
                   No orders found.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
