'use client';

import { useMemo, useState } from 'react';
import { collectionGroup, query, collection, doc } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useUser, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { ExternalLink, CheckCircle, ShieldAlert, Store, Bike, AlertCircle, Trash2, UserPlus } from 'lucide-react';
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

  const { data: allDrivers, isLoading: loadingDrivers, error: driversError } = useCollection(driversQuery);
  const { data: allOwners, isLoading: loadingOwners, error: ownersError } = useCollection(ownersQuery);
  const { data: allRestaurants, isLoading: loadingRestaurants, error: restaurantsError } = useCollection(restaurantsQuery);

  const handleApprove = (collectionName: 'drivers' | 'storeOwners', userId: string) => {
    if (!firestore) return;

    const docPath = `users/${userId}/${collectionName}/${userId}`;
    const docRef = doc(firestore, docPath);
    
    updateDocumentNonBlocking(docRef, { status: 'active' });
    
    toast({
      title: "Approval Successful",
      description: `The ${collectionName === 'drivers' ? 'driver' : 'store owner'} has been activated.`,
    });
  };

  const handleDelete = (path: string, label: string) => {
    if (!firestore) return;
    if (!confirm(`Are you sure you want to delete this ${label}? This action cannot be undone.`)) return;

    const docRef = doc(firestore, path);
    deleteDocumentNonBlocking(docRef);

    toast({
      title: `${label} Deleted`,
      description: "The record has been removed from the system.",
      variant: "destructive",
    });
  };

  const TableSkeleton = () => (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );

  const isGlobalLoading = isUserLoading || (loadingDrivers && !allDrivers) || (loadingOwners && !allOwners) || (loadingRestaurants && !allRestaurants);

  if (driversError || ownersError || restaurantsError) {
    return (
      <div className="container py-12">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Error</AlertTitle>
          <AlertDescription>
            The system encountered a permission issue or the database is not ready. Please ensure your account is correctly set as an admin in the database.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container py-12">
      <div className="mb-8 flex items-center gap-4">
        <div className="p-3 bg-primary/10 rounded-lg">
          <ShieldAlert className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h1 className="font-headline text-4xl font-bold">Admin Management</h1>
          <p className="text-muted-foreground mt-1">Manage drivers, store owners, and restaurants across the Pin2You platform.</p>
        </div>
      </div>

      <Tabs defaultValue="drivers" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-xl">
          <TabsTrigger value="drivers" className="flex items-center gap-2">
            <Bike className="h-4 w-4" />
            Drivers
          </TabsTrigger>
          <TabsTrigger value="owners" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Store Owners
          </TabsTrigger>
          <TabsTrigger value="restaurants" className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            Restaurants
          </TabsTrigger>
        </TabsList>

        <TabsContent value="drivers">
          <Card>
            <CardHeader>
              <CardTitle>Driver Directory</CardTitle>
              <CardDescription>Manage all registered drivers and their approval status.</CardDescription>
            </CardHeader>
            <CardContent>
              {isGlobalLoading ? (
                <TableSkeleton />
              ) : !allDrivers || allDrivers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No drivers found.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Driver Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allDrivers.map((driver) => (
                      <TableRow key={driver.id}>
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span>{driver.name}</span>
                            {driver.licenseUrl && (
                                <a href={driver.licenseUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center mt-1">
                                    View License <ExternalLink className="ml-1 h-3 w-3" />
                                </a>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={driver.status === 'active' ? 'default' : 'destructive'}>
                            {driver.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs">
                            <p>{driver.vehicleType || 'N/A'}</p>
                            <p className="text-muted-foreground">{driver.vehicleRegistration || 'No plates'}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {driver.status === 'pending' && (
                              <Button 
                                size="sm" 
                                onClick={() => handleApprove('drivers', driver.userId)}
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                <CheckCircle className="h-4 w-4" />
                                <span className="hidden sm:inline ml-2">Approve</span>
                              </Button>
                            )}
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => handleDelete(`users/${driver.userId}/drivers/${driver.userId}`, 'Driver')}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="hidden sm:inline ml-2">Delete</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="owners">
          <Card>
            <CardHeader>
              <CardTitle>Store Owner Directory</CardTitle>
              <CardDescription>Manage store owner profiles and platform access.</CardDescription>
            </CardHeader>
            <CardContent>
              {isGlobalLoading ? (
                <TableSkeleton />
              ) : !allOwners || allOwners.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No store owners found.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Owner Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allOwners.map((owner) => (
                      <TableRow key={owner.id}>
                        <TableCell className="font-medium">
                          {owner.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant={owner.status === 'active' ? 'default' : 'destructive'}>
                            {owner.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs">
                            <p>{owner.email}</p>
                            <p className="text-muted-foreground">{owner.phoneNumber}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                             {owner.status === 'pending' && (
                              <Button 
                                size="sm" 
                                onClick={() => handleApprove('storeOwners', owner.userId)}
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                <CheckCircle className="h-4 w-4" />
                                <span className="hidden sm:inline ml-2">Approve</span>
                              </Button>
                            )}
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => handleDelete(`users/${owner.userId}/storeOwners/${owner.userId}`, 'Owner')}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="hidden sm:inline ml-2">Delete</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="restaurants">
          <Card>
            <CardHeader>
              <CardTitle>Restaurant Directory</CardTitle>
              <CardDescription>View and manage all stores currently listed on the platform.</CardDescription>
            </CardHeader>
            <CardContent>
              {isGlobalLoading ? (
                <TableSkeleton />
              ) : !allRestaurants || allRestaurants.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No restaurants found.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Store Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allRestaurants.map((restaurant) => (
                      <TableRow key={restaurant.id}>
                        <TableCell className="font-medium">
                          {restaurant.name}
                        </TableCell>
                        <TableCell>{restaurant.category}</TableCell>
                        <TableCell>
                          <Badge variant={restaurant.status === 'active' ? 'default' : 'secondary'}>
                            {restaurant.status || 'active'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleDelete(`restaurants/${restaurant.id}`, 'Restaurant')}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="hidden sm:inline ml-2">Delete</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
