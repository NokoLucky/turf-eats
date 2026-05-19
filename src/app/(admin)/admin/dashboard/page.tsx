'use client';

import React, { useMemo, useState } from 'react';
import { collectionGroup, collection, doc, deleteDoc, setDoc } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Store, Bike, Trash2, TrendingUp, ShoppingCart, 
  User, Phone, Mail, MapPin, Calendar, 
  CreditCard, Info, Clock, Star, ExternalLink 
} from 'lucide-react';
import type { Order, Driver, Restaurant } from '@/lib/data';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

type InspectionType = 'driver' | 'owner' | 'restaurant';

export default function AdminDashboard() {
  const firestore = useFirestore();
  const { user } = useUser();

  // State for the inspection dialog
  const [inspectedItem, setInspectedItem] = useState<any | null>(null);
  const [inspectionType, setInspectionType] = useState<InspectionType | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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

  const handleApprove = (e: React.MouseEvent, collectionName: 'drivers' | 'storeOwners', userId: string) => {
    e.stopPropagation();
    if (!firestore) return;
    const docPath = `users/${userId}/${collectionName}/${userId}`;
    const docRef = doc(firestore, docPath);
    
    const updateData = { status: 'active' };

    setDoc(docRef, updateData, { merge: true })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'update',
          requestResourceData: updateData,
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  const handleDelete = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    if (!firestore) return;
    if (!confirm("Are you sure you want to permanently delete this record? This action cannot be undone.")) return;

    const docRef = doc(firestore, path);
    deleteDoc(docRef).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'delete',
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
    });
  };

  const openInspection = (item: any, type: InspectionType) => {
    setInspectedItem(item);
    setInspectionType(type);
    setIsDialogOpen(true);
  };

  return (
    <div className="container py-10 px-4 sm:px-8">
      <div className="mb-10">
        <h1 className="text-3xl font-bold">Welcome back, Admin 👑</h1>
        <p className="text-muted-foreground mt-1">Here's a live look at the Pin2You platform.</p>
      </div>

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
              <Card 
                key={driver.id} 
                className="border-none shadow-premium rounded-[2rem] p-6 cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all group"
                onClick={() => openInspection(driver, 'driver')}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-secondary overflow-hidden">
                       <img src={`https://picsum.photos/seed/${driver.id}/100/100`} alt="avatar" />
                    </div>
                    <div>
                      <h3 className="font-bold group-hover:text-primary transition-colors">{driver.name}</h3>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">{driver.vehicleType || 'Vehicle Pending'}</p>
                    </div>
                  </div>
                  <Badge variant={driver.status === 'active' ? 'default' : 'outline'}>{driver.status}</Badge>
                </div>
                <div className="flex gap-2 mt-6">
                  {driver.status === 'pending' && (
                    <Button size="sm" className="flex-1 rounded-xl" onClick={(e) => handleApprove(e, 'drivers', driver.userId)}>Approve</Button>
                  )}
                  <Button size="sm" variant="outline" className="flex-1 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30" onClick={(e) => handleDelete(e, `users/${driver.userId}/drivers/${driver.userId}`)}>
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
              <Card 
                key={owner.id} 
                className="border-none shadow-premium rounded-[2rem] p-6 cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all group"
                onClick={() => openInspection(owner, 'owner')}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold group-hover:text-primary transition-colors">{owner.name}</h3>
                    <p className="text-xs text-muted-foreground">{owner.email}</p>
                  </div>
                  <Badge variant={owner.status === 'active' ? 'default' : 'outline'}>{owner.status}</Badge>
                </div>
                <div className="flex gap-2 mt-6">
                  {owner.status === 'pending' && (
                    <Button size="sm" className="flex-1 rounded-xl" onClick={(e) => handleApprove(e, 'storeOwners', owner.userId)}>Approve</Button>
                  )}
                   <Button size="sm" variant="outline" className="flex-1 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30" onClick={(e) => handleDelete(e, `users/${owner.userId}/storeOwners/${owner.userId}`)}>
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
              <Card 
                key={store.id} 
                className="border-none shadow-premium rounded-[2rem] p-6 overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all group"
                onClick={() => openInspection(store, 'restaurant')}
              >
                <div className="relative h-32 -mx-6 -mt-6 mb-4">
                   <img src={store.bannerUrl} className="w-full h-full object-cover" alt="banner" />
                   <div className="absolute bottom-2 right-2 h-10 w-10 bg-white p-1 rounded-lg shadow-lg">
                      <img src={store.logoUrl} className="w-full h-full object-cover rounded-md" alt="logo" />
                   </div>
                </div>
                <h3 className="font-bold group-hover:text-primary transition-colors">{store.name}</h3>
                <p className="text-xs text-muted-foreground">{store.category}</p>
                <div className="flex justify-between items-center mt-4">
                  <Badge variant={store.status === 'active' ? 'secondary' : 'outline'}>{store.status}</Badge>
                  <Button size="sm" variant="ghost" className="text-muted-foreground h-8 px-2 hover:bg-destructive/10 hover:text-destructive" onClick={(e) => handleDelete(e, `restaurants/${store.id}`)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Inspection Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl">
          {inspectedItem && inspectionType && (
            <div className="flex flex-col h-full">
              <div className="bg-primary p-8 text-white">
                <DialogHeader>
                  <div className="flex items-center gap-4 mb-2">
                    <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                      {inspectionType === 'driver' && <Bike className="h-6 w-6" />}
                      {inspectionType === 'owner' && <User className="h-6 w-6" />}
                      {inspectionType === 'restaurant' && <Store className="h-6 w-6" />}
                    </div>
                    <Badge variant="secondary" className="bg-white/20 text-white border-none uppercase text-[10px] tracking-widest font-bold">
                      {inspectionType} Inspection
                    </Badge>
                  </div>
                  <DialogTitle className="text-3xl font-bold">{inspectedItem.name || 'N/A'}</DialogTitle>
                  <DialogDescription className="text-white/80">
                    ID: {inspectedItem.id} • Status: {inspectedItem.status}
                  </DialogDescription>
                </DialogHeader>
              </div>

              <ScrollArea className="flex-1 p-8">
                <div className="space-y-8 pb-4">
                  {/* Media Previews */}
                  {inspectionType === 'restaurant' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Logo</p>
                        <div className="h-24 w-24 rounded-2xl overflow-hidden border-4 border-white shadow-md bg-muted">
                           <img src={inspectedItem.logoUrl} className="w-full h-full object-cover" alt="logo" />
                        </div>
                      </div>
                      <div className="space-y-2">
                         <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Banner</p>
                         <div className="h-24 w-full rounded-2xl overflow-hidden border-4 border-white shadow-md bg-muted">
                           <img src={inspectedItem.bannerUrl} className="w-full h-full object-cover" alt="banner" />
                        </div>
                      </div>
                    </div>
                  )}

                  {inspectionType === 'driver' && inspectedItem.licenseUrl && (
                    <div className="space-y-2">
                       <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Driver's License Document</p>
                       <div className="relative aspect-video w-full rounded-2xl overflow-hidden border bg-muted group cursor-pointer" onClick={() => window.open(inspectedItem.licenseUrl, '_blank')}>
                          <img src={inspectedItem.licenseUrl} className="w-full h-full object-contain" alt="license" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                             <Button variant="secondary" size="sm" className="rounded-full">
                               <ExternalLink className="h-4 w-4 mr-2" /> View Original
                             </Button>
                          </div>
                       </div>
                    </div>
                  )}

                  {/* General Info Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InfoItem icon={<User className="h-4 w-4" />} label="Display Name" value={inspectedItem.name} />
                    <InfoItem icon={<Mail className="h-4 w-4" />} label="Email Address" value={inspectedItem.email || 'N/A'} />
                    <InfoItem icon={<Phone className="h-4 w-4" />} label="Phone Number" value={inspectedItem.phoneNumber || 'N/A'} />
                    
                    {inspectionType === 'restaurant' && (
                      <>
                        <InfoItem icon={<Store className="h-4 w-4" />} label="Store Category" value={inspectedItem.category} />
                        <InfoItem icon={<MapPin className="h-4 w-4" />} label="Street Address" value={inspectedItem.address} />
                        <InfoItem icon={<Clock className="h-4 w-4" />} label="Operating Hours" value={inspectedItem.openingHours} />
                        <InfoItem icon={<Star className="h-4 w-4" />} label="Current Rating" value={inspectedItem.rating?.toFixed(1) || '0.0'} />
                        <InfoItem icon={<CreditCard className="h-4 w-4" />} label="Min. Order" value={`R${inspectedItem.minOrder || '0.00'}`} />
                        <InfoItem icon={<TrendingUp className="h-4 w-4" />} label="Delivery Fee" value={`R${inspectedItem.deliveryFee || '0.00'}`} />
                      </>
                    )}

                    {inspectionType === 'driver' && (
                      <>
                        <InfoItem icon={<Bike className="h-4 w-4" />} label="Vehicle Type" value={inspectedItem.vehicleType} />
                        <InfoItem icon={<CreditCard className="h-4 w-4" />} label="License No." value={inspectedItem.licenseNumber} />
                        <InfoItem icon={<Info className="h-4 w-4" />} label="Registration" value={inspectedItem.vehicleRegistration} />
                        <InfoItem icon={<Star className="h-4 w-4" />} label="Rating" value={inspectedItem.rating?.toFixed(1) || '0.0'} />
                      </>
                    )}

                    <InfoItem icon={<Calendar className="h-4 w-4" />} label="System UID" value={inspectedItem.userId || inspectedItem.id} />
                  </div>

                  {inspectionType === 'restaurant' && inspectedItem.promotionBannerText && (
                    <div className="p-4 rounded-2xl bg-orange-50 border border-orange-100">
                      <p className="text-[10px] font-bold text-orange-600 uppercase mb-1">Active Promotion Banner</p>
                      <p className="text-sm font-medium italic text-orange-900">"{inspectedItem.promotionBannerText}"</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
              
              <Separator />
              
              <div className="p-6 bg-muted/30 flex gap-3">
                <Button className="flex-1 rounded-2xl h-12 font-bold" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Close Inspection
                </Button>
                {inspectedItem.status === 'pending' && (
                  <Button className="flex-1 rounded-2xl h-12 font-bold bg-primary" onClick={(e) => {
                    handleApprove(e, inspectionType === 'driver' ? 'drivers' : 'storeOwners', inspectedItem.userId);
                    setIsDialogOpen(false);
                  }}>
                    Approve Request
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | number }) {
  return (
    <div className="flex gap-4 group">
      <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{label}</p>
        <p className="text-sm font-bold text-foreground truncate mt-0.5">{value}</p>
      </div>
    </div>
  );
}
