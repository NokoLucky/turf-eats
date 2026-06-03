'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import type { Order, OrderItem, Driver, Restaurant } from '@/lib/data';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  MoreHorizontal, Eye, Clock, 
  MapPin, Phone, User, 
  Bike, Package, Trash2, 
  ChevronRight, ArrowRight,
  Info, ClipboardList
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import OrderTrackingMap from '@/components/order-tracking-map';
import Image from 'next/image';
import { cn } from '@/lib/utils';

type EnrichedOrder = Order & { customerName?: string };

function OrderItemsList({ orderId }: { orderId: string }) {
    const firestore = useFirestore();
    const itemsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, `orders/${orderId}/orderItems`);
    }, [firestore, orderId]);

    const { data: items, isLoading } = useCollection<OrderItem>(itemsQuery);

    if (isLoading) return <Skeleton className="h-20 w-full rounded-xl" />;

    return (
        <ul className="space-y-3">
            {items?.map((item) => (
                <li key={item.id} className="bg-background/50 p-3 rounded-xl border shadow-sm group">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="font-black text-primary bg-primary/10 px-2 py-0.5 rounded text-xs">{item.quantity}x</span>
                            <span className="font-bold text-sm">{item.name}</span>
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">ID: {item.menuItemId.slice(0,6)}</span>
                    </div>
                    {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {Object.entries(item.selectedOptions).map(([group, choices]) => (
                           choices.map(choice => (
                             <Badge key={`${group}-${choice}`} variant="secondary" className="text-[9px] h-4 font-bold bg-muted text-muted-foreground border-none">
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

function OrderDetailsDialog({ 
  order, 
  isOpen, 
  onClose,
  onStatusUpdate
}: { 
  order: EnrichedOrder | null, 
  isOpen: boolean, 
  onClose: () => void,
  onStatusUpdate: (id: string, status: Order['status'], extra?: any) => void
}) {
  const firestore = useFirestore();
  const [prepTime, setPrepTime] = useState('20');
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);

  // Fetch driver info if assigned
  const driverRef = useMemoFirebase(() => {
    if (!firestore || !order?.driverId) return null;
    return doc(firestore, `users/${order.driverId}/drivers/${order.driverId}`);
  }, [firestore, order?.driverId]);
  const { data: driverInfo } = useDoc<Driver>(driverRef);

  // Fetch restaurant for map context
  useMemo(async () => {
    if (!firestore || !order?.restaurantId) return;
    const snap = await getDoc(doc(firestore, 'restaurants', order.restaurantId));
    if (snap.exists()) setRestaurant({ id: snap.id, ...snap.data() } as Restaurant);
  }, [firestore, order?.restaurantId]);

  if (!order) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 rounded-[2.5rem] border-none shadow-2xl bg-background">
        <div className="bg-primary p-6 text-white shrink-0">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
               <Badge className="bg-white/20 text-white border-none text-[10px] font-bold">ORDER #{order.id.slice(0, 8)}</Badge>
               <Badge variant="outline" className="text-white border-white/30 text-[10px] font-bold uppercase">{order.status}</Badge>
            </div>
            <DialogTitle className="text-2xl font-bold">Manage Order Details</DialogTitle>
            <DialogDescription className="text-white/70">Review preparation items and logistics status.</DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
           <div className="space-y-6">
              <section>
                 <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-4">Items to Prepare</h3>
                 <OrderItemsList orderId={order.id} />
              </section>

              {order.notes && (
                <section className="bg-orange-50 dark:bg-orange-950/20 p-4 rounded-2xl border border-orange-100 dark:border-orange-900/30">
                   <div className="flex items-center gap-2 mb-1">
                      <Info className="h-4 w-4 text-primary" />
                      <h4 className="text-[10px] font-black uppercase text-primary">Customer Request</h4>
                   </div>
                   <p className="text-sm italic text-foreground/80">"{order.notes}"</p>
                </section>
              )}

              <section className="space-y-4 pt-4 border-t">
                 <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-2">Customer Info</h3>
                 <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                       <User className="h-6 w-6" />
                    </div>
                    <div>
                       <p className="font-bold">{order.customerName}</p>
                       <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> {order.deliveryAddress}</p>
                    </div>
                 </div>
              </section>
           </div>

           <div className="space-y-6">
              <section className="bg-card border rounded-3xl overflow-hidden shadow-sm">
                 <div className="bg-muted/30 p-4 border-b">
                    <h3 className="text-xs font-bold uppercase tracking-wide flex items-center gap-2">
                       <Bike className="h-4 w-4 text-primary" /> 
                       Logistics & Tracking
                    </h3>
                 </div>
                 <div className="aspect-video w-full relative">
                    <OrderTrackingMap order={order} restaurant={restaurant} />
                 </div>
                 {driverInfo ? (
                   <div className="p-4 flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl overflow-hidden bg-muted border">
                         <img src={driverInfo.photoUrl || `https://picsum.photos/seed/${driverInfo.id}/100/100`} className="object-cover w-full h-full" alt="driver" />
                      </div>
                      <div className="flex-1">
                         <p className="text-xs font-bold">{driverInfo.name}</p>
                         <p className="text-[10px] text-muted-foreground uppercase">{driverInfo.vehicleType} • {driverInfo.vehicleRegistration}</p>
                      </div>
                      <Button asChild size="sm" variant="outline" className="rounded-xl">
                        <a href={`tel:${driverInfo.phoneNumber}`}><Phone className="h-3.5 w-3.5" /></a>
                      </Button>
                   </div>
                 ) : (
                   <div className="p-6 text-center text-muted-foreground italic text-xs">
                      Driver assignment pending...
                   </div>
                 )}
              </section>

              {order.status === 'Placed' && (
                <section className="space-y-4 bg-muted/30 p-6 rounded-3xl border">
                   <h3 className="text-sm font-black text-center">Set Prep Time</h3>
                   <div className="flex items-center gap-3">
                      <div className="flex-1">
                         <Label htmlFor="prep" className="sr-only">Minutes</Label>
                         <div className="relative">
                            <Input 
                                id="prep" 
                                type="number" 
                                value={prepTime} 
                                onChange={(e) => setPrepTime(e.target.value)} 
                                className="pl-4 pr-12 h-12 rounded-xl text-lg font-bold"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">MINS</span>
                         </div>
                      </div>
                      <Button 
                        onClick={() => onStatusUpdate(order.id, 'Preparing', { estimatedPrepTime: parseInt(prepTime) })}
                        className="h-12 rounded-xl px-8 font-bold shadow-lg shadow-primary/20"
                      >
                         Accept Order
                      </Button>
                   </div>
                </section>
              )}

              <div className="space-y-2 pt-4">
                 {order.status === 'Preparing' && (
                   <Button onClick={() => onStatusUpdate(order.id, 'Out for Delivery')} className="w-full h-12 rounded-xl font-bold">Ready for Pickup</Button>
                 )}
                 {order.status === 'Out for Delivery' && (
                   <Button onClick={() => onStatusUpdate(order.id, 'Delivered')} variant="outline" className="w-full h-12 rounded-xl font-bold border-green-200 text-green-600 hover:bg-green-50">Confirm Delivery</Button>
                 )}
                 {order.status !== 'Delivered' && order.status !== 'Cancelled' && (
                    <Button onClick={() => onStatusUpdate(order.id, 'Cancelled')} variant="ghost" className="w-full text-destructive font-bold h-12 rounded-xl">Cancel Order</Button>
                 )}
              </div>
           </div>
        </div>
        
        <DialogFooter className="p-4 border-t bg-muted/30">
           <Button variant="outline" onClick={onClose} className="rounded-xl px-8">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function OwnerOrdersPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const [selectedOrder, setSelectedOrder] = useState<EnrichedOrder | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const ordersQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'orders'), where('participantUids', 'array-contains', user.uid));
  }, [user, firestore]);
  const { data: orders, isLoading: areOrdersLoading } = useCollection<EnrichedOrder>(ordersQuery);

  const sortedOrders = useMemo(() => {
      if (!orders) return [];
      return [...orders].sort((a, b) => b.orderDate.toDate().getTime() - a.orderDate.toDate().getTime());
  }, [orders]);

  const handleUpdateStatus = async (orderId: string, newStatus: Order['status'], extra?: any) => {
    if (!firestore) return;
    const orderRef = doc(firestore, 'orders', orderId);
    
    const updateData: any = { status: newStatus, ...extra };
    
    if (newStatus === 'Preparing') updateData.preparingAt = serverTimestamp();
    if (newStatus === 'Out for Delivery') updateData.pickedUpAt = serverTimestamp();
    if (newStatus === 'Delivered') updateData.deliveredAt = serverTimestamp();
    if (newStatus === 'Cancelled') updateData.cancelledAt = serverTimestamp();

    await updateDoc(orderRef, updateData);
    setIsDetailsOpen(false);
  };

  const openDetails = (order: EnrichedOrder) => {
    setSelectedOrder(order);
    setIsDetailsOpen(true);
  };

  return (
    <div className="container py-12 px-4 sm:px-8">
        <OrderDetailsDialog 
          order={selectedOrder} 
          isOpen={isDetailsOpen} 
          onClose={() => setIsDetailsOpen(false)} 
          onStatusUpdate={handleUpdateStatus}
        />

        <div className="mb-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-headline text-4xl font-bold">Incoming Orders</h1>
              <p className="text-muted-foreground mt-2">Live dashboard for your store's logistics.</p>
            </div>
            <div className="flex gap-2">
               <Badge className="bg-primary/10 text-primary border-none rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest">
                  {orders?.filter(o => o.status === 'Placed').length || 0} NEW REQUESTS
               </Badge>
            </div>
        </div>

        <Card className="border-none shadow-premium rounded-[2.5rem] overflow-hidden bg-card">
            <CardContent className="p-0">
            <Table>
                <TableHeader className="bg-muted/50 border-none">
                  <TableRow className="border-none">
                      <TableHead className="w-[40%] pl-8 py-5">Order Context</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>ETA/Prep</TableHead>
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
                    <TableRow key={order.id} className="hover:bg-muted/20 transition-colors border-border/50 group cursor-pointer" onClick={() => openDetails(order)}>
                      <TableCell className="align-top pl-8 py-8">
                         <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-black text-primary tracking-widest uppercase mb-1">#ORD-{order.id.slice(0, 6)}</span>
                            <OrderItemsList orderId={order.id} />
                         </div>
                      </TableCell>
                      <TableCell className="align-top py-8">
                         <div className="flex flex-col">
                            <span className="font-bold text-sm">{order.customerName || 'Guest'}</span>
                            <span className="text-[10px] text-muted-foreground">{order.orderDate ? format(order.orderDate.toDate(), 'MMM d, p') : 'N/A'}</span>
                         </div>
                      </TableCell>
                      <TableCell className="align-top py-8">
                          {order.estimatedPrepTime ? (
                            <div className="flex items-center gap-1.5 text-xs font-bold text-orange-600">
                               <Clock className="h-3.5 w-3.5" />
                               {order.estimatedPrepTime}m
                            </div>
                          ) : (
                            <span className="text-[10px] text-muted-foreground italic">Not set</span>
                          )}
                      </TableCell>
                      <TableCell className="align-top py-8">
                          <Badge variant={order.status === 'Placed' ? 'destructive' : 'outline'} className={cn(
                            "rounded-lg font-bold text-[10px] tracking-wide border-none",
                            order.status === 'Placed' ? "bg-red-100 text-red-600" : 
                            order.status === 'Preparing' ? "bg-orange-100 text-orange-600" :
                            order.status === 'Out for Delivery' ? "bg-blue-100 text-blue-600" :
                            "bg-green-100 text-green-600"
                          )}>
                            {order.status}
                          </Badge>
                      </TableCell>
                      <TableCell className="text-right align-top pr-8 py-8">
                        <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 hover:bg-primary/10 hover:text-primary transition-colors">
                           <Eye className="h-5 w-5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
            {!areOrdersLoading && (!orders || orders.length === 0) && (
              <div className='text-center py-32 text-muted-foreground bg-muted/5'>
                <div className="bg-muted/50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ClipboardList className="h-10 w-10 opacity-20" />
                </div>
                <p className="font-bold text-lg">No active orders.</p>
                <p className="text-sm">When customers place orders, they will appear here in real-time.</p>
              </div>
            )}
            </CardContent>
        </Card>
    </div>
  );
}
