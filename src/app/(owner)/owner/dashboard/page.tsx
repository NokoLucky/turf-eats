'use client';

import { useMemo } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { format, formatDistanceToNow } from 'date-fns';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import type { Order, OrderItem } from '@/lib/data';
import Link from 'next/link';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DollarSign, ShoppingCart, Users, ArrowRight, TrendingUp, Clock, Star } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"

export default function OwnerDashboard() {
  const { user } = useUser();
  const firestore = useFirestore();

  const ordersQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'orders'), where('participantUids', 'array-contains', user.uid));
  }, [user, firestore]);

  const { data: orders, isLoading } = useCollection<Order>(ordersQuery);

  const stats = useMemo(() => {
    if (!orders) return { totalRevenue: 0, totalOrders: 0, newCustomers: 0, growth: 12 };
    const totalRevenue = orders.filter(o => o.status === 'Delivered').reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    return {
      totalRevenue,
      totalOrders: orders.length,
      newCustomers: new Set(orders.map(o => o.customerId)).size,
      growth: 12
    };
  }, [orders]);

  const chartData = useMemo(() => {
    if (!orders) return [];
    const salesByDay = orders.filter(o => o.status === 'Delivered').reduce((acc, o) => {
      const date = format(o.orderDate.toDate(), 'MMM d');
      acc[date] = (acc[date] || 0) + o.totalAmount;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(salesByDay).map(([date, amount]) => ({ date, amount }));
  }, [orders]);

  return (
    <div className="container py-10 px-4 sm:px-8">
      {/* Dynamic Header */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {user?.displayName || 'Store Owner'} 🍤</h1>
          <p className="text-muted-foreground mt-1">Your store received <span className="text-primary font-bold">{orders?.length || 0}</span> new orders today.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="rounded-xl">Today</Button>
          <Button size="sm" variant="outline" className="rounded-xl">This Week</Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <Card className="border-none shadow-premium rounded-[2rem]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold text-muted-foreground">Total Revenue</CardTitle>
            <div className="bg-green-100 p-2 rounded-xl"><DollarSign className="h-4 w-4 text-green-600" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">R{stats.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-green-600 font-bold mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> ↑ +{stats.growth}% this week
            </p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-premium rounded-[2rem]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold text-muted-foreground">Total Orders</CardTitle>
            <div className="bg-orange-100 p-2 rounded-xl"><ShoppingCart className="h-4 w-4 text-orange-600" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalOrders}</div>
            <p className="text-xs text-muted-foreground mt-1">Processed successfully</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-premium rounded-[2rem]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold text-muted-foreground">Rating</CardTitle>
            <div className="bg-yellow-100 p-2 rounded-xl"><Star className="h-4 w-4 text-yellow-600" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">4.8</div>
            <p className="text-xs text-muted-foreground mt-1">Based on latest reviews</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sales Chart */}
        <Card className="lg:col-span-2 border-none shadow-premium rounded-[2rem] overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg">Revenue Overview</CardTitle>
            <CardDescription>Visualizing your growth over the last week.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] pt-4">
             {isLoading ? <Skeleton className="w-full h-full" /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
             )}
          </CardContent>
        </Card>

        {/* Recent Orders List */}
        <Card className="border-none shadow-premium rounded-[2rem] overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {orders?.slice(0, 5).map(order => (
                <div key={order.id} className="p-4 hover:bg-muted/30 transition-colors flex justify-between items-center">
                  <div>
                    <p className="font-bold text-sm">#{order.id.slice(0, 6)}</p>
                    <p className="text-[10px] text-muted-foreground">{formatDistanceToNow(order.orderDate.toDate(), { addSuffix: true })}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">R{order.totalAmount.toFixed(2)}</p>
                    <Badge variant="outline" className="text-[9px] h-4">{order.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}