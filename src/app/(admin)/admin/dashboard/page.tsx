'use client';

import React, { useMemo } from 'react';
import { collectionGroup, collection, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Store, Bike, Trash2, TrendingUp, ShoppingCart, Users } from 'lucide-react';
import type { Order, Driver, Restaurant } from '@/lib/data';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function AdminDashboard() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const driversQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collectionGroup(firestore, 'drivers');
  }, [firestore, user?.uid]);

  const ownersQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collectionGroup(firestore, 'storeOwners');
  }, [firestore, user?.uid]);

  const restaurantsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'restaurants');
  }, [firestore, user?.uid]);

  const ordersQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'orders');
  }, [firestore, user?.uid]);

  const { data: allDrivers, isLoading: loadingDrivers } = useCollection<Driver>(driversQuery);
  const { data: allOwners, isLoading: loadingOwners } = useCollection(ownersQuery);
  const { data: allRestaurants, isLoading: loadingRestaurants } = useCollection<Restaurant>(restaurantsQuery);
  const { data: allOrders, isLoading: loadingOrders } = useCollection<Order>(ordersQuery);

  const stats = useMemo(() => {
    if (!allOrders || !allDrivers || !allRestaurants) return null;

    const totalOrders = allOrders.length;
    const totalRevenue = allOrders
      .filter(o => o.status === 'Delivered')
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    
    const activeDrivers = allDrivers.filter(d => d.status === 'active').length;
    const activeStores = allRestaurants.filter(r => r.status === 'active').length;

    return [
      { label: 'Total Orders', value: totalOrders.toString(), icon: <ShoppingCart /> },
      { label: 'Total Revenue', value: `R${totalRevenue.toFixed(2)}`, icon: <TrendingUp /> },
      { label: 'Active Drivers', value: activeDrivers.toString(), icon: <Bike /> },
      { label: 'Active Stores', value: activeStores.toString(), icon: <Store /> },
    ];
  }, [allOrders, allDrivers, allRestaurants]);

  const handleApprove = async (collectionName: 'drivers' | 'storeOwners', userId: string) => {
    if (!firestore) return;
    const docPath = `users/${userId}/${collectionName}/${userId}`;
    const docRef = doc(firestore, docPath);
    
    updateDoc(docRef, { status: 'active' }).then(() => {
        toast({ title: "Approval Successful", description: "Profile has been activated." });
    }).catch(err => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'update', requestResourceData: { status: 'active' } }));
    });
  };

  const handleDelete = async (path: string) => {
    if (!firestore) return;
    if (!confirm("Are you sure you want to permanently delete this record? This action cannot be undone.")) return;

    const docRef = doc(firestore, path);
    deleteDoc(docRef).then(() => {
        toast({ title: "Deleted", description: "Record has been removed from the system.", variant: "destructive" });
    }).catch(err => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'delete' }));
    });
  };

  return (
    <div className="container py-10 px-4 sm:px-8">
      <div className="mb-10">
        <h1 className="text-3xl font-bold">Welcome back, Admin 👑</h1>
        <p className="text-muted-foreground mt-1">Here's a live look at the Pin2You platform.</p>
      </div>

      {/* Admin Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {!stats ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-[2rem]" />)
        ) : stats.map((stat) => (
          <Card key={stat.label} className="border-none shadow-premium rounded-[2rem]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase">{stat.label}</CardTitle>
              <div className="bg-primary/10 p-2 rounded-xl text-primary">
                {React.cloneElement(stat.icon as React.ReactElement, { className: "h-4 w-4" })}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-[10px] text-muted-foreground font-bold mt-1 uppercase">Live Platform Data</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="drivers" className="space-y-8">
        <TabsList className="bg-white p-1 rounded-2xl shadow-premium border-none h-14 w-full max-w-md">
          <TabsTrigger value="drivers" className="flex items-center gap-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white">Drivers</TabsTrigger>
          <TabsTrigger value="owners" className="flex items-center gap-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white">Owners</TabsTrigger>
          <TabsTrigger value="restaurants" className="flex items-center gap-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white">Stores</TabsTrigger>
        </TabsList>

        <TabsContent value="drivers">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loadingDrivers ? <Skeleton className="h-40 w-full rounded-3xl" /> : allDrivers?.map(driver => (
              <Card key={driver.id} className="border-none shadow-premium rounded-[2rem] p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-secondary overflow-hidden">
                       <img src={`https://picsum.photos/seed/${driver.id}/100/100`} alt="avatar" />
                    </div>
                    <div>
                      <h3 className="font-bold">{driver.name}</h3>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">{driver.vehicleType || 'Vehicle Pending'}</p>
                    </div>
                  </div>
                  <Badge variant={driver.status === 'active' ? 'default' : 'outline'}>{driver.status}</Badge>
                </div>
                <div className="flex gap-2 mt-6">
                  {driver.status === 'pending' && (
                    <Button size="sm" className="flex-1 rounded-xl" onClick={() => handleApprove('drivers', driver.userId)}>Approve</Button>
                  )}
                  <Button size="sm" variant="outline" className="flex-1 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30" onClick={() => handleDelete(`users/${driver.userId}/drivers/${driver.userId}`)}>
                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="owners">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loadingOwners ? <Skeleton className="h-40 w-full rounded-3xl" /> : allOwners?.map(owner => (
              <Card key={owner.id} className="border-none shadow-premium rounded-[2rem] p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold">{owner.name}</h3>
                    <p className="text-xs text-muted-foreground">{owner.email}</p>
                  </div>
                  <Badge variant={owner.status === 'active' ? 'default' : 'outline'}>{owner.status}</Badge>
                </div>
                <div className="flex gap-2 mt-6">
                  {owner.status === 'pending' && (
                    <Button size="sm" className="flex-1 rounded-xl" onClick={() => handleApprove('storeOwners', owner.userId)}>Approve</Button>
                  )}
                   <Button size="sm" variant="outline" className="flex-1 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30" onClick={() => handleDelete(`users/${owner.userId}/storeOwners/${owner.userId}`)}>
                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="restaurants">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loadingRestaurants ? <Skeleton className="h-40 w-full rounded-3xl" /> : allRestaurants?.map(store => (
              <Card key={store.id} className="border-none shadow-premium rounded-[2rem] p-6 overflow-hidden">
                <div className="relative h-32 -mx-6 -mt-6 mb-4">
                   <img src={store.bannerUrl} className="w-full h-full object-cover" alt="banner" />
                   <div className="absolute bottom-2 right-2 h-10 w-10 bg-white p-1 rounded-lg">
                      <img src={store.logoUrl} className="w-full h-full object-cover rounded-md" alt="logo" />
                   </div>
                </div>
                <h3 className="font-bold">{store.name}</h3>
                <p className="text-xs text-muted-foreground">{store.category}</p>
                <div className="flex justify-between items-center mt-4">
                  <Badge variant={store.status === 'active' ? 'secondary' : 'outline'}>{store.status}</Badge>
                  <Button size="sm" variant="ghost" className="text-muted-foreground h-8 px-2 hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDelete(`restaurants/${store.id}`)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}