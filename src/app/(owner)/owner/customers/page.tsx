
'use client';

import { useMemo } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import type { Order } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, ShoppingBag, DollarSign } from 'lucide-react';

export default function OwnerCustomersPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const ordersQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'orders'), where('participantUids', 'array-contains', user.uid));
  }, [user, firestore]);
  const { data: orders, isLoading } = useCollection<Order>(ordersQuery);

  const customerStats = useMemo(() => {
    if (!orders) return [];
    
    const customersMap = new Map<string, { name: string; email: string; orderCount: number; totalSpent: number }>();
    
    orders.forEach(order => {
      const id = order.customerId;
      const current = customersMap.get(id) || { name: order.customerName || 'Guest', email: '', orderCount: 0, totalSpent: 0 };
      
      customersMap.set(id, {
        ...current,
        orderCount: current.orderCount + 1,
        totalSpent: current.totalSpent + (order.itemsTotal || 0)
      });
    });

    return Array.from(customersMap.values()).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [orders]);

  return (
    <div className="container py-12 px-4 sm:px-8">
      <div className="mb-10">
        <h1 className="font-headline text-4xl font-bold">Your Customers</h1>
        <p className="text-muted-foreground mt-2">Insights into your store's most loyal patrons.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
         <Card className="border-none shadow-premium rounded-[2rem]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase">Unique Customers</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{customerStats.length}</div>
            </CardContent>
         </Card>
      </div>

      <Card className="border-none shadow-premium rounded-[2.5rem] overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="pl-8">Customer Name</TableHead>
                <TableHead>Total Orders</TableHead>
                <TableHead>Life-time Value</TableHead>
                <TableHead className="text-right pr-8">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="pl-8 py-6"><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell className="text-right pr-8"><Skeleton className="h-6 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : customerStats.map((customer, idx) => (
                <TableRow key={idx} className="hover:bg-muted/20 transition-colors">
                  <TableCell className="pl-8 py-6 font-bold">{customer.name}</TableCell>
                  <TableCell>
                     <div className="flex items-center gap-1.5">
                        <ShoppingBag className="h-3 w-3 text-muted-foreground" />
                        {customer.orderCount} orders
                     </div>
                  </TableCell>
                  <TableCell className="font-black text-primary">R{customer.totalSpent.toFixed(2)}</TableCell>
                  <TableCell className="text-right pr-8">
                     <Badge variant="secondary" className="rounded-lg text-[9px] font-black tracking-widest uppercase">
                        {customer.orderCount > 3 ? 'LOYAL' : 'RECURRING'}
                     </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!isLoading && customerStats.length === 0 && (
            <div className="p-20 text-center text-muted-foreground italic">No customer data available.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
