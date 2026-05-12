'use client';

import React, { useMemo, useState } from 'react';
import { collectionGroup, query, collection, doc } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useUser, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { ExternalLink, CheckCircle, ShieldAlert, Store, Bike, AlertCircle, Trash2, UserPlus, TrendingUp, Users } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function AdminDashboard() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
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

  const { data: allDrivers, isLoading: loadingDrivers } = useCollection(driversQuery);
  const { data: allOwners, isLoading: loadingOwners } = useCollection(ownersQuery);
  const { data: allRestaurants, isLoading: loadingRestaurants } = useCollection(restaurantsQuery);

  const stats = [
    { label: 'Total Orders', value: '1,245', growth: '+18%', icon: <ShoppingCart /> },
    { label: 'Total Revenue', value: 'R24,560', growth: '+22%', icon: <TrendingUp /> },
    { label: 'Active Drivers', value: '45', growth: '+12%', icon: <Bike /> },
    { label: 'Restaurants', value: '32', growth: '+10%', icon: <Store /> },
  ];

  const handleApprove = (collectionName: 'drivers' | 'storeOwners', userId: string) => {
    if (!firestore) return;
    const docPath = `users/${userId}/${collectionName}/${userId}`;
    const docRef = doc(firestore, docPath);
    updateDocumentNonBlocking(docRef, { status: 'active' });
    toast({ title: "Approval Successful", description: "Profile has been activated." });
  };

  return (
    <div className="container py-10 px-4 sm:px-8">
      <div className="mb-10">
        <h1 className="text-3xl font-bold">Welcome back, Admin 👑</h1>
        <p className="text-muted-foreground mt-1">Here's what's happening on your platform today.</p>
      </div>

      {/* Admin Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-none shadow-premium rounded-[2rem]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase">{stat.label}</CardTitle>
              <div className="bg-primary/10 p-2 rounded-xl text-primary">{React.cloneElement(stat.icon as React.ReactElement, { className: "h-4 w-4" })}</div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-[10px] text-green-600 font-bold mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> {stat.growth}
              </p>
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
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">{driver.vehicleType}</p>
                    </div>
                  </div>
                  <Badge variant={driver.status === 'active' ? 'default' : 'outline'}>{driver.status}</Badge>
                </div>
                <div className="flex gap-2 mt-6">
                  {driver.status === 'pending' && (
                    <Button size="sm" className="flex-1 rounded-xl" onClick={() => handleApprove('drivers', driver.userId)}>Approve</Button>
                  )}
                  <Button size="sm" variant="outline" className="flex-1 rounded-xl text-muted-foreground">Details</Button>
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
                  <Button size="sm" variant="outline" className="flex-1 rounded-xl text-muted-foreground">Manage</Button>
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
                  <Badge variant="secondary">Active</Badge>
                  <Button size="sm" variant="ghost" className="text-destructive h-8 px-2 hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ShoppingCart(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
  )
}